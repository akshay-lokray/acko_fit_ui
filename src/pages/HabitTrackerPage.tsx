import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    ArrowLeft,
    Plus,
    Check,
    Flame,
    MoreVertical,
    BookOpen,
    Droplets,
    Dumbbell,
    Moon,
    Music,
    Sun,
    Briefcase,
    Coffee,
    Utensils,
    ChevronRight,
    Bell,
    Calendar,
    X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

// --- Types ---
interface Habit {
    id: string;
    name: string;
    icon: string; // ID of the icon
    color: string;
    streak: number;
    completed: boolean;
    goal?: string;
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
    const [view, setView] = useState<"dashboard" | "create-1" | "create-2">("dashboard");

    // Form State
    const [newHabitName, setNewHabitName] = useState("");
    const [selectedIcon, setSelectedIcon] = useState("book");
    const [selectedColor, setSelectedColor] = useState("bg-emerald-500");
    const [frequency, setFrequency] = useState<"Daily" | "Weekly" | "Custom">("Daily");
    const [hasGoal, setHasGoal] = useState(false);
    const [goalAmount, setGoalAmount] = useState("");
    const [hasReminder, setHasReminder] = useState(false);
    const [reminderTime, setReminderTime] = useState("07:00");

    // Habits State
    const [habits, setHabits] = useState<Habit[]>([
        {
            id: "1",
            name: "Read for 30 mins",
            icon: "book",
            color: "bg-emerald-500",
            streak: 5,
            completed: true,
            frequency: "Daily",
            goal: "30 mins"
        },
        {
            id: "2",
            name: "Drink 2L Water",
            icon: "water",
            color: "bg-blue-500",
            streak: 2,
            completed: false,
            frequency: "Daily",
            goal: "2L"
        },
        {
            id: "3",
            name: "Run 5K",
            icon: "run",
            color: "bg-orange-500",
            streak: 10,
            completed: false,
            frequency: "Weekly",
            goal: "5 km"
        }
    ]);

    const toggleHabit = (id: string) => {
        setHabits(habits.map(h =>
            h.id === id ? { ...h, completed: !h.completed, streak: !h.completed ? h.streak + 1 : h.streak - 1 } : h
        ));
    };

    const handleSaveHabit = () => {
        const newHabit: Habit = {
            id: Date.now().toString(),
            name: newHabitName || "New Habit",
            icon: selectedIcon,
            color: selectedColor,
            streak: 0,
            completed: false,
            frequency: frequency,
            goal: hasGoal ? goalAmount : undefined
        };
        setHabits([...habits, newHabit]);
        resetForm();
        setView("dashboard");
    };

    const resetForm = () => {
        setNewHabitName("");
        setSelectedIcon("book");
        setSelectedColor("bg-emerald-500");
        setFrequency("Daily");
        setHasGoal(false);
        setGoalAmount("");
        setHasReminder(false);
        setReminderTime("07:00");
    };

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

                {habits.map(habit => (
                    <div key={habit.id} className="bg-white rounded-2xl p-4 shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-gray-100 flex items-center justify-between group">
                        <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-sm ${habit.color}`}>
                                {getIconComponent(habit.icon)}
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-900 text-sm md:text-base">{habit.name}</h3>
                                <div className="flex items-center gap-1 mt-1">
                                    <Flame className="w-3 h-3 text-orange-500 fill-orange-500" />
                                    <span className="text-xs font-semibold text-gray-500">{habit.streak}-Day Streak</span>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={() => toggleHabit(habit.id)}
                            className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all duration-300
                            ${habit.completed
                                    ? "bg-green-500 border-green-500 shadow-[0_4px_12px_rgba(34,197,94,0.3)]"
                                    : "border-gray-200 text-transparent hover:border-gray-300"}`}
                        >
                            <Check className="w-5 h-5 text-white" strokeWidth={3} />
                        </button>
                    </div>
                ))}

                {/* Streak Detail / Analytics Card */}
                <div className="mt-8 bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="font-bold text-gray-900">Streak Detail</h3>
                        <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center">
                            <Plus className="w-4 h-4 text-green-600" />
                        </div>
                    </div>

                    <div className="flex items-end justify-between h-24 px-2 mb-4">
                        {[40, 65, 45, 80, 55, 90, 70].map((h, i) => (
                            <div key={i} className="w-8 bg-emerald-50 rounded-t-lg relative group">
                                <div
                                    className="absolute bottom-0 w-full bg-emerald-400 rounded-t-lg transition-all"
                                    style={{ height: `${h}%` }}
                                />
                            </div>
                        ))}
                    </div>

                    <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-500">Completion Rate: <span className="text-gray-900 font-bold">85%</span></span>
                        <span className="text-gray-500">Best Streak: <span className="text-gray-900 font-bold">10 Days</span></span>
                    </div>
                </div>
            </div>

            {/* Floating Action Button */}
            <div className="absolute bottom-8 right-6">
                <Button
                    onClick={() => setView("create-1")}
                    className="w-14 h-14 rounded-full bg-emerald-500 hover:bg-emerald-600 shadow-[0_8px_20px_rgba(16,185,129,0.3)] flex items-center justify-center"
                >
                    <Plus className="w-8 h-8 text-white" strokeWidth={2.5} />
                </Button>
            </div>
        </div>
    );

    const renderCreateStep1 = () => (
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
                    onClick={() => setView("create-2")}
                    disabled={!newHabitName.trim()}
                >
                    Next: Schedule
                </Button>
            </div>
        </div>
    );

    const renderCreateStep2 = () => (
        <div className="flex flex-col h-full p-2">
            <div className="flex items-center justify-center relative mb-8">
                <Button variant="ghost" size="icon" className="absolute left-0" onClick={() => setView("create-1")}>
                    <ArrowLeft className="w-6 h-6 text-gray-900" />
                </Button>
                <h2 className="text-lg font-bold">Create New Habit</h2>
            </div>

            <div className="space-y-6 animate-fade-in-up">
                {/* Frequency */}
                <div className="bg-white rounded-2xl p-2 shadow-sm border border-gray-100 flex">
                    {["Daily", "Weekly", "Custom"].map(f => (
                        <button
                            key={f}
                            onClick={() => setFrequency(f as any)}
                            className={`flex-1 py-3 text-sm font-semibold rounded-xl transition-all ${frequency === f ? 'bg-white shadow-md text-emerald-600 border border-emerald-100' : 'text-gray-400'}`}
                        >
                            {f}
                        </button>
                    ))}
                </div>

                {/* Goal Setting */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <p className="font-semibold text-gray-900">Goal:</p>
                            <p className="text-xs text-gray-400">{hasGoal ? goalAmount || "Set quantity" : "No specific goal"}</p>
                        </div>
                        <Switch checked={hasGoal} onCheckedChange={setHasGoal} />
                    </div>
                    {hasGoal && (
                        <Input
                            placeholder="e.g. 30 minutes, 2 Litres"
                            value={goalAmount}
                            onChange={(e) => setGoalAmount(e.target.value)}
                            className="bg-gray-50 border-gray-200"
                        />
                    )}
                </div>

                {/* Reminder Setting */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <p className="font-semibold text-gray-900">Set Reminder</p>
                            <p className="text-xs text-gray-400">{hasReminder ? reminderTime : "No reminder"}</p>
                        </div>
                        <Switch checked={hasReminder} onCheckedChange={setHasReminder} />
                    </div>
                    {hasReminder && (
                        <div className="grid grid-cols-1">
                            <input
                                type="time"
                                value={reminderTime}
                                onChange={(e) => setReminderTime(e.target.value)}
                                className="w-full p-3 bg-gray-50 rounded-xl border-gray-200 text-center font-bold text-gray-800"
                            />
                        </div>
                    )}
                </div>
            </div>

            <div className="mt-auto pb-6">
                <Button
                    className="w-full h-14 text-lg bg-emerald-500 hover:bg-emerald-600 rounded-xl shadow-lg shadow-emerald-200"
                    onClick={handleSaveHabit}
                >
                    Save Habit
                </Button>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50/50 p-6 font-sans flex flex-col relative overflow-hidden">
            {view === "dashboard" && renderDashboard()}
            {view === "create-1" && renderCreateStep1()}
            {view === "create-2" && renderCreateStep2()}
        </div>
    );
}
