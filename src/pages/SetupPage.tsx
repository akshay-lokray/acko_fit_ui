import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { io, Socket } from "socket.io-client";
import { Send, Zap, Mic, Keyboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import AvatarScene from "@/components/AvatarScene";
import type { VoiceType } from "@/types/voice";
import { useUserProfileStore } from "@/store/userProfileStore";
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
  const { updateFormData } = useUserProfileStore();
  const location = useLocation();
  const navigate = useNavigate();
  const gender = location.state?.gender || "female";
  const coachName = gender === "male" ? "Dhoni" : "Disha";
  const isMale = gender === "male";

  // State
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isBackgroundListening, setIsBackgroundListening] = useState(false);
  const [isWaitingForResponse, setIsWaitingForResponse] = useState(false);
  const [showTextInput, setShowTextInput] = useState(false);
  const lastCoachMessage = (() => {
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      if (messages[i].sender === "coach") {
        return messages[i].text;
      }
    }
    return "";
  })();
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [selectionConfig, setSelectionConfig] = useState<{
    possibleValues: string[];
    multiSelect: boolean;
    keyName: string;
  } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const [contextState, setContextState] = useState<{
    status?: string;
    keys?: Record<string, unknown>;
  } | null>(null); // Store context from server responses (new structure: {status, keys})

  // Socket and recognition refs
  const socketRef = useRef<Socket | null>(null);
  const SOCKET_URL = "http://192.168.233.159:5000";

  // Refs for functions used in socket event handlers to avoid stale closures
  // Initialize as null, will be set after functions are defined
  const speakTextRef = useRef<((text: string) => void) | null>(null);
  const cleanMessageTextRef = useRef<
    ((text: string, possibleValues?: string[]) => string) | null
  >(null);
  const navigateRef = useRef(navigate);
  const genderRef = useRef(gender);
  const stopListeningAndSendRef = useRef<(() => void) | null>(null);
  const startBackgroundListeningRef = useRef<(() => void) | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const recognitionResultRef = useRef<string>("");
  const interimTranscriptRef = useRef<string>(""); // Store interim transcripts
  const maxListeningTimeoutRef = useRef<number | null>(null);
  const silenceTimeoutRef = useRef<number | null>(null);
  const lastSpeechTimeRef = useRef<number>(0);
  const speechSynthesisRef = useRef<SpeechSynthesisUtterance | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const backgroundRecognitionRef = useRef<SpeechRecognition | null>(null); // For continuous background listening

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

  // Function to stop background listening (when agent starts speaking)
  const stopBackgroundListening = useCallback(() => {
    if (backgroundRecognitionRef.current) {
      try {
        const bgRecognition = backgroundRecognitionRef.current;
        bgRecognition.onend = null;
        bgRecognition.onerror = null;
        bgRecognition.onresult = null;
        backgroundRecognitionRef.current = null;
        bgRecognition.stop();
        console.log("🔇 Stopped background listening (agent is speaking)");
        setIsBackgroundListening(false); // Update state to hide overlay
        // Play end sound to indicate mic is inactive
        playEndSound();
      } catch {
        // Ignore errors
      }
    }
  }, [playEndSound]);

  // Function to start background listening (when agent is not speaking)
  const startBackgroundListening = useCallback(() => {
    // Don't start if already listening explicitly or if agent is speaking
    if (isListening || window.speechSynthesis.speaking) {
      return;
    }

    // Don't start if already running
    if (backgroundRecognitionRef.current) {
      return;
    }

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
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      backgroundRecognitionRef.current = recognition;

      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        // Only process if not explicitly listening and agent is not speaking
        if (isListening || window.speechSynthesis.speaking) {
          return;
        }

        let transcript = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            transcript += event.results[i][0].transcript + " ";
          }
        }

        // If we got a final transcript, automatically send it
        if (
          transcript.trim() &&
          !isListening &&
          !window.speechSynthesis.speaking
        ) {
          console.log("🎤 Background listening detected:", transcript.trim());
          // Stop background listening and start explicit listening
          stopBackgroundListening();
          // Trigger voice input to send the transcript
          recognitionResultRef.current = transcript.trim();
          setIsListening(true);
          stopListeningAndSendRef.current?.();
        }
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        if (event.error === "aborted" || event.error === "no-speech") {
          return; // Ignore these errors
        }
        console.warn("⚠️ Background recognition error:", event.error);
        // Restart background listening on error (except aborted)
        if (
          event.error !== "aborted" &&
          !isListening &&
          !window.speechSynthesis.speaking
        ) {
          backgroundRecognitionRef.current = null;
          setTimeout(() => {
            if (!isListening && !window.speechSynthesis.speaking) {
              startBackgroundListeningRef.current?.();
            }
          }, 1000);
        }
      };

      recognition.onend = () => {
        // Restart if we're still supposed to be listening
        if (
          !isListening &&
          !window.speechSynthesis.speaking &&
          backgroundRecognitionRef.current === recognition
        ) {
          backgroundRecognitionRef.current = null;
          setIsBackgroundListening(false); // Hide overlay while restarting
          setTimeout(() => {
            if (!isListening && !window.speechSynthesis.speaking) {
              startBackgroundListeningRef.current?.();
            }
          }, 200);
        } else {
          setIsBackgroundListening(false); // Hide overlay if not restarting
        }
      };

      recognition.start();
      console.log("👂 Started background listening");
      setIsBackgroundListening(true); // Update state to show overlay
      // Play start sound to indicate mic is active
      playStartSound();
    } catch (error) {
      console.error("Failed to start background listening:", error);
      backgroundRecognitionRef.current = null;
      setIsBackgroundListening(false);
    }
  }, [isListening, stopBackgroundListening, playStartSound]);

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

      // Stop background listening when agent starts speaking
      stopBackgroundListening();

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
          // Resume background listening when agent finishes speaking
          if (!isListening) {
            setTimeout(() => {
              startBackgroundListeningRef.current?.();
            }, 500);
          }
        };

        utterance.onerror = (event) => {
          console.error("❌ Speech synthesis error:", event.error);
          speechSynthesisRef.current = null;
          // Resume background listening on error
          if (!isListening) {
            setTimeout(() => {
              startBackgroundListeningRef.current?.();
            }, 500);
          }
        };

        window.speechSynthesis.speak(utterance);
        console.log("🔊 Speaking response:", text.substring(0, 50) + "...");
      } catch (error) {
        console.error("Failed to speak text:", error);
        // Resume background listening on error
        if (!isListening) {
          setTimeout(() => {
            startBackgroundListeningRef.current?.();
          }, 500);
        }
      }
    },
    [isMale, stopBackgroundListening, isListening]
  );

  // Load voices when available
  useEffect(() => {
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        console.log("🔊 Available voices loaded:", voices.length);
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
  }, []);

  // Update refs when functions are defined
  useEffect(() => {
    startBackgroundListeningRef.current = startBackgroundListening;
  }, [startBackgroundListening]);

  // Start background listening on mount and when agent finishes speaking
  useEffect(() => {
    // Start background listening after a short delay on mount
    const timer = setTimeout(() => {
      if (!isListening && !window.speechSynthesis.speaking) {
        startBackgroundListeningRef.current?.();
      }
    }, 1000);

    return () => {
      clearTimeout(timer);
      // Cleanup background listening on unmount
      if (backgroundRecognitionRef.current) {
        try {
          const bgRecognition = backgroundRecognitionRef.current;
          bgRecognition.onend = null;
          bgRecognition.onerror = null;
          bgRecognition.onresult = null;
          bgRecognition.stop();
        } catch {
          // Ignore errors
        }
        backgroundRecognitionRef.current = null;
      }
    };
  }, [isListening]);

  // Function to parse context and find keys with possible_values
  const checkForSelectionOptions = useCallback(() => {
    const context = contextState;
    console.log("🔍 Checking for selection options. Context:", context);

    if (!context || typeof context !== "object") {
      console.log("❌ No context or invalid context");
      setSelectionConfig(null);
      setSelectedOptions([]);
      return;
    }

    // New structure: context is {status, keys}
    // Check if status is not "completed" and look for keys with possible_values
    if (context.status === "completed") {
      // If completed, clear selection config
      console.log("✅ Context status is completed, clearing selection");
      setSelectionConfig(null);
      setSelectedOptions([]);
      return;
    }

    const keys = context.keys;
    console.log("🔑 Keys object:", keys);

    if (keys && typeof keys === "object") {
      // Find the FIRST key with key_status: "pending"
      for (const [keyName, keyData] of Object.entries(keys)) {
        console.log(`🔎 Checking key: ${keyName}`, keyData);

        if (keyData && typeof keyData === "object" && "key_status" in keyData) {
          const keyStatus = (keyData as { key_status?: string }).key_status;
          console.log(`  Key status: ${keyStatus}`);

          if (keyStatus === "pending") {
            console.log(`✅ Found pending key: ${keyName}`);
            // Found the first pending key, now check if it has possible_values with items
            if (
              "possible_values" in keyData &&
              Array.isArray(
                (keyData as { possible_values?: unknown[] }).possible_values
              )
            ) {
              const possibleValues = (
                keyData as { possible_values?: unknown[] }
              ).possible_values;
              console.log(`  Possible values:`, possibleValues);

              // Only show selection UI if possible_values has items
              if (possibleValues && possibleValues.length > 0) {
                const keyDataTyped = keyData as {
                  possible_values: string[];
                  multi_select?: boolean;
                };
                console.log("📋 Setting selection config:", {
                  keyName,
                  multiSelect: keyDataTyped.multi_select === true,
                  options: keyDataTyped.possible_values,
                });
                setSelectionConfig({
                  possibleValues: keyDataTyped.possible_values,
                  multiSelect: keyDataTyped.multi_select === true,
                  keyName: keyName,
                });
                setSelectedOptions([]);
                return;
              } else {
                // First pending key found but no possible_values or empty array
                // Don't show selection UI, user can use voice/text input
                console.log(
                  `📋 First pending key "${keyName}" found but no selection options (empty array)`
                );
                setSelectionConfig(null);
                setSelectedOptions([]);
                return;
              }
            } else {
              // First pending key found but no possible_values field
              console.log(
                `📋 First pending key "${keyName}" found but no possible_values field`
              );
              setSelectionConfig(null);
              setSelectedOptions([]);
              return;
            }
          }
        }
      }
    }
    // No pending keys found, clear the config
    console.log("❌ No pending keys found");
    setSelectionConfig(null);
    setSelectedOptions([]);
  }, [contextState]);

  // Socket connection - only create once, don't recreate on dependency changes
  useEffect(() => {
    // Check if socket already exists to prevent multiple connections
    if (socketRef.current?.connected) {
      console.log("🔌 Socket already connected, skipping reconnection");
      return;
    }

    const avatar = isMale ? "Dhoni" : "Disha";
    const socket = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: Infinity,
      timeout: 20000,
      forceNew: false,
      withCredentials: false,
      auth: {
        avatar: avatar,
      },
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("✅ Socket.IO connected:", SOCKET_URL);

      // Send start message as soon as connected
      try {
        const avatar = isMale ? "Dhoni" : "Disha";
        const startPayload = {
          data: {
            text: "start",
            context: null,
            avatar: avatar,
          },
        };
        console.log("📤 Sending start message:", startPayload);
        socket.emit("process_journey", startPayload);
      } catch (e) {
        console.warn("Socket.IO start message send failed", e);
      }
    });

    // Listen for 'journey_response' event from server
    // Format: ["journey_response", "{\"data\": {\"text\": \"...\", \"context\": [...]}}"]
    // or just the JSON string directly
    socket.on("journey_response", (...args: unknown[]) => {
      console.log("📥 Received journey_response event:", args);

      try {
        // Handle different formats: array or direct JSON string
        let jsonString: string = "";

        if (Array.isArray(args) && args.length > 0) {
          // If it's an array, the JSON string is typically the second element or the first if it's a string
          if (args.length >= 2 && typeof args[1] === "string") {
            jsonString = args[1];
          } else if (typeof args[0] === "string") {
            jsonString = args[0];
          }
        } else if (typeof args[0] === "string") {
          jsonString = args[0];
        }

        // Parse the JSON string
        let parsedData: unknown;
        if (jsonString) {
          // Check if the string looks like JSON before parsing
          const trimmedJson = jsonString.trim();
          if (
            (trimmedJson.startsWith("{") && trimmedJson.endsWith("}")) ||
            (trimmedJson.startsWith("[") && trimmedJson.endsWith("]"))
          ) {
            try {
              parsedData = JSON.parse(jsonString);
            } catch (parseError) {
              console.error(
                "❌ Failed to parse JSON string:",
                parseError,
                "String:",
                jsonString.substring(0, 100)
              );
              // If it's not valid JSON, treat it as plain text
              parsedData = {
                data: {
                  text: jsonString,
                  context: [],
                },
              };
            }
          } else {
            // Not JSON, treat as plain text
            console.warn(
              "⚠️ Received non-JSON string, treating as plain text:",
              jsonString.substring(0, 100)
            );
            parsedData = {
              data: {
                text: jsonString,
                context: [],
              },
            };
          }
        } else if (args[0] && typeof args[0] === "object") {
          // If it's already an object, use it directly
          parsedData = args[0];
        } else {
          console.warn(
            "⚠️ Could not extract JSON string from journey_response:",
            args
          );
          return;
        }

        console.log("📦 Parsed journey response:", parsedData);

        let journeyText = "";
        let journeyContext: {
          status?: string;
          keys?: Record<string, unknown>;
        } | null = null;

        // Extract text and context from the parsed data
        // New format: {data: {text: "...", context: {status, keys}}}
        if (
          parsedData &&
          typeof parsedData === "object" &&
          parsedData !== null
        ) {
          const data = parsedData as {
            data?: {
              text?: string;
              context?:
                | {
                    status?: string;
                    keys?: Record<string, unknown>;
                  }
                | unknown[];
            };
            text?: string;
            context?:
              | {
                  status?: string;
                  keys?: Record<string, unknown>;
                }
              | unknown[];
          };

          // Check nested format first: {data: {text: "...", context: {status, keys}}}
          if (
            data.data &&
            typeof data.data === "object" &&
            data.data !== null
          ) {
            journeyText = String(data.data.text || "");
            // Context is now an object with {status, keys}, not an array
            if (data.data.context) {
              if (
                typeof data.data.context === "object" &&
                !Array.isArray(data.data.context) &&
                "status" in data.data.context
              ) {
                journeyContext = data.data.context as {
                  status?: string;
                  keys?: Record<string, unknown>;
                };
              } else if (Array.isArray(data.data.context)) {
                // Fallback: if it's still an array, convert to new format
                journeyContext = null;
              }
            }
          } else if (data.text !== undefined || data.context !== undefined) {
            // Handle direct format: {text: "...", context: {status, keys}}
            journeyText = String(data.text || "");
            if (
              data.context &&
              typeof data.context === "object" &&
              !Array.isArray(data.context) &&
              "status" in data.context
            ) {
              journeyContext = data.context as {
                status?: string;
                keys?: Record<string, unknown>;
              };
            }
          }
        }

        // Ensure we have a valid string
        if (!journeyText || journeyText === "[object Object]") {
          console.warn(
            "⚠️ Invalid journey text, attempting to extract from structure:",
            parsedData
          );
          if (
            parsedData &&
            typeof parsedData === "object" &&
            parsedData !== null
          ) {
            const data = parsedData as { data?: { text?: string } };
            if (data.data?.text) {
              journeyText = String(data.data.text);
            } else {
              journeyText =
                "Received a response, but couldn't extract the text.";
            }
          }
        }

        // Store the context for future messages
        if (journeyContext && typeof journeyContext === "object") {
          setContextState(journeyContext);
          console.log(
            "📋 Stored context:",
            JSON.stringify(journeyContext, null, 2)
          );
          // checkForSelectionOptions will be called automatically via useEffect when contextState changes
        }

        // Extract possible values synchronously from context for message cleaning
        let possibleValuesForCleaning: string[] = [];
        if (
          journeyContext &&
          typeof journeyContext === "object" &&
          "keys" in journeyContext
        ) {
          const keys = journeyContext.keys;
          if (keys && typeof keys === "object") {
            for (const keyData of Object.values(keys)) {
              if (
                keyData &&
                typeof keyData === "object" &&
                "possible_values" in keyData &&
                Array.isArray(
                  (keyData as { possible_values?: unknown[] }).possible_values
                )
              ) {
                possibleValuesForCleaning = (
                  keyData as { possible_values: string[] }
                ).possible_values;
                break;
              }
            }
          }
        }

        // Check if status is completed
        const isCompleted =
          journeyContext &&
          typeof journeyContext === "object" &&
          journeyContext.status === "completed";

        // Display the message if available and valid
        if (
          journeyText &&
          journeyText.trim() &&
          journeyText !== "[object Object]"
        ) {
          // Clean the message text to remove options list if selection UI is available
          const cleanedText =
            cleanMessageTextRef.current?.(
              journeyText.trim(),
              possibleValuesForCleaning
            ) || journeyText.trim();
          const journeyMsg: Message = {
            id: Date.now().toString(),
            sender: "coach",
            text: cleanedText,
          };
          setMessages((prev) => [...prev, journeyMsg]);
          setShowTextInput(false);
          setIsWaitingForResponse(false); // Hide loading indicator

          // Speak the cleaned response using text-to-speech
          speakTextRef.current?.(cleanedText);

          // Check if status is completed and redirect to /home
          if (isCompleted) {
            console.log("✅ Setup completed! Redirecting to /home...");

            // Extract and save phone number to localStorage
            if (
              journeyContext?.keys &&
              typeof journeyContext.keys === "object"
            ) {
              const phoneKey = journeyContext.keys.phone;
                if (
                  phoneKey &&
                  typeof phoneKey === "object" &&
                  "value" in phoneKey &&
                  phoneKey.value &&
                  typeof phoneKey.value === "string"
                ) {
                  try {
                    localStorage.setItem("userPhone", phoneKey.value);
                    console.log(
                      "📱 Saved phone number to localStorage:",
                      phoneKey.value
                    );
                    updateFormData({ mobile: phoneKey.value });
                  } catch (error) {
                    console.error(
                      "❌ Failed to save phone number to localStorage:",
                      error
                    );
                  }
                }
            }

            setTimeout(() => {
              if (navigateRef.current) {
                navigateRef.current("/premium", {
                  state: {
                    gender: genderRef.current,
                    formData: contextState?.keys || {},
                  },
                });
              }
            }, 2000); // Small delay to let user see the completion message
          }
        } else {
          console.warn(
            "⚠️ Skipping journey_response message display - invalid or empty text:",
            journeyText
          );
        }
      } catch (error) {
        console.error("Error processing journey_response:", error);
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

      // Handle response with data.text and data.context
      let responseText = "";
      let responseContext: {
        status?: string;
        keys?: Record<string, unknown>;
      } | null = null;

      try {
        if (typeof data === "string") {
          // Check if the string looks like JSON before parsing
          const trimmedData = data.trim();
          if (
            (trimmedData.startsWith("{") && trimmedData.endsWith("}")) ||
            (trimmedData.startsWith("[") && trimmedData.endsWith("]"))
          ) {
          try {
            const parsed = JSON.parse(data);
              // Check if it's the new format with data.data
              if (parsed.data && typeof parsed.data === "object") {
                responseText = String(parsed.data.text || "");
                // Context is now an object with {status, keys}, not an array
                if (
                  parsed.data.context &&
                  typeof parsed.data.context === "object" &&
                  !Array.isArray(parsed.data.context) &&
                  "status" in parsed.data.context
                ) {
                  responseContext = parsed.data.context as {
                    status?: string;
                    keys?: Record<string, unknown>;
                  };
                }
              } else if (parsed.text) {
                responseText = String(parsed.text);
                if (
                  parsed.context &&
                  typeof parsed.context === "object" &&
                  !Array.isArray(parsed.context) &&
                  "status" in parsed.context
                ) {
                  responseContext = parsed.context as {
                    status?: string;
                    keys?: Record<string, unknown>;
                  };
                }
              } else {
                responseText = String(data);
              }
            } catch (parseError) {
              console.error(
                "❌ Failed to parse JSON string in response event:",
                parseError,
                "String:",
                data.substring(0, 100)
              );
              // If it's not valid JSON, treat it as plain text
              responseText = String(data);
            }
          } else {
            // Not JSON, treat as plain text
            responseText = String(data);
          }
        } else if (typeof data === "object" && data !== null) {
          // Check if it's the new format: { data: { text: "...", context: {status, keys} } }
          if (
            data.data &&
            typeof data.data === "object" &&
            data.data !== null
          ) {
            responseText = String(data.data.text || "");
            // Context is now an object with {status, keys}, not an array
            if (
              data.data.context &&
              typeof data.data.context === "object" &&
              !Array.isArray(data.data.context) &&
              "status" in data.data.context
            ) {
              responseContext = data.data.context as {
                status?: string;
                keys?: Record<string, unknown>;
              };
            }
          } else if (data.text !== undefined) {
            // Old format: { text: "..." }
            responseText = String(data.text);
            if (
              data.context &&
              typeof data.context === "object" &&
              !Array.isArray(data.context) &&
              "status" in data.context
            ) {
              responseContext = data.context as {
                status?: string;
                keys?: Record<string, unknown>;
              };
            }
          } else {
            // Fallback: try to stringify the object
            responseText = JSON.stringify(data);
          }
        } else {
          responseText = String(data);
        }
      } catch (error) {
        console.error("Error parsing response:", error);
        responseText =
          typeof data === "object" ? JSON.stringify(data) : String(data);
      }

      // Ensure we have a valid string (not empty and not "[object Object]")
      if (!responseText || responseText === "[object Object]") {
        console.warn(
          "⚠️ Invalid response text, attempting to extract from structure:",
          data
        );
        // Try one more time to extract text
        if (typeof data === "object" && data !== null) {
          if (data.data?.text) {
            responseText = String(data.data.text);
          } else if (data.text) {
            responseText = String(data.text);
          } else {
            responseText =
              "Received a response, but couldn't extract the text.";
          }
        }
      }

      // Store the context for future messages
      if (responseContext && typeof responseContext === "object") {
        setContextState(responseContext);
        console.log(
          "📋 Stored context:",
          JSON.stringify(responseContext, null, 2)
        );
        // checkForSelectionOptions will be called automatically via useEffect when contextState changes
      }

      // Extract possible values synchronously from context for message cleaning
      let possibleValuesForCleaning: string[] = [];
      if (
        responseContext &&
        typeof responseContext === "object" &&
        "keys" in responseContext
      ) {
        const keys = responseContext.keys;
        if (keys && typeof keys === "object") {
          for (const keyData of Object.values(keys)) {
            if (
              keyData &&
              typeof keyData === "object" &&
              "possible_values" in keyData &&
              Array.isArray(
                (keyData as { possible_values?: unknown[] }).possible_values
              )
            ) {
              possibleValuesForCleaning = (
                keyData as { possible_values: string[] }
              ).possible_values;
              break;
            }
          }
        }
      }

      // Check if status is completed
      const isCompleted =
        responseContext &&
        typeof responseContext === "object" &&
        responseContext.status === "completed";

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

      // Only add message if we have valid text
      if (
        responseText &&
        responseText.trim() &&
        responseText !== "[object Object]"
      ) {
        // Clean the message text to remove options list if selection UI is available
        const cleanedText = cleanMessageTextRef.current
          ? cleanMessageTextRef.current(
              responseText.trim(),
              possibleValuesForCleaning
            )
          : responseText.trim();
      const coachMsg: Message = {
        id: Date.now().toString(),
        sender: "coach",
          text: cleanedText,
        };
        setMessages((prev) => [...prev, coachMsg]);
        setShowTextInput(false);
        setIsWaitingForResponse(false); // Hide loading indicator

        // Speak the cleaned response using text-to-speech
        speakText(cleanedText);

        // Check if status is completed and redirect to /home
        if (isCompleted) {
          console.log("✅ Setup completed! Redirecting to /home...");

          // Extract and save phone number to localStorage
          if (
            responseContext?.keys &&
            typeof responseContext.keys === "object"
          ) {
            const phoneKey = responseContext.keys.phone;
            if (
              phoneKey &&
              typeof phoneKey === "object" &&
              "value" in phoneKey &&
              phoneKey.value &&
              typeof phoneKey.value === "string"
            ) {
              try {
                localStorage.setItem("userPhone", phoneKey.value);
                console.log(
                  "📱 Saved phone number to localStorage:",
                  phoneKey.value
                );
              } catch (error) {
                console.error(
                  "❌ Failed to save phone number to localStorage:",
                  error
                );
              }
            }
          }

          setTimeout(() => {
            navigate("/premium", {
              state: {
                gender,
                formData: contextState?.keys || {},
              },
            });
          }, 2000); // Small delay to let user see the completion message
        }
      } else {
        console.warn(
          "⚠️ Skipping message display - invalid or empty text:",
          responseText
        );
      }
    });

    // Listen for 'process_journey' event from server
    socket.on("process_journey", (data) => {
      console.log("📥 Received process_journey event:", data);

      // Handle the journey data
      try {
        // Log the journey data for debugging
        console.log("🎯 Journey data:", JSON.stringify(data, null, 2));

        let journeyText = "";
        let journeyContext: {
          status?: string;
          keys?: Record<string, unknown>;
        } | null = null;

        // Parse the response format: { data: { text: "...", context: {status, keys} } }
        if (data && typeof data === "object" && data !== null) {
          if (
            data.data &&
            typeof data.data === "object" &&
            data.data !== null
          ) {
            journeyText = String(data.data.text || "");
            // Context is now an object with {status, keys}, not an array
            if (
              data.data.context &&
              typeof data.data.context === "object" &&
              !Array.isArray(data.data.context) &&
              "status" in data.data.context
            ) {
              journeyContext = data.data.context as {
                status?: string;
                keys?: Record<string, unknown>;
              };
            }
          } else if (data.text !== undefined) {
            journeyText = String(data.text);
            if (
              data.context &&
              typeof data.context === "object" &&
              !Array.isArray(data.context) &&
              "status" in data.context
            ) {
              journeyContext = data.context as {
                status?: string;
                keys?: Record<string, unknown>;
              };
            }
          }
        }

        // Ensure we have a valid string
        if (!journeyText || journeyText === "[object Object]") {
          console.warn(
            "⚠️ Invalid journey text, attempting to extract from structure:",
            data
          );
          if (data && typeof data === "object" && data !== null) {
            if (data.data?.text) {
              journeyText = String(data.data.text);
            } else if (data.text) {
              journeyText = String(data.text);
            } else {
              journeyText =
                "Received a response, but couldn't extract the text.";
            }
          }
        }

        // Store the context for future messages
        if (journeyContext && typeof journeyContext === "object") {
          setContextState(journeyContext);
          console.log(
            "📋 Stored context:",
            JSON.stringify(journeyContext, null, 2)
          );
          // checkForSelectionOptions will be called automatically via useEffect when contextState changes
        }

        // Extract possible values synchronously from context for message cleaning
        let possibleValuesForCleaning: string[] = [];
        if (
          journeyContext &&
          typeof journeyContext === "object" &&
          "keys" in journeyContext
        ) {
          const keys = journeyContext.keys;
          if (keys && typeof keys === "object") {
            for (const keyData of Object.values(keys)) {
              if (
                keyData &&
                typeof keyData === "object" &&
                "possible_values" in keyData &&
                Array.isArray(
                  (keyData as { possible_values?: unknown[] }).possible_values
                )
              ) {
                possibleValuesForCleaning = (
                  keyData as { possible_values: string[] }
                ).possible_values;
                break;
              }
            }
          }
        }

        // Check if status is completed
        const isCompleted =
          journeyContext &&
          typeof journeyContext === "object" &&
          journeyContext.status === "completed";

        // Display the message if available and valid
        if (
          journeyText &&
          journeyText.trim() &&
          journeyText !== "[object Object]"
        ) {
          // Clean the message text to remove options list if selection UI is available
          const cleanedText =
            cleanMessageTextRef.current?.(
              journeyText.trim(),
              possibleValuesForCleaning
            ) || journeyText.trim();
          const journeyMsg: Message = {
            id: Date.now().toString(),
            sender: "coach",
            text: cleanedText,
          };
          setMessages((prev) => [...prev, journeyMsg]);
          setIsWaitingForResponse(false); // Hide loading indicator
          speakText(cleanedText);

          // Check if status is completed and redirect to /home
          if (isCompleted) {
            console.log("✅ Setup completed! Redirecting to /home...");

            // Extract and save phone number to localStorage
            if (
              journeyContext?.keys &&
              typeof journeyContext.keys === "object"
            ) {
              const phoneKey = journeyContext.keys.phone;
              if (
                phoneKey &&
                typeof phoneKey === "object" &&
                "value" in phoneKey &&
                phoneKey.value &&
                typeof phoneKey.value === "string"
              ) {
                try {
                  localStorage.setItem("userPhone", phoneKey.value);
                  console.log(
                    "📱 Saved phone number to localStorage:",
                    phoneKey.value
                  );
                } catch (error) {
                  console.error(
                    "❌ Failed to save phone number to localStorage:",
                    error
                  );
                }
              }
            }

            setTimeout(() => {
              if (navigateRef.current) {
                navigateRef.current("/premium", {
                  state: {
                    gender: genderRef.current,
                    formData: contextState?.keys || {},
                  },
                });
              }
            }, 2000); // Small delay to let user see the completion message
          }
        } else {
          console.warn(
            "⚠️ Skipping journey message display - invalid or empty text:",
            journeyText
          );
        }
      } catch (error) {
        console.error("Error processing journey data:", error);
      }
    });

    return () => {
      // Only disconnect on component unmount, not on dependency changes
      if (socket && socket.connected) {
        try {
          socket.emit("disconnect", { type: "disconnect" });
        } catch (e) {
          console.warn("Socket.IO disconnect event send failed", e);
        }
        socket.disconnect();
      socketRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount, dependencies are accessed via refs/state

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
    // Use final transcript if available, otherwise fall back to interim transcript
    const finalText = recognitionResultRef.current.trim();
    const interimText = interimTranscriptRef.current.trim();
    const textToSend = finalText || interimText;

    if (textToSend && socket && socket.connected) {
      // Add user message to chat
      const userMsg: Message = {
        id: Date.now().toString(),
        sender: "user",
        text: textToSend,
      };
      setMessages((prev) => [...prev, userMsg]);

      const avatar = isMale ? "Dhoni" : "Disha";
      const payload = {
        data: {
          text: textToSend,
          context: contextState, // Include the stored context
          avatar: avatar,
        },
      };

      console.log("📤 Sending transcribed text:", payload);
      if (interimText && !finalText) {
        console.log(
          "⚠️ Using interim transcript as final transcript was not available"
        );
      }
      socket.emit("process_journey", payload);
      setIsWaitingForResponse(true); // Show loading indicator
      recognitionResultRef.current = "";
      interimTranscriptRef.current = "";
    }

    // Play end sound
    playEndSound();

    // Resume background listening after sending (if agent is not speaking)
    if (!window.speechSynthesis.speaking) {
      setTimeout(() => {
        startBackgroundListeningRef.current?.();
      }, 1000);
    }
  }, [playEndSound, contextState, isMale]);

  // Update stopListeningAndSend ref
  useEffect(() => {
    stopListeningAndSendRef.current = stopListeningAndSend;
  }, [stopListeningAndSend]);

  // Update stopListeningAndSend ref
  useEffect(() => {
    stopListeningAndSendRef.current = stopListeningAndSend;
  }, [stopListeningAndSend]);

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

    // Stop any ongoing speech synthesis when user clicks mic (mic takes priority)
    if (window.speechSynthesis.speaking) {
      console.log("🔇 Stopping speech synthesis - microphone activated");
      window.speechSynthesis.cancel();
      if (speechSynthesisRef.current) {
        speechSynthesisRef.current = null;
      }
    }

    // Stop background listening when user explicitly clicks mic
    stopBackgroundListening();

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
            interimTranscriptRef.current = ""; // Clear interim when we get final
            console.log("🎤 Final transcript:", finalTranscript);
            lastSpeechTimeRef.current = Date.now();
            resetSilenceTimeout();
          }

          if (interimTranscript) {
            interimTranscriptRef.current = interimTranscript; // Store interim transcript
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
          } else {
            // If not listening anymore, resume background listening
            if (!window.speechSynthesis.speaking) {
              setTimeout(() => {
                startBackgroundListeningRef.current?.();
              }, 500);
            }
          }
        };

        recognition.start();
        setIsListening(true);
        recognitionResultRef.current = "";
        interimTranscriptRef.current = ""; // Clear interim transcript on start
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
  }, [
    isListening,
    stopListeningAndSend,
    playStartSound,
    stopBackgroundListening,
  ]);

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
      const avatar = isMale ? "Dhoni" : "Disha";
      const payload = {
        data: {
          text: textToSend,
          context: contextState, // Include the stored context
          avatar: avatar,
        },
      };

      console.log("📤 Sending chat message:", payload);
      socket.emit("process_journey", payload);
      setIsWaitingForResponse(true); // Show loading indicator
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

  // Watch for context changes and check for selection options
  useEffect(() => {
    if (contextState) {
      checkForSelectionOptions();
    }
  }, [contextState, checkForSelectionOptions]);

  // Auto-scroll to show latest message near the top
  useEffect(() => {
    if (chatContainerRef.current && messagesEndRef.current) {
      // Small delay to ensure DOM is updated
      setTimeout(() => {
        if (chatContainerRef.current && messagesEndRef.current) {
          const scrollOffset = 20; // Space from top in pixels
          const elementTop = messagesEndRef.current.offsetTop;

          // Scroll to show the latest message near the top with some offset
          chatContainerRef.current.scrollTo({
            top: elementTop - scrollOffset,
            behavior: "smooth",
          });
        }
      }, 100);
    }
  }, [messages, isWaitingForResponse, selectionConfig]);

  // Handle option selection
  const handleOptionToggle = (option: string) => {
    if (!selectionConfig) return;

    if (selectionConfig.multiSelect) {
      // Multi-select: toggle the option
      setSelectedOptions((prev) =>
        prev.includes(option)
          ? prev.filter((o) => o !== option)
          : [...prev, option]
      );
    } else {
      // Single-select: replace the selection
      setSelectedOptions([option]);
    }
  };

  // Handle submit selection
  const handleSubmitSelection = () => {
    if (!selectionConfig || selectedOptions.length === 0) return;

    const socket = socketRef.current;
    if (!socket || !socket.connected) return;

    // Format the response based on multi-select
    const responseText = selectionConfig.multiSelect
      ? selectedOptions.join(", ")
      : selectedOptions[0];

    // Add user message to chat
    const userMsg: Message = {
      id: Date.now().toString(),
      sender: "user",
      text: responseText,
    };
    setMessages((prev) => [...prev, userMsg]);

    // Send the selection to the server
    const avatar = isMale ? "Dhoni" : "Disha";
    const payload = {
      data: {
        text: responseText,
        context: contextState,
        avatar: avatar,
      },
    };

    console.log("📤 Sending selection:", payload);
    socket.emit("process_journey", payload);
    setIsWaitingForResponse(true); // Show loading indicator

    // Clear selection UI
    setSelectionConfig(null);
    setSelectedOptions([]);
  };

  return (
    <div className="setup-page-root min-h-screen bg-white font-sans flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 p-4 sticky top-0 z-50 shadow-sm">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-xl font-bold text-gray-900">
            Setup your profile with {coachName}
          </h1>
          <p className="text-sm text-gray-500">Let's get you started</p>
        </div>
      </header>

      {/* Chat Messages */}
      <main className="setup-chat-area p-4 bg-gray-50/50">
        <div
          ref={chatContainerRef}
          className="max-w-2xl mx-auto space-y-4 overflow-y-auto"
          style={{ maxHeight: "calc(100vh - 300px)", paddingTop: "20px" }}
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
                    : "bg-white border border-gray-100 shadow-sm text-gray-800 rounded-bl-none"
                }`}
              >
                {msg.text}
              </div>
            </div>
          ))}

          {/* Loading indicator when waiting for response */}
          {isWaitingForResponse && (
            <div className="flex justify-start">
              <div className="max-w-[80%] rounded-2xl p-4 bg-white border border-gray-100 shadow-sm rounded-bl-none">
                <div className="flex items-center gap-1">
                  <div className="flex gap-1">
                    <div
                      className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                      style={{ animationDelay: "0ms" }}
                    ></div>
                    <div
                      className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                      style={{ animationDelay: "150ms" }}
                    ></div>
                    <div
                      className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                      style={{ animationDelay: "300ms" }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Listening Indicator - Explicit Listening */}
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

          {/* Background Listening Indicator - Always On Mic */}
          {isBackgroundListening && !isListening && (
            <div className="flex justify-center py-4">
              <div className="flex flex-col items-center gap-2">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    isMale ? "bg-emerald-400/70" : "bg-purple-400/70"
                  } shadow-md`}
                >
                  <Mic className={`w-6 h-6 ${themeColor}`} />
                </div>
                <p className="text-xs text-gray-500 font-medium">
                  🎤 Mic is active - You can speak anytime
                </p>
              </div>
            </div>
          )}

          {/* Selection Options UI - Only show when keyboard input is active */}
          {selectionConfig && showTextInput && (
            <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
              <p className="text-sm font-medium text-gray-700 mb-3">
                {selectionConfig.multiSelect
                  ? "Select one or more options:"
                  : "Select an option:"}
              </p>
              <div className="space-y-2 mb-4">
                {selectionConfig.possibleValues.map((option) => {
                  const isSelected = selectedOptions.includes(option);
                  return (
                    <label
                      key={option}
                      className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                        isSelected
                          ? isMale
                            ? "border-emerald-500 bg-emerald-50"
                            : "border-purple-500 bg-purple-50"
                          : "border-gray-200 hover:border-gray-300 bg-white"
                      }`}
                    >
                      <input
                        type={
                          selectionConfig.multiSelect ? "checkbox" : "radio"
                        }
                        checked={isSelected}
                        onChange={() => handleOptionToggle(option)}
                        className={`w-5 h-5 ${
                          selectionConfig.multiSelect
                            ? "rounded"
                            : "rounded-full"
                        } ${
                          isMale
                            ? "text-emerald-600 focus:ring-emerald-500"
                            : "text-purple-600 focus:ring-purple-500"
                        } cursor-pointer`}
                      />
                      <span
                        className={`flex-1 text-sm ${
                          isSelected ? "font-medium" : "font-normal"
                        } text-gray-800`}
                      >
                        {option}
                      </span>
                    </label>
                  );
                })}
              </div>
              <Button
                onClick={handleSubmitSelection}
                disabled={selectedOptions.length === 0}
                className={`w-full ${buttonBg} disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                Submit
              </Button>
            </div>
          )}

          {/* Invisible element to scroll to */}
          <div ref={messagesEndRef} />
        </div>
      </main>
      
      <div className="setup-page-avatar-zone">
        <div className="setup-avatar-panel">
          <div className="setup-avatar-inner">
            <AvatarScene
              textToSpeak={
                messages
                  .slice()
                  .reverse()
                  .find((msg) => msg.sender === "coach")?.text || ""
              }
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
          {!showTextInput && !isListening && !isBackgroundListening && (
            <p className="text-center text-xs text-gray-400 mt-2">
              Tap the microphone to speak, or tap the keyboard to type
            </p>
          )}
          {isBackgroundListening && !isListening && (
            <p className="text-center text-xs text-emerald-600 mt-2 font-medium">
              🎤 Mic is active - You can speak anytime
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
