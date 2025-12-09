import { useEffect, useState, useMemo, useCallback } from "react";
import { useUserProfileStore } from "@/store/userProfileStore";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Zap, Flame, Droplets, Footprints } from "lucide-react";
import { Button } from "@/components/ui/button";
import UserAvatar3D from "@/components/UserAvatar3D";
import { FEMALE_DEFAULT_AVATAR_URL, MALE_DHONI_AVATAR_URL } from "@/constants/avatarUrls";
import ackoLogo from "@/assets/acko_logo.png";


interface HabitRecord {
    id: string;
    userId: string;
    habit: string;
    value: number;
    recordedAt: string;
    meta?: {
        unit?: string;
        source?: string;
        note?: string;
        cheatMeal?: boolean;
    } | null;
}

const HABIT_LOG_API = "/api/habits/user?userId=9795784244";

const SAMPLE_HABIT_LOG: HabitRecord[] = [
    {
        id: "sample-cal-1",
        userId: "9795784244",
        habit: "calories",
        value: 660,
        recordedAt: "2025-12-09T12:00:00Z",
        meta: { unit: "kcal" },
    },
    {
        id: "sample-water-1",
        userId: "9795784244",
        habit: "water",
        value: 2400,
        recordedAt: "2025-12-09T10:00:00Z",
        meta: { unit: "ml" },
    },
    {
        id: "sample-steps-1",
        userId: "9795784244",
        habit: "steps",
        value: 6100,
        recordedAt: "2025-12-09T18:00:00Z",
        meta: null,
    },
];

export function UserLockerPage() {
    const navigate = useNavigate();
    const { formData: profile } = useUserProfileStore();

    // --- State ---
    const bodyShape = 0.5;
    const [habitLog, setHabitLog] = useState<HabitRecord[]>([]);
    const [isLoadingLog, setIsLoadingLog] = useState(false);
    const [logError, setLogError] = useState<string | null>(null);
    const [selectedHabit, setSelectedHabit] = useState<string>("calories");
    const [recordsLimit, setRecordsLimit] = useState(5);
    
    const gender = profile.gender || "female";
    const fallbackAvatarUrl =
        profile.avatarUrl || (gender === "male" ? MALE_DHONI_AVATAR_URL : FEMALE_DEFAULT_AVATAR_URL);

    const habitIcons: Record<string, any> = {
        calories: Flame,
        water: Droplets,
        steps: Footprints,
    };
    const habitLabels: Record<string, string> = {
        calories: "Calories",
        water: "Water",
        steps: "Steps",
    };
    const habitUnits: Record<string, string> = {
        calories: "kcal",
        water: "ml",
        steps: "steps",
    };

    const fetchHabitLog = useCallback(async () => {
        setIsLoadingLog(true);
        try {
            const response = await fetch(HABIT_LOG_API, {
                headers: {
                    "Content-Type": "application/json",
                    Cookie: "trackerid=",
                },
            });
            if (!response.ok) {
                throw new Error("Failed to load habit log");
            }
            const data = await response.json();
            if (!Array.isArray(data)) {
                throw new Error("Invalid habit log response");
            }
            setHabitLog(
                data
                    .map((record: HabitRecord) => ({
                        ...record,
                        value: Number(record.value) || 0,
                    }))
                    .sort(
                        (a, b) =>
                            new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime()
                    )
            );
            setLogError(null);
        } catch (error) {
            console.error("Habit log fetch failed", error);
            setHabitLog(SAMPLE_HABIT_LOG);
            setLogError("Unable to reach the log API (likely blocked by CORS). Showing cached data.");
        } finally {
            setIsLoadingLog(false);
        }
    }, []);

    useEffect(() => {
        fetchHabitLog();
    }, [fetchHabitLog]);

    const habitGroups = useMemo(() => {
        const map: Record<string, HabitRecord[]> = {};
        habitLog.forEach((record) => {
            map[record.habit] = map[record.habit] || [];
            map[record.habit].push(record);
        });
        Object.values(map).forEach((records) =>
            records.sort(
                (a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime()
            )
        );
        return map;
    }, [habitLog]);

    const habitSummaries = useMemo(() => {
        return Object.entries(habitGroups).map(([habit, records]) => {
            const latest = records[0];
            const previous = records[1];
            const change = previous ? latest.value - previous.value : 0;
            return { habit, records, latest, change };
        });
    }, [habitGroups]);

    const selectedSummary =
        habitSummaries.find((s) => s.habit === selectedHabit) || habitSummaries[0] || null;

    const habitKeys = useMemo(() => Object.keys(habitGroups), [habitGroups]);
    useEffect(() => {
        if (habitKeys.length && !habitKeys.includes(selectedHabit)) {
            setSelectedHabit(habitKeys[0]);
        }
    }, [habitKeys, selectedHabit]);

    // --- Render: Main Locker ---
    return (
        <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
            <div className="bg-white p-4 shadow-sm z-10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Button variant="outline" onClick={() => navigate("/home")} className="flex items-center gap-2">
                        <ArrowLeft className="w-5 h-5" />
                        <span>Back</span>
                    </Button>
                <h1 className="text-xl font-bold text-gray-900">Your Profile</h1>
            </div>
            <div className="flex items-center gap-2 bg-white shadow-sm rounded-full p-1">
                <div className="w-10 h-10 rounded-full overflow-hidden border border-gray-100 bg-white">
                    <img src={ackoLogo} alt="ACKO logo" className="w-full h-full object-contain" />
                </div>
                </div>
            </div>


            {/* Avatar Stage */}
            <div className="h-[45vh] relative bg-gradient-to-b from-gray-200 to-gray-50 flex items-center justify-center overflow-hidden">
                <UserAvatar3D bodyShape={bodyShape} url={fallbackAvatarUrl} />

            </div>

            {/* Content Tabs */}
            <div className="flex-1 bg-white rounded-t-[2.5rem] shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.05)] relative -top-8 p-6 flex flex-col h-full z-10">
                <div className="overflow-y-auto flex-1 pb-10">
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="font-bold text-gray-900">All Logs</h3>
                            <button
                                onClick={fetchHabitLog}
                                disabled={isLoadingLog}
                                className="text-xs uppercase tracking-wider text-emerald-600 font-semibold disabled:opacity-40"
                            >
                                Refresh
                            </button>
                        </div>
                        {isLoadingLog ? (
                            <div className="flex justify-center py-4">
                                <div className="animate-spin h-8 w-8 border-4 border-emerald-500 border-t-transparent rounded-full" />
                            </div>
                        ) : (
                            <>
                                {logError && (
                                    <div className="text-sm text-center text-red-500">
                                        {logError}
                                    </div>
                                )}
                                {habitSummaries.length === 0 ? (
                                    <div className="text-sm text-center text-gray-500">
                                        No daily log data available yet.
                                    </div>
                                ) : (
                                    <>
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                            {habitSummaries.map((summary) => {
                                                const isSelected = summary.habit === selectedHabit;
                                                const Icon = habitIcons[summary.habit] || Zap;
                                                const latestUnit =
                                                    summary.latest.meta?.unit ||
                                                    habitUnits[summary.habit] ||
                                                    "";
                                                return (
                                                    <button
                                                        key={summary.habit}
                                                        onClick={() => setSelectedHabit(summary.habit)}
                                                        className={`px-4 py-3 rounded-2xl border transition-shadow text-left flex flex-col gap-2 ${
                                                            isSelected
                                                                ? "bg-emerald-500 text-white shadow-lg border-emerald-500"
                                                                : "bg-white border border-gray-200 text-gray-800 hover:shadow-sm"
                                                        }`}
                                                    >
                                                        <div className="flex items-center justify-between">
                                                            <Icon className="w-5 h-5" />
                                                            <span className="text-xs uppercase tracking-[0.2em]">
                                                                {habitLabels[summary.habit] || summary.habit}
                                                            </span>
                                </div>
                                                        <div className="text-2xl font-bold">
                                                            {summary.latest.value} {latestUnit}
                        </div>
                                                        <div className="text-xs">
                                                            {new Date(summary.latest.recordedAt).toLocaleDateString(
                                                                "en-IN",
                                                                { month: "short", day: "numeric" }
                                                            )}
                                            </div>
                                                        <div
                                                            className={`text-sm font-semibold ${
                                                                summary.change >= 0
                                                                    ? "text-emerald-200"
                                                                    : "text-rose-200"
                                                            }`}
                                                        >
                                                            {summary.change >= 0 ? "+" : ""}
                                                            {summary.change.toFixed(1)} {latestUnit}
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                        {selectedSummary && (
                                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <p className="text-xs uppercase tracking-[0.3em] text-gray-400">
                                                            {habitLabels[selectedSummary.habit] ||
                                                                selectedSummary.habit}{" "}
                                                            log
                                                        </p>
                                                        <p className="text-3xl font-bold text-gray-900">
                                                            {selectedSummary.latest.value}{" "}
                                                            {selectedSummary.latest.meta?.unit ||
                                                                habitUnits[selectedSummary.habit] ||
                                                                ""}
                                                        </p>
                                                        <p className="text-xs text-gray-500">
                                                            Latest entry{" "}
                                                            {new Date(
                                                                selectedSummary.latest.recordedAt
                                                            ).toLocaleTimeString("en-IN", {
                                                                hour: "2-digit",
                                                                minute: "2-digit",
                                                            })}
                                                        </p>
                                                    </div>
                                                    <div
                                                        className={`text-sm font-bold ${
                                                            selectedSummary.change >= 0
                                                                ? "text-emerald-600"
                                                                : "text-red-500"
                                                        }`}
                                                    >
                                                        {selectedSummary.change >= 0 ? "+" : ""}
                                                        {selectedSummary.change.toFixed(1)}{" "}
                                                        {selectedSummary.latest.meta?.unit ||
                                                            habitUnits[selectedSummary.habit] ||
                                                            ""}
                                                    </div>
                                                </div>
                                                {(() => {
                                                    if (!selectedSummary) return null;
                                                    const recordsToShow = selectedSummary.records.slice(0, recordsLimit);
                                                    const hasMoreRecords =
                                                        selectedSummary.records.length > recordsLimit;
                                                    const formatUnit =
                                                        selectedSummary.latest.meta?.unit ||
                                                        habitUnits[selectedSummary.habit] ||
                                                        "";
                                                    return (
                                                        <>
                                                            <div className="flex flex-wrap gap-2 text-xs text-gray-600">
                                                                {recordsToShow.map((record) => (
                                                                    <span
                                                                        key={record.id}
                                                                        className="px-3 py-1 bg-gray-50 rounded-full border border-gray-100"
                                                                    >
                                                                        {new Date(record.recordedAt).toLocaleDateString(
                                                                            "en-IN",
                                                                            { month: "short", day: "numeric" }
                                                                        )}{" "}
                                                                        · {record.value} {formatUnit}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                            {hasMoreRecords && (
                                                                <div className="flex justify-center">
                                                                    <button
                                                                        onClick={() =>
                                                                            setRecordsLimit((prev) =>
                                                                                Math.min(
                                                                                    selectedSummary.records.length,
                                                                                    prev + 5
                                                                                )
                                                                            )
                                                                        }
                                                                        className="text-xs uppercase tracking-wider text-emerald-600 font-semibold"
                                                                    >
                                                                        Load more
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </>
                                                    );
                                                })()}
                                            </div>
                                        )}
                                    </>
                                )}
                            </>
                        )}
                        </div>
                </div>
            </div>

        </div>
    );
}
