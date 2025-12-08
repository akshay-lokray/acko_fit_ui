import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { io, Socket } from "socket.io-client";
import { Send, Zap, Mic, Keyboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import AvatarScene from "@/components/AvatarScene";
import type { VoiceType } from "@/types/voice";
import "./SetupPage.css";

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

interface Message {
  id: string;
  sender: "user" | "coach";
  text: string;
}

export function SetupPage() {
  const location = useLocation();
  const gender = location.state?.gender || "female";
  const coachName = gender === "male" ? "Dhoni" : "Disha";
  const isMale = gender === "male";
  const avatar = isMale ? "Dhoni" : "Disha";

  // State
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      sender: "coach",
      text: `Hi! I'm ${coachName}. Let's get started with your setup. I'll ask you a few questions.`,
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [showTextInput, setShowTextInput] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Socket and recognition refs
  const socketRef = useRef<Socket | null>(null);
  const SOCKET_URL = "http://192.168.233.159:5000";
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const recognitionResultRef = useRef<string>("");
  const maxListeningTimeoutRef = useRef<number | null>(null);
  const silenceTimeoutRef = useRef<number | null>(null);
  const lastSpeechTimeRef = useRef<number>(0);
  const speechSynthesisRef = useRef<SpeechSynthesisUtterance | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Theme colors
  const themeColor = isMale ? "text-emerald-600" : "text-purple-700";
  const buttonBg = isMale
    ? "bg-emerald-600 hover:bg-emerald-700"
    : "bg-purple-700 hover:bg-purple-800";

  // Function to play audio feedback - start listening sound
  const playStartSound = useCallback(() => {
    try {
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
          return;
        }
      }
      const audioContext = audioContextRef.current;
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 800;
      oscillator.type = "sine";

      const now = audioContext.currentTime;
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.3, now + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

      oscillator.start(now);
      oscillator.stop(now + 0.15);
    } catch (error) {
      console.warn("Failed to play start sound:", error);
    }
  }, []);

  // Function to play audio feedback - end listening sound
  const playEndSound = useCallback(() => {
    try {
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
          return;
        }
      }
      const audioContext = audioContextRef.current;
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 600;
      oscillator.type = "sine";

      const now = audioContext.currentTime;
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.3, now + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

      oscillator.start(now);
      oscillator.stop(now + 0.2);
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

      if (!("speechSynthesis" in window)) {
        console.warn("Speech synthesis not supported");
        return;
      }

      if (speechSynthesisRef.current) {
        window.speechSynthesis.cancel();
      }

      try {
        const utterance = new SpeechSynthesisUtterance(text);
        speechSynthesisRef.current = utterance;

        utterance.lang = "en-US";
        utterance.rate = 1.0;
        utterance.pitch = isMale ? 0.8 : 1.2;
        utterance.volume = 1.0;

        const voices = window.speechSynthesis.getVoices();
        if (voices.length > 0) {
          const preferredVoices = voices.filter((voice) => {
            const voiceName = voice.name.toLowerCase();
            if (isMale) {
              return (
                voiceName.includes("male") ||
                voiceName.includes("david") ||
                voiceName.includes("daniel") ||
                voiceName.includes("alex") ||
                voice.lang.startsWith("en")
              );
            } else {
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
            const englishVoices = voices.filter((v) => v.lang.startsWith("en"));
            if (englishVoices.length > 0) {
              utterance.voice = englishVoices[0];
            }
          }
        }

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

        window.speechSynthesis.speak(utterance);
        console.log("🔊 Speaking response:", text.substring(0, 50) + "...");
      } catch (error) {
        console.error("Failed to speak text:", error);
      }
    },
    [isMale]
  );

  // Load voices when available and speak initial message
  useEffect(() => {
    const initialMessage = `Hi! I'm ${coachName}. Let's get started with your setup. I'll ask you a few questions.`;

    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        console.log("🔊 Available voices loaded:", voices.length);
        // Speak the initial welcome message once voices are loaded
        setTimeout(() => {
          speakText(initialMessage);
        }, 500);
      }
    };

    if (window.speechSynthesis.getVoices().length > 0) {
      loadVoices();
    } else {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }

    return () => {
      if (speechSynthesisRef.current) {
        window.speechSynthesis.cancel();
      }
    };
  }, [speakText, coachName]);

  // Socket connection
  useEffect(() => {
    const socket = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
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

      // Send start message as soon as connected
      try {
        const startPayload = {
          data: {
            text: "start",
            context: [],
          },
        };
        console.log("📤 Sending start message:", startPayload);
        socket.emit("process_audio", startPayload);
      } catch (e) {
        console.warn("Socket.IO start message send failed", e);
      }
    });

    socket.on("connect_error", (error) => {
      console.error("❌ Socket.IO connection error:", {
        error: error.message,
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
        return;
      }

      // Handle text response - format: {'text': response_text}
      let responseText = "";
      try {
        if (typeof data === "string") {
          try {
            const parsed = JSON.parse(data);
            responseText = parsed.text || String(data);
          } catch {
            responseText = data;
          }
        } else if (typeof data === "object" && data !== null) {
          responseText = data.text || String(data);
        } else {
          responseText = String(data);
        }
      } catch (error) {
        console.error("Error parsing response:", error);
        responseText = String(data);
      }

      console.log("📝 Response text:", responseText);

      // Stop any ongoing listening
      setIsListening(false);
      if (recognitionRef.current) {
        try {
          const recognition = recognitionRef.current;
          recognition.onend = null;
          recognition.onerror = null;
          recognition.onresult = null;
          recognitionRef.current = null;
          recognition.stop();
        } catch {
          // Ignore errors
        }
      }
      // Clear timeouts
      if (maxListeningTimeoutRef.current) {
        window.clearTimeout(maxListeningTimeoutRef.current);
        maxListeningTimeoutRef.current = null;
      }
      if (silenceTimeoutRef.current) {
        window.clearTimeout(silenceTimeoutRef.current);
        silenceTimeoutRef.current = null;
      }

      // Add message to chat
      const coachMsg: Message = {
        id: Date.now().toString(),
        sender: "coach",
        text: responseText,
      };
      setMessages((prev) => [...prev, coachMsg]);
      setShowTextInput(false);

      // Speak the response using text-to-speech
      speakText(responseText);
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
  }, [SOCKET_URL, speakText]);

  // Helper function to stop listening and send the result
  const stopListeningAndSend = useCallback(() => {
    const socket = socketRef.current;
    setIsListening(false);

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
      recognition.onend = null;
      recognition.onerror = null;
      recognition.onresult = null;
      recognitionRef.current = null;

      try {
        recognition.stop();
      } catch {
        try {
          recognition.abort();
        } catch {
          // Ignore errors
        }
      }
    }

    // Send the transcribed text if available
    if (recognitionResultRef.current.trim() && socket && socket.connected) {
      const payload = {
        event: "process_audio",
        data: {
          text: recognitionResultRef.current.trim(),
          user_id: "user123",
          avatar: avatar,
        },
      };

      console.log("📤 Sending transcribed text:", payload);
      socket.emit("process_audio", payload);
      recognitionResultRef.current = "";
    }

    // Play end sound
    playEndSound();
  }, [avatar, playEndSound]);

  // Voice input handler
  const handleVoiceInput = useCallback(() => {
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
      stopListeningAndSend();
      return;
    }

    // Ensure any previous recognition is cleaned up
    if (recognitionRef.current) {
      try {
        const oldRecognition = recognitionRef.current;
        oldRecognition.onend = null;
        oldRecognition.onerror = null;
        oldRecognition.onresult = null;
        oldRecognition.stop();
      } catch {
        // Ignore errors
      }
      recognitionRef.current = null;
    }

    // Small delay to ensure previous recognition is fully stopped
    setTimeout(() => {
      if (isListening) {
        return;
      }

      try {
        const recognition = new SpeechRecognition();
        recognitionRef.current = recognition;

        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = "en-US";

        const MAX_LISTENING_TIME = 35000;
        const SILENCE_TIMEOUT = 3000;

        maxListeningTimeoutRef.current = window.setTimeout(() => {
          console.log("⏱️ Maximum listening time reached (35s), stopping...");
          stopListeningAndSend();
        }, MAX_LISTENING_TIME);

        lastSpeechTimeRef.current = Date.now();

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

          if (finalTranscript) {
            recognitionResultRef.current += finalTranscript;
            console.log("🎤 Final transcript:", finalTranscript);
            lastSpeechTimeRef.current = Date.now();
            resetSilenceTimeout();
          }

          if (interimTranscript) {
            console.log("🎤 Interim transcript:", interimTranscript);
            lastSpeechTimeRef.current = Date.now();
            resetSilenceTimeout();
          }
        };

        recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
          if (event.error === "aborted") {
            return;
          }

          console.log(`⚠️ Speech recognition error: ${event.error}`);

          if (event.error === "no-speech") {
            console.log("No speech detected, checking silence timeout...");
          } else if (event.error === "audio-capture") {
            alert("No microphone found. Please check your microphone.");
            stopListeningAndSend();
          } else if (event.error === "not-allowed") {
            alert("Microphone access denied. Please allow microphone access.");
            stopListeningAndSend();
          } else if (event.error === "network") {
            console.error("❌ Network error in speech recognition");
            if (isListening) {
              setTimeout(() => {
                if (isListening && recognitionRef.current === recognition) {
                  try {
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
            console.warn(
              `⚠️ Speech recognition error (non-critical): ${event.error}`
            );
          }
        };

        const recognitionStartTime = Date.now();
        const MIN_RECOGNITION_DURATION = 500;

        recognition.onend = () => {
          const duration = Date.now() - recognitionStartTime;
          console.log(`🎤 Speech recognition ended (duration: ${duration}ms)`);

          if (duration < MIN_RECOGNITION_DURATION) {
            console.warn(
              "⚠️ Recognition ended too quickly, might be an error. Not restarting."
            );
            if (isListening && recognitionRef.current === recognition) {
              setTimeout(() => {
                if (isListening && recognitionRef.current === recognition) {
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
              }, 1000);
            }
            return;
          }

          if (isListening && recognitionRef.current === recognition) {
            setTimeout(() => {
              if (isListening && recognitionRef.current === recognition) {
                try {
                  recognition.start();
                } catch (error) {
                  if (isListening) {
                    console.error("Failed to restart recognition:", error);
                    stopListeningAndSend();
                  }
                }
              }
            }, 100);
          }
        };

        recognition.start();
        setIsListening(true);
        recognitionResultRef.current = "";
        lastSpeechTimeRef.current = Date.now();

        playStartSound();
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
    }, 100);
  }, [isListening, stopListeningAndSend, playStartSound]);

  // Send message handler
  const handleSendMessage = (textOverride?: string) => {
    const textToSend = textOverride || inputValue;
    if (!textToSend.trim()) return;

    const socket = socketRef.current;

    // User message
    const userMsg: Message = {
      id: Date.now().toString(),
      sender: "user",
      text: textToSend,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInputValue("");
    setShowTextInput(false);

    if (socket && socket.connected) {
      const payload = {
        event: "process_audio",
        data: {
          text: textToSend,
          user_id: "user123",
          avatar: avatar,
        },
      };

      console.log("📤 Sending chat message:", payload);
      socket.emit("process_audio", payload);
    }
  };

  // Handle text input toggle
  const handleTextInputToggle = () => {
    setShowTextInput(!showTextInput);
    if (!showTextInput) {
      // Focus the input after a small delay to ensure it's rendered
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  };

  return (
    <div className="setup-page-root min-h-screen bg-white font-sans flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 p-4 sticky top-0 z-50 shadow-sm">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-xl font-bold text-gray-900">
            Setup with {coachName}
          </h1>
          <p className="text-sm text-gray-500">Let's get you started</p>
        </div>
      </header>

      {/* Chat Messages */}
      <main className="setup-chat-area p-4 bg-gray-50/50">
        <div className="max-w-2xl mx-auto space-y-4">
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

          {/* Listening Indicator */}
          {isListening && (
            <div className="flex justify-center py-4">
              <div
                className={`w-16 h-16 rounded-full flex items-center justify-center ${
                  isMale ? "bg-emerald-500" : "bg-purple-500"
                } animate-pulse shadow-lg`}
              >
                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center animate-ping ${
                      isMale ? "bg-emerald-100" : "bg-purple-100"
                    }`}
                  >
                    <Zap className={`w-6 h-6 ${themeColor}`} />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      <div className="setup-page-avatar-zone">
        <div className="setup-avatar-panel">
          <div className="setup-avatar-inner">
            <AvatarScene
              textToSpeak={messages[messages.length - 1]?.text || ""}
              voiceType={gender as VoiceType}
              isFullScreen={false}
            />
          </div>
        </div>
      </div>
      

      {/* Input Area */}
      <div className="bg-white border-t border-gray-100 p-4 sticky bottom-0 z-50">
        <div className="max-w-2xl mx-auto">
          {/* Text Input (shown when user clicks keyboard icon) */}
          {showTextInput && (
            <div className="mb-3 animate-in slide-in-from-bottom-2">
              <div className="relative flex items-center gap-2">
                <Input
                  ref={inputRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleSendMessage();
                    } else if (e.key === "Escape") {
                      setShowTextInput(false);
                      setInputValue("");
                    }
                  }}
                  placeholder="Type your answer here..."
                  className="flex-1 py-4 rounded-full border-2 border-gray-300 shadow-sm focus-visible:ring-offset-0 focus-visible:ring-2 focus-visible:border-transparent pr-12"
                  autoFocus
                />
                {inputValue && (
                  <Button
                    size="icon"
                    onClick={() => handleSendMessage()}
                    className={`absolute right-2 rounded-full w-9 h-9 ${buttonBg}`}
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-1 ml-2">
                Press Enter to send, Esc to cancel
              </p>
            </div>
          )}

          {/* Primary Input Controls */}
          <div className="flex items-center justify-center gap-3">
            {/* Voice Input Button (Primary) */}
            <Button
              size="lg"
              onClick={handleVoiceInput}
              className={`w-16 h-16 rounded-full shadow-lg transition-all ${
                isListening
                  ? "bg-red-500 hover:bg-red-600 animate-pulse scale-110"
                  : buttonBg
              }`}
            >
              {isListening ? (
                <Mic className="w-6 h-6 fill-white text-white" />
              ) : (
                <Mic className="w-6 h-6 fill-white text-white" />
              )}
            </Button>

            {/* Text Input Toggle Button (Fallback) */}
            <Button
              size="lg"
              variant="outline"
              onClick={handleTextInputToggle}
              className={`w-16 h-16 rounded-full shadow-md border-2 ${
                showTextInput
                  ? "border-gray-400 bg-gray-50"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <Keyboard className="w-6 h-6 text-gray-600" />
            </Button>
          </div>

          {/* Helper Text */}
          {!showTextInput && !isListening && (
            <p className="text-center text-xs text-gray-400 mt-2">
              Tap the microphone to speak, or tap the keyboard to type
            </p>
          )}
          {isListening && (
            <p className="text-center text-xs text-gray-500 mt-2 font-medium">
              🎤 Listening... Speak now or tap again to stop
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
