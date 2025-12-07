import { useState, useEffect, useRef } from "react";
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
import AvatarScene from "@/components/AvatarScene";
import type { VoiceType } from "@/types/voice";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

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
  rank: number;
  name: string;
  xp: number;
  avatarColor: string;
  isUser?: boolean;
  location?: string;
}

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

const MOCK_LEADERBOARD: LeaderboardUser[] = [
  {
    rank: 1,
    name: "Aarav P.",
    xp: 15400,
    avatarColor: "bg-orange-500",
    location: "Mumbai",
  },
  {
    rank: 2,
    name: "Sneha K.",
    xp: 14200,
    avatarColor: "bg-blue-500",
    location: "Delhi",
  },
  {
    rank: 3,
    name: "Rohan M.",
    xp: 13850,
    avatarColor: "bg-green-500",
    location: "Bangalore",
  },
  {
    rank: 144,
    name: "You",
    xp: 350,
    avatarColor: "bg-purple-600",
    isUser: true,
    location: "Pune",
  }, // User's rank
];

export function HomePage() {
  const location = useLocation();
  const navigate = useNavigate();
  // Safe access to formData with defaults
  const formData = location.state?.formData || {};
  const gender = formData.gender || "female";
  const name = formData.name || "Traveller";
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
  const [xp] = useState(350);
  const [userLocation, setUserLocation] = useState("India"); // Default location

  const levelingXp = 1000;
  const level = 1;

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
      const payload = {
        event: "process_audio",
        data: {
          text: textToSend,
          user_id: "user123", // You can change this to use actual user ID
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

  const handleVoiceInput = () => {
    const socket = socketRef.current;

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

    // If already listening, stop recognition
    if (isListening) {
      setIsListening(false);

      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }

      // Send the transcribed text if available
      if (recognitionResultRef.current.trim() && socket && socket.connected) {
        const payload = {
          event: "process_audio",
          data: {
            text: recognitionResultRef.current.trim(),
            user_id: "user123", // You can change this to use actual user ID
          },
        };

        console.log("📤 Sending transcribed text:", payload);

        socket.emit("process_audio", payload);
        recognitionResultRef.current = "";
      }

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
        }

        // Optionally show interim results in console
        if (interimTranscript) {
          console.log("🎤 Interim transcript:", interimTranscript);
        }
      };

      // Handle errors
      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error("Speech recognition error:", event.error);
        if (event.error === "no-speech") {
          console.log("No speech detected, continuing...");
        } else if (event.error === "audio-capture") {
          alert("No microphone found. Please check your microphone.");
          setIsListening(false);
        } else if (event.error === "not-allowed") {
          alert("Microphone access denied. Please allow microphone access.");
          setIsListening(false);
        }
      };

      // Handle when recognition ends
      recognition.onend = () => {
        console.log("🎤 Speech recognition ended");
        if (isListening) {
          // If still listening, restart recognition (for continuous mode)
          try {
            recognition.start();
          } catch (error) {
            console.error("Failed to restart recognition:", error);
            setIsListening(false);
          }
        }
      };

      // Start recognition
      recognition.start();
      setIsListening(true);
      recognitionResultRef.current = "";
      console.log("🎤 Started speech recognition");
    } catch (error) {
      console.error("Failed to start speech recognition:", error);
      setIsListening(false);
      alert(
        "Failed to start speech recognition. Please check your microphone permissions."
      );
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

        {/* 1. The Coach View (Bigger Height) */}
        {/* Increased height from h-[40vh] to h-[55vh] */}
        <div className="relative z-10 h-[55vh] md:h-[60vh] flex-shrink-0">
          <AvatarScene
            textToSpeak={
              messages[messages.length - 1].sender === "coach"
                ? messages[messages.length - 1].text
                : ""
            }
            voiceType={gender as VoiceType}
          />

          {/* Contextual Nudge Bubble (Hidden if listening to avoid clutter) */}
          {!isListening && (
            <div className="absolute bottom-4 left-4 right-4 md:left-auto md:right-8 md:w-80">
              <div className="bg-white/90 backdrop-blur-md p-4 rounded-2xl border border-gray-100 shadow-lg animate-fade-in-up">
                <p className={`text-xs font-bold uppercase mb-1 ${themeColor}`}>
                  Current Mission
                </p>
                <p className="text-sm text-gray-800 font-medium">
                  Log your meal to maintain your 3-day streak!
                </p>
              </div>
            </div>
          )}

          {/* Listening Overlay */}
          {isListening && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/20 backdrop-blur-sm animate-in fade-in">
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
              <p className="mt-6 text-white font-bold text-lg drop-shadow-md">
                Listening...
              </p>
            </div>
          )}
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
              <div className="h-full flex flex-col max-w-2xl mx-auto">
                <div className="flex-1 space-y-4 mb-4">
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
                  {DAILY_QUESTS.map((quest) => (
                    <div
                      key={quest.id}
                      className={`bg-white p-3 rounded-xl border border-gray-100 flex items-center justify-between shadow-sm ${
                        quest.title === "Log Lunch"
                          ? "cursor-pointer hover:border-emerald-300 hover:shadow-md"
                          : ""
                      }`}
                      onClick={() => {
                        if (quest.title === "Log Meal") {
                          navigate("/log-meal", { state: { formData } });
                        }
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            quest.completed
                              ? "bg-green-100 text-green-600"
                              : "bg-gray-100 text-gray-400"
                          }`}
                        >
                          {quest.completed ? (
                            <CheckCircle2 className="w-5 h-5" />
                          ) : (
                            <div className="w-3 h-3 rounded-full bg-gray-300" />
                          )}
                        </div>
                        <span
                          className={`text-sm font-medium ${
                            quest.completed
                              ? "text-gray-400 line-through"
                              : "text-gray-700"
                          }`}
                        >
                          {quest.title}
                        </span>
                      </div>
                      <span className="text-xs font-bold text-yellow-600 bg-yellow-50 px-2 py-1 rounded-md">
                        +{quest.xp} XP
                      </span>
                    </div>
                  ))}
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

                {/* Top 3 Podium */}
                <div className="grid grid-cols-3 gap-2 items-end pt-4 mb-8">
                  {/* Silver */}
                  <div className="flex flex-col items-center">
                    <div className="w-14 h-14 bg-gray-200 rounded-full border-4 border-gray-300 flex items-center justify-center mb-2 relative">
                      <span className="text-xl">🥈</span>
                      <div className="absolute -bottom-2 bg-gray-600 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
                        #2
                      </div>
                    </div>
                    <p className="font-bold text-xs text-center truncate w-full">
                      {MOCK_LEADERBOARD[1].name}
                    </p>
                    <p className="text-[10px] text-gray-400">
                      {MOCK_LEADERBOARD[1].xp} XP
                    </p>
                  </div>

                  {/* Gold */}
                  <div className="flex flex-col items-center -mt-4">
                    <Crown className="w-6 h-6 text-yellow-500 mb-1 animate-bounce" />
                    <div className="w-20 h-20 bg-yellow-100 rounded-full border-4 border-yellow-400 flex items-center justify-center mb-2 relative shadow-lg">
                      <span className="text-3xl">🥇</span>
                      <div className="absolute -bottom-2 bg-yellow-500 text-white text-xs px-2 py-0.5 rounded-full font-bold">
                        #1
                      </div>
                    </div>
                    <p className="font-bold text-sm text-center truncate w-full">
                      {MOCK_LEADERBOARD[0].name}
                    </p>
                    <p className="text-xs text-gray-400">
                      {MOCK_LEADERBOARD[0].xp} XP
                    </p>
                  </div>

                  {/* Bronze */}
                  <div className="flex flex-col items-center">
                    <div className="w-14 h-14 bg-orange-100 rounded-full border-4 border-orange-300 flex items-center justify-center mb-2 relative">
                      <span className="text-xl">🥉</span>
                      <div className="absolute -bottom-2 bg-orange-600 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
                        #3
                      </div>
                    </div>
                    <p className="font-bold text-xs text-center truncate w-full">
                      {MOCK_LEADERBOARD[2].name}
                    </p>
                    <p className="text-[10px] text-gray-400">
                      {MOCK_LEADERBOARD[2].xp} XP
                    </p>
                  </div>
                </div>

                {/* User Rank Card */}
                <Card className="bg-gradient-to-r from-gray-900 to-gray-800 p-4 rounded-xl flex items-center justify-between text-white shadow-lg transform scale-105 border-2 border-emerald-500/50">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center font-bold text-sm border-2 border-white/20">
                      You
                    </div>
                    <div>
                      <p className="font-bold text-sm">Your Rank</p>
                      <p className="text-xs text-gray-400">
                        Top 15% in {userLocation}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-emerald-400">#144</p>
                    <p className="text-xs text-gray-400">{xp} XP</p>
                  </div>
                </Card>

                {/* REST OF LIST */}
                <div className="space-y-4 pt-2">
                  <p className="text-xs font-bold text-gray-400 uppercase">
                    Runners Up
                  </p>
                  {[4, 5, 6].map((rank) => (
                    <div
                      key={rank}
                      className="flex items-center justify-between p-3 bg-white rounded-xl border border-gray-100"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-gray-400 text-sm w-6">
                          #{rank}
                        </span>
                        <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-xs font-bold text-gray-500">
                          U{rank}
                        </div>
                        <span className="font-medium text-sm text-gray-700">
                          User_{9200 + rank}
                        </span>
                      </div>
                      <span className="text-xs font-bold text-gray-500">
                        {13000 - rank * 500} XP
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
