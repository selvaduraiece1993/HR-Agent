'use client';

import { useState, useRef, useCallback } from 'react';
import { supabase } from '@/services/supabaseClient';

/**
 * Custom hook for recording video interviews
 * @returns {Object} Recording state and control functions
 */
export function useVideoRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingError, setRecordingError] = useState(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  /**
   * Start recording the video stream
   * @param {MediaStream} stream - The media stream to record
   * @returns {boolean} - Success status
   */
  const startRecording = useCallback(async (stream) => {
    if (!stream) {
      setRecordingError('No media stream provided');
      return false;
    }

    try {
      // Check for MediaRecorder support
      if (!window.MediaRecorder) {
        throw new Error('MediaRecorder API not supported');
      }

      // Determine best codec
      const mimeTypes = [
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm',
        'video/mp4',
      ];

      let selectedMimeType = '';
      for (const mimeType of mimeTypes) {
        if (MediaRecorder.isTypeSupported(mimeType)) {
          selectedMimeType = mimeType;
          break;
        }
      }

      if (!selectedMimeType) {
        throw new Error('No supported video format found');
      }

      // Create MediaRecorder instance
      const options = {
        mimeType: selectedMimeType,
        videoBitsPerSecond: 2500000, // 2.5 Mbps
        audioBitsPerSecond: 128000, // 128 kbps
      };

      mediaRecorderRef.current = new MediaRecorder(stream, options);
      chunksRef.current = [];

      // Handle data available
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      // Handle recording errors
      mediaRecorderRef.current.onerror = (event) => {
        console.error('MediaRecorder error:', event.error);
        setRecordingError(event.error?.message || 'Recording error');
        setIsRecording(false);
      };

      // Start recording
      mediaRecorderRef.current.start(1000); // Collect data every 1 second
      setIsRecording(true);
      setRecordingError(null);
      console.log('✅ Video recording started:', selectedMimeType);
      return true;
    } catch (err) {
      console.error('Failed to start recording:', err);
      setRecordingError(err.message);
      return false;
    }
  }, []);

  /**
   * Stop recording and return the recorded blob
   * @returns {Promise<Blob|null>} - The recorded video blob
   */
  const stopRecording = useCallback(async () => {
    return new Promise((resolve) => {
      if (
        !mediaRecorderRef.current ||
        mediaRecorderRef.current.state === 'inactive'
      ) {
        resolve(null);
        return;
      }

      mediaRecorderRef.current.onstop = () => {
        try {
          const blob = new Blob(chunksRef.current, {
            type: mediaRecorderRef.current.mimeType || 'video/webm',
          });
          console.log(
            '✅ Recording stopped. Size:',
            (blob.size / 1024 / 1024).toFixed(2),
            'MB'
          );
          setIsRecording(false);
          resolve(blob);
        } catch (err) {
          console.error('Error creating blob:', err);
          setRecordingError(err.message);
          resolve(null);
        } finally {
          chunksRef.current = [];
        }
      };

      mediaRecorderRef.current.stop();
    });
  }, []);

  /**
   * Upload recorded video to Supabase Storage
   * @param {Blob} videoBlob - The recorded video blob
   * @param {string} interviewId - The interview ID
   * @returns {Promise<string|null>} - The public URL of the uploaded video
   */
  const uploadRecording = useCallback(async (videoBlob, interviewId) => {
    if (!videoBlob || !interviewId) {
      console.error('Missing videoBlob or interviewId');
      return null;
    }

    try {
      // Generate unique filename with timestamp
      const timestamp = new Date().getTime();
      const filename = `interview_${interviewId}_${timestamp}.webm`;
      const filePath = `interviews/${interviewId}/${filename}`;

      console.log('📤 Uploading recording:', filePath);

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('interview-recordings') // Storage bucket name
        .upload(filePath, videoBlob, {
          contentType: videoBlob.type || 'video/webm',
          upsert: false,
        });

      if (error) {
        throw error;
      }

      // Get public URL
      const { data: publicUrlData } = supabase.storage
        .from('interview-recordings')
        .getPublicUrl(filePath);

      console.log(
        '✅ Recording uploaded successfully:',
        publicUrlData.publicUrl
      );
      return publicUrlData.publicUrl;
    } catch (err) {
      console.error('Failed to upload recording:', err);
      setRecordingError(err.message);
      return null;
    }
  }, []);

  /**
   * Clean up recorder resources
   */
  const cleanup = useCallback(() => {
    if (mediaRecorderRef.current) {
      try {
        if (mediaRecorderRef.current.state !== 'inactive') {
          mediaRecorderRef.current.stop();
        }
      } catch (err) {
        console.warn('Error during cleanup:', err);
      }
      mediaRecorderRef.current = null;
    }
    chunksRef.current = [];
    setIsRecording(false);
  }, []);

  return {
    isRecording,
    recordingError,
    startRecording,
    stopRecording,
    uploadRecording,
    cleanup,
  };
}
