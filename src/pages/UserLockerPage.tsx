import { useEffect, useState } from "react";
import { useUserProfileStore } from "@/store/userProfileStore";
import { useNavigate } from "react-router-dom";
import {
    ArrowLeft,
    Shield,
    Zap,
    Shirt,
    Crown,
    Dumbbell,
    Lock,
    ScanLine,
    CheckCircle2,
    Palette
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import UserAvatar3D from "@/components/UserAvatar3D";

// Mock Gear Inteface
interface GearItem {
    id: string;
    name: string;
    type: "head" | "body" | "legs" | "feet";
    rarity: "common" | "rare" | "epic";
    locked: boolean;
    levelReq?: number;
    icon: any;
}

const GEAR_ITEMS: GearItem[] = [
    { id: "1", name: "Novice Headband", type: "head", rarity: "common", locked: false, icon: Crown },
    { id: "2", name: "Neon Runner Info", type: "body", rarity: "rare", locked: false, icon: Shirt },
    { id: "3", name: "Titan Gym Shorts", type: "legs", rarity: "common", locked: false, icon: Shirt },
    { id: "4", name: "Cyber Kicks", type: "feet", rarity: "epic", locked: true, levelReq: 5, icon: Zap },
    { id: "5", name: "Golden Halo", type: "head", rarity: "epic", locked: true, levelReq: 10, icon: Crown },
];

const COLOR_CLASSES = [
    "bg-orange-100 text-orange-600",
    "bg-blue-100 text-blue-600",
    "bg-green-100 text-green-600",
    "bg-purple-100 text-purple-600",
    "bg-amber-100 text-amber-600",
    "bg-rose-100 text-rose-600",
    "bg-indigo-100 text-indigo-600",
];

type HabitDaily = Record<string, Record<string, number>>;

export function UserLockerPage() {
    const navigate = useNavigate();
    const { formData: profile } = useUserProfileStore();

    // --- State ---
    const [hasAvatar, setHasAvatar] = useState(false); // Simulate if user already created avatar
    const [scanStep, setScanStep] = useState<"idle" | "camera" | "scanning" | "complete">("idle");
    const [selectedTab, setSelectedTab] = useState<"gear" | "stats" | "logs">("logs");
    const [bodyShape, setBodyShape] = useState(0.5); // 0-1 Normal to Muscular
    const [dailyProgress, setDailyProgress] = useState<HabitDaily>({});

    // Mock user stats impacting shape
    const stats = [
        { label: "Strength", value: 45, icon: Dumbbell, color: "text-red-500", bg: "bg-red-500" },
        { label: "Endurance", value: 72, icon: Zap, color: "text-yellow-500", bg: "bg-yellow-500" },
        { label: "Discipline", value: 88, icon: Shield, color: "text-blue-500", bg: "bg-blue-500" },
    ];

    // --- Avatar Creation Logic ---
    const startScan = () => {
        setScanStep("camera");
    };

    const takePhoto = () => {
        setScanStep("scanning");
        // Simulate processing
        setTimeout(() => setScanStep("complete"), 2500);
    };

    const finalizeAvatar = () => {
        setHasAvatar(true);
        setScanStep("idle"); // Reset for future logic if needed, but 'hasAvatar' gates main view
    };

    // Fetch habits and daily progress on load
    useEffect(() => {
        const userId = profile.mobile || "";
        if (!userId) return;

        const loadHabits = async () => {
            try {
                const habitsRes = await fetch(`/api/habits/names?userId=${encodeURIComponent(userId)}`);
                if (!habitsRes.ok) return;
                const habitsData: string[] = await habitsRes.json();
                const habitKeys = habitsData.filter(Boolean);
                if (habitKeys.length === 0) return;

                const dailyRes = await fetch(
                    `/api/habits/daily/batch?userId=${encodeURIComponent(userId)}&habits=${encodeURIComponent(
                        habitKeys.join(",")
                    )}`
                );
                if (!dailyRes.ok) return;
                const dailyData = await dailyRes.json();
                setDailyProgress(dailyData as HabitDaily);
            } catch (e) {
                console.error("Failed to load habits", e);
            }
        };

        loadHabits();
    }, [profile.mobile]);

    // --- Render: Avatar Creation Flow ---
    if (!hasAvatar) {
        return (
            <div className="min-h-screen bg-black text-white flex flex-col font-sans">
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center relative overflow-hidden">

                    {/* Background Ambience */}
                    <div className="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none">
                        <div className="absolute top-[20%] left-[10%] w-[300px] h-[300px] bg-purple-600 rounded-full blur-[100px]" />
                        <div className="absolute bottom-[20%] right-[10%] w-[200px] h-[200px] bg-emerald-600 rounded-full blur-[80px]" />
                    </div>

                    {scanStep === "idle" && (
                        <div className="animate-fade-in-up space-y-8 z-10 w-full max-w-sm">
                            <div className="w-24 h-24 bg-gradient-to-tr from-purple-500 to-emerald-500 rounded-full mx-auto flex items-center justify-center mb-6 shadow-lg shadow-purple-500/20">
                                <ScanLine className="w-10 h-10 text-white" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold mb-2">Create Your Digital Twin</h1>
                                <p className="text-gray-400">
                                    We'll analyze your biometrics to generate an evolving avatar that changes as you get fitter.
                                </p>
                            </div>

                            <div className="bg-white/5 rounded-2xl p-4 text-left space-y-3 border border-white/10">
                                <div className="flex items-center gap-3 text-sm text-gray-300">
                                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                                    <span>Visualize body transformation</span>
                                </div>
                                <div className="flex items-center gap-3 text-sm text-gray-300">
                                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                                    <span>Unlock wearable rewards</span>
                                </div>
                                <div className="flex items-center gap-3 text-sm text-gray-300">
                                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                                    <span>Track posture data</span>
                                </div>
                            </div>

                            <Button
                                onClick={startScan}
                                className="w-full h-14 text-lg font-bold bg-white text-black hover:bg-gray-200 rounded-xl"
                            >
                                Start Face Scan
                            </Button>
                        </div>
                    )}

                    {scanStep === "camera" && (
                        <div className="z-10 w-full h-full flex flex-col">
                            <h2 className="text-xl font-bold mb-4">Position Face in Frame</h2>
                            <div className="flex-1 bg-gray-800 rounded-3xl relative overflow-hidden mb-8 border-2 border-white/20">
                                {/* Mock Camera Feed */}
                                <div className="absolute inset-0 bg-gray-900 flex items-center justify-center">
                                    <span className="text-gray-600">Camera Feed Active</span>
                                </div>
                                <div className="absolute inset-0 border-[3px] border-emerald-500/50 m-8 rounded-[3rem]" />
                                <div className="absolute top-1/2 left-0 w-full h-1 bg-emerald-500/50 animate-pulse" />
                            </div>
                            <Button
                                onClick={takePhoto}
                                className="w-20 h-20 rounded-full border-4 border-white p-1 mx-auto"
                            >
                                <div className="w-full h-full bg-white rounded-full" />
                            </Button>
                        </div>
                    )}

                    {scanStep === "scanning" && (
                        <div className="z-10 text-center space-y-6">
                            <div className="relative w-32 h-32 mx-auto">
                                <div className="absolute inset-0 border-4 border-t-emerald-500 border-r-emerald-500 border-b-transparent border-l-transparent rounded-full animate-spin" />
                                <div className="absolute inset-2 border-4 border-t-transparent border-r-transparent border-b-purple-500 border-l-purple-500 rounded-full animate-spin direction-reverse" />
                            </div>
                            <h2 className="text-2xl font-bold animate-pulse">Analyzing Biometrics...</h2>
                            <p className="text-gray-400">Generating mesh... Applying textures...</p>
                        </div>
                    )}

                    {scanStep === "complete" && (
                        <div className="z-10 w-full animate-fade-in-up">
                            <div className="h-[40vh] w-full mb-8 relative">
                                <UserAvatar3D bodyShape={0.4} /> {/* Initial Skinny Avatar */}
                                <div className="absolute bottom-0 w-full text-center">
                                    <span className="bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full text-xs font-bold border border-emerald-500/30">
                                        Level 1 Avatar Generated
                                    </span>
                                </div>
                            </div>
                            <h2 className="text-2xl font-bold mb-2">You look ready!</h2>
                            <p className="text-gray-400 mb-8 max-w-xs mx-auto">
                                Your avatar currently reflects your starting stats. Log meals and workouts to verify its shape daily.
                            </p>
                            <Button
                                onClick={finalizeAvatar}
                                className="w-full h-14 text-lg font-bold bg-emerald-500 hover:bg-emerald-600 rounded-xl"
                            >
                                Enter Locker
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // --- Render: Main Locker ---
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

            {/* Daily Update Notification */}
            <div className="bg-emerald-600 text-white px-4 py-2 text-xs font-bold text-center flex items-center justify-center gap-2 animate-in slide-in-from-top">
                <ScanLine className="w-3 h-3" />
                Avatar shape updated based on yesterday's activity. (+2% Muscle)
            </div>

            {/* Avatar Stage */}
            <div className="h-[45vh] relative bg-gradient-to-b from-gray-200 to-gray-50 flex items-center justify-center overflow-hidden">
                <UserAvatar3D bodyShape={bodyShape} />

                {/* Stats Overlay */}
                <div className="absolute top-4 right-4 flex flex-col gap-2">
                    <div className="p-3 bg-white/80 backdrop-blur rounded-2xl shadow-sm text-center">
                        <p className="text-xs font-bold text-gray-400 uppercase">Streak</p>
                        <p className="text-xl font-bold text-orange-500">🔥 {profile.streak ?? 0}</p>
                    </div>
                </div>
            </div>

            {/* Content Tabs */}
            <div className="flex-1 bg-white rounded-t-[2.5rem] shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.05)] relative -top-8 p-6 flex flex-col h-full z-10">

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
                        Biometrics
                    </button>
                </div>

                <div className="overflow-y-auto flex-1 pb-10">

                    {/* Gear Grid */}
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
                                        <item.icon className={`w-8 h-8 ${item.rarity === 'epic' ? 'text-purple-500' : item.rarity === 'rare' ? 'text-blue-500' : 'text-gray-400'}`} />
                                    </div>
                                    <h3 className="text-xs font-bold text-gray-900">{item.name}</h3>
                                    <p className="text-[10px] text-gray-500 uppercase font-bold mt-1">{item.rarity}</p>
                                </Card>
                            ))}
                        </div>
                    )}

                    {/* Stats & Sliders */}
                    {selectedTab === "stats" && (
                        <div className="space-y-6">
                            <div className="bg-blue-50 p-4 rounded-2xl mb-4 border border-blue-100">
                                <h4 className="font-bold text-gray-900 mb-2 text-sm flex items-center gap-2">
                                    <Palette className="w-4 h-4 text-blue-500" /> Shape Simulator
                                </h4>
                                <p className="text-xs text-gray-500 mb-4">See how working out changes your avatar.</p>
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between text-xs font-bold text-gray-600">
                                        <span>Lean</span>
                                        <span>Muscular</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0"
                                        max="1"
                                        step="0.01"
                                        value={bodyShape}
                                        onChange={(e) => setBodyShape(parseFloat(e.target.value))}
                                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                                    />
                                </div>
                            </div>

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
                        </div>
                    )}

                    {/* Logs */}
                    {selectedTab === "logs" && (
                        <div className="space-y-4">
                            <h3 className="font-bold text-gray-900 mb-4 px-1">Today's Timeline</h3>
                            <div className="relative border-l-2 border-gray-100 ml-4 space-y-8 pb-4">
                                {Object.keys(dailyProgress).length > 0 &&
                                    Object.entries(dailyProgress).map(([habit, dates], idx) => {
                                        const todayVal = Object.values(dates)[0];
                                        const color = COLOR_CLASSES[idx % COLOR_CLASSES.length];
                                        const displayName = habit ? habit.charAt(0).toUpperCase() + habit.slice(1) : habit;
                                        return (
                                            <div key={`${habit}-${idx}`} className="relative pl-8">
                                                <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full border-2 border-white shadow-sm z-10 bg-emerald-500" />
                                                <div className="bg-white border border-gray-100 rounded-xl p-3 shadow-sm flex items-start gap-3">
                                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${color} font-bold text-sm`}>
                                                        {displayName.slice(0, 1).toUpperCase()}
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="flex justify-between items-start">
                                                            <h4 className="font-bold text-gray-900 text-sm capitalize">{displayName}</h4>
                                                            <span className="text-[10px] font-bold text-gray-400 bg-gray-50 px-2 py-1 rounded-full">Today</span>
                                                        </div>
                                                        <p className="text-xs text-gray-500 mt-1 font-medium">
                                                            {todayVal ?? 0} logged today
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
