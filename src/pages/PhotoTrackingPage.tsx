import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
    ArrowLeft,
    ScanLine,
    Coffee,
    Utensils,
    Moon,
    Apple,
    ChevronLeft,
    Star,
    Flame,
    Minus,
    Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import AvatarScene from "@/components/AvatarScene";
import { useUserProfileStore } from "@/store/userProfileStore";

type MealType = "Breakfast" | "Lunch" | "Dinner" | "Snack";

interface FoodItem {
    id: string;
    name: string;
    quantity: string;
    calories: number;
    note?: string;
}

export function PhotoTrackingPage() {
    const navigate = useNavigate();
    const [step, setStep] = useState<"camera" | "review" | "success">("camera");
    const [selectedType, setSelectedType] = useState<MealType>("Breakfast");
    const [items, setItems] = useState<FoodItem[]>([]);
    const [showConfetti, setShowConfetti] = useState(false);
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
    const { formData: profile } = useUserProfileStore();
    const streak = profile.streak ?? 0;

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

    const resizeImageFile = (inputFile: File, width: number, height: number): Promise<File> =>
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
                canvas.toBlob((blob) => {
                    if (!blob) {
                        reject(new Error("Failed to create blob"));
                        return;
                    }
                    const resizedFile = new File([blob], inputFile.name, { type: blob.type });
                    resolve(resizedFile);
                }, "image/jpeg", 0.9);
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
            const analyzedItems = (data.items || []).map((item: any, idx: number) => ({
                id: `${item.name}-${idx}-${Date.now()}`,
                name: item.name || "",
                quantity: `${item.quantity ?? ""}${item.unit ? ` ${item.unit}` : ""}`,
                calories: Number(item.calories ?? 0),
                note: item.note || "",
            }));
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
            setStep("success");
            setShowConfetti(true);
        } catch (error) {
            console.error("Meal logging failed", error);
            setLogError("Unable to log the meal right now.");
        } finally {
            setLoggingMeal(false);
        }
    };

    const handleItemChange = (index: number, field: keyof FoodItem, value: string | number) => {
        setItems((prev) => {
            const next = [...prev];
            if (field === "calories") {
                next[index] = { ...next[index], calories: Number(value) };
            } else {
                next[index] = { ...next[index], [field]: value };
            }
            return next;
        });
    };

    const handleDeleteItem = (index: number) => {
        setItems((prev) => prev.filter((_, idx) => idx !== index));
    };

    const handleAddRow = () => {
        setItems((prev) => [
            ...prev,
            {
                id: `new-${Date.now()}`,
                name: "",
                quantity: "",
                calories: 0,
                note: "",
            },
        ]);
    };

    // --- Steps Renderers ---

    const renderCamera = () => (
        <div className="flex flex-col h-full bg-white relative">
            {/* Header */}
            <div className="pt-6 px-4 flex items-center justify-center relative mb-4">
                <Button variant="ghost" size="icon" className="absolute left-4" onClick={() => navigate(-1)}>
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
                        Take a clear, well lit photo. The better the photo, the more accurate the analysis.
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
                            className={`flex flex-col items-center gap-1 transition-colors ${selectedType === type.id ? 'text-emerald-600' : 'text-gray-400'}`}
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
                    <div className="mb-4 rounded-2xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-800">
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
                        <Input
                            value={mealName}
                            onChange={(e) => setMealName(e.target.value)}
                            placeholder="e.g., Spicy Potato Stew"
                            className="text-sm"
                        />
                        <label className="text-xs font-semibold text-gray-500">Health note</label>
                        <textarea
                            value={healthNote}
                            onChange={(e) => setHealthNote(e.target.value)}
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
                            rows={2}
                            placeholder="Rich in carbohydrates and provides a good source of energy."
                        />
                    </div>
                    <div className="space-y-3">
                        {items.map((item, idx) => (
                            <div
                                key={item.id}
                                className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-gray-50 px-3 py-2 shadow-sm"
                            >
                                    <div className="flex-1 space-y-1">
                                        <input
                                            type="text"
                                            value={item.name}
                                            onChange={(e) => handleItemChange(idx, "name", e.target.value)}
                                            placeholder="Food name"
                                            className="w-full border-0 bg-transparent px-0 text-sm font-semibold text-gray-900 focus:outline-none"
                                        />
                                        <div className="flex gap-2 text-xs text-gray-500">
                                            <input
                                                type="text"
                                                value={item.quantity}
                                                onChange={(e) => handleItemChange(idx, "quantity", e.target.value)}
                                                placeholder="e.g., 200 g"
                                                className="flex-1 border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                                            />
                                            <input
                                                type="number"
                                                min="0"
                                                value={item.calories}
                                                onChange={(e) =>
                                                    handleItemChange(idx, "calories", Number(e.target.value))
                                                }
                                                placeholder="Calories"
                                                className="w-24 border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                                            />
                                        </div>
                                        <input
                                            type="text"
                                            value={item.note ?? ""}
                                            onChange={(e) => handleItemChange(idx, "note", e.target.value)}
                                            placeholder="Add a short note (e.g., Boiled)"
                                            className="w-full border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-300"
                                        />
                                    </div>
                                <button
                                    type="button"
                                    onClick={() => handleDeleteItem(idx)}
                                    className="flex h-8 w-8 items-center justify-center rounded-full border border-red-100 bg-red-50 text-red-600 shadow-sm transition hover:bg-red-100"
                                >
                                    <Minus className="w-3 h-3" />
                                </button>
                            </div>
                        ))}
                    </div>
                    <div className="flex justify-end">
                        <button
                            type="button"
                            onClick={handleAddRow}
                            className="flex items-center gap-1 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-600 shadow-sm transition hover:bg-emerald-100"
                        >
                            <Plus className="w-3 h-3" />
                            Add item
                        </button>
                    </div>
                </div>

                {/* Totals */}
                <div className="bg-white rounded-3xl p-6 shadow-sm mb-6 flex justify-between items-center">
                    <span className="font-bold text-gray-900">Est Total Calories:</span>
                    <span className="font-bold text-xl text-emerald-600">{totalCalories} Kcal</span>
                </div>

                <div className="space-y-3">
                    {logError && (
                        <div className="rounded-xl bg-red-50 px-4 py-2 text-sm text-red-600 border border-red-100">
                            {logError}
                        </div>
                    )}
                    <Button
                        onClick={handleConfirmLog}
                        className="w-full h-14 text-lg bg-emerald-500 hover:bg-emerald-600 rounded-2xl shadow-lg shadow-emerald-200"
                        disabled={loggingMeal}
                    >
                        {loggingMeal ? "Saving..." : "Confirm & Log Meal"}
                    </Button>
                </div>
            </div>
        </div>
    );

    const renderSuccess = () => (
        <div className="flex flex-col h-full bg-gradient-to-b from-blue-400 to-blue-500 relative overflow-hidden">
            {/* Header */}
            <div className="pt-6 px-4 flex items-center justify-center relative z-20">
                <h1 className="text-lg font-bold text-white">Rewards</h1>
            </div>

            {/* Confetti BG */}
            {showConfetti && (
                <div className="absolute inset-0 pointer-events-none z-10 flex items-center justify-center">
                    <div className="text-6xl animate-bounce duration-1000">🎉 🎊</div>
                </div>
            )}

            {/* Avatar Celebration */}
            <div className="flex-1 relative z-10">
                <AvatarScene
                    textToSpeak="Awesome work! That looks delicious. I've added 50 points to your account."
                    voiceType="female" // Or match context
                />
            </div>

            {/* Success Card */}
            <div className="bg-white rounded-t-[3rem] p-8 pb-12 relative z-20 animate-slide-up-fade">
                <div className="text-center space-y-2 mb-8">
                    <h2 className="text-2xl font-bold text-gray-900">Meal Logged!</h2>
                    <p className="text-gray-500 font-medium">Awesome work.</p>
                </div>

                <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600">
                        <Star className="w-6 h-6 fill-current" />
                    </div>
                    <div>
                        <p className="font-bold text-gray-900">+50 ACKO Points Earned!</p>
                        <p className="text-xs text-gray-500">Keep it up!</p>
                    </div>
                </div>

                <div className="space-y-2 mb-8">
                    <div className="flex justify-between items-center text-sm font-medium">
                        <span className="flex items-center gap-1 text-orange-500">
                            <Flame className="w-4 h-4 fill-current" />
                            {streak}-Day Snap Streak
                        </span>
                        <span className="text-gray-400">{streak}/7</span>
                    </div>
                    <Progress value={Math.min((streak / 7) * 100, 100)} className="h-2" />
                </div>

                <Button
                    onClick={() => navigate("/home")}
                    className="w-full h-14 text-lg bg-emerald-500 hover:bg-emerald-600 rounded-2xl shadow-xl"
                >
                    Back to Dashboard
                </Button>
            </div>
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
