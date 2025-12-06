import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Shield, Zap, Heart, Sparkles, ArrowRight } from "lucide-react";
import type { FormData } from "@/types/form";
import AvatarScene from "@/components/AvatarScene";
import type { VoiceType } from "@/types/voice";

export function PremiumPlanPage() {
    const location = useLocation();
    const navigate = useNavigate();
    const formData = location.state?.formData as FormData;
    const gender = formData?.gender || "female";
    const name = formData?.name || "Friend";

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
    const heightInM = (formData.heightUnit === "cm" ? formData.height : formData.height * 2.54) / 100;
    const weightInKg = formData.weightUnit === "kg" ? formData.currentWeight : formData.currentWeight * 0.453592;
    const bmi = weightInKg / (heightInM * heightInM);

    let calculatedPremium = 499;
    if (formData.age > 25) calculatedPremium += (formData.age - 25) * 5;
    if (bmi > 25) calculatedPremium += 100;
    if (formData.activityLevel === "sedentary") calculatedPremium += 50;

    // Theme colors
    const isMale = gender === "male";
    const themeColor = isMale ? "text-emerald-600" : "text-purple-700";
    const bgTheme = isMale ? "bg-emerald-50" : "bg-purple-50";
    const buttonBg = isMale ? "bg-emerald-600 hover:bg-emerald-700" : "bg-purple-700 hover:bg-purple-800";
    const borderColor = isMale ? "border-emerald-200" : "border-purple-200";

    return (
        <div className="min-h-screen bg-white font-sans relative overflow-hidden">
            {/* Decorative Background */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className={`absolute top-[-10%] right-[-5%] w-[50%] h-[50%] ${isMale ? 'bg-emerald-100/40' : 'bg-purple-100/40'} rounded-full blur-[100px]`} />
                <div className={`absolute bottom-[-10%] left-[-5%] w-[50%] h-[50%] ${isMale ? 'bg-emerald-100/40' : 'bg-purple-100/40'} rounded-full blur-[100px]`} />
            </div>

            <div className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center relative z-10 min-h-screen pt-20">

                {/* Left Column: The Pitch */}
                <div className="space-y-8 animate-fade-in-up">
                    <div className="space-y-4">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-gray-200 text-xs font-semibold text-gray-600 uppercase tracking-wider shadow-sm">
                            <Shield className={`w-3 h-3 ${themeColor}`} />
                            <span>Acko Total Health Protect</span>
                        </div>
                        <h1 className="text-5xl md:text-6xl font-bold text-gray-900 leading-tight">
                            Your Health, <br />
                            <span className={themeColor}>Digitally Secured.</span>
                        </h1>
                        <p className="text-xl text-gray-600 leading-relaxed max-w-lg">
                            {name}, based on your active lifestyle and biometrics, we've designed a hybrid plan that covers both your <span className="font-semibold text-gray-900">fitness goals</span> and <span className="font-semibold text-gray-900">medical security</span>.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {[
                            { icon: Heart, text: "Waitlist for Medical Procedures waived" },
                            { icon: Zap, text: "Unlimited AI Coach Access" },
                            { icon: Shield, text: "100% Hospital Bill Coverage" },
                            { icon: Sparkles, text: "Smart Wearable Included" }
                        ].map((benefit, i) => (
                            <div key={i} className="flex items-center gap-3 p-4 rounded-xl bg-white border border-gray-100 shadow-sm">
                                <div className={`p-2 rounded-lg ${bgTheme}`}>
                                    <benefit.icon className={`w-5 h-5 ${themeColor}`} />
                                </div>
                                <span className="font-medium text-gray-700">{benefit.text}</span>
                            </div>
                        ))}
                    </div>

                    <div className={`p-8 rounded-3xl bg-white border-2 ${borderColor} shadow-xl relative overflow-hidden group`}>
                        <div className={`absolute top-0 right-0 p-4 ${bgTheme} rounded-bl-3xl`}>
                            <p className={`text-xs font-bold uppercase tracking-wider ${themeColor}`}>Dynamic Pricing</p>
                        </div>

                        <div className="space-y-1 mb-6">
                            <p className="text-sm text-gray-500 font-medium">Monthly Premium for You</p>
                            <div className="flex items-baseline gap-2">
                                <span className="text-5xl font-bold text-gray-900">₹{calculatedPremium}</span>
                                <span className="text-lg text-gray-400 line-through">₹{calculatedPremium + 300}</span>
                            </div>
                            <p className={`text-sm ${themeColor} font-medium`}>You saved ₹300 due to your healthy BMI!</p>
                        </div>

                        <Button
                            onClick={() => navigate("/home", { state: { formData } })}
                            className={`w-full py-6 text-lg shadow-lg hover:shadow-xl transition-all ${buttonBg}`}
                        >
                            Secure My Health Now <ArrowRight className="ml-2 w-5 h-5" />
                        </Button>
                        <p className="text-xs text-center text-gray-400 mt-4">No commitment. Cancel anytime.</p>
                    </div>
                </div>

                {/* Right Column: Avatar visual */}
                <div className="hidden lg:block h-[800px] relative">
                    <div className="absolute inset-0">
                        <AvatarScene
                            textToSpeak={`Incredible Analysis ${name}. Your biological age matches your spirit. This premium plan is tailored to keep you at your peak.`}
                            voiceType={gender as VoiceType}
                        />
                    </div>
                    {/* Floating Card Overlay */}
                    <div className="absolute bottom-20 left-10 bg-white/90 backdrop-blur border border-white/50 p-4 rounded-2xl shadow-lg max-w-xs animate-bounce-slow">
                        <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${bgTheme}`}>
                                <Heart className={`w-5 h-5 ${themeColor}`} fill="currentColor" />
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 font-semibold uppercase">Heart Score</p>
                                <p className="text-lg font-bold text-gray-900">98/100 (Excellent)</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
