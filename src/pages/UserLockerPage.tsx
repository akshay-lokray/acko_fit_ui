import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    ArrowLeft,
    Shield,
    Zap,
    Trophy,
    Shirt,
    Crown,
    Dumbbell,
    Lock,
    Clock,
    Droplets,
    Utensils,
    ShoppingBag
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import AvatarScene from "@/components/AvatarScene";

// Mock Gear Inteface
interface GearItem {
    id: string;
    name: string;
    type: "head" | "body" | "legs" | "feet";
    rarity: "common" | "rare" | "epic";
    locked: boolean;
    levelReq?: number;
}

const GEAR_ITEMS: GearItem[] = [
    { id: "1", name: "Novice Headband", type: "head", rarity: "common", locked: false },
    { id: "2", name: "Neon Runner Info", type: "body", rarity: "rare", locked: false },
    { id: "3", name: "Titan Gym Shorts", type: "legs", rarity: "common", locked: false },
    { id: "4", name: "Cyber Kicks", type: "feet", rarity: "epic", locked: true, levelReq: 5 },
    { id: "5", name: "Golden Halo", type: "head", rarity: "epic", locked: true, levelReq: 10 },
];

// Mock Activity Logs
const ACTIVITY_LOGS = [
    { id: 1, type: "food", title: "Lunch Logged", detail: "Dal Tadka & Rice (580 kcal)", time: "2:30 PM", icon: Utensils, color: "bg-orange-100 text-orange-600" },
    { id: 2, type: "water", title: "Hydration Goal", detail: "5 Glasses (1.2L)", time: "1:00 PM", icon: Droplets, color: "bg-blue-100 text-blue-600" },
    { id: 3, type: "order", title: "Ingredients Ordered", detail: "BigBasket: Lentils, Tomatoes...", time: "11:45 AM", icon: ShoppingBag, color: "bg-green-100 text-green-600" },
    { id: 4, type: "workout", title: "Morning HIIT", detail: "30 mins • 320 kcal burned", time: "8:00 AM", icon: Dumbbell, color: "bg-purple-100 text-purple-600" },
];

export function UserLockerPage() {
    const navigate = useNavigate();
    const [selectedTab, setSelectedTab] = useState<"gear" | "stats" | "logs">("gear");

    // Mock user stats
    const stats = [
        { label: "Strength", value: 45, icon: Dumbbell, color: "text-red-500", bg: "bg-red-500" },
        { label: "Endurance", value: 72, icon: Zap, color: "text-yellow-500", bg: "bg-yellow-500" },
        { label: "Discipline", value: 88, icon: Shield, color: "text-blue-500", bg: "bg-blue-500" },
    ];

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
            <div className="bg-white p-4 shadow-sm z-10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" onClick={() => navigate("/home")}>
                        <ArrowLeft className="w-6 h-6 text-gray-900" />
                    </Button>
                    <h1 className="text-xl font-bold text-gray-900">Your Locker</h1>
                </div>
                <div className="flex items-center gap-2 bg-yellow-50 px-3 py-1 rounded-full border border-yellow-100">
                    <Crown className="w-4 h-4 text-yellow-600 fill-yellow-600" />
                    <span className="font-bold text-yellow-700 text-sm">Lvl 1</span>
                </div>
            </div>

            {/* Main Avatar Display (The User) */}
            <div className="h-[45vh] relative bg-gradient-to-b from-gray-200 to-gray-50 flex items-center justify-center overflow-hidden">
                {/* 
                   Ideally, this AvatarScene would load the USER'S model, distinct from the Coach. 
                   For demo, we reuse the component but in a "customization" context.
                */}
                <div className="opacity-90 scale-90">
                    <AvatarScene voiceType="female" textToSpeak="" />
                </div>

                <div className="absolute top-4 right-4 flex flex-col gap-2">
                    <div className="p-3 bg-white/80 backdrop-blur rounded-2xl shadow-sm text-center">
                        <p className="text-xs font-bold text-gray-400 uppercase">Streak</p>
                        <p className="text-xl font-bold text-orange-500">🔥 12</p>
                    </div>
                </div>

                {/* Floating "Equipped" Labels */}
                <div className="absolute bottom-4 left-4 bg-white/80 backdrop-blur px-3 py-1.5 rounded-full text-xs font-bold text-gray-600 border border-gray-200 shadow-sm animate-bounce">
                    👕 Neon Runner Info
                </div>
            </div>

            {/* Customization Panel */}
            <div className="flex-1 bg-white rounded-t-[2.5rem] shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.05)] relative -top-8 p-6 flex flex-col h-full z-10">

                {/* Tabs */}
                <div className="flex p-1 bg-gray-100 rounded-xl mb-6 flex-shrink-0">
                    <button
                        onClick={() => setSelectedTab("logs")}
                        className={`flex-1 py-2.5 text-xs md:text-sm font-bold rounded-lg transition-all ${selectedTab === 'logs' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-400'}`}
                    >
                        Daily Log
                    </button>
                    <button
                        onClick={() => setSelectedTab("gear")}
                        className={`flex-1 py-2.5 text-xs md:text-sm font-bold rounded-lg transition-all ${selectedTab === 'gear' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-400'}`}
                    >
                        Gear
                    </button>
                    <button
                        onClick={() => setSelectedTab("stats")}
                        className={`flex-1 py-2.5 text-xs md:text-sm font-bold rounded-lg transition-all ${selectedTab === 'stats' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-400'}`}
                    >
                        Stats
                    </button>
                </div>

                <div className="overflow-y-auto flex-1 pb-10">
                    {selectedTab === "gear" && (
                        <div className="grid grid-cols-2 gap-4">
                            {GEAR_ITEMS.map((item) => (
                                <Card
                                    key={item.id}
                                    className={`p-3 border-2 relative cursor-pointer group transition-all 
                                    ${item.locked ? 'bg-gray-50 border-gray-100 opacity-70' : 'bg-white border-gray-100 hover:border-emerald-500 hover:shadow-md'}`}
                                >
                                    {item.locked && (
                                        <div className="absolute inset-0 bg-gray-100/50 flex items-center justify-center z-10 text-gray-400 flex-col">
                                            <Lock className="w-6 h-6 mb-1" />
                                            <span className="text-[10px] font-bold">Lvl {item.levelReq}</span>
                                        </div>
                                    )}
                                    <div className="aspect-square bg-gray-50 rounded-xl mb-3 flex items-center justify-center">
                                        <Shirt className={`w-8 h-8 ${item.rarity === 'epic' ? 'text-purple-500' : item.rarity === 'rare' ? 'text-blue-500' : 'text-gray-400'}`} />
                                    </div>
                                    <h3 className="text-xs font-bold text-gray-900">{item.name}</h3>
                                    <p className="text-[10px] text-gray-500 uppercase font-bold mt-1">{item.rarity}</p>
                                </Card>
                            ))}
                        </div>
                    )}

                    {selectedTab === "stats" && (
                        <div className="space-y-6">
                            {stats.map((stat, i) => (
                                <div key={i} className="space-y-2">
                                    <div className="flex items-center justify-between text-sm">
                                        <div className="flex items-center gap-2">
                                            <stat.icon className={`w-4 h-4 ${stat.color}`} />
                                            <span className="font-bold text-gray-700">{stat.label}</span>
                                        </div>
                                        <span className="font-bold text-gray-900">{stat.value}/100</span>
                                    </div>
                                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                        <div className={`h-full rounded-full ${stat.bg}`} style={{ width: `${stat.value}%` }} />
                                    </div>
                                </div>
                            ))}

                            <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-2xl p-4 text-white flex items-center justify-between mt-4">
                                <div>
                                    <p className="text-xs font-bold opacity-70 uppercase">Daily Grind</p>
                                    <p className="text-sm font-medium mt-1">Complete 2 more workouts to boost Strength.</p>
                                </div>
                                <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center">
                                    <Trophy className="w-5 h-5 text-yellow-400" />
                                </div>
                            </div>
                        </div>
                    )}

                    {selectedTab === "logs" && (
                        <div className="space-y-0">
                            <h3 className="font-bold text-gray-900 mb-4 px-1">Today's Timeline</h3>
                            <div className="relative border-l-2 border-gray-100 ml-4 space-y-8 pb-4">
                                {ACTIVITY_LOGS.map((log) => (
                                    <div key={log.id} className="relative pl-8">
                                        <div className={`absolute -left-[9px] top-0 w-4 h-4 rounded-full border-2 border-white shadow-sm z-10 ${log.type === 'workout' ? 'bg-purple-500' : log.type === 'order' ? 'bg-green-500' : 'bg-blue-500'}`} />

                                        <div className="bg-white border border-gray-100 rounded-xl p-3 shadow-sm flex items-start gap-3">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${log.color}`}>
                                                <log.icon className="w-5 h-5" />
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex justify-between items-start">
                                                    <h4 className="font-bold text-gray-900 text-sm">{log.title}</h4>
                                                    <span className="text-[10px] font-bold text-gray-400 bg-gray-50 px-2 py-1 rounded-full">{log.time}</span>
                                                </div>
                                                <p className="text-xs text-gray-500 mt-1 font-medium">{log.detail}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                <div className="relative pl-8 opacity-50">
                                    <div className="absolute -left-[5px] top-1 w-2 h-2 rounded-full bg-gray-300" />
                                    <p className="text-xs font-bold text-gray-400">Day Started • 6:00 AM</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
