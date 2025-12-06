import { useEffect, useRef } from 'react';
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
  const animationFrameRef = useRef<number | undefined>(undefined);
  const voiceTimeoutRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    synthRef.current = window.speechSynthesis;

    // Ensure voices are loaded (some browsers need this)
    const loadVoices = () => {
      if (synthRef.current) {
        const voices = synthRef.current.getVoices();
        console.log('Voices loaded:', voices.length);
        if (voices.length > 0) {
          console.log('Available voices:', voices.map(v => `${v.name} (${v.lang})`));
        }
      }
    };

    // Load voices immediately if available
    loadVoices();

    // Some browsers fire the voiceschanged event
    if (synthRef.current) {
      synthRef.current.onvoiceschanged = loadVoices;
    }

    return () => {
      if (synthRef.current) {
        synthRef.current.cancel();
        synthRef.current.onvoiceschanged = null;
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (textToSpeak && textToSpeak.trim() && synthRef.current) {
      // Ensure voices are loaded before speaking
      const voices = synthRef.current.getVoices();
      if (voices.length === 0) {
        // Wait for voices to load
        const waitForVoices = () => {
          const loadedVoices = synthRef.current?.getVoices() || [];
          if (loadedVoices.length > 0) {
            speakText(textToSpeak, voiceType);
          } else {
            // Try again after a short delay
            voiceTimeoutRef.current = window.setTimeout(waitForVoices, 100);
          }
        };
        waitForVoices();
      } else {
        speakText(textToSpeak, voiceType);
      }
    }

    return () => {
      if (synthRef.current) {
        synthRef.current.cancel();
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      // Clear pending voice loading timeout
      if (voiceTimeoutRef.current !== undefined) {
        clearTimeout(voiceTimeoutRef.current);
        voiceTimeoutRef.current = undefined;
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

    // Configure voice settings for more human-like Indian English
    // More natural settings for human-like speech
    utterance.rate = 1.05; // Slightly slower for natural, clear speech (human-like pace)
    utterance.pitch = voiceType === 'male' ? 0.9 : 1.5; // More natural pitch range (closer to human voices)
    utterance.volume = 1.0;
    utterance.lang = 'en-IN'; // Set language to Indian English

    // Get available voices (may need to wait for voices to load)
    let voices = synthRef.current.getVoices();

    // If voices aren't loaded yet, wait a bit and try again
    if (voices.length === 0) {
      // Try multiple times as voices may load asynchronously
      let attempts = 0;
      const tryLoadVoices = () => {
        voices = synthRef.current?.getVoices() || [];
        if (voices.length > 0 || attempts >= 5) {
          selectAndSpeak(voices, utterance, voiceType);
        } else {
          attempts++;
          setTimeout(tryLoadVoices, 200);
        }
      };
      setTimeout(tryLoadVoices, 100);
      return;
    }

    selectAndSpeak(voices, utterance, voiceType);
  };

  const selectAndSpeak = (
    voices: SpeechSynthesisVoice[],
    utterance: SpeechSynthesisUtterance,
    voiceType: VoiceType
  ) => {
    // Log all available voices for debugging
    console.log('Available voices:', voices.map(v => `${v.name} (${v.lang})`));

    if (voices.length === 0) {
      console.warn('No voices available');
      return;
    }

    // Filter voices by gender/type, prioritizing Indian English and natural-sounding voices
    let preferredVoice: SpeechSynthesisVoice | null = null;

    if (voiceType === 'female') {
      console.log('🔍 Searching for FEMALE voice...');

      // Common female voice names across different browsers/platforms
      const femaleVoiceKeywords = [
        'female', 'zira', 'samantha', 'karen', 'susan', 'priya', 'neela',
        'kavya', 'ananya', 'victoria', 'linda', 'heather', 'hazel',
        'google uk english female', 'microsoft zira', 'google us english female',
        'siri female', 'alex female', 'cortana'
      ];

      // Common male voice names to exclude (comprehensive list)
      const maleVoiceKeywords = [
        'male', 'david', 'mark', 'richard', 'james', 'ravi', 'ajay',
        'kiran', 'arjun', 'tom', 'daniel', 'alex', 'google uk english male',
        'microsoft david', 'siri male', 'thomas', 'john', 'paul', 'mike',
        'michael', 'robert', 'william', 'charles', 'george', 'joseph',
        'kevin', 'brian', 'edward', 'ronald', 'anthony', 'kenny',
        'google us english male', 'microsoft mark', 'microsoft richard'
      ];

      // Priority 1: Indian English female voices
      preferredVoice = voices.find(
        (voice) =>
          (voice.lang === 'en' || voice.lang.includes('en')) &&
          femaleVoiceKeywords.some(keyword => voice.name.toLowerCase().includes(keyword))
      ) || null;

      if (preferredVoice) {
        console.log('✅ Found Indian English female voice:', preferredVoice.name);
      } else {
        // Priority 2: Any Indian English voice (exclude male explicitly)
        preferredVoice = voices.find((voice) =>
          (voice.lang === 'en-IN' || voice.lang.includes('en-IN')) &&
          !maleVoiceKeywords.some(keyword => voice.name.toLowerCase().includes(keyword))
        ) || null;

        if (preferredVoice) {
          console.log('✅ Found Indian English voice (non-male):', preferredVoice.name);
        } else {
          // Priority 3: Explicit female English voices
          preferredVoice = voices.find(
            (voice) =>
              voice.lang.includes('en') &&
              !maleVoiceKeywords.some(keyword => voice.name.toLowerCase().includes(keyword)) &&
              femaleVoiceKeywords.some(keyword => voice.name.toLowerCase().includes(keyword))
          ) || null;

          if (preferredVoice) {
            console.log('✅ Found explicit female English voice:', preferredVoice.name);
          } else {
            // Priority 4: Any English voice that's NOT male (safer fallback)
            preferredVoice = voices.find((voice) =>
              voice.lang.includes('en') &&
              !maleVoiceKeywords.some(keyword => voice.name.toLowerCase().includes(keyword))
            ) || null;

            if (preferredVoice) {
              console.log('✅ Found English voice (non-male):', preferredVoice.name);
            } else {
              // Priority 5: Try common female voices by name
              preferredVoice = voices.find((voice) =>
                voice.lang.includes('en') &&
                (voice.name.toLowerCase().includes('zira') ||
                  voice.name.toLowerCase().includes('samantha') ||
                  voice.name.toLowerCase().includes('karen') ||
                  voice.name.toLowerCase().includes('susan'))
              ) || null;

              if (preferredVoice) {
                console.log('✅ Found common female voice:', preferredVoice.name);
              } else {
                // Last resort: Find ANY English voice that's NOT male (will be verified later)
                const nonMaleVoices = voices.filter(v =>
                  v.lang.includes('en') &&
                  !maleVoiceKeywords.some(keyword => v.name.toLowerCase().includes(keyword))
                );

                if (nonMaleVoices.length > 0) {
                  preferredVoice = nonMaleVoices[0];
                  console.warn('⚠️ Using non-male voice as last resort:', preferredVoice.name);
                  console.warn('   Note: This voice may not be explicitly female, but it is not male');
                } else {
                  console.error('❌ No suitable female voice found!');
                  console.error('Available voices:', voices.map(v => `${v.name} (${v.lang})`));
                  preferredVoice = null;
                }
              }
            }
          }
        }
      }
    } else {
      // Priority 1: Indian English male voices
      preferredVoice =
        voices.find(
          (voice) =>
            (voice.lang === 'en' || voice.lang.includes('en')) &&
            (voice.name.toLowerCase().includes('male') ||
              voice.name.toLowerCase().includes('india') ||
              voice.name.toLowerCase().includes('ravi') ||
              voice.name.toLowerCase().includes('ajay') ||
              voice.name.toLowerCase().includes('kiran') ||
              voice.name.toLowerCase().includes('arjun'))
        ) ||
        // Priority 2: Any Indian English voice (prefer lower-pitched ones for male)
        voices.find((voice) =>
          (voice.lang === 'en' || voice.lang.includes('en')) &&
          !voice.name.toLowerCase().includes('female')
        ) ||
        // Priority 3: Natural-sounding male English voices
        voices.find(
          (voice) =>
            voice.lang.includes('en') &&
            (voice.name.toLowerCase().includes('male') ||
              voice.name.toLowerCase().includes('david') ||
              voice.name.toLowerCase().includes('mark') ||
              voice.name.toLowerCase().includes('richard') ||
              voice.name.toLowerCase().includes('james') ||
              voice.name.toLowerCase().includes('ravi') ||
              voice.name.toLowerCase().includes('google uk english male') ||
              voice.name.toLowerCase().includes('microsoft david') ||
              (voice.name.toLowerCase().includes('natural') && voice.name.toLowerCase().includes('male')))
        ) ||
        // Priority 4: Any English voice that's not explicitly female
        voices.find((voice) =>
          voice.lang.includes('en') &&
          !voice.name.toLowerCase().includes('female') &&
          !voice.name.toLowerCase().includes('zira') &&
          !voice.name.toLowerCase().includes('samantha')
        ) ||
        // Priority 5: First available English voice
        voices.find((voice) => voice.lang.includes('en')) ||
        voices[0];
    }

    // Final verification: if female is requested, double-check it's not a male voice
    if (preferredVoice && voiceType === 'female') {
      const voiceNameLower = preferredVoice.name.toLowerCase();
      const maleKeywords = ['male', 'david', 'mark', 'richard', 'james', 'ravi', 'ajay', 'kiran', 'arjun', 'tom', 'daniel', 'michael', 'thomas', 'john', 'paul', 'mike'];

      if (maleKeywords.some(keyword => voiceNameLower.includes(keyword))) {
        console.error('❌ ERROR: Selected voice appears to be MALE:', preferredVoice.name);
        console.log('   Rejecting this voice and searching for a different one...');

        // Try to find a different voice
        const alternativeVoice = voices.find((voice) => {
          const name = voice.name.toLowerCase();
          return voice.lang.includes('en') &&
            !maleKeywords.some(k => name.includes(k)) &&
            (name.includes('female') ||
              name.includes('zira') ||
              name.includes('samantha') ||
              name.includes('karen') ||
              name.includes('susan') ||
              name.includes('victoria') ||
              name.includes('linda'));
        });

        if (alternativeVoice) {
          preferredVoice = alternativeVoice;
          console.log('✅ Found alternative female voice:', preferredVoice.name);
        } else {
          console.error('❌ Could not find a suitable female voice. Available voices:', voices.map(v => v.name));
          preferredVoice = null;
        }
      }
    }

    if (preferredVoice) {
      utterance.voice = preferredVoice;
      utterance.lang = preferredVoice.lang; // Use the voice's language
      console.log(`✅ Using voice: ${preferredVoice.name} (${preferredVoice.lang}) for ${voiceType}`);
      console.log(`   Voice settings: rate=${utterance.rate}, pitch=${utterance.pitch}, volume=${utterance.volume}`);

      // Final confirmation
      if (voiceType === 'female') {
        const isFemale = !['male', 'david', 'mark', 'richard', 'james', 'ravi', 'ajay', 'kiran', 'arjun', 'tom', 'daniel'].some(k =>
          preferredVoice!.name.toLowerCase().includes(k)
        );
        if (!isFemale) {
          console.error('❌ WARNING: Selected voice may not be female!');
        } else {
          console.log('✅ Confirmed: Voice appears to be female');
        }
      }
    } else {
      console.error('❌ No suitable voice found!');
      console.log('Available voices:', voices.map(v => `${v.name} (${v.lang})`));
      // Don't set a default if we can't find the right gender - it's better to fail than use wrong voice
      console.error('❌ Refusing to use wrong gender voice. Please check available voices.');
      return; // Don't speak if we can't find the right voice
    }

    // Set up event handlers
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

    // Verify voice is set before speaking
    if (!utterance.voice && preferredVoice) {
      console.warn('⚠️ Voice not set, attempting to set it again...');
      utterance.voice = preferredVoice;
    }

    // Speak the text
    if (synthRef.current) {
      if (utterance.voice) {
        console.log('🎤 Speaking with voice:', utterance.voice.name);
        synthRef.current.speak(utterance);
      } else {
        console.error('❌ Cannot speak: No voice is set!');
        console.log('Available voices:', voices.map(v => `${v.name} (${v.lang})`));
      }
    }
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

