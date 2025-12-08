import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { io, Socket } from "socket.io-client";
import {
  MessageSquare,
  Zap,
  Shield,
  Send,
  CheckCircle2,
  Compass,
  Utensils,
  Dumbbell,
  Camera,
  MapPin,
  Trophy,
  Crown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useUserProfileStore } from "@/store/userProfileStore";
import AvatarScene from "@/components/AvatarScene";
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

interface Quest {
  id: string;
  title: string;
  xp: number;
  completed: boolean;
  type: "daily" | "weekly";
}

interface LeaderboardUser {
  userId: string;
  rank: number;
  name: string;
  xp: number;
}

type LeaderboardApiResponse = {
  topUsers: Array<{
    userId: string;
    name: string | null;
    xp: number;
    rank: number;
  }>;
  currentUser: {
    userId: string;
    name: string | null;
    xp: number;
    rank: number;
    percentile?: number;
  };
};

// --- Mock Data ---
const DAILY_QUESTS: Quest[] = [
  { id: "1", title: "Log Meal", xp: 50, completed: false, type: "daily" },
  {
    id: "2",
    title: "Walk 5,000 Steps",
    xp: 100,
    completed: false,
    type: "daily",
  },
  { id: "3", title: "Drink 2L Water", xp: 50, completed: true, type: "daily" },
];

const FALLBACK_LEADERBOARD: LeaderboardUser[] = [
  { userId: "1", rank: 1, name: "Aarav P.", xp: 15400 },
  { userId: "2", rank: 2, name: "Sneha K.", xp: 14200 },
  { userId: "3", rank: 3, name: "Rohan M.", xp: 13850 },
  { userId: "you", rank: 144, name: "You", xp: 350 },
];

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
  const coachName = gender === "male" ? "Atlas" : "Aria";

  // State
  // Changed "community" to "leaderboard"
  const [activeTab, setActiveTab] = useState<
    "chat" | "explore" | "leaderboard"
  >("chat");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      sender: "coach",
      text: `Welcome back, ${name}. Ready to conquer today's mission?`,
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const xp = profile.xp ?? routeFormData.xp ?? 350;
  const [userLocation, setUserLocation] = useState("India"); // Default location (show actual percentile from API)
  const [habitStats, setHabitStats] = useState<{
    calorie?: number;
    water?: number;
    steps?: number;
  }>({});
  const [leaderboardData, setLeaderboardData] =
    useState<LeaderboardApiResponse | null>(null);
  const currentPercentile = Math.round(
    leaderboardData?.currentUser?.percentile ?? 15
  );

  const levelingXp = 1000;
  const level = 1;

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

  const awardXp = async (userId: string, delta: number) => {
    try {
      const res = await fetch(
        `/api/users/${encodeURIComponent(userId)}/xp?delta=${delta}`,
        {
        method: "POST",
        }
      );
      if (!res.ok) return;
      await fetchUserProfile(userId); // refresh xp
    } catch (e) {
      console.error("Failed to award XP", e);
    }
  };

  // Fetch user profile on mount
  useEffect(() => {
    const userId = profile.mobile || routeFormData.mobile || "";
    if (!userId) return;
    if (fetchedUserRef.current === userId) return;
    fetchedUserRef.current = userId;

    fetchUserProfile(userId);
  }, [profile.mobile, routeFormData.mobile]);

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

  useEffect(() => {
    const userId = profile.mobile || routeFormData.mobile || "";
    if (!userId) return;

    const loadLeaderboard = async () => {
      try {
        const res = await fetch(
          `/api/users/leaderboard?userId=${encodeURIComponent(userId)}`
        );
        if (!res.ok) return;
        const data: LeaderboardApiResponse = await res.json();
        setLeaderboardData(data);
      } catch (e) {
        console.error("Failed to load leaderboard", e);
      }
    };

    loadLeaderboard();
  }, [profile.mobile, routeFormData.mobile]);

  // Award XP when goals are reached (once per goal per user)
  useEffect(() => {
    const userId = profile.mobile || routeFormData.mobile || "";
    if (!userId) return;

    // Reset goal state when user changes
    if (goalStateRef.current.userId !== userId) {
      goalStateRef.current = { userId, hits: new Set() };
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
      const marker = `${userId}:${key}`;
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
      awardXp(userId, delta);
    }
  }, [habitStats, profile.mobile, routeFormData.mobile]);

  // Determining "Persona" styles
  const isMale = gender === "male";
  const themeColor = isMale ? "text-emerald-600" : "text-purple-700";
  const buttonBg = isMale
    ? "bg-emerald-600 hover:bg-emerald-700"
    : "bg-purple-700 hover:bg-purple-800";

  const [isListening, setIsListening] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const SOCKET_URL = "http://192.168.233.159:5000";
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const recognitionResultRef = useRef<string>("");
  const wakeWordRecognitionRef = useRef<SpeechRecognition | null>(null);
  const maxListeningTimeoutRef = useRef<number | null>(null);
  const silenceTimeoutRef = useRef<number | null>(null);
  const lastSpeechTimeRef = useRef<number>(0);
  const speechSynthesisRef = useRef<SpeechSynthesisUtterance | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

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
  }, [SOCKET_URL]);

  // Helper function to stop listening and send the result
  const stopListeningAndSend = useCallback(() => {
    const socket = socketRef.current;
    setIsListening(false);

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
      const avatar = isMale ? "atlas" : "aria";
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
  }, [isMale, playEndSound]);

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

  // Wake word listener - listens for "okay atlas" or "ok aria"
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
          ? ["okay atlas", "ok atlas", "hey atlas", "atlas"]
          : ["okay aria", "ok aria", "hey aria", "aria"];

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
      const avatar = isMale ? "atlas" : "aria";
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
  };

  return (
    <div className="min-h-screen bg-white font-sans flex flex-col">
      {/* --- Top HUD (Head-Up Display) --- */}
      <header className="bg-white border-b border-gray-100 p-4 sticky top-0 z-50 shadow-sm">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div
            className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => navigate("/profile")}
          >
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${
                isMale ? "bg-emerald-600" : "bg-purple-600"
              }`}
            >
              {level}
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">
                Level {level} Novice
              </p>
              <div className="w-32 h-2 bg-gray-100 rounded-full mt-1">
                <div
                  className={`h-full rounded-full ${
                    isMale ? "bg-emerald-500" : "bg-purple-500"
                  }`}
                  style={{ width: `${(xp / levelingXp) * 100}%` }}
                />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm font-medium text-gray-600">
            <div
              className="flex items-center gap-1 cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => navigate("/rewards")}
            >
              <Zap className="w-4 h-4 text-yellow-500 fill-yellow-500" />
              <span>{xp} XP</span>
            </div>
            <div
              className="flex items-center gap-1 cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => navigate("/rankings")}
            >
              <Shield className="w-4 h-4 text-blue-500" />
              <span>Warrior</span>
            </div>
          </div>
        </div>
      </header>

      {/* --- Main Content Area --- */}
      <main className="flex-1 relative overflow-hidden flex flex-col">
        {/* Dynamic Background */}
        <div className="absolute inset-0 pointer-events-none z-0 opacity-30">
          <div
            className={`absolute top-[-20%] left-[-20%] w-[80%] h-[80%] ${
              isMale ? "bg-emerald-100" : "bg-purple-100"
            } rounded-full blur-[120px]`}
          />
              </div>

        {/* Listening Overlay - shown when listening */}
          {isListening && (
          <div className="relative z-10 flex flex-col items-center justify-center py-8">
            <div
              className={`w-24 h-24 rounded-full flex items-center justify-center ${
                isMale ? "bg-emerald-500" : "bg-purple-500"
              } animate-pulse shadow-[0_0_40px_rgba(0,0,0,0.2)]`}
            >
                <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center">
                <div
                  className={`w-16 h-16 rounded-full flex items-center justify-center animate-ping ${
                    isMale ? "bg-emerald-100" : "bg-purple-100"
                  }`}
                >
                    <Zap className={`w-8 h-8 ${themeColor}`} />
                  </div>
                </div>
              </div>
            <p className="mt-6 text-gray-700 font-bold text-lg">Listening...</p>
            </div>
          )}

        <div className="home-avatar-banner">
          <AvatarScene
            textToSpeak={messages[messages.length - 1].sender === "coach" ? messages[messages.length - 1].text : ""}
            voiceType={gender as VoiceType}
            isFullScreen={false}
          />
        </div>

        {/* 2. Interface Tabs (Chat / Explore / Leaderboard) */}
        <div className="flex-1 bg-white rounded-t-[2rem] shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)] relative z-20 overflow-hidden flex flex-col">
          {/* Tab Navigation */}
          <div className="flex border-b border-gray-100">
            <button
              onClick={() => setActiveTab("chat")}
              className={`flex-1 py-4 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
                activeTab === "chat"
                  ? `${themeColor} border-b-2 ${
                      isMale ? "border-emerald-500" : "border-purple-500"
                    }`
                  : "text-gray-400"
              }`}
            >
              <MessageSquare className="w-4 h-4" /> Comms
            </button>
            <button
              onClick={() => setActiveTab("explore")}
              className={`flex-1 py-4 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
                activeTab === "explore"
                  ? `${themeColor} border-b-2 ${
                      isMale ? "border-emerald-500" : "border-purple-500"
                    }`
                  : "text-gray-400"
              }`}
            >
              <Compass className="w-4 h-4" /> Explore
            </button>
            <button
              onClick={() => setActiveTab("leaderboard")}
              className={`flex-1 py-4 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
                activeTab === "leaderboard"
                  ? `${themeColor} border-b-2 ${
                      isMale ? "border-emerald-500" : "border-purple-500"
                    }`
                  : "text-gray-400"
              }`}
            >
              <Trophy className="w-4 h-4" /> Ranking
            </button>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-gray-50/50">
            {activeTab === "chat" && (
              <div className="h-full flex flex-col max-w-2xl mx-auto justify-between">
                <div className="flex-1 space-y-4 mb-4 overflow-auto">
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
                            : "bg-white border border-gray-100 shadow-sm text-gray-800 rounded-bl-none"
                        }`}
                      >
                        {msg.text}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Task List (Mini) */}
                <div className="mb-4 space-y-2">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">
                    Daily Objectives
                  </p>
                  {DAILY_QUESTS.map((quest) => {
                    const goalHit =
                      (quest.title === "Walk 5,000 Steps" &&
                        habitStats.steps != null &&
                        habitStats.steps >= 5000) ||
                      (quest.title === "Drink 2L Water" &&
                        habitStats.water != null &&
                        habitStats.water >= 2000);

                    return (
                    <div
                      key={quest.id}
                      className={`bg-white p-3 rounded-xl border border-gray-100 flex items-center justify-between shadow-sm ${
                          quest.title === "Log Meal" ||
                          quest.title === "Walk 5,000 Steps" ||
                          quest.title === "Drink 2L Water"
                          ? "cursor-pointer hover:border-emerald-300 hover:shadow-md"
                          : ""
                        } ${goalHit ? "border-emerald-400 bg-emerald-50" : ""}`}
                      onClick={() => {
                          if (quest.title === "Log Meal") {
                            navigate("/log-meal", {
                              state: { formData: profile },
                            });
                          }
                        }}
                      >
                        <div className="flex items-center gap-3 flex-1">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center ${
                              quest.completed || goalHit
                                ? "bg-emerald-100 text-emerald-600"
                                : "bg-gray-100 text-gray-400"
                          }`}
                        >
                          {quest.completed ? (
                            <CheckCircle2 className="w-5 h-5" />
                          ) : goalHit ? (
                            <div className="w-3 h-3 rounded-full bg-emerald-500" />
                          ) : (
                            <div className="w-3 h-3 rounded-full bg-gray-300" />
                          )}
                        </div>
                        <div className="flex flex-col">
                            <span
                              className={`text-sm font-medium ${
                                quest.completed
                                  ? "text-gray-400 line-through"
                                  : "text-gray-700"
                              }`}
                            >
                              {quest.title}
                            </span>
                            {quest.title === "Log Meal" &&
                              habitStats.calorie != null && (
                                <span className="text-xs text-emerald-600">
                                  {habitStats.calorie} kcal today
                                </span>
                              )}
                            {quest.title === "Walk 5,000 Steps" &&
                              habitStats.steps != null && (
                            <span className="text-xs text-emerald-600">
                              {habitStats.steps} steps today
                                  {habitStats.steps >= 5000
                                    ? " · Goal hit!"
                                    : ""}
                            </span>
                          )}
                            {quest.title === "Drink 2L Water" &&
                              habitStats.water != null && (
                            <span className="text-xs text-emerald-600">
                              {habitStats.water} ml today
                                  {habitStats.water >= 2000
                                    ? " · Goal hit!"
                                    : ""}
                            </span>
                          )}
                        </div>
                      </div>
                        <span
                          className={`text-xs font-bold px-2 py-1 rounded-md ${
                            goalHit
                              ? "text-emerald-700 bg-emerald-100"
                              : "text-yellow-600 bg-yellow-50"
                          }`}
                        >
                          +{quest.xp} XP
                        </span>
                    </div>
                    );
                  })}
                </div>

                {/* Input Area */}
                <div className="relative flex items-center gap-2">
                  <Input
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                    placeholder={`Message ${coachName}...`}
                    className="flex-1 py-6 rounded-full border-gray-200 shadow-sm focus-visible:ring-offset-0 focus-visible:ring-1 pr-12"
                  />
                  {inputValue ? (
                    <Button
                      size="icon"
                      onClick={() => handleSendMessage()}
                      className={`absolute right-14 top-2 rounded-full w-8 h-8 ${buttonBg}`}
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  ) : null}

                  <Button
                    size="icon"
                    onClick={handleVoiceInput}
                    className={`w-12 h-12 rounded-full shadow-md transition-all ${
                      isListening ? "bg-red-500 animate-pulse" : buttonBg
                    }`}
                  >
                    <Zap className="w-5 h-5 fill-white text-white" />
                  </Button>
                </div>

              </div>
            )}

            {/* Explore Tab replaced Map Tab */}
            {activeTab === "explore" && (
              <div className="h-full max-w-2xl mx-auto space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <Card
                    className="p-4 flex flex-col items-center justify-center gap-3 cursor-pointer hover:shadow-md transition-shadow bg-white"
                    onClick={() => navigate("/recipes")}
                  >
                    <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center text-orange-600">
                      <Utensils className="w-6 h-6" />
                    </div>
                    <span className="font-semibold text-gray-700">Recipes</span>
                  </Card>

                  <Card
                    className="p-4 flex flex-col items-center justify-center gap-3 cursor-pointer hover:shadow-md transition-shadow bg-white"
                    onClick={() => navigate("/workouts")}
                  >
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                      <Dumbbell className="w-6 h-6" />
                    </div>
                    <span className="font-semibold text-gray-700">
                      Workouts
                    </span>
                  </Card>

                  <Card
                    className="p-4 flex flex-col items-center justify-center gap-3 cursor-pointer hover:shadow-md transition-shadow bg-white"
                    onClick={() => navigate("/tracker")}
                  >
                    <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center text-purple-600">
                      <Camera className="w-6 h-6" />
                    </div>
                    <span className="font-semibold text-gray-700">
                      Photo Track
                    </span>
                  </Card>

                  <Card
                    className="p-4 flex flex-col items-center justify-center gap-3 cursor-pointer hover:shadow-md transition-shadow bg-white"
                    onClick={() => navigate("/habits")}
                  >
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-green-600">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <span className="font-semibold text-gray-700">Habits</span>
                  </Card>

                  <Card
                    className="p-4 flex flex-col items-center justify-center gap-3 cursor-pointer hover:shadow-md transition-shadow bg-white md:col-span-2"
                    onClick={() => navigate("/devices")}
                  >
                    <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600">
                      <Zap className="w-6 h-6" />
                    </div>
                    <span className="font-semibold text-gray-700">
                      Wearable Sync
                    </span>
                  </Card>
                </div>

                <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-6 text-white shadow-lg">
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

            {/* Leaderboard Tab (Replaces Squad) */}
            {activeTab === "leaderboard" && (
              <div className="h-full space-y-6 max-w-2xl mx-auto">
                {/* Location Header */}
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">
                      Leaderboard
                    </h2>
                    <div className="flex items-center gap-1 text-sm text-gray-500 mt-1">
                      <MapPin className="w-4 h-4 text-emerald-500" />
                      <span>
                        Ranking in{" "}
                        <span className="font-bold text-gray-900">
                          {userLocation}
                        </span>
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={() =>
                      setUserLocation((prev) =>
                        prev === "India" ? "Global" : "India"
                      )
                    }
                  >
                    {userLocation === "India" ? "Show Global" : "Show Local"}
                  </Button>
                </div>

                <div className="grid grid-cols-3 gap-2 items-end pt-4 mb-8">
                  {[0, 1, 2].map((position) => {
                    const topUsers =
                      leaderboardData?.topUsers ?? FALLBACK_LEADERBOARD;
                    const user =
                      topUsers[position] ||
                      topUsers[position % topUsers.length];
                    const medal =
                      position === 1 ? "🥈" : position === 0 ? "🥇" : "🥉";
                    const badgeColor =
                      position === 1
                        ? "bg-gray-200"
                        : position === 0
                        ? "bg-yellow-100"
                        : "bg-orange-100";
                    const borderColor =
                      position === 1
                        ? "border-gray-300"
                        : position === 0
                        ? "border-yellow-400"
                        : "border-orange-300";
                    const size = position === 0 ? "w-20 h-20" : "w-14 h-14";
                    const textSize = position === 0 ? "text-3xl" : "text-xl";
                    const badgeTextSize =
                      position === 0 ? "text-xs" : "text-[10px]";

                    return (
                      <div
                        key={`podium-${position}`}
                        className={`flex flex-col items-center ${
                          position === 0 ? "-mt-4" : ""
                        }`}
                      >
                        {position === 0 && (
                    <Crown className="w-6 h-6 text-yellow-500 mb-1 animate-bounce" />
                        )}
                        <div
                          className={`${size} rounded-full border-4 flex items-center justify-center mb-2 relative ${badgeColor} ${borderColor} ${
                            position === 0 ? "shadow-lg" : ""
                          }`}
                        >
                          <span className={textSize}>{medal}</span>
                          <div
                            className={`absolute -bottom-2 ${
                              position === 0
                                ? "bg-yellow-500"
                                : position === 1
                                ? "bg-gray-600"
                                : "bg-orange-600"
                            } text-white ${badgeTextSize} px-2 py-0.5 rounded-full font-bold`}
                          >
                            #{user.rank}
                    </div>
                  </div>
                        <p
                          className={`font-bold ${
                            position === 0 ? "text-sm" : "text-xs"
                          } text-center truncate w-full`}
                        >
                          {user.name || "Unknown"}
                        </p>
                        <p
                          className={`${
                            position === 0 ? "text-xs" : "text-[10px]"
                          } text-gray-400`}
                        >
                          {user.xp} XP
                        </p>
                    </div>
                    );
                  })}
                </div>

                <Card className="bg-gradient-to-r from-gray-900 to-gray-800 p-4 rounded-xl flex items-center justify-between text-white shadow-lg transform scale-105 border-2 border-emerald-500/50">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center font-bold text-sm border-2 border-white/20">
                      You
                    </div>
                    <div>
                      <p className="font-bold text-sm">Your Rank</p>
                      <p className="text-xs text-gray-400">
                        Top {currentPercentile}% in {userLocation}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-emerald-400">
                      #
                      {leaderboardData?.currentUser?.rank ??
                        FALLBACK_LEADERBOARD[3].rank}
                    </p>
                    <p className="text-xs text-gray-400">
                      {leaderboardData?.currentUser?.xp ??
                        FALLBACK_LEADERBOARD[3].xp}{" "}
                      XP
                    </p>
                  </div>
                </Card>

                <div className="space-y-4 pt-2">
                  <p className="text-xs font-bold text-gray-400 uppercase">
                    Runners Up
                  </p>
                  {(
                    leaderboardData?.topUsers?.slice(3) ??
                    FALLBACK_LEADERBOARD.slice(3)
                  ).map((user) => (
                    <div
                      key={`runner-${user.userId}`}
                      className="flex items-center justify-between p-3 bg-white rounded-xl border border-gray-100"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-gray-400 text-sm w-6">
                          #{user.rank}
                        </span>
                        <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-xs font-bold text-gray-500">
                          {user.name ? user.name.charAt(0) : "U"}
                        </div>
                        <span className="font-medium text-sm text-gray-700">
                          {user.name || "Unknown"}
                        </span>
                      </div>
                      <span className="text-xs font-bold text-gray-500">
                        {user.xp} XP
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
