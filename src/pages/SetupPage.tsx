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
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [showTextInput, setShowTextInput] = useState(false);
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [selectionConfig, setSelectionConfig] = useState<{
    possibleValues: string[];
    multiSelect: boolean;
    keyName: string;
  } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const contextRef = useRef<unknown[]>([]); // Store context from server responses

  // Socket and recognition refs
  const socketRef = useRef<Socket | null>(null);
  const SOCKET_URL = "http://192.168.233.159:5000";
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

  // Function to parse context and find sections with possible_values
  const checkForSelectionOptions = useCallback(() => {
    const context = contextRef.current;
    if (!Array.isArray(context)) return;

    // Find the first pending section with possible_values
    for (const section of context) {
      if (
        typeof section === "object" &&
        section !== null &&
        "status" in section &&
        (section as { status?: string }).status === "pending" &&
        "keys" in section
      ) {
        const keys = (section as { keys?: Record<string, unknown> }).keys;
        if (keys && typeof keys === "object") {
          // Look for keys with possible_values
          for (const [keyName, keyData] of Object.entries(keys)) {
            if (
              keyData &&
              typeof keyData === "object" &&
              "possible_values" in keyData &&
              Array.isArray(
                (keyData as { possible_values?: unknown[] }).possible_values
              ) &&
              (keyData as { possible_values?: unknown[] }).possible_values!
                .length > 0
            ) {
              const keyDataTyped = keyData as {
                possible_values: string[];
                multi_select?: boolean;
              };
              setSelectionConfig({
                possibleValues: keyDataTyped.possible_values,
                multiSelect: keyDataTyped.multi_select === true,
                keyName: keyName,
              });
              setSelectedOptions([]);
              console.log("📋 Found selection options:", {
                keyName,
                multiSelect: keyDataTyped.multi_select,
                options: keyDataTyped.possible_values,
              });
              return;
            }
          }
        }
      }
    }
    // No selection options found, clear the config
    setSelectionConfig(null);
    setSelectedOptions([]);
  }, []);

  // Function to clean message text by removing options list when selection UI is available
  const cleanMessageText = useCallback(
    (text: string, possibleValues?: string[]): string => {
      const optionsToRemove =
        possibleValues || selectionConfig?.possibleValues || [];

      if (!optionsToRemove.length) {
        return text;
      }

      // Remove the options list from the text
      // Look for patterns like "Here are some options" or "Feel free to select"
      let cleanedText = text;

      // Remove text after common phrases that introduce options
      const optionIntroPatterns = [
        /Here are some options.*$/i,
        /Here are the options.*$/i,
        /Here are.*options.*$/i,
        /Feel free to select.*$/i,
        /You can choose.*$/i,
        /Select.*from.*$/i,
        /Options.*$/i,
      ];

      for (const pattern of optionIntroPatterns) {
        cleanedText = cleanedText.replace(pattern, "").trim();
      }

      // Also remove any quoted options that match our possible values
      optionsToRemove.forEach((option) => {
        // Remove quoted option (e.g., "'Lose weight'")
        const quotedOption = `'${option}'`;
        const doubleQuotedOption = `"${option}"`;
        cleanedText = cleanedText
          .replace(
            new RegExp(
              quotedOption.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
              "g"
            ),
            ""
          )
          .replace(
            new RegExp(
              doubleQuotedOption.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
              "g"
            ),
            ""
          )
          .replace(
            new RegExp(option.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"),
            ""
          );
      });

      // Clean up extra commas, periods, and whitespace
      cleanedText = cleanedText
        .replace(/,\s*,/g, ",") // Remove double commas
        .replace(/,\s*\./g, ".") // Remove comma before period
        .replace(/\s+/g, " ") // Multiple spaces to single space
        .replace(/\.\s*\./g, ".") // Double periods
        .trim();

      // Remove trailing commas and periods
      cleanedText = cleanedText.replace(/[,.]+$/, "").trim();

      return cleanedText || text; // Return original if cleaned text is empty
    },
    [selectionConfig]
  );

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
        let journeyContext: unknown[] = [];

        // Extract text and context from the parsed data
        // Handle both formats: {data: {text: "...", context: [...]}} and {text: "...", context: [...]}
        if (
          parsedData &&
          typeof parsedData === "object" &&
          parsedData !== null
        ) {
          const data = parsedData as {
            data?: { text?: string; context?: unknown[] };
            text?: string;
            context?: unknown[];
          };

          // Check nested format first: {data: {text: "...", context: [...]}}
          if (
            data.data &&
            typeof data.data === "object" &&
            data.data !== null
          ) {
            journeyText = String(data.data.text || "");
            journeyContext = Array.isArray(data.data.context)
              ? data.data.context
              : [];
          } else if (data.text !== undefined || data.context !== undefined) {
            // Handle direct format: {text: "...", context: [...]}
            journeyText = String(data.text || "");
            journeyContext = Array.isArray(data.context) ? data.context : [];
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
        if (
          journeyContext &&
          Array.isArray(journeyContext) &&
          journeyContext.length > 0
        ) {
          contextRef.current = journeyContext;
          console.log(
            "📋 Stored context:",
            JSON.stringify(contextRef.current, null, 2)
          );
          // Check for selection options after storing context
          checkForSelectionOptions();
        }

        // Extract possible values synchronously from context for message cleaning
        let possibleValuesForCleaning: string[] = [];
        if (Array.isArray(journeyContext)) {
          for (const section of journeyContext) {
            if (
              typeof section === "object" &&
              section !== null &&
              "status" in section &&
              (section as { status?: string }).status === "pending" &&
              "keys" in section
            ) {
              const keys = (section as { keys?: Record<string, unknown> }).keys;
              if (keys && typeof keys === "object") {
                for (const keyData of Object.values(keys)) {
                  if (
                    keyData &&
                    typeof keyData === "object" &&
                    "possible_values" in keyData &&
                    Array.isArray(
                      (keyData as { possible_values?: unknown[] })
                        .possible_values
                    )
                  ) {
                    possibleValuesForCleaning = (
                      keyData as { possible_values: string[] }
                    ).possible_values;
                    break;
                  }
                }
                if (possibleValuesForCleaning.length > 0) break;
              }
            }
          }
        }

        // Check if there's a pending section in the stored context
        const hasPendingSection =
          Array.isArray(contextRef.current) &&
          contextRef.current.some(
            (section: unknown) =>
              typeof section === "object" &&
              section !== null &&
              "status" in section &&
              (section as { status?: string }).status === "pending"
          );

        // Display the message if available and valid
        if (
          journeyText &&
          journeyText.trim() &&
          journeyText !== "[object Object]"
        ) {
          // Clean the message text to remove options list if selection UI is available
          const cleanedText = cleanMessageText(
            journeyText.trim(),
            possibleValuesForCleaning
          );
          const journeyMsg: Message = {
            id: Date.now().toString(),
            sender: "coach",
            text: cleanedText,
          };
          setMessages((prev) => [...prev, journeyMsg]);
          setShowTextInput(false);

          // Speak the cleaned response using text-to-speech
          speakText(cleanedText);

          // After displaying the message, check if there's a pending section
          // If yes, automatically continue to the next section
          if (hasPendingSection) {
            console.log(
              "🔄 Message displayed but pending section found, continuing to next section..."
            );
            const socket = socketRef.current;
            if (socket && socket.connected) {
              setTimeout(() => {
                const continuePayload = {
                  data: {
                    text: "continue",
                    context: contextRef.current,
                  },
                };
                console.log(
                  "📤 Auto-continuing to next section:",
                  continuePayload
                );
                socket.emit("process_journey", continuePayload);
              }, 1000); // Delay to let the user hear the current message
            }
          }
        } else if (hasPendingSection) {
          // If there's a pending section but no text response, automatically continue
          console.log(
            "🔄 No text response but pending section found, continuing..."
          );
          const socket = socketRef.current;
          if (socket && socket.connected) {
            setTimeout(() => {
              const continuePayload = {
                data: {
                  text: "continue",
                  context: contextRef.current,
                },
              };
              console.log(
                "📤 Auto-continuing to next section:",
                continuePayload
              );
              socket.emit("process_journey", continuePayload);
            }, 500); // Small delay to ensure context is stored
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
      let responseContext: unknown[] = [];

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
                responseContext = Array.isArray(parsed.data.context)
                  ? parsed.data.context
                  : [];
              } else if (parsed.text) {
                responseText = String(parsed.text);
                responseContext = Array.isArray(parsed.context)
                  ? parsed.context
                  : [];
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
          // Check if it's the new format: { data: { text: "...", context: [...] } }
          if (
            data.data &&
            typeof data.data === "object" &&
            data.data !== null
          ) {
            responseText = String(data.data.text || "");
            responseContext = Array.isArray(data.data.context)
              ? data.data.context
              : [];
          } else if (data.text !== undefined) {
            // Old format: { text: "..." }
            responseText = String(data.text);
            responseContext = Array.isArray(data.context) ? data.context : [];
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
      if (
        responseContext &&
        Array.isArray(responseContext) &&
        responseContext.length > 0
      ) {
        contextRef.current = responseContext;
        console.log(
          "📋 Stored context:",
          JSON.stringify(contextRef.current, null, 2)
        );
        // Check for selection options after storing context
        checkForSelectionOptions();
      }

      // Extract possible values synchronously from context for message cleaning
      let possibleValuesForCleaning: string[] = [];
      if (Array.isArray(responseContext)) {
        for (const section of responseContext) {
          if (
            typeof section === "object" &&
            section !== null &&
            "status" in section &&
            (section as { status?: string }).status === "pending" &&
            "keys" in section
          ) {
            const keys = (section as { keys?: Record<string, unknown> }).keys;
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
              if (possibleValuesForCleaning.length > 0) break;
            }
          }
        }
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

      // Only add message if we have valid text
      if (
        responseText &&
        responseText.trim() &&
        responseText !== "[object Object]"
      ) {
        // Clean the message text to remove options list if selection UI is available
        const cleanedText = cleanMessageText(
          responseText.trim(),
          possibleValuesForCleaning
        );
        const coachMsg: Message = {
          id: Date.now().toString(),
          sender: "coach",
          text: cleanedText,
        };
        setMessages((prev) => [...prev, coachMsg]);
        setShowTextInput(false);

        // Speak the cleaned response using text-to-speech
        speakText(cleanedText);
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
        let journeyContext: unknown[] = [];

        // Parse the response format: { data: { text: "...", context: [...] } }
        if (data && typeof data === "object" && data !== null) {
          if (
            data.data &&
            typeof data.data === "object" &&
            data.data !== null
          ) {
            journeyText = String(data.data.text || "");
            journeyContext = Array.isArray(data.data.context)
              ? data.data.context
              : [];
          } else if (data.text !== undefined) {
            journeyText = String(data.text);
            journeyContext = Array.isArray(data.context) ? data.context : [];
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
        if (
          journeyContext &&
          Array.isArray(journeyContext) &&
          journeyContext.length > 0
        ) {
          contextRef.current = journeyContext;
          console.log(
            "📋 Stored context:",
            JSON.stringify(contextRef.current, null, 2)
          );
          // Check for selection options after storing context
          checkForSelectionOptions();
        }

        // Extract possible values synchronously from context for message cleaning
        let possibleValuesForCleaning: string[] = [];
        if (Array.isArray(journeyContext)) {
          for (const section of journeyContext) {
            if (
              typeof section === "object" &&
              section !== null &&
              "status" in section &&
              (section as { status?: string }).status === "pending" &&
              "keys" in section
            ) {
              const keys = (section as { keys?: Record<string, unknown> }).keys;
              if (keys && typeof keys === "object") {
                for (const keyData of Object.values(keys)) {
                  if (
                    keyData &&
                    typeof keyData === "object" &&
                    "possible_values" in keyData &&
                    Array.isArray(
                      (keyData as { possible_values?: unknown[] })
                        .possible_values
                    )
                  ) {
                    possibleValuesForCleaning = (
                      keyData as { possible_values: string[] }
                    ).possible_values;
                    break;
                  }
                }
                if (possibleValuesForCleaning.length > 0) break;
              }
            }
          }
        }

        // Check if there's a pending section in the stored context
        const hasPendingSection =
          Array.isArray(contextRef.current) &&
          contextRef.current.some(
            (section: unknown) =>
              typeof section === "object" &&
              section !== null &&
              "status" in section &&
              (section as { status?: string }).status === "pending"
          );

        // Display the message if available and valid
        if (
          journeyText &&
          journeyText.trim() &&
          journeyText !== "[object Object]"
        ) {
          // Clean the message text to remove options list if selection UI is available
          const cleanedText = cleanMessageText(
            journeyText.trim(),
            possibleValuesForCleaning
          );
          const journeyMsg: Message = {
            id: Date.now().toString(),
            sender: "coach",
            text: cleanedText,
          };
          setMessages((prev) => [...prev, journeyMsg]);
          speakText(cleanedText);

          // After displaying the message, check if there's a pending section
          if (hasPendingSection) {
            console.log(
              "🔄 Message displayed but pending section found, continuing to next section..."
            );
            const socket = socketRef.current;
            if (socket && socket.connected) {
              setTimeout(() => {
                const continuePayload = {
                  data: {
                    text: "continue",
                    context: contextRef.current,
                  },
                };
                console.log(
                  "📤 Auto-continuing to next section:",
                  continuePayload
                );
                socket.emit("process_journey", continuePayload);
              }, 1000); // Delay to let the user hear the current message
            }
          }
        } else if (hasPendingSection) {
          // If there's a pending section but no text response, automatically continue
          console.log(
            "🔄 No text response but pending section found, continuing..."
          );
          const socket = socketRef.current;
          if (socket && socket.connected) {
            setTimeout(() => {
              const continuePayload = {
                data: {
                  text: "continue",
                  context: contextRef.current,
                },
              };
              console.log(
                "📤 Auto-continuing to next section:",
                continuePayload
              );
              socket.emit("process_journey", continuePayload);
            }, 500); // Small delay to ensure context is stored
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
  }, [SOCKET_URL, speakText, checkForSelectionOptions, cleanMessageText]);

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

      const payload = {
        data: {
          text: textToSend,
          context: contextRef.current, // Include the stored context
        },
      };

      console.log("📤 Sending transcribed text:", payload);
      if (interimText && !finalText) {
        console.log(
          "⚠️ Using interim transcript as final transcript was not available"
        );
      }
      socket.emit("process_journey", payload);
      recognitionResultRef.current = "";
      interimTranscriptRef.current = "";
    }

    // Play end sound
    playEndSound();
  }, [playEndSound]);

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

    // Stop any ongoing speech synthesis when user starts listening (mic takes priority)
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
      const payload = {
        data: {
          text: textToSend,
          context: contextRef.current, // Include the stored context
        },
      };

      console.log("📤 Sending chat message:", payload);
      socket.emit("process_journey", payload);
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

  // Check for selection options whenever context changes
  useEffect(() => {
    checkForSelectionOptions();
  }, [checkForSelectionOptions]);

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
    const payload = {
      data: {
        text: responseText,
        context: contextRef.current,
      },
    };

    console.log("📤 Sending selection:", payload);
    socket.emit("process_journey", payload);

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

          {/* Selection Options UI */}
          {selectionConfig && (
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
