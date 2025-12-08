import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Shield, Zap, Heart, Sparkles } from "lucide-react";
import type { FormData } from "@/types/form";

import { useState } from "react";


import FeatureItem from "@/components/FeatureItem";
import PricingCard from "@/components/PricingCard";

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
    const buttonBg = isMale ? "bg-emerald-600 hover:bg-emerald-700" : "bg-purple-700 hover:bg-purple-800";
    const borderColor = isMale ? "border-emerald-200" : "border-purple-200";

    const calculatePremiumWithXp = (xp: number) => {
        const basePremium = 499;
        const maxDiscountXp = 2000;
        const discountPer100Xp = 20;
        const minPremium = 99;

        const effectiveXp = Math.min(xp, maxDiscountXp);
        const discount = Math.floor(effectiveXp / 100) * discountPer100Xp;
        return Math.max(basePremium - discount, minPremium);
    };

    const finalPremium = calculatePremiumWithXp(mockXp);

    return (
        <div className="min-h-screen bg-gradient-to-b from-background via-muted/30 to-background relative overflow-hidden">
            {/* Background effects */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-gradient-to-b from-accent/5 via-primary/5 to-transparent rounded-full blur-3xl" />
                <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-accent/5 rounded-full blur-3xl" />
                <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl" />
            </div>

            <div className="relative z-10 container mx-auto px-4 py-12 max-w-md">
                {/* Header */}
                <div className="text-center mb-10 animate-fade-in">
                    <h1 className="text-2xl md:text-3xl font-bold mb-2 leading-tight">
                        <span className="gradient-text">First month is on us,</span>{" "}
                        <span className="text-foreground">as you move forward,</span>
                    </h1>
                    <p className="text-lg md:text-xl text-muted-foreground">
                        your next month premium will be based on{" "}
                        <span className="text-primary font-semibold">XP you earned</span>
                    </p>
                </div>

                {/* Features */}
                <div className="space-y-4 mb-10">
                    <FeatureItem
                        icon={Heart}
                        title="Start with ₹499/month"
                        delay={100}
                    />
                    <FeatureItem
                        icon={Zap}
                        title="Earn XP points for workouts & challenges"
                        delay={200}
                    />
                    <FeatureItem
                        icon={Shield}
                        title="Each XP reduces next month's bill"
                        delay={300}
                    />
                    <FeatureItem
                        icon={Sparkles}
                        title="Minimum ₹0/month - unbeatable value!"
                        delay={400}
                    />
                </div>

                {/* Pricing Card */}
                <PricingCard finalPremium={finalPremium} mockXp={mockXp} setMockXp={setMockXp} buttonBg={buttonBg} themeColor={themeColor} borderColor={borderColor} />
            </div>
        </div>
    );
}
