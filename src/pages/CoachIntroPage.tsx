import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import AvatarScene from "@/components/AvatarScene";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";
import type { VoiceType } from "@/types/voice";

export function CoachIntroPage() {
    const location = useLocation();
    const navigate = useNavigate();
    const { gender, coachName } = location.state || { gender: "female", coachName: "Aria" };
    const [showButton, setShowButton] = useState(false);

    useEffect(() => {
        // Show the "Start" button after a slight delay or when speaking finishes
        const timer = setTimeout(() => setShowButton(true), 3000);
        return () => clearTimeout(timer);
    }, []);

    const introText = `Hi! I'm ${coachName}. I'm here to push you to your limits and help you achieve your goals. Let's get started!`;

    // Determine theme colors based on coach
    const isMale = gender === "male";
    const themeColor = isMale ? "text-emerald-600" : "text-purple-700";
    const buttonBg = isMale ? "bg-emerald-600 hover:bg-emerald-700" : "bg-purple-700 hover:bg-purple-800";

    return (
        <div className="min-h-screen bg-white relative overflow-hidden flex flex-col items-center justify-center font-sans">
            {/* Soft decorative blobs matching Acko's clean aesthetic */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                <div className={`absolute top-[-10%] right-[-5%] w-[40%] h-[40%] ${isMale ? 'bg-emerald-100/40' : 'bg-purple-100/40'} rounded-full blur-[80px]`} />
                <div className={`absolute bottom-[-10%] left-[-5%] w-[40%] h-[40%] ${isMale ? 'bg-emerald-100/40' : 'bg-purple-100/40'} rounded-full blur-[80px]`} />
            </div>

            {/* Full screen avatar scene - contained to avoid covering UI */}
            <div className="absolute inset-0 z-0">
                <AvatarScene
                    textToSpeak={introText}
                    voiceType={gender as VoiceType}
                />
            </div>

            {/* Removed dark gradient, using subtle light fade if needed, but keeping clean for now */}
            {/* <div className="absolute inset-0 bg-gradient-to-t from-white/90 via-transparent to-transparent z-10 pointer-events-none" /> */}

            <div className="relative z-20 flex flex-col items-center justify-end h-full pb-20 space-y-8 pointer-events-auto w-full max-w-4xl px-6">
                <div className="text-center space-y-4 animate-fade-in-up bg-white/80 backdrop-blur-md p-8 rounded-3xl border border-white/50 shadow-xl">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-gray-200 text-xs font-semibold text-gray-600 uppercase tracking-wider mx-auto shadow-sm">
                        <Sparkles className={`w-3 h-3 ${themeColor}`} />
                        <span>Your Personal Trainer</span>
                    </div>
                    <div className="space-y-1">
                        <h1 className="text-4xl md:text-5xl font-bold text-gray-900">
                            Meet <span className={themeColor}>{coachName}</span>
                        </h1>
                        <p className="text-lg text-gray-600 font-medium">
                            AI-Powered Performance Coach
                        </p>
                    </div>
                </div>

                {showButton && (
                    <Button
                        onClick={() => navigate("/setup", { state: { gender, coachName } })}
                        className={`h-14 px-10 text-lg text-white shadow-lg transition-all hover:scale-105 hover:shadow-xl rounded-full ${buttonBg}`}
                    >
                        Start Assessment
                        <ArrowRight className="ml-3 h-6 w-6" />
                    </Button>
                )}
            </div>
        </div>
    );
}
