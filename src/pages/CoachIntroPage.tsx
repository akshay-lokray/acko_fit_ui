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
    const [isButtonVisible, setIsButtonVisible] = useState(false);
    const [isClicked, setIsClicked] = useState(false);

    useEffect(() => {
        // Start showing the button after delay
        const showTimer = setTimeout(() => setShowButton(true), 3000);
        // Make it fully visible and clickable after fade-in completes
        const visibleTimer = setTimeout(() => setIsButtonVisible(true), 3500); // 500ms fade-in
        return () => {
            clearTimeout(showTimer);
            clearTimeout(visibleTimer);
        };
    }, []);

    const introText = `Hi! I'm ${coachName}. I'm here to push you to your limits and help you achieve your goals. Let's get started!`;

    // Determine theme colors based on coach
    const isMale = gender === "male";
    const themeColor = isMale ? "text-emerald-600" : "text-purple-700";
    const buttonBg = isMale ? "bg-emerald-600 hover:bg-emerald-700" : "bg-purple-700 hover:bg-purple-800";

    const handleButtonClick = () => {
        setIsClicked(true);
        // Navigate after animation
        setTimeout(() => {
            navigate("/setup", { state: { gender, coachName } });
        }, 500);
    };

    return (
        <div className="min-h-screen bg-white relative overflow-hidden flex flex-col font-sans">
            {/* Soft decorative blobs matching Acko's clean aesthetic */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                <div className={`absolute top-[-10%] right-[-5%] w-[40%] h-[40%] ${isMale ? 'bg-emerald-100/40' : 'bg-purple-100/40'} rounded-full blur-[80px]`} />
                <div className={`absolute bottom-[-10%] left-[-5%] w-[40%] h-[40%] ${isMale ? 'bg-emerald-100/40' : 'bg-purple-100/40'} rounded-full blur-[80px]`} />
            </div>

            {/* Card at top when clicked, otherwise centered */}
            <div className={`relative z-20 flex flex-col items-center w-full max-w-4xl mx-auto px-6 transition-all duration-500 ${
                isClicked ? 'pt-8 pb-4' : 'justify-center h-full pb-20'
            }`}>
                <div className={`text-center space-y-4 bg-white/80 backdrop-blur-md p-8 rounded-3xl border border-white/50 shadow-xl transition-all duration-500 ${
                    isClicked ? 'w-full' : 'animate-fade-in-up'
                }`}>
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

                {!isClicked && (
                    <Button
                        onClick={handleButtonClick}
                        disabled={!isButtonVisible}
                        className={`h-14 px-10 text-lg text-white shadow-lg transition-all duration-500 hover:scale-105 hover:shadow-xl rounded-full mt-8 ${buttonBg} ${
                            showButton 
                                ? 'opacity-100 pointer-events-auto' 
                                : 'opacity-0 pointer-events-none'
                        }`}
                    >
                        Start Assessment
                        <ArrowRight className="ml-3 h-6 w-6" />
                    </Button>
                )}
            </div>

            {/* Avatar fills the remaining space */}
            <div className="absolute inset-0 z-0">
                <AvatarScene
                    textToSpeak={introText}
                    voiceType={gender as VoiceType}
                    isFullScreen={true}
                />
            </div>
        </div>
    );
}
