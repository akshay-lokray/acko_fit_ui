import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CheckCircle2, TrendingUp } from "lucide-react";
import { useUserProfileStore } from "@/store/userProfileStore";

export function PremiumPlanPage() {
    const navigate = useNavigate();
    const { formData } = useUserProfileStore();

    // If no gender is set (form not started), redirect to home
    if (!formData?.gender) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Button onClick={() => navigate("/")}>Go Home</Button>
            </div>
        );
    }

    const BASE_PRICE = 499;

    // Refund policy examples based on goal achievement
    const refundExamples = [
        { goalPercent: 50, refund: 250 },
        { goalPercent: 75, refund: 375 },
        { goalPercent: 100, refund: 499 },
    ];

    return (
        <div className="min-h-screen bg-gradient-to-b from-white to-emerald-50/30 relative overflow-hidden">
            <div className="relative z-10 container mx-auto px-4 py-8 max-w-md">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-2xl md:text-3xl font-bold mb-2 leading-tight">
                        <span className="bg-gradient-to-r from-purple-700 to-emerald-600 bg-clip-text text-transparent">
                            Premium Plan
                        </span>
                    </h1>
                    <p className="text-base md:text-lg text-gray-600 mt-2">
                        Achieve your goals and get rewarded
                    </p>
                </div>

                {/* Base Price Display */}
                <div className="bg-white rounded-3xl p-6 mb-6 border border-gray-200 shadow-sm">
                    <div className="text-center space-y-2">
                        <p className="text-sm font-medium text-gray-600">One-time payment</p>
                        <div className="flex items-baseline justify-center gap-2">
                            <span className="text-5xl font-bold bg-gradient-to-r from-purple-700 to-emerald-600 bg-clip-text text-transparent">
                                ₹{BASE_PRICE}
                            </span>
                            <span className="text-2xl font-medium text-gray-400">
                                per goal
                            </span>
                        </div>
                        <p className="text-sm text-gray-500 mt-2">Pay once, lifetime access</p>
                    </div>
                </div>

                {/* Refund Policy Section */}
                <div className="bg-gradient-to-br from-emerald-50 to-purple-50 rounded-3xl p-6 mb-6 border border-emerald-200/50 shadow-sm">
                    <div className="flex items-start gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-md flex-shrink-0">
                            <TrendingUp className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1">
                            <h2 className="text-lg font-bold text-gray-900 mb-1">
                                Goal Achievement Refund
                            </h2>
                            <p className="text-sm text-gray-700 leading-relaxed">
                                We will refund the amount, if you achieve X% of your goal
                            </p>
                        </div>
                    </div>

                    {/* Refund Examples */}
                    <div className="space-y-3 mt-4">
                        {refundExamples.map((example, index) => (
                            <div
                                key={index}
                                className="bg-white/80 rounded-xl p-4 border border-emerald-100 shadow-sm"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-gray-900">
                                                Reach {example.goalPercent}% of your goal
                                            </p>
                                            <p className="text-xs text-gray-500">
                                                Get refunded
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-lg font-bold text-emerald-600">
                                            ₹{example.refund}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                            refund
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-4 p-3 bg-white/60 rounded-xl border border-emerald-200/50">
                        <p className="text-xs text-gray-700 leading-relaxed">
                            <span className="font-semibold text-emerald-700">Example:</span>{" "}
                            If you reach 50% of your goal, we will refund ₹250. 
                            Complete 100% of your goal and get the full ₹499 back!
                        </p>
                    </div>
                </div>

                {/* CTA Button */}
                <div className="space-y-3">
                    <Button
                        onClick={() =>
                            navigate("/home", {
                                state: { fromPremium: true },
                            })
                        }
                        className="w-full py-6 text-base font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-lg hover:shadow-xl transition-all"
                    >
                        START FREE TRIAL
                    </Button>
                    <p className="text-xs text-center text-gray-400">
                        One-time payment. Lifetime access. Get refunds based on goal achievement.
                    </p>
                </div>
            </div>
        </div>
    );
}
