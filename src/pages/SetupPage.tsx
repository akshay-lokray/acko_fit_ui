import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Socket } from "socket.io-client";
import { Send, Zap, Mic, Keyboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import AvatarScene from "@/components/AvatarScene";
import type { VoiceType } from "@/types/voice";
import { useUserProfileStore } from "@/store/userProfileStore";
import { useSocket } from "@/contexts/SocketContext";
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

const HARD_CODED_USER_ID = "9795784244";

export function SetupPage() {
  const { updateFormData } = useUserProfileStore();
  const location = useLocation();
  const navigate = useNavigate();
  const gender = location.state?.gender || "female";
  const coachName = gender === "male" ? "Dhoni" : "Disha";
  const isMale = gender === "male";

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem("visitedSetup", "true");
    }
  }, []);

  // State
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isWaitingForResponse, setIsWaitingForResponse] = useState(false);
  const [isWaitingForInitialResponse, setIsWaitingForInitialResponse] =
    useState(true);
  const [showTextInput, setShowTextInput] = useState(false);
  const processedMessageIdsRef = useRef<Set<string>>(new Set()); // Track processed messages to prevent duplicates
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
  const [isJourneyCompleted, setIsJourneyCompleted] = useState(false); // Track if journey is completed

  // Socket from context
  const { socket: contextSocket } = useSocket();
  const socketRef = useRef<Socket | null>(contextSocket);

  // Refs for functions used in socket event handlers to avoid stale closures
  // Initialize as null, will be set after functions are defined
  const speakTextRef = useRef<((text: string) => void) | null>(null);
  const navigateRef = useRef(navigate);
  const genderRef = useRef(gender);
  const stopListeningAndSendRef = useRef<(() => void) | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const recognitionResultRef = useRef<string>("");
  const interimTranscriptRef = useRef<string>(""); // Store interim transcripts
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
        return Promise.resolve();
      }

      if (!("speechSynthesis" in window)) {
        console.warn("Speech synthesis not supported");
        return Promise.resolve();
      }

      if (speechSynthesisRef.current) {
        window.speechSynthesis.cancel();
      }

      return new Promise<void>((resolve) => {
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
              const englishVoices = voices.filter((v) =>
                v.lang.startsWith("en")
              );
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
            resolve();
          };

          utterance.onerror = (event) => {
            console.error("❌ Speech synthesis error:", event.error);
            speechSynthesisRef.current = null;
            resolve();
          };

          window.speechSynthesis.speak(utterance);
          console.log("🔊 Speaking response:", text.substring(0, 50) + "...");
        } catch (error) {
          console.error("Failed to speak text:", error);
          resolve();
        }
      });
    },
    [isMale]
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
    speakTextRef.current = speakText;
  }, [speakText]);

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

  // Update socket ref when context socket changes
  useEffect(() => {
    socketRef.current = contextSocket;
  }, [contextSocket]);

  // Track if start message has been sent to prevent duplicates
  const startMessageSentRef = useRef(false);

  // Send start message when SetupPage mounts and socket is connected
  useEffect(() => {
    if (!contextSocket) {
      console.log("⏳ Waiting for socket connection...");
      return;
    }

    // Function to send start message
    const sendStartMessage = () => {
      // Prevent sending multiple times
      if (startMessageSentRef.current) {
        console.log("⚠️ Start message already sent, skipping...");
        return;
      }

      try {
        const avatar = isMale ? "Dhoni" : "Disha";
        const startPayload = {
          data: {
            text: "start",
            context: null,
            avatar: avatar,
          },
        };
        console.log("📤 Sending start message from SetupPage:", startPayload);
        contextSocket.emit("process_journey", startPayload);
        setIsWaitingForInitialResponse(true); // Show loader for initial message
        startMessageSentRef.current = true; // Mark as sent
      } catch (e) {
        console.warn("Socket.IO start message send failed", e);
      }
    };

    // If socket is already connected, send immediately
    if (contextSocket.connected) {
      console.log("✅ Socket already connected, sending start message");
      sendStartMessage();
    } else {
      console.log("⏳ Socket not connected yet, waiting for connection...");
      // Socket not connected yet, wait for connection
      const onConnect = () => {
        console.log("✅ Socket connected, sending start message");
        sendStartMessage();
      };

      contextSocket.on("connect", onConnect);

      return () => {
        contextSocket.off("connect", onConnect);
      };
    }
  }, [contextSocket, isMale]);

  // Socket event listeners - only set up once
  useEffect(() => {
    if (!contextSocket) {
      return;
    }

    // Listen for 'journey_response' event from server
    // Format: ["journey_response", "{\"data\": {\"text\": \"...\", \"context\": [...]}}"]
    // or just the JSON string directly
    const handleJourneyResponse = (...args: unknown[]) => {
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
          // Use the text exactly as received without any processing
          const rawText = journeyText;
          const journeyMsg: Message = {
            id: Date.now().toString(),
            sender: "coach",
            text: rawText,
          };
          setMessages((prev) => [...prev, journeyMsg]);
          setShowTextInput(false);
          setIsWaitingForResponse(false); // Hide loading indicator
          setIsWaitingForInitialResponse(false); // Hide initial loading indicator

          // Speak the text exactly as received
          speakText(rawText);

          // Extract and save phone number to localStorage
          if (journeyContext?.keys && typeof journeyContext.keys === "object") {
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
            } else {
              // Fallback to hardcoded user ID if phone number is not available
              try {
                localStorage.setItem("userPhone", HARD_CODED_USER_ID);
                console.log(
                  "📱 Saved hardcoded phone number to localStorage:",
                  HARD_CODED_USER_ID
                );
                updateFormData({ mobile: HARD_CODED_USER_ID });
              } catch (error) {
                console.error(
                  "❌ Failed to save hardcoded phone number to localStorage:",
                  error
                );
              }
            }
          } else {
            // Fallback to hardcoded user ID if context is not available
            try {
              localStorage.setItem("userPhone", HARD_CODED_USER_ID);
              console.log(
                "📱 Saved hardcoded phone number to localStorage:",
                HARD_CODED_USER_ID
              );
              updateFormData({ mobile: HARD_CODED_USER_ID });
            } catch (error) {
              console.error(
                "❌ Failed to save hardcoded phone number to localStorage:",
                error
              );
            }
          }

          // Check if status is completed - wait for plan_creation_response
          if (isCompleted) {
            console.log(
              "✅ Setup completed! Waiting for plan_creation_response..."
            );
            setIsJourneyCompleted(true);
            // Don't redirect here - wait for plan_creation_response event
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
    };

    contextSocket.on("journey_response", handleJourneyResponse);

    const handleConnectError = (error: Error) => {
      console.error("❌ Socket.IO connection error:", {
        error: error.message,
        connected: contextSocket.connected,
      });
    };

    const handleError = (error: unknown) => {
      console.error("❌ Socket.IO error:", {
        error,
        connected: contextSocket.connected,
      });
    };

    // Listen for 'response' event from server
    const handleResponse = (data: unknown) => {
      console.log("📥 Received response event:", data);

      // Check if it's audio/media data
      if (
        data instanceof Blob ||
        data instanceof ArrayBuffer ||
        (typeof data === "object" &&
          data !== null &&
          "type" in data &&
          (data as { type?: string }).type === "audio")
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
          const dataObj = data as {
            data?: { text?: string; context?: unknown };
            text?: string;
            context?: unknown;
          };
          // Check if it's the new format: { data: { text: "...", context: {status, keys} } }
          if (
            dataObj.data &&
            typeof dataObj.data === "object" &&
            dataObj.data !== null
          ) {
            responseText = String(dataObj.data.text || "");
            // Context is now an object with {status, keys}, not an array
            if (
              dataObj.data.context &&
              typeof dataObj.data.context === "object" &&
              !Array.isArray(dataObj.data.context) &&
              "status" in dataObj.data.context
            ) {
              responseContext = dataObj.data.context as {
                status?: string;
                keys?: Record<string, unknown>;
              };
            }
          } else if (dataObj.text !== undefined) {
            // Old format: { text: "..." }
            responseText = String(dataObj.text);
            if (
              dataObj.context &&
              typeof dataObj.context === "object" &&
              !Array.isArray(dataObj.context) &&
              "status" in dataObj.context
            ) {
              responseContext = dataObj.context as {
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
          const dataObj = data as { data?: { text?: string }; text?: string };
          if (dataObj.data?.text) {
            responseText = String(dataObj.data.text);
          } else if (dataObj.text) {
            responseText = String(dataObj.text);
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
        // Use the text exactly as received without any processing
        const rawText = responseText;

        // Check if we've already processed this message
        if (processedMessageIdsRef.current.has(rawText)) {
          console.log(
            "⚠️ Duplicate message detected, skipping:",
            rawText.substring(0, 50)
          );
          setIsWaitingForInitialResponse(false);
          setIsWaitingForResponse(false);
          return;
        }

        processedMessageIdsRef.current.add(rawText);

        const coachMsg: Message = {
          id: `${rawText.substring(0, 50)}-${Date.now()}`,
          sender: "coach",
          text: rawText,
        };
        setMessages((prev) => [...prev, coachMsg]);
        setShowTextInput(false);
        setIsWaitingForResponse(false); // Hide loading indicator
        setIsWaitingForInitialResponse(false); // Hide initial loading indicator

        // Speak the text exactly as received
        speakText(rawText);

        // Check if status is completed - wait for plan_creation_response
        if (isCompleted) {
          console.log(
            "✅ Setup completed! Waiting for plan_creation_response..."
          );
          setIsJourneyCompleted(true);
          // Don't redirect here - wait for plan_creation_response event
        }
      } else {
        console.warn(
          "⚠️ Skipping message display - invalid or empty text:",
          responseText
        );
      }
    };

    // Listen for 'process_journey' event from server
    const handleProcessJourney = (data: unknown) => {
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
          const dataObj = data as {
            data?: { text?: string; context?: unknown };
            text?: string;
            context?: unknown;
          };
          if (
            dataObj.data &&
            typeof dataObj.data === "object" &&
            dataObj.data !== null
          ) {
            journeyText = String(dataObj.data.text || "");
            // Context is now an object with {status, keys}, not an array
            if (
              dataObj.data.context &&
              typeof dataObj.data.context === "object" &&
              !Array.isArray(dataObj.data.context) &&
              "status" in dataObj.data.context
            ) {
              journeyContext = dataObj.data.context as {
                status?: string;
                keys?: Record<string, unknown>;
              };
            }
          } else if (dataObj.text !== undefined) {
            journeyText = String(dataObj.text);
            if (
              dataObj.context &&
              typeof dataObj.context === "object" &&
              !Array.isArray(dataObj.context) &&
              "status" in dataObj.context
            ) {
              journeyContext = dataObj.context as {
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
            const dataObj = data as { data?: { text?: string }; text?: string };
            if (dataObj.data?.text) {
              journeyText = String(dataObj.data.text);
            } else if (dataObj.text) {
              journeyText = String(dataObj.text);
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
          // Use the text exactly as received without any processing
          const rawText = journeyText;

          // Check if we've already processed this message
          if (processedMessageIdsRef.current.has(rawText)) {
            console.log(
              "⚠️ Duplicate message detected, skipping:",
              rawText.substring(0, 50)
            );
            setIsWaitingForInitialResponse(false);
            setIsWaitingForResponse(false);
            return;
          }

          processedMessageIdsRef.current.add(rawText);

          const journeyMsg: Message = {
            id: `${rawText.substring(0, 50)}-${Date.now()}`,
            sender: "coach",
            text: rawText,
          };
          setMessages((prev) => [...prev, journeyMsg]);
          setIsWaitingForResponse(false); // Hide loading indicator
          setIsWaitingForInitialResponse(false); // Hide initial loading indicator
          speakText(rawText);

          // Check if status is completed - wait for plan_creation_response
          if (isCompleted) {
            console.log(
              "✅ Setup completed! Waiting for plan_creation_response..."
            );
            setIsJourneyCompleted(true);
            // Don't redirect here - wait for plan_creation_response event
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
    };

    // Listen for 'plan_creation_response' event - received when journey is completed
    const handlePlanCreationResponse = (data: unknown) => {
      console.log("📥 Received plan_creation_response event:", data);

      try {
        let planText = "";

        // Parse the response - could be string, object, or array
        if (typeof data === "string") {
          // Check if it's JSON
          const trimmedData = data.trim();
          if (
            (trimmedData.startsWith("{") && trimmedData.endsWith("}")) ||
            (trimmedData.startsWith("[") && trimmedData.endsWith("]"))
          ) {
            try {
              const parsed = JSON.parse(data);
              // Extract text from various possible structures
              if (
                parsed.data &&
                typeof parsed.data === "object" &&
                parsed.data.text
              ) {
                planText = String(parsed.data.text);
              } else if (parsed.text) {
                planText = String(parsed.text);
              } else if (Array.isArray(parsed) && parsed.length > 0) {
                // Handle array format: ["plan_creation_response", "{\"text\": \"...\"}"]
                const secondElement = parsed[1];
                if (typeof secondElement === "string") {
                  try {
                    const innerParsed = JSON.parse(secondElement);
                    planText = String(
                      innerParsed.data?.text || innerParsed.text || ""
                    );
                  } catch {
                    planText = secondElement;
                  }
                }
              } else {
                planText = String(data);
              }
            } catch {
              planText = String(data);
            }
          } else {
            planText = String(data);
          }
        } else if (typeof data === "object" && data !== null) {
          const dataObj = data as {
            data?: { text?: string };
            text?: string;
          };
          if (dataObj.data?.text) {
            planText = String(dataObj.data.text);
          } else if (dataObj.text) {
            planText = String(dataObj.text);
          } else {
            planText = JSON.stringify(data);
          }
        } else {
          planText = String(data);
        }

        // Ensure we have valid text
        if (
          !planText ||
          planText.trim() === "" ||
          planText === "[object Object]"
        ) {
          console.warn("⚠️ Invalid plan text, using default message");
          planText = "Your plan has been created successfully!";
        }

        console.log("📋 Plan creation text:", planText);

        // Display the plan message in chat - use text exactly as received
        const planMsg: Message = {
          id: `plan-${Date.now()}`,
          sender: "coach",
          text: planText,
        };
        setMessages((prev) => [...prev, planMsg]);
        setIsWaitingForResponse(false);
        setIsWaitingForInitialResponse(false);

        // Speak the plan text exactly as received
        speakText(planText);

        // Extract and save phone number to localStorage if not already saved
        if (contextState?.keys && typeof contextState.keys === "object") {
          const phoneKey = contextState.keys.phone;
          if (
            phoneKey &&
            typeof phoneKey === "object" &&
            "value" in phoneKey &&
            phoneKey.value &&
            typeof phoneKey.value === "string"
          ) {
            try {
              const phoneValue = String(phoneKey.value);
              if (!localStorage.getItem("userPhone")) {
                localStorage.setItem("userPhone", phoneValue);
                console.log(
                  "📱 Saved phone number to localStorage:",
                  phoneValue
                );
                updateFormData({ mobile: phoneValue });
              }
            } catch (error) {
              console.error(
                "❌ Failed to save phone number to localStorage:",
                error
              );
            }
          } else {
            // Fallback to hardcoded user ID if phone number is not available
            try {
              if (!localStorage.getItem("userPhone")) {
                localStorage.setItem("userPhone", HARD_CODED_USER_ID);
                console.log(
                  "📱 Saved hardcoded phone number to localStorage:",
                  HARD_CODED_USER_ID
                );
                updateFormData({ mobile: HARD_CODED_USER_ID });
              }
            } catch (error) {
              console.error(
                "❌ Failed to save hardcoded phone number to localStorage:",
                error
              );
            }
          }
        } else {
          // Fallback to hardcoded user ID if context is not available
          try {
            if (!localStorage.getItem("userPhone")) {
              localStorage.setItem("userPhone", HARD_CODED_USER_ID);
              console.log(
                "📱 Saved hardcoded phone number to localStorage:",
                HARD_CODED_USER_ID
              );
              updateFormData({ mobile: HARD_CODED_USER_ID });
            }
          } catch (error) {
            console.error(
              "❌ Failed to save hardcoded phone number to localStorage:",
              error
            );
          }
        }

        // Mark journey as completed to show Done button
        setIsJourneyCompleted(true);
      } catch (error) {
        console.error("❌ Error processing plan_creation_response:", error);
      }
    };

    // Set up all event listeners
    contextSocket.on("connect_error", handleConnectError);
    contextSocket.on("error", handleError);
    contextSocket.on("response", handleResponse);
    contextSocket.on("process_journey", handleProcessJourney);
    contextSocket.on("plan_creation_response", handlePlanCreationResponse);

    return () => {
      // Clean up event listeners when component unmounts
      contextSocket.off("journey_response", handleJourneyResponse);
      contextSocket.off("connect_error", handleConnectError);
      contextSocket.off("error", handleError);
      contextSocket.off("response", handleResponse);
      contextSocket.off("process_journey", handleProcessJourney);
      contextSocket.off("plan_creation_response", handlePlanCreationResponse);
    };
  }, [
    contextSocket,
    isMale,
    gender,
    navigate,
    contextState,
    updateFormData,
    speakText,
  ]);

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
      // Use setTimeout to avoid calling setState synchronously in effect
      setTimeout(() => {
        checkForSelectionOptions();
      }, 0);
    }
  }, [contextState, checkForSelectionOptions]);

  // Auto-scroll to bottom when new message is added
  useEffect(() => {
    if (chatContainerRef.current && messagesEndRef.current) {
      // Small delay to ensure DOM is updated
      setTimeout(() => {
        if (chatContainerRef.current && messagesEndRef.current) {
          // Scroll to the bottom to show the latest message
          chatContainerRef.current.scrollTo({
            top: chatContainerRef.current.scrollHeight,
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

  // Handle Done button click - redirect to premium page
  const handleDoneClick = () => {
    // Stop any ongoing speech
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
      if (speechSynthesisRef.current) {
        speechSynthesisRef.current.onend = null;
        speechSynthesisRef.current.onerror = null;
        speechSynthesisRef.current.onstart = null;
        speechSynthesisRef.current = null;
      }
    }

    // Redirect to premium page
    if (navigateRef.current) {
      navigateRef.current("/premium", {
        state: {
          gender: genderRef.current,
          formData: contextState?.keys || {},
        },
      });
    } else {
      navigate("/premium", {
        state: {
          gender,
          formData: contextState?.keys || {},
        },
      });
    }
  };

  return (
    <div className="setup-page-root h-screen bg-white font-sans flex flex-col overflow-hidden">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 p-4 flex-shrink-0 z-50 shadow-sm">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-xl font-bold text-gray-900">
            Setup your profile with {coachName}
          </h1>
          <p className="text-sm text-gray-500">Let's get you started</p>
        </div>
      </header>

      {/* Chat Messages - Takes available space */}
      <main className="flex-1 min-h-0 overflow-hidden flex flex-col bg-gray-50/50">
        <div
          ref={chatContainerRef}
          className="flex-1 overflow-y-auto p-4 pb-24"
        >
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

            {/* Loading indicator when waiting for response (including initial) */}
            {(isWaitingForResponse || isWaitingForInitialResponse) && (
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
        </div>
      </main>

      {/* Avatar Zone - Fixed at bottom */}
      <div className="setup-page-avatar-zone flex-shrink-0">
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

      {/* Input Area - Fixed at bottom */}
      <div className="bg-white border-t border-gray-100 p-4 flex-shrink-0 z-50">
        <div className="max-w-2xl mx-auto">
          {/* Done Button - Show when journey is completed */}
          {isJourneyCompleted ? (
            <div className="flex flex-col items-center gap-3">
              <Button
                size="lg"
                onClick={handleDoneClick}
                className={`w-full max-w-xs py-6 text-lg font-semibold rounded-full shadow-lg ${buttonBg}`}
              >
                Done
              </Button>
              <p className="text-center text-xs text-gray-500">
                Click Done to continue to your premium plan
              </p>
            </div>
          ) : (
            <>
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}
