'use client';

import { InterviewDataContext } from '@/context/InterviewDataContext';
import { Timer, Phone } from 'lucide-react';
import Image from 'next/image';
import React, {
  useContext,
  useEffect,
  useState,
  useRef,
  useCallback,
} from 'react';
import { useVideoRecorder } from '@/hooks/useVideoRecorder';
import AlertConfirmation from './_components/AlertConfirmation';
import VideoStream from './_components/VideoStream';
import axios from 'axios';
import TimmerComponent from './_components/TimmerComponent';
import { getVapiClient } from '@/lib/vapiconfig';
import { supabase } from '@/services/supabaseClient';
import { useParams } from 'next/navigation';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { DB_TABLES } from '@/services/Constants';

function StartInterview() {
  const { interviewInfo, setInterviewInfo } = useContext(InterviewDataContext);
  const vapiRef = useRef(null);
  const [vapiReady, setVapiReady] = useState(false);
  const [activeUser, setActiveUser] = useState(false);
  const [start, setStart] = useState(false);
  const [subtitles, setSubtitles] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const conversation = useRef(null);
  const { interview_id } = useParams();

  const router = useRouter();
  const [userProfile] = useState({
    picture: null,
    name: interviewInfo?.candidate_name || 'Candidate',
  });
  const [isGeneratingFeedback, setIsGeneratingFeedback] = useState(false);
  const [showMediaPrompt, setShowMediaPrompt] = useState(false);
  const mediaStreamRef = useRef(null);
  const [mediaError, setMediaError] = useState(null);
  const [callTerminated, setCallTerminated] = useState(false);
  const [cameraWarning, setCameraWarning] = useState(null);
  const [warningCountdown, setWarningCountdown] = useState(0);
  const {
    isRecording,
    recordingError,
    startRecording,
    stopRecording,
    uploadRecording,
    cleanup: cleanupRecording,
  } = useVideoRecorder();

  const ensureMediaAccess = useCallback(async () => {
    if (
      typeof navigator === 'undefined' ||
      !navigator.mediaDevices ||
      !navigator.mediaDevices.getUserMedia
    ) {
      setMediaError('Media devices are not supported by this browser.');
      setShowMediaPrompt(true);
      return false;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true,
      });
      // keep stream so we can monitor tracks for disconnects
      mediaStreamRef.current = stream;

      // attach ended handlers to all tracks
      stream.getTracks().forEach((t) => {
        t.onended = () => {
          console.warn('Media track ended:', t.kind);
          toast.error('Camera or microphone disconnected. Interview ended.');
          try {
            if (vapiRef.current && typeof vapiRef.current.stop === 'function')
              vapiRef.current.stop();
          } catch (e) {
            console.error('Error stopping vapi after media disconnect', e);
          }
          setStart(false);
          setCallTerminated(true);
        };
      });

      // Additional verification: ensure the video track is live and producing frames.
      try {
        const videoTracks = stream.getVideoTracks();
        if (!videoTracks || videoTracks.length === 0) {
          throw new Error('No video tracks');
        }
        const vt = videoTracks[0];
        if (vt.enabled === false || vt.readyState !== 'live' || vt.muted) {
          setMediaError('Camera appears disabled or blocked.');
          setShowMediaPrompt(true);
          // Do not keep the stream around
          try {
            stream.getTracks().forEach((t) => t.stop());
          } catch {}
          mediaStreamRef.current = null;
          return false;
        }

        // Verify camera is producing visible frames (not black/shuttered)
        const tmpVideo = document.createElement('video');
        tmpVideo.muted = true;
        tmpVideo.playsInline = true;
        tmpVideo.srcObject = stream;
        try {
          await tmpVideo.play();
        } catch {
          // ignore play errors
        }

        // Wait for video to have dimensions
        const waitStart = Date.now();
        while (
          (tmpVideo.videoWidth === 0 || tmpVideo.videoHeight === 0) &&
          Date.now() - waitStart < 3000
        ) {
          // eslint-disable-next-line no-await-in-loop
          await new Promise((r) => setTimeout(r, 100));
        }

        if (tmpVideo.videoWidth === 0 || tmpVideo.videoHeight === 0) {
          setMediaError(
            'Camera not providing video. Please check your camera.'
          );
          setShowMediaPrompt(true);
          try {
            tmpVideo.pause();
            tmpVideo.srcObject = null;
            stream.getTracks().forEach((t) => t.stop());
          } catch {}
          mediaStreamRef.current = null;
          return false;
        }

        // Basic verification: camera is providing video frames
        // Detailed brightness checks will happen during the interview
        if (process.env.NODE_ENV !== 'production') {
          // eslint-disable-next-line no-console
          console.debug('Camera startup check passed - video track is live');
        }

        // Cleanup
        try {
          tmpVideo.pause();
          tmpVideo.srcObject = null;
        } catch {}
      } catch (verr) {
        console.warn('Video verification failed:', verr);
        setMediaError('Camera verification failed. Please check your camera.');
        setShowMediaPrompt(true);
        try {
          stream.getTracks().forEach((t) => t.stop());
        } catch {}
        mediaStreamRef.current = null;
        return false;
      }

      setShowMediaPrompt(false);
      setMediaError(null);
      return true;
    } catch (err) {
      console.warn('Media access denied or unavailable:', err);
      setMediaError(
        'Camera and microphone are required to start the interview. Please enable them and try again.'
      );
      setShowMediaPrompt(true);
      setStart(false);
      return false;
    }
  }, []);

  // Restore interviewInfo from localStorage if missing

  useEffect(() => {
    if (!interviewInfo && typeof window !== 'undefined') {
      const stored = localStorage.getItem('interviewInfo');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (parsed && parsed.interview_id === interview_id) {
            setInterviewInfo(parsed);
          } else {
            // interview_id mismatch, clear
            localStorage.removeItem('interviewInfo');
            router.replace(`/interview/${interview_id}`);
          }
        } catch {
          localStorage.removeItem('interviewInfo');
          router.replace(`/interview/${interview_id}`);
        }
      } else {
        // No info, redirect to join page
        router.replace(`/interview/${interview_id}`);
      }
    }
  }, [interviewInfo, interview_id, setInterviewInfo, router]);

  const startCall = useCallback(async () => {
    const ok = await ensureMediaAccess();
    if (!ok) return;

    const job_position = interviewInfo?.job_position || 'Unknown Position';
    // Use the generated questions for this candidate
    const question_list =
      interviewInfo?.question_list?.interviewQuestions?.map(
        (question) => question?.question
      ) || [];

    console.log('job_position:', job_position);
    console.log('question_list:', question_list);

    const assistantOptions = {
      name: 'AI Recruiter',
      firstMessage: `Hi ${interviewInfo?.candidate_name}, how are you? Ready for your interview on ${interviewInfo?.job_position}?`,
      transcriber: {
        provider: 'deepgram',
        model: 'nova-3',
        language: 'en-US',
      },
      voice: {
        provider: 'playht',
        voiceId: 'jennifer',
      },
      model: {
        provider: 'openai',
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `
You are an AI voice assistant conducting interviews.
Your job is to ask candidates provided interview questions, assess their responses.
Begin the conversation with a friendly introduction, setting a relaxed yet professional tone. Example:
"Hey ${interviewInfo?.candidate_name}! Welcome to your ${interviewInfo?.job_position} interview. Let's get started with a few questions!"
Ask one question at a time and wait for the candidate's response before proceeding. Keep the questions clear and concise. Below Are the questions ask one by one:
Questions: ${question_list}
If the candidate struggles, offer hints or rephrase the question without giving away the answer. Example:
"Need a hint? Think about how React tracks component updates!"
Keep the conversation natural and engaging—use casual phrases like "Alright, next up..." or "Let's tackle a tricky one!"
After 5-7 questions, wrap up the interview smoothly by summarizing their performance. Example:
"That was great! You handled some tough questions well. Keep sharpening your skills!"
End on a positive note:
"Thanks for chatting! Hope to see you crushing projects soon!"
Key Guidelines:
✅ Be friendly, engaging, and witty 🎤
✅ Keep responses short and natural, like a real conversation
✅ Adapt based on the candidate's confidence level
✅ Ensure the interview remains focused on React
`.trim(),
          },
        ],
      },
    };

    // instantiate VAPI client only after media is verified to avoid
    // SDK auto-connecting before camera is ready
    vapiRef.current = getVapiClient();
    if (!vapiRef.current) {
      toast.error('Failed to initialize VAPI client.');
      return;
    }
    setVapiReady(true);

    try {
      vapiRef.current.start(assistantOptions);
      // mark started only after vapi.start() invoked
      setStart(true);
    } catch (e) {
      console.error('Error while starting VAPI:', e);
      toast.error('Failed to start the interview.');
    }
  }, [interviewInfo, ensureMediaAccess]);

  useEffect(() => {
    console.log('interviewInfo:', interviewInfo);
    if (
      interviewInfo &&
      interviewInfo?.job_position &&
      !start &&
      !callTerminated
    ) {
      // Do not set `start` here — only set after media verification and vapi.start succeeds
      startCall();
    }
  }, [interviewInfo, start, startCall, callTerminated]);

  const GenerateFeedback = useCallback(
    async (videoUrl = null) => {
      if (!interviewInfo || !conversation.current) {
        toast.error('Interview data missing. Please restart the interview.');
        router.replace(`/interview/${interview_id}`);
        return;
      }
      try {
        const result = await axios.post('/api/ai-feedback', {
          conversation: conversation.current,
        });

        const Content = result?.data?.content
          ?.replace('```json', '')
          ?.replace('```', '')
          ?.trim();

        if (!Content) {
          console.warn(
            'Feedback content is empty. Proceeding without parsed transcript.'
          );
          toast.warning(
            'AI returned empty feedback. Proceeding to finalize interview.'
          );
        }

        console.log('Cleaned Content:', Content);

        let parsedTranscript = null;
        if (Content) {
          try {
            parsedTranscript = JSON.parse(Content);
          } catch (err) {
            console.error('Invalid JSON in AI feedback:', Content, err);
            toast.error(
              'Received malformed feedback from AI. Proceeding without parsed transcript.'
            );
            parsedTranscript = null;
          }
        }

        const { error: insertError } = await supabase
          .from(DB_TABLES.INTERVIEW_RESULTS)
          .insert([
            {
              fullname: interviewInfo?.candidate_name,
              email: interviewInfo?.email,
              interview_id: interview_id,
              conversation_transcript: parsedTranscript,
              recommendations: 'Not recommended',
              completed_at: new Date().toISOString(),
              video_recording_url: videoUrl,
            },
          ]);

        if (insertError) {
          console.error('Supabase insert error:', insertError);
          throw new Error('Insert failed');
        }

        try {
          const aiResult = await axios.post('/api/ai-model', {
            job_position: interviewInfo?.job_position,
            job_description: interviewInfo?.job_description,
            duration: interviewInfo?.duration,
            type: interviewInfo?.type,
          });
          const rawContent = aiResult?.data?.content || aiResult?.data?.Content;
          let newQuestions = null;
          if (rawContent) {
            const match = rawContent.match(/```json\s*([\s\S]*?)\s*```/);
            if (match && match[1]) {
              newQuestions = JSON.parse(match[1].trim());
            }
          }
          if (newQuestions) {
            await supabase
              .from(DB_TABLES.INTERVIEWS)
              .update({ question_list: newQuestions })
              .eq('interview_id', interview_id);
          }
        } catch (e) {
          console.error(
            'Failed to generate or update new questions for next candidate',
            e
          );
        }

        toast.success('Feedback generated successfully!');
        if (typeof window !== 'undefined') {
          localStorage.removeItem('interviewInfo');
        }
        router.replace(
          '/interview/' + interviewInfo?.interview_id + '/completed'
        );
      } catch (error) {
        console.error('Feedback generation failed:', error);
        toast.error('Failed to generate feedback');
      } finally {
        setIsGeneratingFeedback(false);
      }
    },
    [interviewInfo, interview_id, router]
  );

  useEffect(() => {
    const vapi = vapiRef.current;
    if (!vapi) return;
    // Set up event listeners for Vapi events with stable handlers so we can remove them later
    const handleMessage = (message) => {
      if (message?.role === 'assistant' && message?.content) {
        setSubtitles(message.content);
      }

      if (message && message?.conversation) {
        const filteredConversation =
          message.conversation.filter((msg) => msg.role !== 'system') || '';
        const conversationString = JSON.stringify(
          filteredConversation,
          null,
          2
        );
        conversation.current = conversationString;
      }
    };

    const handleSpeechStart = () => {
      setIsSpeaking(true);
      setActiveUser(false);
      toast('AI is speaking...');
    };

    const handleSpeechEnd = () => {
      setIsSpeaking(false);
      setActiveUser(true);
    };

    const handleCallStart = () => {
      toast('Call started...');
      setStart(true);
      // Start recording the interview
      if (mediaStreamRef.current) {
        startRecording(mediaStreamRef.current);
      }
    };

    const handleCallEnd = async () => {
      // Friendly user flow when call ends
      toast('Call has ended. Generating feedback...');
      setIsGeneratingFeedback(true);
      setCallTerminated(true);

      // Stop and upload video recording
      let videoUrl = null;
      try {
        const recordedBlob = await stopRecording();
        if (recordedBlob) {
          toast('Uploading interview recording...');
          videoUrl = await uploadRecording(recordedBlob, interview_id);
          if (videoUrl) {
            console.log('✅ Recording uploaded:', videoUrl);
          }
        }
      } catch (recErr) {
        console.error('Error handling recording:', recErr);
        toast.error('Failed to save video recording');
      }

      try {
        await GenerateFeedback(videoUrl);
      } catch (e) {
        // GenerateFeedback already handles errors and toasts; just log defensively
        console.warn('Error while generating feedback on call end:', e);
      }
    };

    const handleVapiError = (err) => {
      const msg = err?.message || String(err);
      // Suppress or transform known benign messages to avoid noisy console errors in Next devtools
      if (
        msg.includes('Meeting has ended') ||
        msg.toLowerCase().includes('ejection') ||
        // Handle WebRTC transport disconnect messages which can appear from the SDK
        msg.toLowerCase().includes('recv transport changed to disconnected') ||
        msg.toLowerCase().includes('transport changed to disconnected')
      ) {
        // Terminal condition: stop retrying and inform the user
        toast.info('The call ended.');
        setStart(false);
        setCallTerminated(true);
        try {
          if (vapi && typeof vapi.stop === 'function') vapi.stop();
        } catch (e) {
          console.error('Error stopping vapi after terminal error', e);
        }
        return;
      }
      // For unexpected errors, log so developers can see them
      console.error('VAPI error:', err);
    };

    const handleVideoEvent = (data) => {
      // Called when video frames are received/lost from remote or local
      console.log('VAPI video event:', data);
      // If video stops or becomes unavailable, end the call
      if (data && (data.stopped === true || data.available === false)) {
        toast.error('Video stream lost. Interview ended.');
        setStart(false);
        setCallTerminated(true);
        try {
          if (vapi && typeof vapi.stop === 'function') vapi.stop();
        } catch (e) {
          console.error('Error stopping vapi after video loss', e);
        }
      }
    };

    const handleCameraError = (err) => {
      // Called when camera initialization or usage fails
      console.warn('VAPI camera error:', err);
      const msg = err?.message || String(err);
      toast.error(`Camera error: ${msg}. Interview ended.`);
      setStart(false);
      setCallTerminated(true);
      setShowMediaPrompt(true);
      setMediaError(`Camera error: ${msg}`);
      try {
        if (vapi && typeof vapi.stop === 'function') vapi.stop();
      } catch (e) {
        console.error('Error stopping vapi after camera error', e);
      }
    };

    // Register handlers
    vapi.on('message', handleMessage);
    vapi.on('call-start', handleCallStart);
    vapi.on('speech-start', handleSpeechStart);
    vapi.on('speech-end', handleSpeechEnd);
    vapi.on('call-end', handleCallEnd);
    vapi.on('error', handleVapiError);
    vapi.on('video', handleVideoEvent);
    vapi.on('camera-error', handleCameraError);

    return () => {
      // Remove the exact same handlers to avoid leaking listeners
      vapi.off('message', handleMessage);
      vapi.off('call-start', handleCallStart);
      vapi.off('speech-start', handleSpeechStart);
      vapi.off('speech-end', handleSpeechEnd);
      vapi.off('call-end', handleCallEnd);
      vapi.off('error', handleVapiError);
      vapi.off('video', handleVideoEvent);
      vapi.off('camera-error', handleCameraError);

      // Also cleanup any media tracks we created for monitoring
      if (mediaStreamRef.current) {
        try {
          mediaStreamRef.current.getTracks().forEach((t) => {
            try {
              t.onended = null;
              t.stop();
            } catch {
              // ignore
            }
          });
        } finally {
          mediaStreamRef.current = null;
        }
      }
    };
  }, [vapiReady, interviewInfo, interview_id, router, GenerateFeedback]);

  // Clean up media stream and recording if component unmounts
  useEffect(() => {
    return () => {
      // Clean up recording
      cleanupRecording();

      // Clean up media stream
      if (mediaStreamRef.current) {
        try {
          mediaStreamRef.current.getTracks().forEach((t) => {
            try {
              t.onended = null;
              t.stop();
            } catch {
              // ignore
            }
          });
        } finally {
          mediaStreamRef.current = null;
        }
      }
    };
  }, [cleanupRecording]);

  const handleRetryMedia = async () => {
    setShowMediaPrompt(false);
    setMediaError(null);
    const ok = await ensureMediaAccess();
    if (ok) {
      setStart(true);
      // startCall will continue the flow
      try {
        await startCall();
      } catch (e) {
        console.error('Error starting call on retry:', e);
      }
    }
  };

  const handleCameraWarning = useCallback((reason) => {
    if (reason === null) {
      // Clear warning - face detected again
      console.log('✅ Face detected - clearing warning');
      setCameraWarning(null);
      setWarningCountdown(0);
      toast.success('✅ Face detected! Interview continues.');
      return;
    }

    // Show warning - issue detected
    console.warn('Camera warning:', reason);
    setCameraWarning(reason);
    setWarningCountdown(30);
    const msg = reason?.includes('face')
      ? '⚠️ No face detected! Please show your face to the camera.'
      : '⚠️ Camera issue detected! Please fix within 30 seconds.';
    toast.warning(msg);
  }, []);

  const handleCandidateNotVisible = useCallback(() => {
    // Called after 30 seconds of camera being blocked - end interview
    console.warn('Candidate not visible — ending interview.');
    const errorMsg = cameraWarning?.includes('face')
      ? 'No human face detected. Interview ended.'
      : 'Camera blocked or turned off. Interview ended.';
    toast.error(errorMsg);
    setCameraWarning(null);
    setWarningCountdown(0);
    setShowMediaPrompt(true);
    setMediaError(
      'Please ensure your camera is on and your face is clearly visible to continue.'
    );
    setStart(false);
    setCallTerminated(true);
    try {
      if (vapiRef.current && typeof vapiRef.current.stop === 'function')
        vapiRef.current.stop();
    } catch (e) {
      console.error('Error stopping vapi after camera invisible', e);
    }

    // Stop and clear media tracks
    if (mediaStreamRef.current) {
      try {
        mediaStreamRef.current.getTracks().forEach((t) => {
          try {
            t.onended = null;
            t.stop();
          } catch {
            // ignore
          }
        });
      } finally {
        mediaStreamRef.current = null;
      }
    }
  }, []);

  // Countdown timer for camera warning
  useEffect(() => {
    if (warningCountdown > 0) {
      const timer = setTimeout(() => {
        setWarningCountdown(warningCountdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (warningCountdown === 0 && cameraWarning) {
      // Warning expired but camera still blocked - clear warning
      setCameraWarning(null);
    }
  }, [warningCountdown, cameraWarning]);

  // Monitor media track state (video track enabled/readyState). If the
  // video track becomes disabled or not live, treat as candidate not visible.
  useEffect(() => {
    let monitor = null;
    const startMonitor = () => {
      if (!mediaStreamRef.current) return;
      monitor = setInterval(() => {
        try {
          const stream = mediaStreamRef.current;
          if (!stream) return;
          const videoTracks = stream.getVideoTracks();
          if (!videoTracks || videoTracks.length === 0) return;
          const vt = videoTracks[0];
          // If the track is disabled or ended, notify parent handler
          if (vt.enabled === false || vt.readyState !== 'live') {
            handleCandidateNotVisible();
          }
        } catch (e) {
          // ignore
        }
      }, 1000);
    };

    if (mediaStreamRef.current) startMonitor();

    // Also listen for changes to tracks (e.g., track ended)
    const cleanupListener = () => {
      if (!mediaStreamRef.current) return;
      try {
        const vt = mediaStreamRef.current.getVideoTracks()[0];
        if (vt) {
          vt.onended = () => {
            handleCandidateNotVisible();
          };
        }
      } catch (e) {
        // ignore
      }
    };

    cleanupListener();

    return () => {
      if (monitor) clearInterval(monitor);
      try {
        if (mediaStreamRef.current) {
          const vt = mediaStreamRef.current.getVideoTracks()[0];
          if (vt) vt.onended = null;
        }
      } catch (e) {
        // ignore
      }
    };
  }, [mediaStreamRef, handleCandidateNotVisible]);

  // Optional: use underlying RTCPeerConnection stats (if accessible via VAPI)
  // to detect whether video frames are actually being encoded/sent.
  useEffect(() => {
    let statsInterval = null;
    let lastFrames = null;

    const getPeerConnection = () => {
      try {
        // Try common SDK accessors
        const vapi = vapiRef.current;
        const maybePc =
          vapi &&
          (vapi.getPeerConnection
            ? vapi.getPeerConnection()
            : vapi.peerConnection || vapi._pc || null);
        return maybePc || null;
      } catch (e) {
        return null;
      }
    };

    const startStatsMonitor = async () => {
      const pc = getPeerConnection();
      if (!pc || typeof pc.getStats !== 'function') return;

      statsInterval = setInterval(async () => {
        try {
          const stats = await pc.getStats();
          let outboundVideo = null;
          stats.forEach((report) => {
            if (
              report.type === 'outbound-rtp' &&
              (report.kind === 'video' ||
                report.mediaType === 'video' ||
                report.mimeType?.includes('video'))
            ) {
              outboundVideo = report;
            }
          });

          if (!outboundVideo) return;

          // Try framesEncoded, or bytesSent as fallback
          const frames =
            outboundVideo.framesEncoded ??
            outboundVideo.framesSent ??
            outboundVideo.bytesSent;
          if (frames == null) return;

          if (lastFrames == null) {
            lastFrames = frames;
            return;
          }
          // If frames/bytes hasn't changed for 3 intervals, consider the feed stalled
          if (frames === lastFrames) {
            // call not visible handler
            handleCandidateNotVisible();
          } else {
            lastFrames = frames;
          }
        } catch (e) {
          // ignore monitoring errors
        }
      }, 1500);
    };

    startStatsMonitor();

    return () => {
      if (statsInterval) clearInterval(statsInterval);
    };
  }, [vapiReady, handleCandidateNotVisible]);

  const stopInterview = () => {
    try {
      if (vapiRef.current && typeof vapiRef.current.stop === 'function')
        vapiRef.current.stop();
    } catch (e) {
      console.error('Error stopping vapi on user action', e);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Professional Header */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              {interviewInfo?.job_position || 'AI'} Interview Session
            </h1>
            <p className="text-gray-600">Powered by AI Interview Assistant</p>
          </div>

          <div className="flex items-center gap-4 bg-white px-4 py-2 rounded-lg shadow-sm border border-gray-200">
            <Timer className="text-blue-600" />
            <span className="font-mono text-lg font-semibold text-gray-700">
              <TimmerComponent start={start} />
            </span>
            {isRecording && (
              <div className="flex items-center gap-2 text-red-600 animate-pulse">
                <div className="w-3 h-3 bg-red-600 rounded-full"></div>
                <span className="text-sm font-medium">REC</span>
              </div>
            )}
          </div>
        </header>

        {/* Camera Warning Banner */}
        {cameraWarning && warningCountdown > 0 && (
          <div className="mb-6 bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg shadow-sm animate-pulse">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0">
                  <svg
                    className="h-6 w-6 text-yellow-400"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-yellow-800">
                    ⚠️ Face Not Detected
                  </h3>
                  <p className="text-sm text-yellow-700">
                    {cameraWarning?.includes('face')
                      ? 'No human face detected. Please position yourself in front of the camera.'
                      : 'Camera appears blocked or turned off. Please ensure your camera is on and your face is visible.'}{' '}
                    You have{' '}
                    <span className="font-bold text-lg">
                      {warningCountdown}
                    </span>{' '}
                    seconds to fix this or the interview will end.
                  </p>
                </div>
              </div>
              <div className="flex-shrink-0">
                <button
                  onClick={() => {
                    setCameraWarning(null);
                    setWarningCountdown(0);
                  }}
                  className="inline-flex text-yellow-400 hover:text-yellow-600"
                >
                  <span className="sr-only">Dismiss</span>
                  <svg
                    className="h-5 w-5"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Interview Panels */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* AI Recruiter Panel */}
          <div
            className={`bg-white rounded-xl p-6 shadow-md border transition-all duration-300 ${isSpeaking ? 'border-blue-300 ring-2 ring-blue-100' : 'border-gray-200'}`}
          >
            <div className="flex flex-col items-center justify-center h-full space-y-4">
              <div className="relative">
                {isSpeaking && (
                  <div className="absolute inset-0 rounded-full bg-blue-100 animate-ping opacity-75"></div>
                )}
                <div className="relative z-10 w-40 h-40 rounded-full overflow-hidden border-4 border-white shadow-md bg-blue-100">
                  <Image
                    src="/AIR.png" // Your AI recruiter image path
                    alt="AI Recruiter"
                    width={90}
                    height={90}
                    className="object-cover w-full h-full" // Ensures full coverage of the circle
                    priority
                  />
                </div>
              </div>
              <div className="text-center">
                <h2 className="text-lg font-semibold text-gray-800">
                  AI Recruiter
                </h2>
                <p className="text-sm text-gray-500">Interview HR</p>
              </div>
            </div>
          </div>

          {/* Candidate Panel */}
          <div
            className={`bg-white rounded-xl p-6 shadow-md border transition-all duration-300 ${activeUser ? 'border-purple-300 ring-2 ring-purple-100' : 'border-gray-200'}`}
          >
            <div className="flex flex-col items-center justify-center h-full space-y-4">
              <div className="relative">
                {activeUser && (
                  <div className="absolute inset-0 rounded-full bg-purple-100 animate-ping opacity-75"></div>
                )}
                <div className="relative z-10 w-100 h-100 rounded-full overflow-hidden border-4 border-white shadow-md bg-gray-100 flex items-center justify-center">
                  <VideoStream
                    mediaStreamRef={mediaStreamRef}
                    onRetry={handleRetryMedia}
                    onNotVisible={handleCandidateNotVisible}
                    onWarning={handleCameraWarning}
                  />
                </div>
              </div>
              <div className="text-center">
                <h2 className="text-lg font-semibold text-gray-800">
                  {userProfile.name}
                </h2>
                <p className="text-sm text-gray-500">Candidate</p>
              </div>
            </div>
          </div>
        </div>

        {/* Subtitles Panel */}
        <div className="bg-white rounded-lg p-4 mb-6 shadow-sm border border-gray-200">
          <div className="min-h-16 flex items-center justify-center">
            {subtitles ? (
              <p className="text-center text-gray-700 animate-fadeIn">
                {subtitles}
              </p>
            ) : (
              <p className="text-center text-gray-400">
                {isSpeaking ? 'AI is speaking...' : 'Waiting for response...'}
              </p>
            )}
          </div>
        </div>

        {/* Control Panel */}
        <div className="bg-white rounded-xl p-4 shadow-md border border-gray-200">
          <div className="flex flex-col items-center">
            <div className="flex gap-4 mb-4">
              <AlertConfirmation stopInterview={stopInterview}>
                <button
                  className="p-3 rounded-full bg-red-100 text-red-600 hover:bg-red-200 shadow-sm transition-all flex items-center gap-2"
                  aria-label="End call"
                >
                  <Phone size={20} />
                  <span>End Interview</span>
                </button>
              </AlertConfirmation>
            </div>

            <p className="text-sm text-gray-500">
              {activeUser ? 'Please respond...' : 'AI is speaking...'}
            </p>
          </div>
        </div>
      </div>
      {showMediaPrompt && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full text-center">
            <h2 className="text-lg font-semibold mb-2">
              Camera & Microphone Required
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              {mediaError ||
                'This interview requires access to your camera and microphone.'}
            </p>
            <div className="flex justify-center gap-3">
              <button
                onClick={handleRetryMedia}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg"
              >
                Retry
              </button>
              <button
                onClick={() => {
                  setShowMediaPrompt(false);
                  router.replace(`/interview/${interview_id}`);
                }}
                className="px-4 py-2 bg-gray-200 rounded-lg"
              >
                Exit
              </button>
            </div>
          </div>
        </div>
      )}

      {isGeneratingFeedback && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-8 max-w-md w-full text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">
              Generating Feedback
            </h2>
            <p className="text-gray-600">
              Please wait while we analyze your interview...
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default StartInterview;
