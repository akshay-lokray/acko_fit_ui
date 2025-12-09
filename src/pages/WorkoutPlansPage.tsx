import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, PlayCircle, Timer } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useUserProfileStore } from "@/store/userProfileStore";

type WorkoutDay = {
    day: string;
    exercise: string;
    youtubeUrl: string;
};

type WorkoutPlanResponse = {
    userId: string;
    planByDay: Record<string, WorkoutDay[]>;
};

export function WorkoutPlansPage() {
    const navigate = useNavigate();
    const [planByDay, setPlanByDay] = useState<Record<string, WorkoutDay[]>>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const { formData: profile } = useUserProfileStore();

    useEffect(() => {
        const fetchPlan = async () => {
            try {
                const userId = profile.mobile || "user-123";
                const res = await fetch(`/api/ai/recipes/workout-plan?userId=${encodeURIComponent(userId)}`);
                if (!res.ok) throw new Error("Unable to fetch workout plan");
                const data: WorkoutPlanResponse = await res.json();
                setPlanByDay(data.planByDay);
            } catch (err) {
                console.error("Workout plan error", err);
                setError("Unable to load workout plan right now.");
            } finally {
                setLoading(false);
            }
        };

        fetchPlan();
    }, []);

    const sortedDays = useMemo(() => {
        return Object.keys(planByDay).sort((a, b) => {
            const numA = Number(a.replace(/\D/g, "")) || 0;
            const numB = Number(b.replace(/\D/g, "")) || 0;
            return numA - numB;
        });
    }, [planByDay]);

    const renderDaySection = (day: string, exercises: WorkoutDay[]) => (
        <Card key={day} className="group relative overflow-hidden cursor-pointer hover:shadow-lg transition">
            <div className="p-6 relative z-10 space-y-4">
                <div className="flex items-center justify-between text-xs uppercase tracking-wide text-gray-500">
                    <span>{day.toUpperCase()}</span>
                    <span className="flex items-center gap-1">
                        <Timer className="w-4 h-4" /> {exercises.length} exercises
                    </span>
                </div>
                <div className="space-y-3">
                    {exercises.map((exercise, idx) => (
                        <div key={`${day}-${idx}`} className="flex flex-col gap-2 rounded-2xl border border-gray-100 bg-gray-50 p-3">
                            <p className="text-sm font-semibold text-gray-900">{exercise.exercise}</p>
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => window.open(exercise.youtubeUrl, "_blank")}
                                className="text-xs text-emerald-600 font-semibold gap-1"
                            >
                                Watch Now <PlayCircle className="w-3 h-3" />
                            </Button>
                        </div>
                    ))}
                </div>
            </div>
        </Card>
    );

    return (
        <div className="min-h-screen bg-white p-6 font-sans">
            <div className="flex items-center gap-4 mb-8">
                <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                    <ArrowLeft className="w-6 h-6" />
                </Button>
                <div>
                    <h1 className="text-2xl font-bold">Curated Workout Plans</h1>
                    <p className="text-sm text-gray-500">Day-wise exercises aligned with your goals.</p>
                </div>
            </div>

            {loading && (
                <div className="text-sm text-gray-500">Working on a fresh workout plan…</div>
            )}
            {error && (
                <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600 mb-6">
                    {error}
                </div>
            )}

            {!loading && !error && (
                <div className="space-y-4">
                    {sortedDays.map((day) => renderDaySection(day, planByDay[day]))}
                </div>
            )}
        </div>
    );
}
