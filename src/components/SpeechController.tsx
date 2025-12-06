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
            setTimeout(waitForVoices, 100);
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
    utterance.rate = 0.90; // Slightly slower for natural, clear speech (human-like pace)
    utterance.pitch = voiceType === 'male' ? 0.90 : 1.05; // More natural pitch range (closer to human voices)
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
      
      // Common male voice names to exclude
      const maleVoiceKeywords = [
        'male', 'david', 'mark', 'richard', 'james', 'ravi', 'ajay',
        'kiran', 'arjun', 'tom', 'daniel', 'alex', 'google uk english male',
        'microsoft david', 'siri male'
      ];
      
      // Priority 1: Indian English female voices
      preferredVoice = voices.find(
        (voice) =>
          (voice.lang === 'en-IN' || voice.lang.includes('en-IN')) &&
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
                // Last resort: any English voice
                preferredVoice = voices.find((voice) => voice.lang.includes('en')) || voices[0] || null;
                console.warn('⚠️ Using fallback voice (may not be female):', preferredVoice?.name);
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
            (voice.lang === 'en-IN' || voice.lang.includes('en-IN')) &&
            (voice.name.toLowerCase().includes('male') ||
             voice.name.toLowerCase().includes('india') ||
             voice.name.toLowerCase().includes('ravi') ||
             voice.name.toLowerCase().includes('ajay') ||
             voice.name.toLowerCase().includes('kiran') ||
             voice.name.toLowerCase().includes('arjun'))
        ) ||
        // Priority 2: Any Indian English voice (prefer lower-pitched ones for male)
        voices.find((voice) => 
          (voice.lang === 'en-IN' || voice.lang.includes('en-IN')) &&
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

    if (preferredVoice) {
      utterance.voice = preferredVoice;
      utterance.lang = preferredVoice.lang; // Use the voice's language
      console.log(`✅ Using voice: ${preferredVoice.name} (${preferredVoice.lang}) for ${voiceType}`);
      console.log(`   Voice settings: rate=${utterance.rate}, pitch=${utterance.pitch}, volume=${utterance.volume}`);
      console.log(`   Voice object:`, preferredVoice);
    } else {
      console.error('❌ No suitable voice found!');
      console.log('Available voices:', voices.map(v => `${v.name} (${v.lang})`));
      // Try to set a reasonable default
      const defaultVoice = voices.find(v => v.lang.includes('en')) || voices[0];
      if (defaultVoice) {
        utterance.voice = defaultVoice;
        utterance.lang = defaultVoice.lang;
        console.warn(`⚠️ Fallback to: ${defaultVoice.name} (${defaultVoice.lang})`);
      } else {
        console.error('❌ No voices available at all!');
      }
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

