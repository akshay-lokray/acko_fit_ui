import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
    ArrowLeft,
    ScanLine,
    Coffee,
    Utensils,
    Moon,
    Apple,
    ChevronLeft,
  Mic,
    Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUserProfileStore } from "@/store/userProfileStore";

type MealType = "Breakfast" | "Lunch" | "Dinner" | "Snack";

interface FoodItem {
    id: string;
    name: string;
    quantity: string;
    calories: number;
  note?: string;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  transcript: string;
  confidence: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

type SpeechRecognitionResultList = SpeechRecognitionResult[];

interface SpeechRecognitionEvent {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
}

export function PhotoTrackingPage() {
    const navigate = useNavigate();
    const [step, setStep] = useState<"camera" | "review" | "success">("camera");
    const [selectedType, setSelectedType] = useState<MealType>("Breakfast");
  const [items, setItems] = useState<FoodItem[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const prevImageRef = useRef<string | null>(null);
  const [mealName, setMealName] = useState("");
  const [loggingMeal, setLoggingMeal] = useState(false);
  const [logError, setLogError] = useState<string | null>(null);
  const [healthNote, setHealthNote] = useState("");
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const intentSentRef = useRef(false);
  const { formData: profile } = useUserProfileStore();
  const transcriptRef = useRef("");
  const [isAdjusting, setIsAdjusting] = useState(false);

  useEffect(() => {
    return () => {
      if (prevImageRef.current) {
        URL.revokeObjectURL(prevImageRef.current);
      }
    };
  }, []);

    // Mock total calories
    const totalCalories = items.reduce((acc, item) => acc + item.calories, 0);

  const handleTakeShit = () => {
    cameraInputRef.current?.click();
  };

  const resizeImageFile = (
    inputFile: File,
    width: number,
    height: number
  ): Promise<File> =>
    new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(inputFile);
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Unable to resize image"));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error("Failed to create blob"));
              return;
            }
            const resizedFile = new File([blob], inputFile.name, {
              type: blob.type,
            });
            resolve(resizedFile);
          },
          "image/jpeg",
          0.9
        );
      };
      img.onerror = (error) => {
        reject(error);
      };
      img.src = url;
    });

  const handleImageSelected = async (file: File | null) => {
    if (!file) return;
    setIsAnalyzing(true);
    setAnalysisError(null);
    try {
      const resizedFile = await resizeImageFile(file, 1024, 1024);
      const form = new FormData();
      form.append("image", resizedFile);
      const response = await fetch("/api/habits/food/analyze-image", {
        method: "POST",
        body: form,
      });
      if (!response.ok) {
        throw new Error("Unable to analyze photo");
      }
      const data = await response.json();
      const analyzedItems = (data.items || []).map(
        (item: any, idx: number) => ({
          id: `${item.name}-${idx}-${Date.now()}`,
          name: item.name || "",
          quantity: `${item.quantity ?? ""}${item.unit ? ` ${item.unit}` : ""}`,
          calories: Number(item.calories ?? 0),
          note: item.note || "",
        })
      );
      setItems(analyzedItems);
      setMealName(data.mealName ?? "");
      setHealthNote(data.healthNote ?? "");
      const nextUrl = URL.createObjectURL(file);
      setImagePreview(nextUrl);
      if (prevImageRef.current) {
        URL.revokeObjectURL(prevImageRef.current);
      }
      prevImageRef.current = nextUrl;
            setStep("review");
    } catch (err) {
      console.error(err);
      setAnalysisError("Unable to analyze the photo right now.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const [successMessage, setSuccessMessage] = useState("");

  const handleConfirmLog = async () => {
    setLogError(null);
    setLoggingMeal(true);
    const userId = profile.mobile || "unknown-user";
    const mealMeta = {
      mealName: mealName.trim() || "Meal",
      healthNote: healthNote.trim(),
      items: items.map((item) => ({
        name: item.name,
        quantity: item.quantity,
        calories: item.calories,
        note: item.note || "",
      })),
    };

    try {
      const calorieRes = await fetch("/api/habits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          habit: "calorie",
          value: totalCalories,
          meta: mealMeta,
        }),
      });
      if (!calorieRes.ok) {
        throw new Error("Failed to log calories");
      }
      const mealRes = await fetch("/api/habits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          habit: "meal",
          value: 1,
          meta: {
            ...mealMeta,
          },
        }),
      });
      if (!mealRes.ok) {
        throw new Error("Failed to log meal details");
      }
      setSuccessMessage("Meal logged! Redirecting you to the dashboard…");
      setTimeout(() => navigate("/home"), 900);
    } catch (error) {
      console.error("Meal logging failed", error);
      setLogError("Unable to log the meal right now.");
    } finally {
      setLoggingMeal(false);
    }
  };

  const handleVoiceIntent = useCallback(
    async (text: string) => {
      console.log("[voice] handleVoiceIntent transcript:", text);
      if (!text.trim() || intentSentRef.current) return;
      intentSentRef.current = true;
      setVoiceError(null);
      setVoiceTranscript(text);
      const instruction = encodeURIComponent(text);
        const parseQuantity = (quantity: string) => {
          const numeric = parseFloat(quantity);
          if (!Number.isFinite(numeric)) {
            return {
              amount: 0,
              unit: quantity.replace(/^[\d\s\.]+/, "").trim(),
            };
          }
          return {
            amount: numeric,
            unit: quantity.replace(/^[\d\s\.]+/, "").trim(),
          };
        };

        const payload = {
          mealName: mealName || "Meal",
          totalCalories,
          items: items.map((item) => {
            const { amount, unit } = parseQuantity(item.quantity);
            return {
              name: item.name,
              quantity: amount,
              unit,
              calories: item.calories,
              note: item.note || "",
            };
          }),
          healthNote: healthNote || "",
        };
      try {
        setIsAdjusting(true);
        const response = await fetch(
          `/api/habits/food/adjust?instruction=${instruction}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
          }
        );
        if (!response.ok) {
          throw new Error("Meal adjust request failed");
        }
        const data = await response.json();
        if (data.mealName) {
          setMealName(data.mealName);
        }
        if (data.healthNote) {
          setHealthNote(data.healthNote);
        }
        if (Array.isArray(data.items)) {
          const normalized = data.items.map((item: any, idx: number) => ({
            id: `${item.name || "item"}-${idx}-${Date.now()}`,
            name: item.name || "",
            quantity: item.unit
              ? `${item.quantity ?? ""} ${item.unit}`.trim()
              : String(item.quantity ?? ""),
            calories: Number(item.calories ?? 0),
            note: item.note || "",
          }));
          setItems(normalized);
        }
        if (data.submit) {
          await handleConfirmLog();
        }
      } catch (error) {
        console.error("Voice adjust failed", error);
        setVoiceError("Unable to adjust meal right now.");
      } finally {
        setIsAdjusting(false);
        intentSentRef.current = false;
      }
    },
    [handleConfirmLog, healthNote, items, mealName, totalCalories]
  );

  const startVoiceCapture = useCallback(() => {
    if (isListening) return;
    const SpeechRecognition =
      (window as unknown as {
        SpeechRecognition?: {
          new (): SpeechRecognition;
        };
        webkitSpeechRecognition?: {
          new (): SpeechRecognition;
        };
      }).SpeechRecognition ||
      (window as unknown as {
        webkitSpeechRecognition?: {
          new (): SpeechRecognition;
        };
      }).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setVoiceError("Speech recognition is not supported in this browser.");
      return;
    }

    recognitionRef.current?.stop();
    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcripts: string[] = [];
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        const alternative = result.item(0);
        if (alternative) {
          transcripts.push(alternative.transcript);
        }
      }
      const transcript = transcripts.join(" ").trim();
      transcriptRef.current = transcript;
      setVoiceTranscript(transcript);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      setVoiceError(event.error || "Voice recording failed.");
      recognition.stop();
    };

    recognition.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;
      const finalTranscript = transcriptRef.current;
      console.log("[voice] onend transcript:", finalTranscript);
      if (finalTranscript) {
        handleVoiceIntent(finalTranscript);
      }
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
      setIsListening(true);
      setVoiceError(null);
    } catch (error) {
      console.error("Voice recognition start failed", error);
      setVoiceError("Unable to start voice recording.");
    }
  }, [handleVoiceIntent, isListening]);

  const stopVoiceCapture = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    const pendingTranscript = transcriptRef.current || voiceTranscript;
    if (pendingTranscript && !intentSentRef.current) {
      setTimeout(() => handleVoiceIntent(pendingTranscript), 150);
    }
  }, [handleVoiceIntent, voiceTranscript]);

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
    };
  }, []);

    // --- Steps Renderers ---

    const renderCamera = () => (
        <div className="flex flex-col h-full bg-white relative">
            {/* Header */}
            <div className="pt-6 px-4 flex items-center justify-center relative mb-4">
        <Button
          variant="ghost"
          size="icon"
          className="absolute left-4"
          onClick={() => navigate(-1)}
        >
                    <ArrowLeft className="w-6 h-6" />
                </Button>
        <h1 className="text-lg font-bold">Snap Your Meal</h1>
            </div>

            {/* Viewfinder */}
            <div className="mx-4 aspect-[4/5] bg-gray-900 rounded-3xl relative overflow-hidden mb-6 group">
                {/* Mock Camera Feed UI */}
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-white/50 flex flex-col items-center gap-2">
                        <ScanLine className="w-16 h-16 animate-pulse" />
                        <p className="text-xs font-medium">Align food within frame</p>
                    </div>
                </div>

                {/* Mock Image (Shows "what see") */}
                <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-transparent pointer-events-none" />
            </div>

            {/* Instruction Bubble */}
            <div className="px-8 mb-8">
                <div className="bg-gray-50 rounded-xl p-4 text-center">
                    <p className="text-sm text-gray-500">
            Take a clear, well lit photo. The better the photo, the more
            accurate the analysis.
                    </p>
                </div>
            </div>

      {/* File picker */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => handleImageSelected(e.target.files?.[0] || null)}
      />
      <input
        ref={uploadInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleImageSelected(e.target.files?.[0] || null)}
      />

      <div className="flex justify-center mb-4">
        <Button
          variant="outline"
          className="text-gray-500 text-xs uppercase tracking-wide"
          onClick={() => uploadInputRef.current?.click()}
        >
          Upload from device
        </Button>
      </div>

            {/* Shutter Button area */}
            <div className="mt-auto pb-8 flex flex-col items-center">
                <button
                    onClick={handleTakeShit}
          className="w-20 h-20 rounded-full border-4 border-gray-200 p-1 mb-6 transition-transform active:scale-95"
                >
                    <div className="w-full h-full bg-emerald-500 rounded-full shadow-lg" />
                </button>

                {/* Meal Type Tabs */}
                <div className="w-full px-6 flex justify-between">
                    {[
                        { id: "Breakfast", icon: Coffee },
                        { id: "Lunch", icon: Utensils },
                        { id: "Dinner", icon: Moon },
                        { id: "Snack", icon: Apple },
                    ].map((type) => (
                        <button
                            key={type.id}
                            onClick={() => setSelectedType(type.id as MealType)}
              className={`flex flex-col items-center gap-1 transition-colors ${
                selectedType === type.id ? "text-emerald-600" : "text-gray-400"
              }`}
                        >
                            <type.icon className="w-6 h-6" />
                            <span className="text-xs font-medium">{type.id}</span>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );

    const renderReview = () => (
        <div className="flex flex-col h-full bg-gray-50/50">
            <div className="pt-6 px-4 flex items-center justify-between relative mb-4 bg-white pb-4 shadow-sm">
                <Button variant="ghost" size="icon" onClick={() => setStep("camera")}>
                    <ChevronLeft className="w-6 h-6" />
                </Button>
        <h1 className="text-lg font-bold">Snap Your Meal</h1>
                <div className="w-10" /> {/* Spacer */}
            </div>

            <div className="flex-1 overflow-y-auto px-4 pb-24">
        {isAnalyzing && (
          <div className="mb-4 rounded-2xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-800 flex items-center justify-center gap-2">
            <div className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
            Analyzing your meal… this might take a moment.
          </div>
        )}
        {analysisError && (
          <div className="mb-4 rounded-2xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
            {analysisError}
          </div>
        )}
                {/* Captured Image Preview */}
                <div className="relative mb-6">
                    <div className="w-full h-64 bg-gray-200 rounded-3xl overflow-hidden flex items-center justify-center text-6xl">
            {imagePreview ? (
              <img
                src={imagePreview}
                alt="Captured meal"
                className="w-full h-full object-cover"
              />
            ) : (
              <span>🥘</span>
            )}
                    </div>
                    <button
                        onClick={() => setStep("camera")}
                        className="absolute top-4 left-4 bg-black/50 text-white px-3 py-1.5 rounded-full text-xs font-medium backdrop-blur-md flex items-center gap-1"
                    >
                        <ArrowLeft className="w-3 h-3" /> Retake
                    </button>
                </div>

        <div className="bg-white rounded-3xl p-6 shadow-sm mb-4 animate-fade-in-up space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-gray-900">Review Meal</h2>
            <Button variant="ghost" size="sm" onClick={() => setStep("camera")}>
              Retake
            </Button>
          </div>
          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-500">Meal name</p>
            <div className="text-sm font-medium text-gray-900 bg-gray-50 rounded-lg px-3 py-2 border border-gray-200">
              {mealName || "—"}
            </div>
            <label className="text-xs font-semibold text-gray-500">
              Health note
            </label>
            <div className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-700 bg-gray-50 min-h-[3rem]">
              {healthNote || "—"}
            </div>
          </div>
          <div className="space-y-3">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm"
              >
                <div className="flex-1 space-y-2">
                  <div className="text-sm font-semibold text-gray-900">
                    {item.name || "—"}
                  </div>
                  <div className="flex gap-2 text-xs">
                    <div className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 text-gray-700">
                      {item.quantity || "—"}
                    </div>
                    <div className="w-24 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 text-gray-700 font-medium">
                      {item.calories || 0} kcal
                    </div>
                  </div>
                  {item.note && (
                    <div className="w-full bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 text-xs text-gray-600">
                      {item.note}
                                </div>
                  )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Totals */}
                <div className="bg-white rounded-3xl p-6 shadow-sm mb-6 flex justify-between items-center">
                    <span className="font-bold text-gray-900">Est Total Calories:</span>
          <span className="font-bold text-xl text-emerald-600">
            {totalCalories} Kcal
          </span>
                </div>

                <div className="space-y-3">
          {logError && (
            <div className="rounded-xl bg-red-50 px-4 py-2 text-sm text-red-600 border border-red-100 text-center">
              {logError}
            </div>
          )}
          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={() => {
                  if (isListening) {
                    stopVoiceCapture();
                  } else {
                    startVoiceCapture();
                  }
                }}
                className={`w-16 h-16 rounded-full flex items-center justify-center shadow-lg transition-colors ${
                  isListening
                    ? "bg-red-500 text-white"
                    : "bg-emerald-600 text-white"
                }`}
              >
                <Mic className="w-6 h-6" />
              </button>
              <button
                onClick={handleConfirmLog}
                className="w-16 h-16 rounded-full flex items-center justify-center shadow-lg bg-white border border-gray-200 text-emerald-600 hover:border-emerald-500"
                disabled={loggingMeal}
              >
                <Check className="w-6 h-6" />
              </button>
            </div>
            <p className="text-xs text-gray-500 text-center">
              {isListening
                ? "Listening… tap again to stop"
                : "Tap the mic to adjust calories"}
            </p>
            {voiceTranscript && (
              <p className="text-xs text-slate-500 text-center">
                "{voiceTranscript}"
              </p>
            )}
            {voiceError && (
              <p className="text-xs text-red-500 text-center">{voiceError}</p>
            )}
            {isAdjusting && (
              <p className="text-xs text-cyan-600 text-center">Adjusting meal...</p>
            )}
            {successMessage && (
              <p className="text-xs text-emerald-600 text-center">
                {successMessage}
              </p>
            )}
                </div>
                    </div>
                    </div>
                </div>
  );

  const renderSuccess = () => (
    <div className="flex flex-col h-full bg-white items-center justify-center p-6 space-y-4">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-emerald-600">Meal Logged!</h1>
        <p className="text-sm text-gray-500">
          Your meal has been recorded. Keep the momentum going!
        </p>
                    </div>
      <div className="text-xs text-slate-500 text-center">
        You can close this screen or log another meal whenever you're ready.
                </div>
                <Button
                    onClick={() => navigate("/home")}
        variant="ghost"
        className="px-6 py-3 rounded-full border border-emerald-200 text-emerald-600"
                >
                    Back to Dashboard
                </Button>
        </div>
    );

    return (
        <div className="min-h-screen bg-white font-sans">
            {step === "camera" && renderCamera()}
            {step === "review" && renderReview()}
            {step === "success" && renderSuccess()}
        </div>
    );
}
