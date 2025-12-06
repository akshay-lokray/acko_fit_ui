import { useEffect, useRef, useState } from 'react';

interface SpeechControllerProps {
  textToSpeak?: string;
  onSpeakStart: () => void;
  onSpeakEnd: () => void;
  onSpeakingChange: (isSpeaking: boolean) => void;
  onAudioTimeUpdate: (time: number) => void;
}

export default function SpeechController({
  textToSpeak,
  onSpeakStart,
  onSpeakEnd,
  onSpeakingChange,
  onAudioTimeUpdate,
}: SpeechControllerProps) {
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const startTimeRef = useRef<number>(0);
  const animationFrameRef = useRef<number>();

  useEffect(() => {
    synthRef.current = window.speechSynthesis;

    return () => {
      if (synthRef.current) {
        synthRef.current.cancel();
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (textToSpeak && textToSpeak.trim() && synthRef.current) {
      speakText(textToSpeak);
    }

    return () => {
      if (synthRef.current) {
        synthRef.current.cancel();
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [textToSpeak]);

  const speakText = (text: string) => {
    if (!synthRef.current) return;

    // Cancel any ongoing speech
    synthRef.current.cancel();
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utteranceRef.current = utterance;

    // Configure voice settings
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    // Try to use a natural-sounding voice
    const voices = synthRef.current.getVoices();
    const preferredVoice =
      voices.find(
        (voice) =>
          voice.lang.includes('en') &&
          (voice.name.includes('Natural') || voice.name.includes('Enhanced'))
      ) ||
      voices.find((voice) => voice.lang.includes('en-US')) ||
      voices[0];

    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    utterance.onstart = () => {
      startTimeRef.current = Date.now();
      onSpeakStart();
      onSpeakingChange(true);

      // Update audio time for viseme sync
      const updateTime = () => {
        const elapsed = (Date.now() - startTimeRef.current) / 1000; // seconds
        onAudioTimeUpdate(elapsed);
        animationFrameRef.current = requestAnimationFrame(updateTime);
      };
      animationFrameRef.current = requestAnimationFrame(updateTime);
    };

    utterance.onend = () => {
      onSpeakEnd();
      onSpeakingChange(false);
      onAudioTimeUpdate(0);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };

    utterance.onerror = (error) => {
      console.error('Speech synthesis error:', error);
      onSpeakEnd();
      onSpeakingChange(false);
      onAudioTimeUpdate(0);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };

    synthRef.current.speak(utterance);
  };

  const stopSpeaking = () => {
    if (synthRef.current) {
      synthRef.current.cancel();
      onSpeakEnd();
      onSpeakingChange(false);
      onAudioTimeUpdate(0);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    }
  };

  // Expose stop function (you can call this from parent if needed)
  useEffect(() => {
    // This component handles speech internally
    return () => {
      stopSpeaking();
    };
  }, []);

  return null; // This is a controller component, no UI
}

