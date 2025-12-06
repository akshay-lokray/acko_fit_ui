import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
    ArrowLeft,
    Camera,
    Upload,
    ScanLine,
    Coffee,
    Utensils,
    Moon,
    Apple,
    Minus,
    Plus,
    ChevronLeft,
    Check,
    Star,
    Flame
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import AvatarScene from "@/components/AvatarScene";

type MealType = "Breakfast" | "Lunch" | "Dinner" | "Snack";

interface FoodItem {
    id: string;
    name: string;
    quantity: string;
    calories: number;
}

export function PhotoTrackingPage() {
    const navigate = useNavigate();
    const [step, setStep] = useState<"camera" | "review" | "success">("camera");
    const [selectedType, setSelectedType] = useState<MealType>("Breakfast");
    const [items, setItems] = useState<FoodItem[]>([
        { id: "1", name: "Roti (Whole Wheat)", quantity: "2x", calories: 240 },
        { id: "2", name: "Dal Tadka", quantity: "150g", calories: 180 },
        { id: "3", name: "White Rice", quantity: "1 cup", calories: 160 },
    ]);
    const [showConfetti, setShowConfetti] = useState(false);

    // Mock total calories
    const totalCalories = items.reduce((acc, item) => acc + item.calories, 0);

    const handleTakeShit = () => { // Funny typo in thought but let's be professional in code :P
        // Simulate processing time
        setTimeout(() => {
            setStep("review");
        }, 800);
    };

    const handleConfirmLog = () => {
        setStep("success");
        setShowConfetti(true);
    };

    const handleQuantityChange = (id: string, delta: number) => {
        // Just mock visual update for now
        console.log("Update quantity", id, delta);
    };

    // --- Steps Renderers ---

    const renderCamera = () => (
        <div className="flex flex-col h-full bg-white relative">
            {/* Header */}
            <div className="pt-6 px-4 flex items-center justify-center relative mb-4">
                <Button variant="ghost" size="icon" className="absolute left-4" onClick={() => navigate(-1)}>
                    <ArrowLeft className="w-6 h-6" />
                </Button>
                <h1 className="text-lg font-bold">Log Meal</h1>
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

            {/* Shutter Button area */}
            <div className="mt-auto pb-8 flex flex-col items-center">
                <button
                    onClick={handleTakeShit}
                    className="w-20 h-20 rounded-full border-4 border-gray-200 p-1 mb-10 transition-transform active:scale-95"
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
                <h1 className="text-lg font-bold">Log Meal</h1>
                <div className="w-10" /> {/* Spacer */}
            </div>

            <div className="flex-1 overflow-y-auto px-4 pb-24">
                {/* Captured Image Preview */}
                <div className="relative mb-6">
                    <div className="w-full h-64 bg-gray-200 rounded-3xl overflow-hidden flex items-center justify-center text-6xl">
                        🥘
                        {/* In a real app this would be the captured image URL */}
                    </div>
                    <button
                        onClick={() => setStep("camera")}
                        className="absolute top-4 left-4 bg-black/50 text-white px-3 py-1.5 rounded-full text-xs font-medium backdrop-blur-md flex items-center gap-1"
                    >
                        <ArrowLeft className="w-3 h-3" /> Retake
                    </button>
                </div>

                {/* Items List */}
                <div className="bg-white rounded-3xl p-6 shadow-sm mb-4 animate-fade-in-up">
                    <h2 className="font-bold text-gray-900 mb-4">Review Meal</h2>
                    <div className="space-y-4">
                        {items.map(item => (
                            <div key={item.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                                <div>
                                    <p className="font-semibold text-gray-900">{item.name}</p>
                                    <p className="text-xs text-gray-500">{item.calories} kcal</p>
                                </div>
                                <div className="flex items-center gap-3 bg-gray-50 rounded-full px-2 py-1">
                                    <button className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-600">-</button>
                                    <span className="text-sm font-medium w-8 text-center">{item.quantity}</span>
                                    <button className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-600">+</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Totals */}
                <div className="bg-white rounded-3xl p-6 shadow-sm mb-6 flex justify-between items-center">
                    <span className="font-bold text-gray-900">Est Total Calories:</span>
                    <span className="font-bold text-xl text-emerald-600">{totalCalories} Kcal</span>
                </div>

                <div className="space-y-3">
                    <Button
                        onClick={handleConfirmLog}
                        className="w-full h-14 text-lg bg-emerald-500 hover:bg-emerald-600 rounded-2xl shadow-lg shadow-emerald-200"
                    >
                        Confirm & Log Meal
                    </Button>
                    <Button
                        variant="ghost"
                        className="w-full text-gray-400 font-medium hover:text-gray-600 hover:bg-transparent"
                    >
                        Need to Edit More?
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
                        <span className="flex items-center gap-1 text-orange-500"><Flame className="w-4 h-4 fill-current" /> 7-Day Snap Streak</span>
                        <span className="text-gray-400">3/7</span>
                    </div>
                    <Progress value={45} className="h-2" />
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
