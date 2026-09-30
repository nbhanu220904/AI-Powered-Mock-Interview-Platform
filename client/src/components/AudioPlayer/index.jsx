// ============================================
// AudioPlayer - Headless Audio Playback Component
// ============================================
// Converts base64 audio to a playable Blob and auto-plays it.
// Signals when playback ends via the onEnded callback.
// ============================================

import { useEffect, useRef } from 'react';

function AudioPlayer({ audioBase64, autoPlay, onEnded }) {
  const audioRef = useRef(null);

  useEffect(() => {
    if (!audioBase64) return;

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }

    let audioUrl;
    try {
      const encodedAudio = audioBase64.replace(/^data:audio\/[^;]+;base64,/, '');
      const binaryString = atob(encodedAudio);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      audioUrl = URL.createObjectURL(new Blob([bytes], { type: 'audio/mpeg' }));
    } catch {
      onEnded?.();
      return undefined;
    }

    const audio = new Audio(audioUrl);
    audioRef.current = audio;

    audio.onended = () => {
      if (onEnded) onEnded();
    };

    if (autoPlay) {
      audio.play().catch((err) => {
        const message = err?.message || '';
        const interrupted =
          err?.name === 'AbortError' ||
          message.includes('interrupted by a call to pause');

        if (!interrupted) {
          console.error('Audio autoplay failed:', message);
          if (onEnded) onEnded();
        }
      });
    }

    return () => {
      audio.pause();
      audio.src = '';
      URL.revokeObjectURL(audioUrl);
      if (audioRef.current === audio) audioRef.current = null;
    };
  }, [audioBase64, autoPlay, onEnded]);

  return null;
}

export default AudioPlayer;