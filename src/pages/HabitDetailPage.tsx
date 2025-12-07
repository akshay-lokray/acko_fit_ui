import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { useUserProfileStore } from "@/store/userProfileStore";
import { Input } from "@/components/ui/input";

interface HabitSeries {
  [date: string]: number;
}

export function HabitDetailPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { formData: profile } = useUserProfileStore();
  const habit = (location.state as { habit?: string })?.habit || "";

  const [series, setSeries] = useState<HabitSeries>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hover, setHover] = useState<{ date: string; value: number; x: number; y: number } | null>(null);
  const [logValue, setLogValue] = useState<string>("");
  const [logLoading, setLogLoading] = useState(false);
  const [logError, setLogError] = useState<string | null>(null);

  const dataPoints = useMemo(() => {
    const today = new Date();
    const last30: Array<[string, number]> = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const iso = d.toISOString().slice(0, 10);
      last30.push([iso, Number(series?.[iso] ?? 0)]);
    }
    return last30;
  }, [series]);

  const maxValue = useMemo(() => {
    const vals = dataPoints.map(([, v]) => v);
    return vals.length ? Math.max(...vals, 1) : 1;
  }, [dataPoints]);

  const avgValue = useMemo(() => {
    const vals = dataPoints.map(([, v]) => v);
    return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
  }, [dataPoints]);

  useEffect(() => {
    const userId = profile.mobile || "";
    if (!habit || !userId) return;

    const fetchSeries = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/habits/last30?userId=${encodeURIComponent(userId)}&habit=${encodeURIComponent(habit)}`
        );
        if (!res.ok) {
          setError("Failed to load habit history");
          setLoading(false);
          return;
        }
        const data = await res.json();
        setSeries(data || {});
      } catch (e) {
        console.error("Failed to load habit history", e);
        setError("Failed to load habit history");
      } finally {
        setLoading(false);
      }
    };

    fetchSeries();
  }, [habit, profile.mobile]);

  const handleLogHabit = async () => {
    const userId = profile.mobile || "";
    if (!habit || !userId) return;
    if (!logValue.trim()) {
      setLogError("Enter a value to log.");
      return;
    }
    setLogError(null);
    setLogLoading(true);
    try {
      const payload = {
        userId,
        habit,
        value: Number(logValue),
      };
      await fetch("/api/habits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      setLogValue("");
      // refresh series
      const res = await fetch(
        `/api/habits/last30?userId=${encodeURIComponent(userId)}&habit=${encodeURIComponent(habit)}`
      );
      if (res.ok) {
        const data = await res.json();
        setSeries(data || {});
      }
    } catch (e) {
      console.error("Failed to log habit", e);
      setLogError("Unable to log right now.");
    } finally {
      setLogLoading(false);
    }
  };

  const title = habit ? habit.charAt(0).toUpperCase() + habit.slice(1) : "Habit";

  return (
    <div className="min-h-screen bg-gray-50/50 p-4 font-sans">
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <p className="text-xs text-gray-500 uppercase font-semibold">Habit stats</p>
            <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          </div>
        </div>

        <Card className="p-4 space-y-4">
          {loading && <p className="text-sm text-gray-500">Loading...</p>}
          {error && <p className="text-sm text-red-500">{error}</p>}
          {!loading && !error && dataPoints.length === 0 && (
            <p className="text-sm text-gray-500">No data for the last 30 days.</p>
          )}

          {/* Log habit form */}
          <div className="flex flex-col gap-2 md:flex-row md:items-center">
            <div className="flex-1">
              <Input
                type="number"
                placeholder={`Enter ${habit} value`}
                value={logValue}
                onChange={(e) => setLogValue(e.target.value)}
              />
            </div>
            <Button className="md:w-auto w-full" onClick={handleLogHabit} disabled={logLoading}>
              {logLoading ? "Saving..." : "Log value"}
            </Button>
          </div>
          {logError && <p className="text-xs text-red-500">{logError}</p>}

          {!loading && !error && dataPoints.length > 0 && (
            <div className="space-y-4 relative">
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3">
                  <p className="text-xs text-emerald-700 font-semibold">Latest</p>
                  <p className="text-lg font-bold text-emerald-800">{dataPoints[dataPoints.length - 1][1]}</p>
                </div>
                <div className="rounded-xl border border-amber-100 bg-amber-50/50 p-3">
                  <p className="text-xs text-amber-700 font-semibold">Average (30d)</p>
                  <p className="text-lg font-bold text-amber-800">{avgValue}</p>
                </div>
                <div className="rounded-xl border border-purple-100 bg-purple-50/50 p-3">
                  <p className="text-xs text-purple-700 font-semibold">Max (30d)</p>
                  <p className="text-lg font-bold text-purple-800">{maxValue}</p>
                </div>
              </div>

              <div className="w-full h-64 relative">
                <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="habitLineGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
                      <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                    </linearGradient>
                  </defs>

                  {/* horizontal grid lines */}
                  {[20, 40, 60, 80].map((y) => (
                    <line key={y} x1="0" y1={y} x2="100" y2={y} stroke="#e5e7eb" strokeWidth="0.3" />
                  ))}

                  {(() => {
                    const count = dataPoints.length || 1;
                    const step = count > 1 ? 100 / (count - 1) : 0;
                    const points = dataPoints.map(([, value], idx) => {
                      const x = idx * step;
                      const y = 95 - (value / maxValue) * 85; // top/bottom padding
                      return `${x},${y}`;
                    });
                    // area fill
                    const areaPoints = ["0,100", ...points, "100,100"].join(" ");
                    return (
                      <>
                        <polygon points={areaPoints} fill="url(#habitLineGradient)" />
                        <polyline
                          points={points.join(" ")}
                          fill="none"
                          stroke="#10b981"
                          strokeWidth={1.5}
                          strokeLinejoin="round"
                          strokeLinecap="round"
                        />
                      </>
                    );
                  })()}
                  {dataPoints.map(([date, value], idx) => {
                    const count = dataPoints.length || 1;
                    const step = count > 1 ? 100 / (count - 1) : 0;
                    const cx = idx * step;
                    const cy = 95 - (value / maxValue) * 85;
                    return (
                      <g
                        key={date}
                        onMouseEnter={(e) => {
                          const rect = (e.currentTarget as SVGGElement).getBoundingClientRect();
                          setHover({ date, value, x: rect.x + rect.width / 2, y: rect.y });
                        }}
                        onMouseLeave={() => setHover(null)}
                      >
                        <circle cx={cx} cy={cy} r={1.6} className="fill-white stroke-emerald-600 stroke-[0.6]" />
                        {idx % 5 === 0 && (
                          <text
                            x={cx}
                            y={98}
                            textAnchor="middle"
                            className="fill-gray-500 text-[6px]"
                          >
                            {date.slice(5)}
                          </text>
                        )}
                      </g>
                    );
                  })}
                </svg>

                {hover && (
                  <div
                    className="absolute bg-white border border-gray-200 shadow-lg rounded-md px-3 py-2 text-xs text-gray-800"
                    style={{
                      left: hover.x,
                      top: hover.y - 40,
                      transform: "translate(-50%, -100%)",
                      pointerEvents: "none",
                    }}
                  >
                    <div className="font-semibold">{hover.value}</div>
                    <div className="text-gray-500">{hover.date}</div>
                  </div>
                )}
              </div>

              <div className="text-sm text-gray-600">
                <p>
                  Latest: <span className="font-semibold">{dataPoints[dataPoints.length - 1][1]}</span>
                </p>
                <p>
                  Max (30d): <span className="font-semibold">{maxValue}</span>
                </p>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

