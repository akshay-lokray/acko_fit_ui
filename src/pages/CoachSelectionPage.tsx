import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Dumbbell, Zap } from "lucide-react";
import { useState } from "react";

export function CoachSelectionPage() {
    const navigate = useNavigate();
    const [hovered, setHovered] = useState<string | null>(null);
    const [selected, setSelected] = useState<string | null>(null);

    const coaches = [
        {
            id: "male",
            name: "Dhoni",
            role: "STRENGTH & POWER",
            description: "Push your limits with high-intensity strength training.",
            themeColor: "emerald",
            icon: Dumbbell,
        },
        {
            id: "female",
            name: "Disha",
            role: "AGILITY & BALANCE",
            description: "Master control and flexibility with precision flows.",
            themeColor: "purple",
            icon: Zap,
        },
    ];

    const handleSelect = (coachId: string, coachName: string) => {
        setSelected(coachId);
        // Add a slight delay for animation before navigation
        setTimeout(() => {
            navigate("/coach-intro", {
                state: { gender: coachId, coachName },
            });
        }, 200);
    };

    return (
        <div className="min-h-screen bg-white relative overflow-hidden font-sans">
            {/* Animated gradient background */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-0 right-0 w-96 h-96 bg-purple-100/30 rounded-full blur-3xl animate-pulse" />
                <div className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-100/30 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
            </div>

            <div className="relative z-10 container mx-auto px-4 py-12 max-w-4xl">
                {/* Header */}
                <div className="text-center mb-12 space-y-3 animate-fade-in-up">
                    <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
                        Choose Your{" "}
                        <span className="bg-gradient-to-r from-purple-700 to-purple-600 bg-clip-text text-transparent">
                            AI Coach
                        </span>
                    </h1>
                    <p className="text-gray-600 text-lg max-w-lg mx-auto">
                        Select the expert AI trainer aligned with your health goals.
                    </p>
                </div>

                {/* Coach Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {coaches.map((coach, index) => {
                        const Icon = coach.icon;
                        const isHovered = hovered === coach.id;
                        const isSelected = selected === coach.id;
                        const isEmerald = coach.themeColor === "emerald";

                        return (
                            <div
                                key={coach.id}
                                className="group relative animate-fade-in-up"
                                onMouseEnter={() => setHovered(coach.id)}
                                onMouseLeave={() => setHovered(null)}
                                style={{ animationDelay: `${index * 150}ms` }}
                            >
                                {/* Card */}
                                <div
                                    className={`
                                        relative h-full bg-white rounded-3xl border-2 cursor-pointer
                                        transition-all duration-500 ease-out
                                        ${isEmerald 
                                            ? 'border-emerald-200 hover:border-emerald-400' 
                                            : 'border-purple-200 hover:border-purple-400'
                                        }
                                        ${isHovered ? 'shadow-2xl -translate-y-2 scale-[1.02]' : 'shadow-lg'}
                                        ${isSelected ? 'ring-4 ring-offset-2 ' + (isEmerald ? 'ring-emerald-500' : 'ring-purple-500') : ''}
                                        overflow-hidden
                                    `}
                                    onClick={() => handleSelect(coach.id, coach.name)}
                                >
                                    {/* Gradient overlay on hover */}
                                    <div 
                                        className={`
                                            absolute inset-0 opacity-0 group-hover:opacity-5 transition-opacity duration-500
                                            ${isEmerald 
                                                ? 'bg-gradient-to-br from-emerald-400 to-emerald-600' 
                                                : 'bg-gradient-to-br from-purple-400 to-purple-600'
                                            }
                                        `}
                                    />

                                    {/* Content */}
                                    <div className="relative p-8 flex flex-col h-full">
                                        {/* Icon */}
                                        <div 
                                            className={`
                                                w-16 h-16 rounded-xl flex items-center justify-center mb-6
                                                transition-all duration-500
                                                ${isEmerald 
                                                    ? 'bg-emerald-100 text-emerald-600 group-hover:bg-emerald-200' 
                                                    : 'bg-purple-100 text-purple-600 group-hover:bg-purple-200'
                                                }
                                                ${isHovered ? 'scale-110 rotate-3' : 'scale-100 rotate-0'}
                                            `}
                                        >
                                            <Icon className="w-8 h-8" strokeWidth={2.5} />
                                        </div>

                                        {/* Name and Role */}
                                        <div className="space-y-2 mb-4">
                                            <h2 className="text-3xl font-bold text-gray-900 group-hover:text-gray-950 transition-colors">
                                                {coach.name}
                                            </h2>
                                            <p 
                                                className={`
                                                    text-sm font-bold uppercase tracking-widest
                                                    ${isEmerald ? 'text-emerald-600' : 'text-purple-600'}
                                                `}
                                            >
                                                {coach.role}
                                            </p>
                                        </div>

                                        {/* Description */}
                                        <p className="text-gray-600 text-base leading-relaxed mb-6 flex-grow">
                                            {coach.description}
                                        </p>

                                        {/* Button */}
                                        <Button
                                            className={`
                                                w-full h-12 rounded-xl font-semibold text-base
                                                transition-all duration-300
                                                ${isEmerald 
                                                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white' 
                                                    : 'bg-purple-700 hover:bg-purple-800 text-white'
                                                }
                                                ${isHovered ? 'shadow-lg scale-105' : 'shadow-md'}
                                                group/button
                                            `}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleSelect(coach.id, coach.name);
                                            }}
                                        >
                                            <span className="flex items-center justify-center">
                                                Select {coach.name}
                                                <ArrowRight 
                                                    className={`
                                                        ml-2 h-5 w-5 transition-all duration-300
                                                        ${isHovered ? 'translate-x-2' : 'translate-x-0'}
                                                    `} 
                                                />
                                            </span>
                                        </Button>
                                    </div>

                                    {/* Animated border glow */}
                                    <div 
                                        className={`
                                            absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100
                                            transition-opacity duration-500 pointer-events-none
                                            ${isEmerald 
                                                ? 'bg-gradient-to-r from-emerald-400/20 via-emerald-500/30 to-emerald-400/20' 
                                                : 'bg-gradient-to-r from-purple-400/20 via-purple-500/30 to-purple-400/20'
                                            }
                                            blur-xl
                                        `}
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
