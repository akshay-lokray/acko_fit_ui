import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Shield, Zap, Heart, Sparkles } from "lucide-react";
import type { FormData } from "@/types/form";

import { useState } from "react";

import { Slider } from "@/components/ui/slider";

export function PremiumPlanPage() {
    const location = useLocation();
    const navigate = useNavigate();
    const formData = location.state?.formData as FormData;
    const gender = formData?.gender || "female";
    const [mockXp, setMockXp] = useState(1000); // Default XP for slider



    // If no data, redirect to home
    if (!formData) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Button onClick={() => navigate("/")}>Go Home</Button>
            </div>
        );
    }

    // Calculate Mock Premium based on "Risk"
    // Base: 499
    // Age factor: +10 per year over 20
    // BMI factor: if BMI > 25, add 50




    // Theme colors
    const isMale = gender === "male";
    const themeColor = isMale ? "text-emerald-600" : "text-purple-700";
    const bgTheme = isMale ? "bg-emerald-50" : "bg-purple-50";
    const buttonBg = isMale ? "bg-emerald-600 hover:bg-emerald-700" : "bg-purple-700 hover:bg-purple-800";
    const borderColor = isMale ? "border-emerald-200" : "border-purple-200";

    const calculatePremiumWithXp = (xp: number) => {
        const basePremium = 499;
        const maxDiscountXp = 2000;
        const discountPer100Xp = 10;
        const minPremium = 299;

        const effectiveXp = Math.min(xp, maxDiscountXp);
        const discount = Math.floor(effectiveXp / 100) * discountPer100Xp;
        return Math.max(basePremium - discount, minPremium);
    };

    const finalPremium = calculatePremiumWithXp(mockXp);

    return (
        <div className="min-h-screen bg-white font-sans relative overflow-hidden">
            {/* Decorative Background */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className={`absolute top-[-10%] right-[-5%] w-[50%] h-[50%] ${isMale ? 'bg-emerald-100/40' : 'bg-purple-100/40'} rounded-full blur-[100px]`} />
                <div className={`absolute bottom-[-10%] left-[-5%] w-[50%] h-[50%] ${isMale ? 'bg-emerald-100/40' : 'bg-purple-100/40'} rounded-full blur-[100px]`} />
            </div>

            <div className="max-w-2xl text-center">

                {/* Left Column: The Pitch */}
                <div className="space-y-8 animate-fade-in-up">
                    <div className="space-y-4 text-center">
                    
                        <h1 className={`text-2xl font-extrabold leading-tight max-w-lg ${themeColor}`}>
                            First month is on us, as you move forward, your next month premium will be based on XP you earned
                        </h1>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {[
                            { icon: Heart, text: "Start with ₹499/month" },
                            { icon: Zap, text: "Earn XP points for workouts & challenges" },
                            { icon: Shield, text: "Each XP reduces next month's bill" },
                            { icon: Sparkles, text: "Minimum ₹0/month - unbeatable value!" }
                        ].map((benefit, i) => (
                            <div key={i} className="flex items-center gap-3 p-4 rounded-xl bg-white border border-gray-100 shadow-sm transition-all duration-300 hover:scale-105 hover:shadow-md">
                                <div className={`p-3 rounded-lg ${bgTheme} transition-all duration-200 group-hover:scale-110`}>
                                    <benefit.icon className={`w-6 h-6 ${themeColor}`} />
                                </div>
                                <span className="font-medium text-gray-700">{benefit.text}</span>
                            </div>
                        ))}
                    </div>

                    <div className={`p-8 rounded-3xl bg-white border-2 ${borderColor} shadow-xl relative overflow-hidden group transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl`}>
                    

                        <div className="space-y-1 mb-6">
                            <p className="text-sm text-gray-500 font-medium">Your Monthly Premium</p>
                            <div className="flex items-baseline gap-2">
                                <span className="text-5xl font-bold text-gray-900 transition-all duration-300 ease-in-out">₹{finalPremium}</span>
                                <span className="text-lg text-gray-400 line-through">₹499</span>
                            </div>
                            <p className={`text-sm ${themeColor} font-medium`}>Based on your XP in the next month!</p>
                        </div>

                        <div className="space-y-4 mb-6">
                            <p className="text-sm text-gray-500 font-medium">Projected XP for next month: <span className="font-bold text-gray-900">{mockXp}</span></p>
                            <Slider
                                defaultValue={[mockXp]}
                                max={3000}
                                step={100}
                                onValueChange={(value) => setMockXp(value[0])}
                                className="w-full"
                            />
                            <p className="text-xs text-gray-500">Slide to see how your XP can reduce your premium.</p>
                        </div>

                        <Button
                            onClick={() => navigate("/home", { state: { formData } })}
                            className={`w-full py-6 text-lg shadow-lg hover:shadow-2xl transition-all hover:scale-105 ${buttonBg}`}
                        >
                            START FREE TRIAL & EARN XP
                        </Button>
                        <p className="text-xs text-center text-gray-400 mt-4">No commitment. Cancel anytime.</p>
                    </div>
                </div>

                
            </div>

            
        </div>
    );
}
