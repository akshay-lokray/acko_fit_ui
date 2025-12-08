import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Shield, Zap, Heart, Sparkles } from "lucide-react";
import { useState } from "react";
import { useUserProfileStore } from "@/store/userProfileStore";

import FeatureItem from "@/components/FeatureItem";
import PricingCard from "@/components/PricingCard";

export function PremiumPlanPage() {
    const navigate = useNavigate();
    const { formData } = useUserProfileStore();
    const [mockXp, setMockXp] = useState(1000); // Default XP for slider

    // If no gender is set (form not started), redirect to home
    if (!formData?.gender) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Button onClick={() => navigate("/")}>Go Home</Button>
            </div>
        );
    }

    const calculatePremiumWithXp = (xp: number) => {
        const basePremium = 499;
        const maxDiscountXp = 10000;
        const discountPer100Xp = 20;
        const minPremium = 99;

        const effectiveXp = Math.min(xp, maxDiscountXp);
        const discount = Math.floor(effectiveXp / 100) * discountPer100Xp;
        return Math.max(basePremium - discount, minPremium);
    };

    const finalPremium = calculatePremiumWithXp(mockXp);

    return (
        <div className="min-h-screen bg-white relative overflow-hidden">
            <div className="relative z-10 container mx-auto px-4 py-8 max-w-md">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-2xl md:text-3xl font-bold mb-2 leading-tight">
                        <span className="bg-gradient-to-r from-purple-700 to-emerald-600 bg-clip-text text-transparent">
                            First month is on us,
                        </span>{" "}
                        <span className="text-gray-900">as you move forward,</span>
                    </h1>
                    <p className="text-base md:text-lg text-gray-600 mt-2">
                        your next month premium will be based on{" "}
                        <span className="text-emerald-600 font-semibold">XP you earned</span>
                    </p>
                </div>

                {/* Features */}
                <div className="space-y-3 mb-8">
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
                <PricingCard finalPremium={finalPremium} mockXp={mockXp} setMockXp={setMockXp} />
            </div>
        </div>
    );
}
