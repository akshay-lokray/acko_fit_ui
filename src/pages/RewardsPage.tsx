import { useNavigate } from "react-router-dom";
import { ArrowLeft, Zap, Gift, Lock, CheckCircle2, ShieldCheck, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";

interface RewardTier {
    xpRequired: number;
    title: string;
    reward: string;
    icon: any;
    type: "insurance" | "product" | "badge";
    image?: string;
    isClaimed?: boolean;
}

const REWARDS: RewardTier[] = [
    {
        xpRequired: 0,
        title: "Novice",
        reward: "Founder's Badge",
        icon: CheckCircle2,
        type: "badge",
        isClaimed: true
    },
    {
        xpRequired: 500,
        title: "Warrior",
        reward: "5% Off Acko Health Policy",
        icon: ShieldCheck,
        type: "insurance"
    },
    {
        xpRequired: 1500,
        title: "Elite",
        reward: "Free Smart Protein Shaker",
        icon: ShoppingBag,
        type: "product"
    },
    {
        xpRequired: 3000,
        title: "Titan",
        reward: "15% Off + Free Full Body Checkup",
        icon: ShieldCheck,
        type: "insurance"
    },
    {
        xpRequired: 5000,
        title: "Legend",
        reward: "AckoFit Premium Gear Kit",
        icon: Gift,
        type: "product"
    },
];

export function RewardsPage() {
    const navigate = useNavigate();
    const currentXP = 350; // Mock current XP

    // Calculate progress to next reward
    const nextRewardIndex = REWARDS.findIndex(r => r.xpRequired > currentXP);
    const nextReward = REWARDS[nextRewardIndex];
    const prevRewardXP = nextRewardIndex > 0 ? REWARDS[nextRewardIndex - 1].xpRequired : 0;
    const progressToNext = Math.min(100, Math.max(0, ((currentXP - prevRewardXP) / (nextReward.xpRequired - prevRewardXP)) * 100));

    return (
        <div className="min-h-screen bg-white font-sans flex flex-col">
            {/* Header */}
            <div className="bg-white p-4 sticky top-0 z-10 flex items-center gap-3 border-b border-gray-100">
                <Button variant="ghost" size="icon" onClick={() => navigate("/home")}>
                    <ArrowLeft className="w-6 h-6 text-gray-900" />
                </Button>
                <span className="text-xl font-bold bg-gradient-to-r from-purple-700 to-emerald-600 bg-clip-text text-transparent">
                    Acko Rewards
                </span>
            </div>

            <div className="flex-1 overflow-y-auto pb-8">
                {/* XP Hero Section */}
                <div className="bg-gradient-to-br from-purple-700 to-emerald-600 p-8 text-white relative overflow-hidden mb-6">
                    <div className="relative z-10 flex flex-col items-center justify-center text-center">
                        <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-md mb-3 border-2 border-white/30">
                            <Zap className="w-10 h-10 text-white fill-white" />
                        </div>
                        <h1 className="text-4xl font-black mb-1">{currentXP}</h1>
                        <p className="text-sm font-semibold uppercase tracking-wider opacity-90">Total XP Earned</p>
                    </div>
                </div>

                {/* Next Goal Card */}
                <div className="px-4 mb-8">
                    <h3 className="font-bold text-gray-900 mb-3 text-lg">Next Milestone</h3>
                    <div className="relative bg-white rounded-3xl overflow-hidden border border-gray-200 shadow-sm">
                        {/* Light green gradient at bottom */}
                        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-emerald-50/50 to-transparent pointer-events-none" />
                        
                        <div className="relative p-5">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Rank: {nextReward.title}</p>
                                    <h4 className="font-bold text-lg text-gray-900 mt-1.5">{nextReward.reward}</h4>
                                </div>
                                <div className="p-2 rounded-lg border-2 border-gray-200 bg-gray-50">
                                    <Lock className="w-5 h-5 text-gray-400" />
                                </div>
                            </div>
                            <div className="space-y-2.5">
                                <div className="flex justify-between text-xs font-medium text-gray-600">
                                    <span>{currentXP} XP</span>
                                    <span>{nextReward.xpRequired} XP</span>
                                </div>
                                <div className="relative h-2.5 bg-gray-100 rounded-full overflow-hidden">
                                    <div 
                                        className="absolute h-full bg-gradient-to-r from-purple-600 to-emerald-600 rounded-full transition-all duration-300"
                                        style={{ width: `${progressToNext}%` }}
                                    />
                                </div>
                                <p className="text-xs text-emerald-600 font-semibold mt-1 text-right">
                                    {nextReward.xpRequired - currentXP} XP to unlock
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Rewards Timeline */}
                <div className="px-4">
                    <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2 text-lg">
                        <div className="p-1.5 rounded-lg border-2 border-emerald-200 bg-emerald-50/30">
                            <Gift className="w-4 h-4 text-emerald-600" />
                        </div>
                        Rewards Path
                    </h3>

                    <div className="space-y-3 relative">
                        {/* Vertical Line */}
                        <div className="absolute left-[22px] top-4 bottom-4 w-0.5 bg-gray-200 z-0" />

                        {REWARDS.map((tier, index) => {
                            const isUnlocked = currentXP >= tier.xpRequired;
                            return (
                                <div key={index} className={`relative z-10 flex gap-3 ${isUnlocked ? 'opacity-100' : 'opacity-60'}`}>
                                    {/* Icon Circle */}
                                    <div className={`w-11 h-11 rounded-full flex-shrink-0 flex items-center justify-center border-2 ${isUnlocked ? 'border-emerald-200 bg-emerald-50/30 text-emerald-600' : 'border-gray-200 bg-gray-50 text-gray-400'}`}>
                                        {isUnlocked ? <CheckCircle2 className="w-5 h-5" strokeWidth={2} /> : <Lock className="w-5 h-5" strokeWidth={2} />}
                                    </div>

                                    {/* Card */}
                                    <div className={`flex-1 rounded-2xl border ${isUnlocked ? 'bg-white border-gray-200 shadow-sm' : 'bg-gray-50 border-gray-200 border-dashed'}`}>
                                        <div className="p-4">
                                            <div className="flex justify-between items-start">
                                                <div className="flex-1">
                                                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                                        {tier.xpRequired} XP • {tier.title}
                                                    </p>
                                                    <h4 className="font-bold text-gray-900 mt-1 text-sm">{tier.reward}</h4>
                                                    <p className="text-xs text-gray-400 mt-1 capitalize">{tier.type} Reward</p>
                                                </div>
                                                <div className={`p-2 rounded-lg border-2 ${isUnlocked ? 'border-emerald-200 bg-emerald-50/30 text-emerald-600' : 'border-gray-200 bg-gray-100 text-gray-400'}`}>
                                                    <tier.icon className="w-4 h-4" strokeWidth={2} />
                                                </div>
                                            </div>
                                            {isUnlocked && tier.type === 'insurance' && !tier.isClaimed && (
                                                <Button className="w-full mt-3 h-9 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 rounded-xl">
                                                    Claim Coupon
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
