import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
    ArrowLeft,
    Plus,
    MoreVertical,
    BookOpen,
    Droplets,
    Dumbbell,
    Moon,
    Music,
    Sun,
    Briefcase,
    Coffee,
    Utensils
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useUserProfileStore } from "@/store/userProfileStore";

// --- Types ---
interface Habit {
    id: string;
    name: string;
    icon: string; // ID of the icon
    color: string;
    completed: boolean;
    frequency: "Daily" | "Weekly" | "Custom";
}

const ICONS = [
    { id: "book", icon: BookOpen },
    { id: "water", icon: Droplets },
    { id: "run", icon: Dumbbell },
    { id: "sleep", icon: Moon },
    { id: "music", icon: Music },
    { id: "sun", icon: Sun },
    { id: "work", icon: Briefcase },
    { id: "coffee", icon: Coffee },
    { id: "food", icon: Utensils },
];

const COLORS = [
    "bg-emerald-500",
    "bg-red-500",
    "bg-blue-500",
    "bg-purple-500",
    "bg-orange-500",
    "bg-pink-500",
    "bg-indigo-500",
    "bg-gray-800"
];

export function HabitTrackerPage() {
    const navigate = useNavigate();
    const { formData: profile } = useUserProfileStore();
    const [view, setView] = useState<"dashboard" | "create">("dashboard");

    // Form State
    const [newHabitName, setNewHabitName] = useState("");
    const [selectedIcon, setSelectedIcon] = useState("book");
    const [selectedColor, setSelectedColor] = useState("bg-emerald-500");
    const frequency = "Daily" as const;

    // Habits State
    const [habits, setHabits] = useState<Habit[]>([]);
    const [habitValues, setHabitValues] = useState<Record<string, number>>({});
    const [habitMeta, setHabitMeta] = useState<Record<string, Record<string, any>>>({});


    const handleSaveHabit = async () => {
        const userId = profile.mobile || "";
        if (!userId) {
            alert("User ID not found. Please complete profile setup.");
            return;
        }

        const newHabit: Habit = {
            id: Date.now().toString(),
            name: newHabitName || "New Habit",
            icon: selectedIcon,
            color: selectedColor,
            completed: false,
            frequency: frequency,
        };

        const payload = {
            userId,
            habit: newHabit.name,
            value: 0,
            meta: {
                color: selectedColor,
                icon: selectedIcon,
                quickNote: newHabit.name,
            },
        };

        try {
            await fetch("/api/habits", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            setHabits([...habits, newHabit]);
            resetForm();
            setView("dashboard");
        } catch (e) {
            console.error("Failed to create habit", e);
            alert("Unable to create habit right now.");
        }
    };

    const resetForm = () => {
        setNewHabitName("");
        setSelectedIcon("book");
        setSelectedColor("bg-emerald-500");
    };

    const assignColor = (index: number) => COLORS[index % COLORS.length];
    const assignIcon = (index: number) => ICONS[index % ICONS.length].id;

    const formatHabitName = (name: string) =>
        name ? name.charAt(0).toUpperCase() + name.slice(1) : name;

    // Load habits and today values
    useEffect(() => {
        const userId = profile.mobile || "";
        if (!userId) return;

        const load = async () => {
            try {
                // 1) get habit names
                const namesRes = await fetch(`/api/habits/names?userId=${encodeURIComponent(userId)}`);
                const names: string[] = namesRes.ok ? await namesRes.json() : [];
                const habitNames = names.length ? names : ["calorie", "water", "steps"];

                // build client habit list with deterministic color/icon
                const builtHabits: Habit[] = habitNames.map((name, idx) => ({
                    id: `${name}-${idx}`,
                    name,
                    icon: assignIcon(idx),
                    color: assignColor(idx),
                    completed: false,
                    frequency: "Daily"
                }));
                setHabits(builtHabits);

                // 2) get daily values
                const dailyRes = await fetch(
                    `/api/habits/daily/batch?userId=${encodeURIComponent(userId)}&habits=${encodeURIComponent(habitNames.join(","))}`
                );
                if (dailyRes.ok) {
                    const dailyData: Record<string, any> = await dailyRes.json();
                    const values: Record<string, number> = {};
                    const metas: Record<string, Record<string, any>> = {};
                    habitNames.forEach((h) => {
                        const entry = dailyData[h];
                        if (entry) {
                            const totalVal = entry.totals ? Object.values(entry.totals)[0] : undefined;
                            values[h] = Number(totalVal ?? 0) || 0;
                            if (entry.meta) metas[h] = entry.meta;
                        }
                    });
                    setHabitValues(values);
                    setHabitMeta(metas);
                }
            } catch (e) {
                console.error("Failed to load habits", e);
            }
        };

        load();
    }, [profile.mobile]);

    const getIconComponent = (id: string) => {
        const item = ICONS.find(i => i.id === id);
        const Icon = item ? item.icon : BookOpen;
        return <Icon className="w-6 h-6 text-white" />; // Icons are white on colored bg
    };

    // --- RENDERERS ---

    const renderDashboard = () => (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <Button variant="ghost" size="icon" className="-ml-3" onClick={() => navigate("/home")}>
                        <ArrowLeft className="w-6 h-6 text-gray-800" />
                    </Button>
                    <h1 className="text-2xl font-bold text-gray-900 mt-2">Today</h1>
                    <p className="text-sm text-gray-400">Consistency is key</p>
                </div>
                <Button variant="ghost" size="icon" className="rounded-full bg-gray-50">
                    <MoreVertical className="w-5 h-5 text-gray-600" />
                </Button>
            </div>

            {/* Habit Cards */}
            <div className="flex-1 space-y-4 overflow-y-auto pb-24">
                <div className="flex items-center justify-between text-sm font-semibold text-gray-400 mb-2">
                    <span>Habit Cards</span>
                    <span>{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                </div>

                {habits.map((habit) => (
                    <div
                        key={habit.id}
                        className="bg-white rounded-2xl p-4 shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-gray-100 flex items-center justify-between group cursor-pointer hover:shadow-md"
                        onClick={() => navigate("/habit-detail", { state: { habit: habit.name } })}
                    >
                        <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-sm ${habitMeta[habit.name]?.color || habit.color}`}>
                                {getIconComponent((habitMeta[habit.name]?.icon as string) || habit.icon)}
                            </div>
                            <div>
                        <h3 className="font-bold text-gray-900 text-sm md:text-base">
                            {habit.name === "meal" && habitMeta[habit.name]?.mealName
                                ? habitMeta[habit.name]?.mealName
                                : formatHabitName(habit.name)}
                        </h3>
                                <div className="text-xs text-gray-500 font-semibold">
                                    {habitValues[habit.name] ?? 0} logged today
                                </div>
                            </div>
                        </div>

                    </div>
                ))}

            </div>

            {/* Floating Action Button */}
            <div className="absolute bottom-8 right-6">
                <Button
                    onClick={() => setView("create")}
                    className="w-14 h-14 rounded-full bg-emerald-500 hover:bg-emerald-600 shadow-[0_8px_20px_rgba(16,185,129,0.3)] flex items-center justify-center"
                >
                    <Plus className="w-8 h-8 text-white" strokeWidth={2.5} />
                </Button>
            </div>
        </div>
    );

    const renderCreate = () => (
        <div className="flex flex-col h-full p-2">
            <div className="flex items-center justify-center relative mb-8">
                <Button variant="ghost" size="icon" className="absolute left-0" onClick={() => setView("dashboard")}>
                    <ArrowLeft className="w-6 h-6 text-gray-900" />
                </Button>
                <h2 className="text-lg font-bold">Create New Habit</h2>
            </div>

            <div className="space-y-8 animate-fade-in-up">
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                    <Input
                        placeholder="Habit Name (e.g., 'Read for 30 mins')"
                        value={newHabitName}
                        onChange={(e) => setNewHabitName(e.target.value)}
                        className="border-0 bg-transparent text-lg font-medium placeholder:text-gray-300 focus-visible:ring-0 p-0 mb-6"
                    />

                    <div className="grid grid-cols-4 gap-4 mb-6">
                        {ICONS.map(({ id, icon: Icon }) => (
                            <button
                                key={id}
                                onClick={() => setSelectedIcon(id)}
                                className={`aspect-square rounded-2xl flex items-center justify-center transition-all ${selectedIcon === id ? selectedColor + ' text-white shadow-lg scale-105' : 'bg-gray-50 text-gray-400'}`}
                            >
                                <Icon className="w-6 h-6" />
                            </button>
                        ))}
                    </div>

                    <div className="flex gap-3 justify-center">
                        {COLORS.map(color => (
                            <button
                                key={color}
                                onClick={() => setSelectedColor(color)}
                                className={`w-6 h-6 rounded-full ${color} ${selectedColor === color ? 'ring-2 ring-offset-2 ring-gray-300' : 'opacity-70'}`}
                            />
                        ))}
                    </div>
                </div>
            </div>

            <div className="mt-auto pb-6">
                <Button
                    className="w-full h-14 text-lg bg-emerald-500 hover:bg-emerald-600 rounded-xl"
                    onClick={handleSaveHabit}
                    disabled={!newHabitName.trim()}
                >
                    Save Habit
                </Button>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50/50 p-6 font-sans flex flex-col relative overflow-hidden">
            {view === "dashboard" && renderDashboard()}
            {view === "create" && renderCreate()}
        </div>
    );
}
