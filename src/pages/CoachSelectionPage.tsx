import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, Dumbbell, Zap } from "lucide-react";
import { useState, useEffect } from "react";
import AvatarScene from "@/components/AvatarScene";
import { useGLTF } from "@react-three/drei";
import {
  MALE_DHONI_AVATAR_URL,
  FEMALE_DEFAULT_AVATAR_URL,
  MALE_DHONI_ANIM_URL,
} from "@/constants/avatarUrls";

export function CoachSelectionPage() {
    const navigate = useNavigate();
    const [hovered, setHovered] = useState<string | null>(null);

    useEffect(() => {
        useGLTF.preload(MALE_DHONI_AVATAR_URL);
        useGLTF.preload(MALE_DHONI_ANIM_URL);
        useGLTF.preload(FEMALE_DEFAULT_AVATAR_URL);
    }, []);

    const coaches = [
        {
            id: "male",
            name: "Dhoni",
            role: "Strength & Power",
            description: "Push your limits with high-intensity strength training.",
            themeColor: "text-emerald-600",
            bgColor: "bg-emerald-50",
            borderColor: "border-emerald-100",
            hoverBorder: "group-hover:border-emerald-500",
            buttonBg: "bg-emerald-600 hover:bg-emerald-700",
            icon: <Dumbbell className="w-8 h-8 text-emerald-600" />,
        },
        {
            id: "female",
            name: "Disha",
            role: "Agility & Balance",
            description: "Master control and flexibility with precision flows.",
            themeColor: "text-purple-700",
            bgColor: "bg-purple-50",
            borderColor: "border-purple-100",
            hoverBorder: "group-hover:border-purple-600",
            buttonBg: "bg-purple-700 hover:bg-purple-800",
            icon: <Zap className="w-8 h-8 text-purple-700" />,
        },
    ];

    return (
        <div className="min-h-screen bg-white relative flex flex-col items-center justify-center p-6 font-sans">
            {/* Soft decorative blobs matching Acko's clean aesthetic */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[40%] bg-purple-100/50 rounded-full blur-[80px]" />
                <div className="absolute bottom-[-10%] left-[-5%] w-[40%] h-[40%] bg-green-100/50 rounded-full blur-[80px]" />
            </div>

            <div className="text-center space-y-4 mb-12 relative z-10 max-w-2xl animate-fade-in-up">
                <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-gray-900">
                    Choose Your <span className="text-purple-700"> AI Coach</span>
                </h1>
                <p className="text-gray-500 text-lg max-w-lg mx-auto">
                    Select the expert AI trainer aligned with your health goals.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl px-4 relative z-10">
                {coaches.map((coach) => (
                    <div
                        key={coach.id}
                        className="group"
                        onMouseEnter={() => setHovered(coach.id)}
                        onMouseLeave={() => setHovered(null)}
                    >
                        <Card
                            className={`relative h-full bg-white border-2 ${coach.borderColor} ${coach.hoverBorder} p-8 cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-1 rounded-2xl flex flex-col items-start gap-6`}
                            onClick={() =>
                                navigate("/coach-intro", {
                                    state: { gender: coach.id, coachName: coach.name },
                                })
                            }
                        >
                            <div className={`p-4 rounded-xl ${coach.bgColor} transition-transform duration-300 group-hover:scale-110`}>
                                {coach.icon}
                            </div>

                            <div className="space-y-1">
                                <h2 className="text-3xl font-bold text-gray-900 group-hover:text-black transition-colors">
                                    {coach.name}
                                </h2>
                                <p className={`text-sm font-bold uppercase tracking-wide ${coach.themeColor}`}>
                                    {coach.role}
                                </p>
                            </div>

                            <p className="text-gray-500 text-base leading-relaxed">
                                {coach.description}
                            </p>

                            <Button
                                className={`mt-4 w-full text-white font-medium ${coach.buttonBg} transition-all duration-300 shadow-sm`}
                                size="lg"
                            >
                                Select {coach.name}
                                <ArrowRight className={`ml-2 h-5 w-5 transition-transform duration-300 ${hovered === coach.id ? 'translate-x-1' : ''}`} />
                            </Button>
                        </Card>
                    </div>
                ))}
            </div>
            <div
                style={{
                    position: "absolute",
                    width: 0,
                    height: 0,
                    opacity: 0,
                    pointerEvents: "none",
                }}
            >
                <AvatarScene voiceType="male" isFullScreen={false} />
                <AvatarScene voiceType="female" isFullScreen={false} />
            </div>
        </div>
    );
}
