import { Suspense, useEffect, useRef, useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Zap, Flame, Droplets, Footprints } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, useAnimations, useGLTF } from "@react-three/drei";
import * as THREE from "three";
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

type TimelineStage = {
    id: string;
    label: string;
    description: string;
    url: string;
};

const obeseModelUrl = new URL("../assets/obese.glb", import.meta.url).href;
const middleModelUrl = new URL("../assets/middle.glb", import.meta.url).href;
const skinnyModelUrl = new URL("../assets/skinny.glb", import.meta.url).href;

const TIMELINE_STAGES: TimelineStage[] = [
    { id: "start", label: "Start", description: "Obese avatar", url: obeseModelUrl },
    { id: "middle", label: "Middle", description: "Transition state", url: middleModelUrl },
    { id: "end", label: "End", description: "Skinny avatar", url: skinnyModelUrl },
];

function StagePreview({ url }: { url: string }) {
    return (
        <Canvas
            shadows
            camera={{ position: [1, 1.5, 4], fov: 20 }}
            style={{ background: "transparent" }}
            className="w-full h-full"
        >
            <color attach="background" args={["#ffffff00"]} />
            <ambientLight intensity={1} />
            <directionalLight position={[2, 5, 5]} intensity={0.8} />
            <Suspense fallback={null}>
                <StageModel url={url} />
            </Suspense>
            <OrbitControls enableZoom={false} enablePan={false} enableRotate={false} />
        </Canvas>
    );
}

function StageModel({ url }: { url: string }) {
    const stageGroup = useRef<THREE.Group>(null);
    const { scene, animations } = useGLTF(url);
    const { actions } = useAnimations(animations, stageGroup);

    useEffect(() => {
        if (!actions) return;
        Object.values(actions).forEach((action) => {
            if (!action) return;
            action.reset();
            action.setLoop(THREE.LoopRepeat, Infinity);
            action.play();
        });
        return () => {
            Object.values(actions).forEach((action) => {
                action?.stop();
            });
        };
    }, [actions]);

    return (
        <primitive
            ref={stageGroup}
            object={scene}
            scale={1.3}
            position={[0, -1.69, 0]}
            rotation={[0, 0, 0]}
        />
    );
}

export function UserLockerPage() {
    const navigate = useNavigate();

    // --- State ---
    const [habitLog, setHabitLog] = useState<HabitRecord[]>([]);
    const [isLoadingLog, setIsLoadingLog] = useState(false);
    const [logError, setLogError] = useState<string | null>(null);
    const [selectedHabit, setSelectedHabit] = useState<string>("calories");
    const [recordsLimit, setRecordsLimit] = useState(5);
    

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

    useEffect(() => {
        TIMELINE_STAGES.forEach((stage) => useGLTF.preload(stage.url));
    }, []);

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


            {/* Avatar Timeline */}
            <div className="profile-timeline py-6 px-4 relative">
                <div className="flex flex-col items-center gap-2 text-center mb-5">
                    <p className="text-xs uppercase tracking-[0.3em] text-gray-500">
                        Track Your Progress
                    </p>
                    <h2 className="text-3xl font-bold text-gray-900">
                        Evolution Timeline
                    </h2>
                </div>
                <div className="flex flex-col md:flex-row items-start md:items-stretch gap-4 w-full max-w-[960px] mx-auto">
                    <div className="hidden md:flex flex-col items-end gap-6 w-28 text-[11px] uppercase tracking-[0.3em] text-slate-500">
                        <span className="text-[10px] text-gray-400">Current</span>
                        <div className="relative flex h-full flex-col justify-between py-4 pr-4">
                            <div className="absolute inset-y-0 right-3 w-[1px] bg-gradient-to-b from-emerald-500/80 to-slate-200 rounded-full" />
                            {TIMELINE_STAGES.map((stage) => (
                                <div key={`current-${stage.id}`} className="flex items-center gap-2 justify-end">
                                    <span className="w-3 h-3 rounded-full bg-emerald-500 border border-white shadow" />
                                    <span className="font-semibold">{stage.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="flex-1 flex flex-col items-center gap-6 w-full">
                        {TIMELINE_STAGES.map((stage) => (
                            <div
                                key={stage.id}
                                className="timeline-card relative rounded-3xl border border-gray-100 bg-transparent shadow-[0_25px_60px_rgba(15,23,42,0.08)] backdrop-blur-md overflow-hidden flex justify-center items-center min-h-[240px] pt-4"
                            >
                                <div className="absolute top-4 left-6 text-[10px] uppercase tracking-[0.3em] text-slate-400">
                                    {stage.label}
                                </div>
                                <div className="w-48 h-48 -translate-y-8">
                                    <div className="w-full h-full flex items-center justify-center">
                                        <StagePreview url={stage.url} />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="hidden md:flex flex-col items-start gap-6 w-28 text-[11px] uppercase tracking-[0.3em] text-slate-500">
                        <span className="text-[10px] text-gray-400">Expected</span>
                        <div className="relative flex h-full flex-col justify-between py-4 pl-4">
                            <div className="absolute inset-y-0 left-3 w-[1px] bg-gradient-to-b from-sky-400/80 to-slate-200 rounded-full" />
                            {TIMELINE_STAGES.map((stage) => (
                                <div key={`expected-${stage.id}`} className="flex items-center gap-2">
                                    <span className="w-3 h-3 rounded-full bg-sky-400 border border-white shadow" />
                                    <span className="font-semibold">{stage.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="md:hidden mt-6 flex flex-col gap-4 text-[10px] uppercase tracking-[0.4em] text-slate-600 items-center">
                    <div className="w-full flex justify-between px-4">
                        <span>Current</span>
                        <span>Expected</span>
                    </div>
                    <div className="flex gap-3 w-full px-4">
                        <div className="flex-1 h-1 rounded-full bg-gradient-to-r from-emerald-500 to-slate-200" />
                        <div className="flex-1 h-1 rounded-full bg-gradient-to-r from-sky-400 to-indigo-500" />
                    </div>
                    <div className="flex flex-col gap-1">
                        <div className="flex justify-center gap-6 items-center">
                            {TIMELINE_STAGES.map((stage) => (
                                <span key={`mobile-current-${stage.id}`} className="flex flex-col items-center gap-1">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                    <span className="text-[10px] text-slate-500">{stage.label}</span>
                                </span>
                            ))}
                        </div>
                        <div className="flex justify-center gap-6 items-center">
                            {TIMELINE_STAGES.map((stage) => (
                                <span key={`mobile-expected-${stage.id}`} className="flex flex-col items-center gap-1">
                                    <span className="w-2 h-2 rounded-full bg-sky-400" />
                                    <span className="text-[10px] text-slate-500">{stage.label}</span>
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
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
