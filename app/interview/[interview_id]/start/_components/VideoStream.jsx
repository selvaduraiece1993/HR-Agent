'use client';

import React, { useEffect, useRef } from 'react';

export default function VideoStream({
  mediaStreamRef,
  onRetry,
  onNotVisible,
  onWarning,
}) {
  const videoRef = useRef(null);

  useEffect(() => {
    let mounted = true;
    let poll = null;
    let warningShown = false;

    const attachIfAvailable = () => {
      const stream = mediaStreamRef && mediaStreamRef.current;
      if (stream && videoRef.current) {
        try {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        } catch (e) {
          // ignore
        }
        return true;
      }
      return false;
    };

    if (!attachIfAvailable()) {
      poll = setInterval(() => {
        if (!mounted) return;
        if (attachIfAvailable() && poll) {
          clearInterval(poll);
        }
      }, 200);
    }

    // Continuous face detection monitoring
    let invisibleCount = 0;
    let faceDetector = null;

    // Initialize Face Detection API (Chrome/Edge)
    if (typeof window !== 'undefined' && 'FaceDetector' in window) {
      try {
        faceDetector = new window.FaceDetector({ fastMode: true });
        console.log('✅ Face Detection API initialized');
      } catch (err) {
        console.warn('Face Detection API not available:', err);
      }
    }

    // Fallback: Canvas for brightness check (if Face Detection unavailable)
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext && canvas.getContext('2d');
    const SAMPLE_W = 64;
    const SAMPLE_H = 48;
    canvas.width = SAMPLE_W;
    canvas.height = SAMPLE_H;

    const visibilityInterval = setInterval(async () => {
      const v = videoRef.current;
      const stream = mediaStreamRef && mediaStreamRef.current;

      if (!stream || !v || !ctx) {
        invisibleCount = 0;
        return;
      }

      let shouldStop = false;
      let reason = '';

      // Check 1: Video track state
      const videoTracks = stream.getVideoTracks();
      if (!videoTracks || videoTracks.length === 0) {
        shouldStop = true;
        reason = 'No video tracks';
      } else {
        const track = videoTracks[0];
        if (!track.enabled) {
          shouldStop = true;
          reason = 'Track disabled';
        } else if (track.readyState !== 'live') {
          shouldStop = true;
          reason = 'Track not live: ' + track.readyState;
        } else if (track.muted) {
          shouldStop = true;
          reason = 'Track muted (hardware shutter)';
        }
      }

      // Check 2: Video element dimensions
      if (!shouldStop && (v.videoWidth === 0 || v.videoHeight === 0)) {
        shouldStop = true;
        reason = 'No video dimensions';
      }

      // Check 3: Face Detection (Primary method - detects human faces)
      if (!shouldStop && faceDetector) {
        try {
          const faces = await faceDetector.detect(v);
          if (!faces || faces.length === 0) {
            shouldStop = true;
            reason = 'No human face detected';
          } else if (process.env.NODE_ENV !== 'production') {
            // eslint-disable-next-line no-console
            console.debug(`✅ ${faces.length} face(s) detected`);
          }
        } catch (err) {
          // Face detection error - treat as no face
          shouldStop = true;
          reason = 'Face detection failed';
          if (process.env.NODE_ENV !== 'production') {
            // eslint-disable-next-line no-console
            console.warn('Face detection error:', err);
          }
        }
      }

      // Check 4: Fallback brightness check (only if Face Detection unavailable)
      if (!shouldStop && !faceDetector) {
        try {
          ctx.drawImage(v, 0, 0, SAMPLE_W, SAMPLE_H);
          const imageData = ctx.getImageData(0, 0, SAMPLE_W, SAMPLE_H);
          const data = imageData.data;

          let totalBrightness = 0;
          let maxBrightness = 0;
          const pixelCount = SAMPLE_W * SAMPLE_H;

          // Calculate brightness across all pixels
          for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const brightness = 0.299 * r + 0.587 * g + 0.114 * b;
            totalBrightness += brightness;
            if (brightness > maxBrightness) {
              maxBrightness = brightness;
            }
          }

          const avgBrightness = totalBrightness / pixelCount;
          const SHUTTER_AVG_THRESHOLD = 25;
          const SHUTTER_MAX_THRESHOLD = 35;

          if (
            avgBrightness < SHUTTER_AVG_THRESHOLD &&
            maxBrightness < SHUTTER_MAX_THRESHOLD
          ) {
            shouldStop = true;
            reason = `Camera blocked (avg: ${avgBrightness.toFixed(1)}, max: ${maxBrightness.toFixed(1)})`;
          }

          if (process.env.NODE_ENV !== 'production') {
            // eslint-disable-next-line no-console
            console.debug('Brightness check:', {
              avgBrightness: avgBrightness.toFixed(1),
              maxBrightness: maxBrightness.toFixed(1),
              faceDetector: 'unavailable',
            });
          }
        } catch (err) {
          // Canvas sampling failed
          if (process.env.NODE_ENV !== 'production') {
            // eslint-disable-next-line no-console
            console.warn('Brightness check failed:', err);
          }
        }
      }

      // Update invisible counter
      if (shouldStop) {
        invisibleCount += 1;

        // Show warning on first detection
        if (invisibleCount === 1 && typeof onWarning === 'function') {
          warningShown = true;
          try {
            onWarning(reason);
          } catch (e) {
            // ignore parent errors
          }
        }

        if (process.env.NODE_ENV !== 'production') {
          // eslint-disable-next-line no-console
          console.warn(
            `Camera issue detected (${invisibleCount}/30): ${reason}`
          );
        }
      } else {
        // Face detected - clear warning if it was shown
        if (warningShown && typeof onWarning === 'function') {
          try {
            onWarning(null); // null means clear the warning
          } catch (e) {
            // ignore parent errors
          }
        }
        invisibleCount = 0;
        warningShown = false;
      }

      // If invisible for 30 consecutive checks (~30s), notify parent to end interview
      if (invisibleCount >= 30) {
        if (typeof onNotVisible === 'function') {
          try {
            onNotVisible();
          } catch (e) {
            // ignore parent errors
          }
        }
        invisibleCount = 0;
        warningShown = false;
      }
    }, 1000);

    return () => {
      mounted = false;
      if (poll) clearInterval(poll);
      if (visibilityInterval) clearInterval(visibilityInterval);
      if (videoRef.current) videoRef.current.srcObject = null;
    };
  }, [mediaStreamRef, onNotVisible, onWarning]);

  const streamAvailable = !!(mediaStreamRef && mediaStreamRef.current);

  return (
    <div className="w-90 h-90 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center">
      {streamAvailable ? (
        <video
          ref={videoRef}
          muted
          playsInline
          className="w-full h-full object-cover"
          aria-label="Local camera preview"
        />
      ) : (
        <div className="flex flex-col items-center justify-center gap-2 p-2">
          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-6 h-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 10l4.553-2.276A2 2 0 0122 9.618v4.764a2 2 0 01-2.447 1.894L15 14M4 6h11M4 18h11M4 12h11"
              />
            </svg>
          </div>
          <button
            type="button"
            onClick={onRetry}
            className="text-xs text-primary-600 hover:underline"
          >
            Retry
          </button>
        </div>
      )}
    </div>
  );
}
