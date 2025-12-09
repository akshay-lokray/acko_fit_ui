import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { io, Socket } from "socket.io-client";
import {
  MessageSquare,
  Zap,
  Send,
  CheckCircle2,
  Compass,
  Utensils,
  Dumbbell,
  Camera,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { useUserProfileStore } from "@/store/userProfileStore";
import AvatarScene from "@/components/AvatarScene";
import type { VoiceType } from "@/types/voice";
import "@/pages/HomePage.css";

// Type definitions for Speech Recognition API
interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
}

interface SpeechRecognitionEvent {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

// --- Types ---
interface Message {
  id: string;
  sender: "user" | "coach";
  text: string;
}

interface Goal {
  id: string;
  title: string;
  detail: string;
  progress: number;
  xp: number;
}

const SAMPLE_GOALS: Goal[] = [
  {
    id: "hydration",
    title: "Hydration streak",
    detail: "Stay above 2.5L for 3 days",
    progress: 72,
    xp: 120,
  },
  {
    id: "strength",
    title: "Strength focus",
    detail: "4 strength sessions this week",
    progress: 45,
    xp: 80,
  },
  {
    id: "mindset",
    title: "Mindset clarity",
    detail: "Journal for 10 min daily",
    progress: 30,
    xp: 60,
  },
];

const HARD_CODED_USER_ID = "9795784244";

// --- Mock Data ---

export function HomePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { formData: profile, updateFormData } = useUserProfileStore();
  const fetchedUserRef = useRef<string | null>(null);
  const goalStateRef = useRef<{ userId: string | null; hits: Set<string> }>({
    userId: null,
    hits: new Set(),
  });
  const routeFormData = location.state?.formData || {};
  // Safe access to formData with defaults
  const gender = profile.gender || routeFormData.gender || "female";
  const name = profile.name || routeFormData.name || "Traveller";
  const coachName = gender === "male" ? "Dhoni" : "Disha";

  // State
  const [activeTab, setActiveTab] = useState<"goals" | "explore" | "Chat">(
    "goals"
  );
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      sender: "coach",
      text: `Welcome back, ${name}. Ready to conquer today's mission?`,
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isHabitApiLoading, setHabitApiLoading] = useState(false);
  const xp = profile.xp ?? routeFormData.xp ?? 350;
  const [habitStats, setHabitStats] = useState<{
    calorie?: number;
    water?: number;
    steps?: number;
  }>({});

  const levelingXp = 1000;
  const level = 1;
  const stageProgress = {
    currentStage: "Novice",
    targetStage: "Warrior",
    progress: 58,
  };

  const fetchUserProfile = async (userId: string) => {
    try {
      const res = await fetch(`/api/users/${encodeURIComponent(userId)}`);
      if (!res.ok) return;
      const data = await res.json();
      updateFormData(data);
    } catch (e) {
      console.error("Failed to fetch user profile", e);
    }
  };

  const awardXp = async (delta: number) => {
    try {
      // Get phone number from localStorage
      const phoneNumber = localStorage.getItem("userPhone");
      if (!phoneNumber) {
        console.warn("No phone number found in localStorage");
        return;
      }
      const res = await fetch(
        `/api/users/${encodeURIComponent(phoneNumber)}/xp?delta=${delta}`,
        {
          method: "POST",
        }
      );
      if (!res.ok) return;
      await fetchUserProfile(); // refresh xp
    } catch (e) {
      console.error("Failed to award XP", e);
    }
  };

  // Fetch user profile on mount
  useEffect(() => {
    if (fetchedUserRef.current === HARD_CODED_USER_ID) return;
    fetchedUserRef.current = HARD_CODED_USER_ID;
    fetchUserProfile(HARD_CODED_USER_ID);
  }, [fetchUserProfile]);

  // Fetch daily habit stats on mount
  useEffect(() => {
    const userId = profile.mobile || routeFormData.mobile || "";
    if (!userId) return;

    const fetchHabits = async () => {
      try {
        const res = await fetch(
          `/api/habits/daily/batch?userId=${encodeURIComponent(
            userId
          )}&habits=water,calorie,steps`
        );
        if (!res.ok) return;
        const data = await res.json();
        const calorie = data?.calorie ?? {};
        const water = data?.water ?? {};
        const steps = data?.steps ?? {};

        const parseTotals = (
          totals: Record<string, unknown> | null | undefined
        ) => {
          if (!totals || typeof totals !== "object") return undefined;
          const firstKey = Object.keys(totals)[0];
          const val = totals[firstKey];
          return Number(val ?? 0) || 0;
        };

        setHabitStats({
          calorie: parseTotals(calorie.totals),
          water: parseTotals(water.totals),
          steps: parseTotals(steps.totals),
        });
      } catch (e) {
        console.error("Failed to fetch habit stats", e);
      }
    };

    fetchHabits();
  }, [profile.mobile, routeFormData.mobile]);

  // Award XP when goals are reached (once per goal per user)
  useEffect(() => {
    const phoneNumber = localStorage.getItem("userPhone");
    if (!phoneNumber) return;

    // Reset goal state when user changes
    if (goalStateRef.current.userId !== phoneNumber) {
      goalStateRef.current = { userId: phoneNumber, hits: new Set() };
    }

    const goals = [
      {
        key: "steps",
        hit: habitStats.steps != null && habitStats.steps >= 5000,
        xp: 100,
      },
      {
        key: "water",
        hit: habitStats.water != null && habitStats.water >= 3000,
        xp: 50,
      },
    ];

    let delta = 0;
    goals.forEach(({ key, hit, xp }) => {
      const marker = `${phoneNumber}:${key}`;
      const alreadyHit = goalStateRef.current.hits.has(marker);

      // If goal is already achieved before this render, only award when transitioning from not-hit -> hit
      if (hit && !alreadyHit) {
        goalStateRef.current.hits.add(marker);
        delta += xp;
      }

      // If not hit, ensure we don't accidentally award next time without a transition
      if (!hit && alreadyHit) {
        goalStateRef.current.hits.delete(marker);
      }
    });

    if (delta > 0) {
      awardXp(delta);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [habitStats]);

  // Determining "Persona" styles
  const isMale = gender === "male";

  const [isListening, setIsListening] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const SOCKET_URL = "http://192.168.233.159:5000";
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const recognitionResultRef = useRef<string>("");
  const wakeWordRecognitionRef = useRef<SpeechRecognition | null>(null);
  const maxListeningTimeoutRef = useRef<number | null>(null);
  const silenceTimeoutRef = useRef<number | null>(null);
  const lastSpeechTimeRef = useRef<number>(0);
  const silenceMonitorRef = useRef<number | null>(null);
  const speechSynthesisRef = useRef<SpeechSynthesisUtterance | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const SILENCE_TIMEOUT_MS = 3000;

  // Function to play audio feedback - start listening sound
  const playStartSound = useCallback(() => {
    try {
      // Create AudioContext if it doesn't exist
      if (!audioContextRef.current) {
        const AudioContextClass =
          window.AudioContext ||
          (
            window as unknown as {
              webkitAudioContext?: { new (): AudioContext };
            }
          ).webkitAudioContext;
        if (AudioContextClass) {
          audioContextRef.current = new AudioContextClass();
        } else {
          console.warn("Web Audio API not supported");
          return;
        }
      }
      const audioContext = audioContextRef.current;

      // Create a pleasant start sound (higher pitch, shorter)
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      // Configure the sound
      oscillator.frequency.value = 800; // Higher pitch for start
      oscillator.type = "sine"; // Smooth sine wave

      // Envelope: quick fade in, then fade out
      const now = audioContext.currentTime;
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.3, now + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

      oscillator.start(now);
      oscillator.stop(now + 0.15);

      console.log("🔊 Played start listening sound");
    } catch (error) {
      console.warn("Failed to play start sound:", error);
    }
  }, []);

  // Function to play audio feedback - end listening sound
  const playEndSound = useCallback(() => {
    try {
      // Create AudioContext if it doesn't exist
      if (!audioContextRef.current) {
        const AudioContextClass =
          window.AudioContext ||
          (
            window as unknown as {
              webkitAudioContext?: { new (): AudioContext };
            }
          ).webkitAudioContext;
        if (AudioContextClass) {
          audioContextRef.current = new AudioContextClass();
        } else {
          console.warn("Web Audio API not supported");
          return;
        }
      }
      const audioContext = audioContextRef.current;

      // Create a pleasant end sound (lower pitch, slightly longer)
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      // Configure the sound
      oscillator.frequency.value = 600; // Lower pitch for end
      oscillator.type = "sine"; // Smooth sine wave

      // Envelope: quick fade in, then fade out
      const now = audioContext.currentTime;
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.3, now + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

      oscillator.start(now);
      oscillator.stop(now + 0.2);

      console.log("🔊 Played end listening sound");
    } catch (error) {
      console.warn("Failed to play end sound:", error);
    }
  }, []);

  // Function to speak text using browser's Speech Synthesis API
  const speakText = useCallback(
    (text: string) => {
      if (!text || !text.trim()) {
        return;
      }

      // Check if Speech Synthesis is available
      if (!("speechSynthesis" in window)) {
        console.warn("Speech synthesis not supported in this browser");
        return;
      }

      // Cancel any ongoing speech
      if (speechSynthesisRef.current) {
        window.speechSynthesis.cancel();
      }

      try {
        const utterance = new SpeechSynthesisUtterance(text);
        speechSynthesisRef.current = utterance;

        // Configure voice based on gender
        utterance.lang = "en-US";
        utterance.rate = 1.0; // Normal speed
        utterance.pitch = isMale ? 0.8 : 1.2; // Lower pitch for male, higher for female
        utterance.volume = 1.0; // Full volume

        // Try to select appropriate voice based on gender
        const voices = window.speechSynthesis.getVoices();
        if (voices.length > 0) {
          // Prefer voices that match the gender
          const preferredVoices = voices.filter((voice) => {
            const voiceName = voice.name.toLowerCase();
            if (isMale) {
              // Prefer male-sounding voices
              return (
                voiceName.includes("male") ||
                voiceName.includes("david") ||
                voiceName.includes("daniel") ||
                voiceName.includes("alex") ||
                voice.lang.startsWith("en")
              );
            } else {
              // Prefer female-sounding voices
              return (
                voiceName.includes("female") ||
                voiceName.includes("samantha") ||
                voiceName.includes("susan") ||
                voiceName.includes("karen") ||
                voiceName.includes("victoria") ||
                voice.lang.startsWith("en")
              );
            }
          });

          if (preferredVoices.length > 0) {
            utterance.voice = preferredVoices[0];
          } else if (voices.length > 0) {
            // Fallback to any English voice
            const englishVoices = voices.filter((v) => v.lang.startsWith("en"));
            if (englishVoices.length > 0) {
              utterance.voice = englishVoices[0];
            }
          }
        }

        // Handle speech events
        utterance.onstart = () => {
          console.log("🔊 Started speaking response");
        };

        utterance.onend = () => {
          console.log("🔊 Finished speaking response");
          speechSynthesisRef.current = null;
        };

        utterance.onerror = (event) => {
          console.error("❌ Speech synthesis error:", event.error);
          speechSynthesisRef.current = null;
        };

        // Speak the text
        window.speechSynthesis.speak(utterance);
        console.log("🔊 Speaking response:", text.substring(0, 50) + "...");
      } catch (error) {
        console.error("Failed to speak text:", error);
      }
    },
    [isMale]
  );

  // Load voices when they become available
  useEffect(() => {
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        console.log("🔊 Available voices loaded:", voices.length);
      }
    };

    // Voices might be loaded asynchronously
    if (window.speechSynthesis.getVoices().length > 0) {
      loadVoices();
    } else {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }

    return () => {
      // Cleanup: cancel any ongoing speech when component unmounts
      if (speechSynthesisRef.current) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Handle audio response from server
  const handleAudioResponse = async (
    data:
      | Blob
      | ArrayBuffer
      | string
      | { data?: string; type?: string; [key: string]: unknown }
  ) => {
    try {
      let audioBlob: Blob | null = null;

      if (data instanceof Blob) {
        audioBlob = data;
      } else if (data instanceof ArrayBuffer) {
        audioBlob = new Blob([data], { type: "audio/wav" });
      } else if (
        typeof data === "object" &&
        data !== null &&
        "data" in data &&
        typeof data.data === "string"
      ) {
        // Base64 encoded audio
        const binaryString = atob(data.data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        audioBlob = new Blob([bytes], {
          type: (data.type as string) || "audio/wav",
        });
      } else if (typeof data === "string") {
        // Try to parse as base64
        try {
          const binaryString = atob(data);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          audioBlob = new Blob([bytes], { type: "audio/wav" });
        } catch {
          console.log("Response is text, not audio:", data);
          return;
        }
      }

      if (audioBlob) {
        console.log(
          "🔊 Playing audio response, size:",
          audioBlob.size,
          "type:",
          audioBlob.type
        );
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        audio.play().catch((error) => {
          console.error("Failed to play audio:", error);
        });
        audio.onended = () => {
          URL.revokeObjectURL(audioUrl);
        };
      }
    } catch (error) {
      console.error("Error handling audio response:", error);
    }
  };

  useEffect(() => {
    const socket = io(SOCKET_URL, {
      transports: ["websocket", "polling"], // Prefer websocket, fallback to polling
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: Infinity,
      timeout: 20000,
      forceNew: false,
      withCredentials: false,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("✅ Socket.IO connected:", SOCKET_URL);
      console.log("Transport:", socket.io.engine.transport.name);
      // Send connection message if needed
      try {
        socket.emit("connect", { type: "connect" });
      } catch (e) {
        console.warn("Socket.IO connect event send failed", e);
      }
    });

    socket.on("connect_error", (error) => {
      console.error("❌ Socket.IO connection error:", {
        error: error.message,
        description: error.toString(),
        url: SOCKET_URL,
        connected: socket.connected,
      });
    });

    socket.on("error", (error) => {
      console.error("❌ Socket.IO error:", {
        error,
        url: SOCKET_URL,
        connected: socket.connected,
      });
    });

    socket.on("message", (data) => {
      let text = "";
      try {
        if (typeof data === "string") {
          const parsed = JSON.parse(data);
          text = parsed.text ?? String(data);
        } else if (typeof data === "object" && data !== null) {
          text = data.text ?? JSON.stringify(data);
        } else {
          text = String(data);
        }
      } catch {
        text = String(data);
      }
      const coachMsg: Message = {
        id: Date.now().toString(),
        sender: "coach",
        text,
      };
      setMessages((prev) => [...prev, coachMsg]);
      setIsListening(false);
    });

    // Listen for 'response' event from server
    socket.on("response", (data) => {
      console.log("📥 Received response event:", data);

      // Check if it's audio/media data
      if (
        data instanceof Blob ||
        data instanceof ArrayBuffer ||
        (typeof data === "object" && data !== null && data?.type === "audio")
      ) {
        console.log("🎵 Received audio data:", data);
        handleAudioResponse(data);
        return;
      }

      // Handle text response - format: {'text': response_text}
      let responseText = "";
      try {
        if (typeof data === "string") {
          // Try to parse as JSON first
          try {
            const parsed = JSON.parse(data);
            responseText = parsed.text || String(data);
          } catch {
            // If not JSON, use as plain text
            responseText = data;
          }
        } else if (typeof data === "object" && data !== null) {
          // Extract text from response object - format: {'text': response_text}
          responseText = data.text || String(data);
        } else {
          responseText = String(data);
        }
      } catch (error) {
        console.error("Error parsing response:", error);
        responseText = String(data);
      }

      // Print the response text
      console.log("📝 Response text:", responseText);

      // Add message to chat
      const coachMsg: Message = {
        id: Date.now().toString(),
        sender: "coach",
        text: responseText,
      };
      setMessages((prev) => [...prev, coachMsg]);
      setIsListening(false);

      // Speak the response using text-to-speech
      speakText(responseText);
    });

    // Listen for audio data specifically
    socket.on("audio", (data) => {
      console.log("🎵 Received audio event:", data);
      handleAudioResponse(data);
    });

    // Listen for binary audio data
    socket.on("audio_chunk", (data) => {
      console.log("🎵 Received audio chunk:", data);
      handleAudioResponse(data);
    });

    socket.on("disconnect", (reason) => {
      console.log("🔌 Socket.IO disconnected:", {
        reason,
        connected: socket.connected,
      });
      if (reason === "io server disconnect") {
        // Server disconnected the socket, need to manually reconnect
        socket.connect();
      }
    });

    // Log reconnection attempts
    socket.on("reconnect_attempt", (attemptNumber) => {
      console.log("🔄 Socket.IO reconnection attempt:", attemptNumber);
    });

    socket.on("reconnect", (attemptNumber) => {
      console.log("✅ Socket.IO reconnected after", attemptNumber, "attempts");
    });

    socket.on("reconnect_failed", () => {
      console.error("❌ Socket.IO reconnection failed");
    });

    return () => {
      if (socket) {
        try {
          socket.emit("disconnect", { type: "disconnect" });
        } catch (e) {
          console.warn("Socket.IO disconnect event send failed", e);
        }
        socket.disconnect();
      }
      socketRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [SOCKET_URL]);

  // Helper function to stop listening and send the result
  const clearSilenceMonitor = useCallback(() => {
    if (silenceMonitorRef.current) {
      window.clearInterval(silenceMonitorRef.current);
      silenceMonitorRef.current = null;
    }
  }, []);

  const stopListeningAndSend = useCallback(() => {
    const socket = socketRef.current;
    setIsListening(false);

    clearSilenceMonitor();

    // Play end sound to indicate listening has stopped
    playEndSound();

    // Clear all timeouts
    if (maxListeningTimeoutRef.current) {
      window.clearTimeout(maxListeningTimeoutRef.current);
      maxListeningTimeoutRef.current = null;
    }
    if (silenceTimeoutRef.current) {
      window.clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = null;
    }

    if (recognitionRef.current) {
      const recognition = recognitionRef.current;

      // Remove all event handlers first to prevent them from firing
      recognition.onend = null;
      recognition.onerror = null;
      recognition.onresult = null;

      // Clear ref to prevent handlers from restarting
      recognitionRef.current = null;

      try {
        // Use stop() for graceful stop (abort() triggers error events)
        recognition.stop();
      } catch {
        // If stop fails, try abort
        try {
          recognition.abort();
        } catch {
          // Ignore errors when stopping
        }
      }
    }

    // Send the transcribed text if available
    if (recognitionResultRef.current.trim() && socket && socket.connected) {
      const avatar = isMale ? "Dhoni" : "Disha";
      const payload = {
        event: "process_audio",
        data: {
          text: recognitionResultRef.current.trim(),
          user_id: "user123", // You can change this to use actual user ID
          avatar: avatar,
        },
      };

      console.log("📤 Sending transcribed text:", payload);

      socket.emit("process_audio", payload);
      recognitionResultRef.current = "";
    }
  }, [isMale, playEndSound, clearSilenceMonitor]);

  const startSilenceMonitor = useCallback(() => {
    clearSilenceMonitor();
    silenceMonitorRef.current = window.setInterval(() => {
      const idle = Date.now() - lastSpeechTimeRef.current;
      if (idle >= SILENCE_TIMEOUT_MS) {
        console.log("🔇 Silence monitor triggered, stopping recognition");
        stopListeningAndSend();
      }
    }, 400);
  }, [clearSilenceMonitor, stopListeningAndSend]);

  // Voice input handler - wrapped in useCallback for use in wake word detection
  const handleVoiceInput = useCallback(() => {
    // Check if SpeechRecognition is available
    const SpeechRecognition =
      (
        window as unknown as {
          SpeechRecognition?: { new (): SpeechRecognition };
        }
      ).SpeechRecognition ||
      (
        window as unknown as {
          webkitSpeechRecognition?: { new (): SpeechRecognition };
        }
      ).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert(
        "Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari."
      );
      return;
    }

    // If already listening, stop recognition manually
    if (isListening) {
      stopListeningAndSend();
      return;
    }

    // Ensure any previous recognition is fully cleaned up
    if (recognitionRef.current) {
      try {
        const oldRecognition = recognitionRef.current;
        // Remove all event handlers to prevent conflicts
        oldRecognition.onend = null;
        oldRecognition.onerror = null;
        oldRecognition.onresult = null;
        oldRecognition.stop();
      } catch {
        // Ignore errors when cleaning up
      }
      recognitionRef.current = null;
    }

    // Small delay to ensure previous recognition is fully stopped
    setTimeout(() => {
      // Double-check we're still not listening (user might have clicked again)
      if (isListening) {
        return;
      }

      // Start speech recognition
      try {
        const recognition = new SpeechRecognition();
        recognitionRef.current = recognition;

        // Configure recognition
        recognition.continuous = true; // Keep listening until stopped
        recognition.interimResults = true; // Show interim results
        recognition.lang = "en-US"; // Set language (you can make this configurable)

        // Constants for timeout management
        const MAX_LISTENING_TIME = 35000; // 35 seconds maximum
        const SILENCE_TIMEOUT = 3000; // 3 seconds of silence to auto-stop

        // Set maximum listening time (35 seconds)
        maxListeningTimeoutRef.current = window.setTimeout(() => {
          console.log("⏱️ Maximum listening time reached (35s), stopping...");
          stopListeningAndSend();
        }, MAX_LISTENING_TIME);

        // Track speech activity
        lastSpeechTimeRef.current = Date.now();

        // Function to reset silence timeout
        const resetSilenceTimeout = () => {
          if (silenceTimeoutRef.current) {
            window.clearTimeout(silenceTimeoutRef.current);
          }
          silenceTimeoutRef.current = window.setTimeout(() => {
            const timeSinceLastSpeech = Date.now() - lastSpeechTimeRef.current;
            if (timeSinceLastSpeech >= SILENCE_TIMEOUT && isListening) {
              console.log("🔇 Silence detected for 3s, stopping...");
              stopListeningAndSend();
            }
          }, SILENCE_TIMEOUT);
        };

        // Handle recognition results
        recognition.onresult = (event: SpeechRecognitionEvent) => {
          let interimTranscript = "";
          let finalTranscript = "";

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscript += transcript + " ";
            } else {
              interimTranscript += transcript;
            }
          }

          // Update the result
          if (finalTranscript) {
            recognitionResultRef.current += finalTranscript;
            console.log("🎤 Final transcript:", finalTranscript);
            // Update last speech time when we get final results
            lastSpeechTimeRef.current = Date.now();
            // Reset silence timeout since we detected speech
            resetSilenceTimeout();
          }

          // Update last speech time for interim results too (user is still speaking)
          if (interimTranscript) {
            console.log("🎤 Interim transcript:", interimTranscript);
            lastSpeechTimeRef.current = Date.now();
            // Reset silence timeout since we detected speech
            resetSilenceTimeout();
          }
        };

        // Handle errors
        recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
          // Suppress "aborted" error - it's expected when we stop recognition
          if (event.error === "aborted") {
            // Silently handle aborted - it's intentional when stopping
            return;
          }

          // Log all errors with details
          console.log(`⚠️ Speech recognition error: ${event.error}`);

          // Log other errors
          if (event.error === "no-speech") {
            console.log("No speech detected, checking silence timeout...");
            // Don't stop immediately, let silence timeout handle it
          } else if (event.error === "audio-capture") {
            console.error("❌ Audio capture error - no microphone found");
            alert("No microphone found. Please check your microphone.");
            stopListeningAndSend();
          } else if (event.error === "not-allowed") {
            console.error("❌ Microphone access denied");
            alert("Microphone access denied. Please allow microphone access.");
            stopListeningAndSend();
          } else if (event.error === "network") {
            console.error("❌ Network error in speech recognition");
            // Try to restart if still listening
            if (isListening) {
              setTimeout(() => {
                if (isListening && recognitionRef.current === recognition) {
                  try {
                    console.log(
                      "🔄 Attempting to restart after network error..."
                    );
                    recognition.start();
                  } catch (error) {
                    console.error(
                      "Failed to restart after network error:",
                      error
                    );
                    stopListeningAndSend();
                  }
                }
              }, 500);
            }
          } else {
            // For other errors, log with details
            console.warn(
              `⚠️ Speech recognition error (non-critical): ${event.error}`,
              event
            );
          }
        };

        // Track when recognition started to prevent immediate restarts
        const recognitionStartTime = Date.now();
        const MIN_RECOGNITION_DURATION = 500; // Minimum 500ms before allowing restart

        // Handle when recognition ends
        recognition.onend = () => {
          const duration = Date.now() - recognitionStartTime;
          console.log(`🎤 Speech recognition ended (duration: ${duration}ms)`);

          // If recognition ended very quickly (< 500ms), it might be an error
          // Don't restart immediately in this case
          if (duration < MIN_RECOGNITION_DURATION) {
            console.warn(
              "⚠️ Recognition ended too quickly, might be an error. Not restarting."
            );
            // Check if we're still supposed to be listening
            if (isListening && recognitionRef.current === recognition) {
              // Wait a bit longer before trying to restart
              setTimeout(() => {
                if (isListening && recognitionRef.current === recognition) {
                  console.log(
                    "🔄 Attempting to restart recognition after quick end..."
                  );
                  try {
                    recognition.start();
                  } catch (error) {
                    console.error(
                      "Failed to restart recognition after quick end:",
                      error
                    );
                    stopListeningAndSend();
                  }
                }
              }, 1000); // Wait 1 second before restarting
            }
            return;
          }

          // Only restart if we're still supposed to be listening
          // and the recognition wasn't intentionally stopped
          if (isListening && recognitionRef.current === recognition) {
            console.log("🔄 Recognition ended normally, restarting...");
            // Small delay before restarting to avoid conflicts
            setTimeout(() => {
              if (isListening && recognitionRef.current === recognition) {
                try {
                  recognition.start();
                } catch (error) {
                  console.error("Failed to restart recognition:", error);
                  // If restart fails, stop listening
                  if (
                    error instanceof Error &&
                    error.message.includes("already started")
                  ) {
                    // Recognition might already be running, ignore
                    return;
                  }
                  stopListeningAndSend();
                }
              }
            }, 100);
          } else {
            console.log(
              "✅ Recognition ended and we're no longer listening (expected)"
            );
          }
        };

        // Start recognition
        recognition.start();
        setIsListening(true);
        recognitionResultRef.current = "";
        lastSpeechTimeRef.current = Date.now();
        startSilenceMonitor();

        // Play start sound to indicate listening has started
        playStartSound();

        // Start silence detection
        resetSilenceTimeout();

        console.log(
          "🎤 Started speech recognition (max 35s, auto-stop after 3s silence)"
        );
      } catch (error) {
        console.error("Failed to start speech recognition:", error);
        setIsListening(false);
        alert(
          "Failed to start speech recognition. Please check your microphone permissions."
        );
      }
    }, 100); // Small delay to ensure previous recognition is fully stopped
  }, [isListening, stopListeningAndSend, playStartSound]);

  // Wake word listener - listens for "okay Dhoni" or "ok Disha"
  useEffect(() => {
    const SpeechRecognition =
      (
        window as unknown as {
          SpeechRecognition?: { new (): SpeechRecognition };
        }
      ).SpeechRecognition ||
      (
        window as unknown as {
          webkitSpeechRecognition?: { new (): SpeechRecognition };
        }
      ).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.warn("Speech recognition not available for wake word detection");
      return;
    }

    // Don't start wake word detection if already listening
    if (isListening) {
      return;
    }

    let wakeWordRecognition: SpeechRecognition | null = null;

    const startWakeWordDetection = () => {
      try {
        wakeWordRecognition = new SpeechRecognition();
        wakeWordRecognitionRef.current = wakeWordRecognition;

        // Configure for wake word detection
        wakeWordRecognition.continuous = true;
        wakeWordRecognition.interimResults = true;
        wakeWordRecognition.lang = "en-US";

        // Define wake words based on coach gender
        const wakeWords = isMale
          ? ["okay Dhoni", "ok Dhoni", "hey Dhoni", "Dhoni"]
          : ["okay Disha", "ok Disha", "hey Disha", "Disha"];

        wakeWordRecognition.onresult = (event: SpeechRecognitionEvent) => {
          // Don't process if already listening
          if (isListening) {
            return;
          }

          let transcript = "";
          for (let i = event.resultIndex; i < event.results.length; i++) {
            transcript += event.results[i][0].transcript.toLowerCase() + " ";
          }

          // Check if any wake word is detected
          const detected = wakeWords.some((wakeWord) =>
            transcript.includes(wakeWord.toLowerCase())
          );

          if (detected && !isListening) {
            console.log("🔔 Wake word detected:", transcript.trim());
            // Stop wake word detection gracefully
            if (wakeWordRecognition) {
              // Clear ref first to prevent error handler from logging
              wakeWordRecognitionRef.current = null;
              try {
                // Use stop() for graceful stop (abort() triggers error events)
                wakeWordRecognition.stop();
              } catch {
                // If stop fails, try abort
                try {
                  wakeWordRecognition.abort();
                } catch {
                  // Ignore errors when stopping
                }
              }
            }
            // Small delay before starting main recognition to ensure cleanup
            setTimeout(() => {
              if (!isListening) {
                handleVoiceInput();
              }
            }, 50);
          }
        };

        wakeWordRecognition.onerror = (event: SpeechRecognitionErrorEvent) => {
          // Suppress "aborted" error - it's expected when we stop wake word detection
          if (event.error === "aborted") {
            // Silently handle aborted - it's intentional when stopping
            return;
          }
          // Ignore "no-speech" errors for wake word detection
          if (event.error === "no-speech") {
            return;
          }
          // Log other errors
          console.error("Wake word recognition error:", event.error);
        };

        wakeWordRecognition.onend = () => {
          // Only restart if:
          // 1. We're not currently listening (main recognition not active)
          // 2. The ref is null (meaning it was intentionally stopped, not just ended)
          if (!isListening && wakeWordRecognitionRef.current === null) {
            // Add a delay to avoid rapid restart loops
            setTimeout(() => {
              // Double-check state before restarting
              if (!isListening && wakeWordRecognitionRef.current === null) {
                startWakeWordDetection();
              }
            }, 200);
          }
        };

        wakeWordRecognition.start();
        console.log(
          `👂 Wake word detection started. Listening for: ${wakeWords.join(
            ", "
          )}`
        );
      } catch (error) {
        console.error("Failed to start wake word detection:", error);
      }
    };

    // Start wake word detection
    startWakeWordDetection();

    return () => {
      if (wakeWordRecognition) {
        // Clear ref first to prevent error handler from logging
        wakeWordRecognitionRef.current = null;
        try {
          wakeWordRecognition.stop();
        } catch {
          try {
            wakeWordRecognition.abort();
          } catch {
            // Ignore errors during cleanup
          }
        }
      }
    };
  }, [isListening, isMale, handleVoiceInput]);

  // Helper: Chat Response Logic (Mock Narrative AI)
  const messageListRef = useRef<HTMLDivElement | null>(null);

  const sendHabitAssistMessage = useCallback(
    async (message: string) => {
      const userId =
        profile.userId ??
        profile.mobile ??
        routeFormData.userId ??
        routeFormData.mobile ??
        "783482642";
      try {
        const body = new URLSearchParams();
        body.append("userId", userId);
        body.append("message", message);
        const response = await fetch(
          "http://192.168.237.53:8080/api/habits/ai-assist",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body,
          }
        );

        if (!response.ok) {
          console.error("Habit assist API error", response.status);
          return "";
        }
        const data = await response.json();
        return data?.reply ?? "";
      } catch (error) {
        console.error("Habit assist request failed", error);
        return "";
      }
    },
    [profile, routeFormData]
  );

  const handleSendMessage = (textOverride?: string) => {
    const textToSend = textOverride || inputValue;
    if (!textToSend.trim()) return;

    // User message
    const userMsg: Message = {
      id: Date.now().toString(),
      sender: "user",
      text: textToSend,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInputValue("");
    const sendFallbackCoachResponse = () => {
      let responseText = "";
      if (isMale) {
        responseText =
          "Copy that. Stay focused on the objective. We don't stop when we're tired, we stop when we're done.";
      } else {
        responseText =
          "Interesting data point. My analysis suggests keeping your hydration up will optimize your recovery today.";
      }
      const coachMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: "coach",
        text: responseText,
      };
      setMessages((prev) => [...prev, coachMsg]);
    };

    const socket = socketRef.current;
    if (socket && socket.connected) {
      const avatar = isMale ? "Dhoni" : "Disha";
      const payload = {
        event: "process_audio",
        data: {
          text: textToSend,
          user_id: "user123", // You can change this to use actual user ID
          avatar: avatar,
        },
      };
      try {
        console.log("📤 Sending chat message:", payload);
        socket.emit("process_audio", payload);
      } catch {
        sendFallbackCoachResponse();
      }
    } else {
      sendFallbackCoachResponse();
    }

    setHabitApiLoading(true);
    sendHabitAssistMessage(textToSend)
      .then((reply) => {
        if (reply) {
          const coachMsg: Message = {
            id: (Date.now() + 2).toString(),
            sender: "coach",
            text: reply,
          };
          setMessages((prev) => [...prev, coachMsg]);
          speakText(reply);
        }
      })
      .finally(() => setHabitApiLoading(false));
  };

  useEffect(() => {
    if (messageListRef.current) {
      messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
    }
  }, [messages, isHabitApiLoading]);

  return (
    <div className="h-screen bg-white font-sans flex flex-col overflow-hidden">
      {/* --- Top HUD (Head-Up Display) --- */}
      <header className="bg-white border-b border-gray-100 p-4 flex-shrink-0 z-50">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div
            className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => navigate("/profile")}
          >
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold bg-emerald-600">
              {level}
            </div>
            <div>
              <p className="text-xs text-gray-700 font-semibold">
                LEVEL {level} NOVICE
              </p>
              <div className="w-32 h-1.5 bg-gray-200 rounded-full mt-1">
                <div
                  className="h-full rounded-full bg-gray-300"
                  style={{ width: `${(xp / levelingXp) * 100}%` }}
                />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm font-medium text-gray-700">
            <div
              className="flex items-center gap-1.5 cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => navigate("/rewards")}
            >
              <Zap className="w-4 h-4 text-yellow-500 fill-yellow-500" />
              <span>{xp} XP</span>
            </div>
            <div
              className="flex items-center gap-1.5 cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => navigate("/rankings")}
            >
              <Shield className="w-4 h-4 text-blue-500" />
              <span>Warrior</span>
            </div>
          </div>
        </div>
      </header>

      {/* --- Main Content Area --- */}
      <main className="flex-1 relative overflow-hidden flex flex-col min-h-0">
        {/* Dynamic Background */}
        <div className="absolute inset-0 pointer-events-none z-0">
          <div className="absolute top-0 left-0 right-0 h-[40%] bg-gradient-to-b from-emerald-50/30 to-transparent" />
        </div>

        {/* Avatar Section - Fixed Height */}
        <div className="home-avatar-banner flex-shrink-0 relative z-10">
          <AvatarScene
            textToSpeak={
              messages[messages.length - 1].sender === "coach"
                ? messages[messages.length - 1].text
                : ""
            }
            voiceType={gender as VoiceType}
            isFullScreen={false}
          />
        </div>

        {/* 2. Interface Tabs (Chat / Explore / Chat) - Fills remaining space and scrolls */}
        <div className="flex-1 bg-white rounded-t-[2rem] relative z-20 flex flex-col min-h-0 overflow-hidden">
          {/* Tab Navigation */}
          <div className="flex border-b border-gray-100 bg-white">
            <button
              onClick={() => setActiveTab("goals")}
              className={`flex-1 py-4 text-sm font-medium flex items-center justify-center gap-2 transition-colors relative ${
                activeTab === "goals" ? "text-emerald-600" : "text-gray-400"
              }`}
            >
              <Zap className="w-4 h-4" /> Goals
              {activeTab === "goals" && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-600" />
              )}
            </button>
            <button
              onClick={() => setActiveTab("explore")}
              className={`flex-1 py-4 text-sm font-medium flex items-center justify-center gap-2 transition-colors relative ${
                activeTab === "explore" ? "text-emerald-600" : "text-gray-400"
              }`}
            >
              <Compass className="w-4 h-4" /> Explore
              {activeTab === "explore" && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-600" />
              )}
            </button>
            <button
              onClick={() => setActiveTab("Chat")}
              className={`flex-1 py-4 text-sm font-medium flex items-center justify-center gap-2 transition-colors relative ${
                activeTab === "Chat" ? "text-emerald-600" : "text-gray-400"
              }`}
            >
              <MessageSquare className="w-4 h-4" /> Chat
              {activeTab === "Chat" && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-600" />
              )}
            </button>
          </div>

          {/* Tab Content */}
          <div className="flex-1 flex flex-col overflow-y-auto bg-white px-4 md:px-6 pt-4 pb-0 min-h-0">
            {activeTab === "goals" && (
              <div className="flex-1 flex flex-col max-w-2xl mx-auto space-y-4 overflow-y-auto">
                <div className="bg-white rounded-2xl shadow-sm p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-wider text-gray-500">
                        Current stage
                      </p>
                      <p className="text-lg font-bold text-gray-900">
                        {stageProgress.currentStage}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs uppercase tracking-wider text-gray-500">
                        Target
                      </p>
                      <p className="text-lg font-bold text-gray-900">
                        {stageProgress.targetStage}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 relative h-2 rounded-full bg-gray-200">
                    <div
                      className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-emerald-500 to-green-400"
                      style={{ width: `${stageProgress.progress}%` }}
                    />
                  </div>
                  <div className="mt-2 flex justify-between text-xs text-gray-500">
                    <span>{stageProgress.progress}% progress</span>
                    <span>Next milestone ahead</span>
                  </div>
                  <div className="mt-4 text-xs text-gray-500">
                    <p>
                      Keep the streak going—Dhoni is watching the plan and
                      upgrading you soon.
                    </p>
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
                  <p className="text-sm text-gray-700">
                    Welcome back, {name.split(" ")[0]}. Ready to conquer today's
                    mission?
                  </p>
                </div>

                <div className="space-y-3">
                  {SAMPLE_GOALS.map((goal) => (
                    <div
                      key={goal.id}
                      className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-gray-900">
                            {goal.title}
                          </p>
                          <p className="text-xs text-gray-500">{goal.detail}</p>
                        </div>
                        <span className="text-xs font-semibold text-emerald-600">
                          +{goal.xp} XP
                        </span>
                      </div>
                      <div className="mt-3 h-2 rounded-full bg-gray-200">
                        <div
                          className="h-2 rounded-full bg-gradient-to-r from-emerald-500 to-green-400"
                          style={{ width: `${goal.progress}%` }}
                        />
                      </div>
                      <div className="mt-2 text-[10px] uppercase tracking-wider text-gray-500 flex justify-between">
                        <span>{goal.progress}% complete</span>
                        <span>{goal.detail}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Explore Tab replaced Map Tab */}
            {activeTab === "explore" && (
              <div className="flex-1 max-w-2xl mx-auto space-y-6 overflow-y-auto">
                <div className="grid grid-cols-2 gap-4">
                  <div
                    className="p-5 flex flex-col items-center justify-center gap-3 cursor-pointer hover:shadow-md transition-shadow bg-white rounded-2xl border border-gray-200 shadow-sm"
                    onClick={() => navigate("/recipes")}
                  >
                    <div className="w-14 h-14 bg-orange-100 rounded-full flex items-center justify-center text-orange-600">
                      <Utensils className="w-7 h-7" />
                    </div>
                    <span className="font-semibold text-gray-700 text-sm">
                      Recipes
                    </span>
                  </div>

                  <div
                    className="p-5 flex flex-col items-center justify-center gap-3 cursor-pointer hover:shadow-md transition-shadow bg-white rounded-2xl border border-gray-200 shadow-sm"
                    onClick={() => navigate("/workouts")}
                  >
                    <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                      <Dumbbell className="w-7 h-7" />
                    </div>
                    <span className="font-semibold text-gray-700 text-sm">
                      Workouts
                    </span>
                  </div>

                  <div
                    className="p-5 flex flex-col items-center justify-center gap-3 cursor-pointer hover:shadow-md transition-shadow bg-white rounded-2xl border border-gray-200 shadow-sm"
                    onClick={() => navigate("/tracker")}
                  >
                    <div className="w-14 h-14 bg-purple-100 rounded-full flex items-center justify-center text-purple-600">
                      <Camera className="w-7 h-7" />
                    </div>
                    <span className="font-semibold text-gray-700 text-sm">
                      Photo Track
                    </span>
                  </div>

                  <div
                    className="p-5 flex flex-col items-center justify-center gap-3 cursor-pointer hover:shadow-md transition-shadow bg-white rounded-2xl border border-gray-200 shadow-sm"
                    onClick={() => navigate("/habits")}
                  >
                    <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600">
                      <CheckCircle2 className="w-7 h-7" />
                    </div>
                    <span className="font-semibold text-gray-700 text-sm">
                      Habits
                    </span>
                  </div>

                  <div
                    className="p-5 flex flex-col items-center justify-center gap-3 cursor-pointer hover:shadow-md transition-shadow bg-white rounded-2xl border border-gray-200 shadow-sm"
                    onClick={() => navigate("/devices")}
                  >
                    <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                      <Zap className="w-7 h-7" />
                    </div>
                    <span className="font-semibold text-gray-700 text-sm">
                      Wearable Sync
                    </span>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-purple-600 to-emerald-600 rounded-2xl p-6 text-white shadow-lg">
                  <h3 className="font-bold text-lg mb-2">Weekly Challenge</h3>
                  <p className="opacity-90 text-sm mb-4">
                    Complete 3 workouts this week to unlock the "Iron Will"
                    badge.
                  </p>
                  <Progress value={33} className="h-2 bg-white/30" />
                  <p className="text-xs mt-2 font-medium">1/3 Completed</p>
                </div>
              </div>
            )}

            {/* Chat Tab */}
            {activeTab === "Chat" && (
              <div className="flex-1 flex flex-col max-w-2xl mx-auto min-h-0 w-full">
                <div
                  ref={messageListRef}
                  className="flex-1 min-h-0 space-y-4 overflow-y-auto pb-20"
                >
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${
                        msg.sender === "user" ? "justify-end" : "justify-start"
                      }`}
                    >
                      <div
                        className={`max-w-[80%] rounded-2xl p-4 text-sm ${
                          msg.sender === "user"
                            ? "bg-gray-900 text-white rounded-br-none"
                            : "bg-white border border-gray-200 shadow-sm text-gray-800 rounded-bl-none"
                        }`}
                      >
                        {msg.text}
                      </div>
                    </div>
                  ))}
                  {isHabitApiLoading && (
                    <div className="flex justify-start">
                      <div className="flex items-center gap-2 px-3 py-2 text-xs text-gray-500">
                        <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                        {coachName} is typing...
                      </div>
                    </div>
                  )}
                </div>

                {/* Input Area - Fixed at bottom */}
                <div className="sticky bottom-0 bg-white border-t border-gray-100 pt-4 pb-4 -mx-4 md:-mx-6 px-4 md:px-6 z-10">
                  <div className="flex items-center gap-2">
                    <Input
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyDown={(e) =>
                        e.key === "Enter" && handleSendMessage()
                      }
                      placeholder={`Message ${coachName}...`}
                      className="flex-1 rounded-full border border-gray-200 bg-white px-4 py-3 shadow-sm focus-visible:ring-offset-0 focus-visible:ring-1"
                    />
                    <Button
                      size="icon"
                      onClick={() => handleSendMessage()}
                      disabled={!inputValue.trim()}
                      className={`w-10 h-10 rounded-full transition ${
                        inputValue.trim()
                          ? "bg-emerald-600 text-white hover:bg-emerald-700"
                          : "bg-gray-200 text-gray-500 cursor-not-allowed"
                      }`}
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      onClick={handleVoiceInput}
                      className={`w-12 h-12 rounded-full shadow-md transition-all relative ${
                        isListening
                          ? "bg-red-500 text-white"
                          : "bg-emerald-600 hover:bg-emerald-700 text-white"
                      }`}
                    >
                      {isListening && (
                        <>
                          {/* Wave animation rings */}
                          <div className="absolute inset-0 rounded-full border-2 border-red-400 animate-ping opacity-75" />
                          <div
                            className="absolute inset-0 rounded-full border-2 border-red-400 animate-ping opacity-50"
                            style={{ animationDelay: "0.3s" }}
                          />
                          <div
                            className="absolute inset-0 rounded-full border-2 border-red-400 animate-ping opacity-25"
                            style={{ animationDelay: "0.6s" }}
                          />
                        </>
                      )}
                      <Zap
                        className={`w-5 h-5 fill-white text-white ${
                          isListening ? "animate-pulse" : ""
                        }`}
                      />
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
