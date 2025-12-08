import { useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Shield, Sword, Crown, Zap, Target, Medal, Star } from "lucide-react";
import { Button } from "@/components/ui/button";

interface RankTier {
    id: string;
    title: string;
    minXp: number;
    icon: any;
    color: string;
    description: string;
    perks: string[];
}

const RANK_TIERS: RankTier[] = [
    {
        id: "novice",
        title: "Novice",
        minXp: 0,
        icon: Target,
        color: "text-gray-600 bg-gray-100",
        description: "The journey of a thousand miles begins with a single step.",
        perks: ["Newbie Badge", "Access to Basic Plans"]
    },
    {
        id: "scout",
        title: "Scout",
        minXp: 500,
        icon: Medal,
        color: "text-blue-500 bg-blue-100",
        description: "Exploring the limits of your potential.",
        perks: ["Scout Badge", "Weekly Report Unlocked"]
    },
    {
        id: "warrior",
        title: "Warrior",
        minXp: 1500,
        icon: Shield,
        color: "text-emerald-600 bg-emerald-100",
        description: "Forged in the fires of discipline and consistency.",
        perks: ["Warrior Badge", "5% Insurance Discount", "Custom Avatar Gear"]
    },
    {
        id: "gladiator",
        title: "Gladiator",
        minXp: 3500,
        icon: Sword,
        color: "text-gray-500 bg-gray-100",
        description: "A force to be reckoned with in the arena of life.",
        perks: ["Gladiator Badge", "Priority Coach Support", "Exclusive Challenges"]
    },
    {
        id: "titan",
        title: "Titan",
        minXp: 7000,
        icon: Zap,
        color: "text-purple-600 bg-purple-100",
        description: "Standing tall amongst mortals.",
        perks: ["Titan Badge", "15% Insurance Discount", "Free Health Checkup"]
    },
    {
        id: "legend",
        title: "Legend",
        minXp: 15000,
        icon: Crown,
        color: "text-yellow-600 bg-yellow-100",
        description: "Your name is whispered with awe.",
        perks: ["Legend Status", "Lifetime Premium App Access", "VVIP Support"]
    }
];

export function RankingsPage() {
    const navigate = useNavigate();
    const currentRankId = "warrior"; // Mock current rank
    const activeRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Scroll to active rank on mount
        if (activeRef.current) {
            activeRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
        }
    }, []);

    return (
        <div className="min-h-screen bg-gray-50 font-sans flex flex-col">
            {/* Header */}
            <div className="bg-white p-4 sticky top-0 z-10 flex items-center gap-3 border-b border-gray-100">
                <Button variant="ghost" size="icon" onClick={() => navigate("/home")}>
                    <ArrowLeft className="w-6 h-6 text-gray-900" />
                </Button>
                <div>
                    <h1 className="text-xl font-bold text-gray-900">Rank Tiers</h1>
                    <p className="text-xs text-gray-500">Climb the ladder to glory.</p>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {RANK_TIERS.map((rank) => {
                    const isActive = rank.id === currentRankId;
                    const isPast = RANK_TIERS.findIndex(r => r.id === rank.id) < RANK_TIERS.findIndex(r => r.id === currentRankId);

                    return (
                        <div key={rank.id} ref={isActive ? activeRef : null}>
                            <div
                                className={`relative bg-white rounded-3xl border overflow-hidden transition-all duration-300 ${
                                    isActive
                                        ? 'border-2 border-emerald-500 shadow-md'
                                        : 'border border-gray-200 shadow-sm'
                                }`}
                            >
                                {isActive && (
                                    <div className="absolute top-0 right-0 bg-emerald-700 text-white text-xs font-bold px-4 py-1.5 rounded-bl-2xl">
                                        Current Rank
                                    </div>
                                )}

                                <div className="p-5 flex items-start gap-4">
                                    {/* Icon in rounded square */}
                                    <div className={`w-14 h-14 rounded-xl flex items-center justify-center shrink-0 ${
                                        isActive 
                                            ? 'bg-emerald-100 text-emerald-600' 
                                            : rank.id === 'scout'
                                                ? 'bg-blue-100 text-blue-500'
                                                : rank.id === 'gladiator'
                                                    ? 'bg-gray-100 text-gray-500'
                                                    : rank.id === 'novice'
                                                        ? 'bg-gray-100 text-gray-600'
                                                        : rank.color
                                    }`}>
                                        <rank.icon className="w-7 h-7" strokeWidth={2} />
                                    </div>

                                    <div className="flex-1">
                                        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-1">
                                            {rank.title}
                                            <Star className="w-4 h-4 text-emerald-500 fill-emerald-500" />
                                        </h3>
                                        <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">
                                            REQUIRED XP: {rank.minXp.toLocaleString()}+
                                        </p>
                                        <p className="text-sm text-gray-700 leading-relaxed mb-4">
                                            {rank.description}
                                        </p>

                                        {/* Perks List */}
                                        <div className="space-y-2">
                                            {rank.perks.map((perk, i) => (
                                                <div key={i} className="flex items-center gap-2 text-sm text-gray-600">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                                                    {perk}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
