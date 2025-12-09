import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Timer } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useUserProfileStore } from "@/store/userProfileStore";

type WorkoutDay = {
  day: string;
  exercise: string;
  youtubeUrl: string | null;
};

type WorkoutPlanResponse = {
  userId: string;
  planByDay: Record<string, WorkoutDay[]>;
  plan?: string;
};

export function WorkoutPlansPage() {
  const navigate = useNavigate();
  const { formData: profile } = useUserProfileStore();
  const [planByDay, setPlanByDay] = useState<Record<string, WorkoutDay[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPlan = async () => {
      try {
        const userId = profile.mobile || "9795784244";
        const res = await fetch(`/api/users/${encodeURIComponent(userId)}/workout-plan`);
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
  }, [profile.mobile]);

  const sortedDays = useMemo(() => {
    return Object.keys(planByDay)
      .sort((a, b) => {
        const numA = Number(a.replace(/\D/g, "")) || 0;
        const numB = Number(b.replace(/\D/g, "")) || 0;
        return numA - numB;
      })
      .filter((day) => planByDay[day]?.length > 0);
  }, [planByDay]);

  const renderDaySection = (day: string, exercises: WorkoutDay[]) => (
    <Card
      key={day}
      className="relative overflow-hidden cursor-pointer hover:shadow-2xl transition border border-purple-100 rounded-[2rem]"
    >
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.4em] text-purple-500">
          <span>{day.toUpperCase()}</span>
          <span className="text-xs text-slate-500 flex items-center gap-1">
            <Timer className="w-3 h-3" /> {exercises.length} exercises
          </span>
        </div>
        <div className="space-y-3">
          {exercises.map((exercise, idx) => (
            <div
              key={`${day}-${idx}`}
              className="rounded-2xl border border-slate-100 bg-white/80 px-4 py-3 text-sm font-semibold text-slate-900 shadow-sm"
            >
              {exercise.exercise}
            </div>
          ))}
        </div>
      </div>
    </Card>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      <div className="sticky top-0 z-20 bg-gradient-to-br from-purple-600 via-purple-500 to-emerald-500 text-white px-6 py-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5 text-white" />
          </Button>
          <div>
            <p className="text-[10px] uppercase tracking-[0.6em] text-white/70">
              daily movement
            </p>
            <h1 className="text-2xl font-bold">Workout plan</h1>
            <p className="text-sm text-white/80">Day-wise exercises aligned with your goals.</p>
          </div>
        </div>
      </div>

      <main className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-4xl mx-auto space-y-4">
          {loading && (
            <div className="text-sm text-slate-500">Working on a fresh workout plan…</div>
          )}
          {error && (
            <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}
          {!loading && !error && sortedDays.length === 0 && (
            <div className="rounded-2xl border border-slate-100 bg-white/80 px-4 py-6 text-sm text-slate-500 text-center">
              Workout plan is still being prepared.
            </div>
          )}
          {!loading && !error && (
            <div className="space-y-4">
              {sortedDays.map((day) => renderDaySection(day, planByDay[day]))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
