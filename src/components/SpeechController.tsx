import { useEffect, useRef, useState } from 'react';
import type { VoiceType } from '../types/voice';

interface SpeechControllerProps {
  textToSpeak?: string;
  voiceType?: VoiceType;
  onSpeakStart: () => void;
  onSpeakEnd: () => void;
  onSpeakingChange: (isSpeaking: boolean) => void;
  onAudioTimeUpdate: (time: number) => void;
}

export default function SpeechController({
  textToSpeak,
  voiceType = 'female',
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
      speakText(textToSpeak, voiceType);
    }

    return () => {
      if (synthRef.current) {
        synthRef.current.cancel();
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [textToSpeak, voiceType]);

  const speakText = (text: string, voiceType: VoiceType) => {
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
    utterance.pitch = voiceType === 'male' ? 0.9 : 1.1; // Slightly lower for male, higher for female
    utterance.volume = 1.0;

    // Get available voices
    const voices = synthRef.current.getVoices();
    
    // Filter voices by gender/type
    let preferredVoice: SpeechSynthesisVoice | null = null;

    if (voiceType === 'female') {
      // Try to find female voices (usually have "Female" in name or higher pitch)
      preferredVoice =
        voices.find(
          (voice) =>
            voice.lang.includes('en') &&
            (voice.name.toLowerCase().includes('female') ||
             voice.name.toLowerCase().includes('zira') ||
             voice.name.toLowerCase().includes('samantha') ||
             voice.name.toLowerCase().includes('karen') ||
             voice.name.toLowerCase().includes('susan'))
        ) ||
        voices.find(
          (voice) =>
            voice.lang.includes('en') &&
            (voice.name.includes('Natural') || voice.name.includes('Enhanced'))
        ) ||
        voices.find((voice) => voice.lang.includes('en-US')) ||
        voices[0];
    } else {
      // Try to find male voices (usually have "Male" in name or lower pitch)
      preferredVoice =
        voices.find(
          (voice) =>
            voice.lang.includes('en') &&
            (voice.name.toLowerCase().includes('male') ||
             voice.name.toLowerCase().includes('david') ||
             voice.name.toLowerCase().includes('mark') ||
             voice.name.toLowerCase().includes('richard') ||
             voice.name.toLowerCase().includes('james'))
        ) ||
        voices.find((voice) => voice.lang.includes('en-US')) ||
        voices[0];
    }

    if (preferredVoice) {
      utterance.voice = preferredVoice;
      console.log(`Using voice: ${preferredVoice.name} (${voiceType})`);
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
      // Ignore 'canceled' errors as they're intentional when speech is interrupted
      if (error.error !== 'canceled') {
        console.error('Speech synthesis error:', error);
      }
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

