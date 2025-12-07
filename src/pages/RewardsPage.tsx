import { useNavigate } from "react-router-dom";
import { ArrowLeft, Zap, Gift, Lock, CheckCircle2, ShieldCheck, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

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
        <div className="min-h-screen bg-gray-50 font-sans flex flex-col">
            {/* Header */}
            <div className="bg-white p-4 shadow-sm sticky top-0 z-10 flex items-center gap-3">
                <Button variant="ghost" size="icon" onClick={() => navigate("/home")}>
                    <ArrowLeft className="w-6 h-6 text-gray-900" />
                </Button>
                <span className="text-xl font-bold text-gray-900">Acko Rewards</span>
            </div>

            <div className="flex-1 overflow-y-auto pb-8">
                {/* XP Hero Section */}
                <div className="bg-gradient-to-br from-yellow-400 to-orange-500 p-8 text-white relative overflow-hidden rounded-b-[2.5rem] shadow-lg mb-6">
                    <div className="relative z-10 flex flex-col items-center justify-center text-center">
                        <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-md mb-3 border-4 border-white/30 shadow-inner">
                            <Zap className="w-10 h-10 text-white fill-white" />
                        </div>
                        <h1 className="text-4xl font-black mb-1 drop-shadow-sm">{currentXP}</h1>
                        <p className="text-sm font-bold uppercase tracking-widest opacity-90">Total XP Earned</p>
                    </div>

                    {/* Decorative circles */}
                    <div className="absolute top-0 left-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -ml-10 -mt-10 pointer-events-none" />
                    <div className="absolute bottom-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-3xl -mr-10 -mb-10 pointer-events-none" />
                </div>

                {/* Next Goal Card */}
                <div className="px-6 mb-8">
                    <h3 className="font-bold text-gray-900 mb-3">Next Milestone</h3>
                    <Card className="p-5 border-l-4 border-l-gray-300 relative overflow-hidden group hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-2">
                            <div>
                                <p className="text-xs font-bold text-gray-400 uppercase">Rank: {nextReward.title}</p>
                                <h4 className="font-bold text-lg text-gray-900">{nextReward.reward}</h4>
                            </div>
                            <Lock className="w-5 h-5 text-gray-400" />
                        </div>
                        <div className="space-y-1">
                            <div className="flex justify-between text-xs font-medium text-gray-500">
                                <span>{currentXP} XP</span>
                                <span>{nextReward.xpRequired} XP</span>
                            </div>
                            <Progress value={progressToNext} className="h-2.5 bg-gray-100" />
                            <p className="text-xs text-indigo-600 font-bold mt-1 text-right">
                                {nextReward.xpRequired - currentXP} XP to unlock
                            </p>
                        </div>
                    </Card>
                </div>

                {/* Rewards Timeline */}
                <div className="px-6">
                    <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <Gift className="w-5 h-5 text-purple-600" />
                        Rewards Path
                    </h3>

                    <div className="space-y-4 relative">
                        {/* Vertical Line */}
                        <div className="absolute left-[22px] top-4 bottom-4 w-0.5 bg-gray-200 z-0" />

                        {REWARDS.map((tier, index) => {
                            const isUnlocked = currentXP >= tier.xpRequired;
                            return (
                                <div key={index} className={`relative z-10 flex gap-4 ${isUnlocked ? 'opacity-100' : 'opacity-60 grayscale'}`}>
                                    {/* Icon Circle */}
                                    <div className={`w-12 h-12 rounded-full flex-shrink-0 flex items-center justify-center border-4 border-gray-50 ${isUnlocked ? 'bg-green-100 text-green-600 shadow-sm' : 'bg-gray-200 text-gray-400'}`}>
                                        {isUnlocked ? <CheckCircle2 className="w-6 h-6" /> : <Lock className="w-5 h-5" />}
                                    </div>

                                    {/* Card */}
                                    <Card className={`flex-1 p-4 ${isUnlocked ? 'bg-white border-green-200 shadow-sm' : 'bg-gray-50 border-dashed'}`}>
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1">
                                                    {tier.xpRequired} XP • {tier.title}
                                                </p>
                                                <h4 className="font-bold text-gray-900 mt-0.5">{tier.reward}</h4>
                                                <p className="text-xs text-gray-400 mt-1 capitalize">{tier.type} Reward</p>
                                            </div>
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isUnlocked ? 'bg-indigo-50 text-indigo-600' : 'bg-gray-100'}`}>
                                                <tier.icon className="w-4 h-4" />
                                            </div>
                                        </div>
                                        {isUnlocked && tier.type === 'insurance' && !tier.isClaimed && (
                                            <Button className="w-full mt-3 h-8 text-xs font-bold bg-emerald-600 hover:bg-emerald-700">
                                                Claim Coupon
                                            </Button>
                                        )}
                                    </Card>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
