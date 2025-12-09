import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, TrendingUp, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUserProfileStore } from "@/store/userProfileStore";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

interface HabitDataPoint {
  date: string;
  value: number;
}

interface ChartDataPoint {
  day: number;
  goalProgress: number;
  projected?: boolean;
}

interface HabitSeries {
  [date: string]: number;
}

/**
 * Generic formula to calculate number of days to reach goal
 * @param goalType - Type of fitness goal (e.g., "Lose weight", "Build muscle")
 * @param currentValue - Current progress value
 * @param targetValue - Target goal value
 * @param dailyProgressRate - Average daily progress rate
 * @returns Number of days to reach goal
 */
function calculateDaysToGoal(
  goalType: string,
  currentValue: number,
  targetValue: number,
  dailyProgressRate: number
): number {
  if (!dailyProgressRate || dailyProgressRate <= 0) {
    return 0; // Cannot calculate if no progress
  }

  const remaining = Math.abs(targetValue - currentValue);
  const days = Math.ceil(remaining / dailyProgressRate);
  return days;
}

/**
 * Calculate goal progress based on fitness goal type
 */
function calculateGoalProgress(
  goalType: string,
  habitData: HabitSeries,
  userProfile: any
): {
  historicalData: ChartDataPoint[];
  projectedData: ChartDataPoint[];
  currentProgress: number;
  targetProgress: number;
  dailyRate: number;
  daysRemaining: number;
} {
  const today = new Date();
  const historicalData: ChartDataPoint[] = [];
  const projectedData: ChartDataPoint[] = [];

  // Get habit values sorted by date
  const sortedDates = Object.keys(habitData)
    .map((d) => new Date(d))
    .sort((a, b) => a.getTime() - b.getTime());

  if (sortedDates.length === 0) {
    return {
      historicalData: [],
      projectedData: [],
      currentProgress: 0,
      targetProgress: 100,
      dailyRate: 0,
      daysRemaining: 0,
    };
  }

  const startDate = sortedDates[0];
  const endDate = sortedDates[sortedDates.length - 1];
  const daysDiff = Math.ceil(
    (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  // Calculate daily progress rate based on historical data
  const values = sortedDates.map((date) => {
    const dateStr = date.toISOString().slice(0, 10);
    return habitData[dateStr] || 0;
  });

  let dailyRate = 0;
  if (values.length > 1) {
    const totalChange = values[values.length - 1] - values[0];
    dailyRate = totalChange / Math.max(daysDiff, 1);
  }

  // For "Lose weight" goal: Use calorie deficit to calculate weight loss progress
  if (goalType.toLowerCase().includes("lose weight")) {
    const currentWeight = userProfile.currentWeight || 70;
    const targetWeight = userProfile.targetWeight || currentWeight * 0.9; // Default to 10% loss if not set
    const startWeight = currentWeight; // Assume starting from current weight
    const weightToLose = startWeight - targetWeight;

    if (weightToLose <= 0) {
      // Already at or below target
      return {
        historicalData: [{ day: 1, goalProgress: 100 }],
        projectedData: [],
        currentProgress: 100,
        targetProgress: 100,
        dailyRate: 0,
        daysRemaining: 0,
      };
    }

    // Calculate progress based on calorie deficit
    // 1 kg = ~7700 calories deficit
    // If daily calorie is tracked, calculate deficit from maintenance
    const maintenanceCalories = 2000; // Estimated maintenance (can be improved)
    let totalCalorieDeficit = 0;
    let dayCount = 0;

    sortedDates.forEach((date, idx) => {
      const dateStr = date.toISOString().slice(0, 10);
      const calories = habitData[dateStr] || 0;
      const deficit = maintenanceCalories - calories;
      totalCalorieDeficit += Math.max(0, deficit);
      dayCount++;

      // Weight loss = calorie deficit / 7700
      const weightLost = totalCalorieDeficit / 7700;
      const progress = (weightLost / weightToLose) * 100;

      historicalData.push({
        day: dayCount,
        goalProgress: Math.min(100, Math.max(0, progress)),
      });
    });

    const weightLost = totalCalorieDeficit / 7700;
    const currentProgress = (weightLost / weightToLose) * 100;

    // Project future data (next 30 days)
    const avgDailyDeficit =
      dayCount > 0 ? totalCalorieDeficit / dayCount : 500; // Default 500 cal deficit if no data
    for (let i = 1; i <= 30; i++) {
      const futureDeficit = totalCalorieDeficit + avgDailyDeficit * i;
      const futureWeightLost = futureDeficit / 7700;
      const futureProgress = (futureWeightLost / weightToLose) * 100;

      projectedData.push({
        day: dayCount + i,
        goalProgress: Math.min(100, Math.max(0, futureProgress)),
        projected: true,
      });
    }

    const currentProgressWeight = startWeight - weightLost;
    const dailyWeightLossRate = avgDailyDeficit / 7700;
    const daysRemaining = calculateDaysToGoal(
      goalType,
      currentProgressWeight,
      targetWeight,
      dailyWeightLossRate
    );

    return {
      historicalData,
      projectedData,
      currentProgress: Math.min(100, Math.max(0, currentProgress)),
      targetProgress: 100,
      dailyRate: dailyWeightLossRate,
      daysRemaining,
    };
  }

  // For "Build muscle" goal: Use calorie surplus and activity
  if (goalType.toLowerCase().includes("build muscle")) {
    // Calculate progress based on calorie surplus and steps
    let totalCalorieSurplus = 0;
    let totalSteps = 0;
    let dayCount = 0;

    sortedDates.forEach((date, idx) => {
      const dateStr = date.toISOString().slice(0, 10);
      const calories = habitData[dateStr] || 0;
      const maintenanceCalories = 2000;
      const surplus = calories - maintenanceCalories;
      totalCalorieSurplus += Math.max(0, surplus);

      // Also consider steps for muscle building (activity level)
      // Assume steps data is in a separate habit or use calorie as proxy
      dayCount++;

      // Progress = (calorie surplus + activity points) / target
      // Target: 500 calorie surplus per day for muscle building
      const targetDailySurplus = 500;
      const progress = Math.min(
        100,
        (totalCalorieSurplus / (targetDailySurplus * dayCount)) * 100
      );

      historicalData.push({
        day: dayCount,
        goalProgress: progress,
      });
    });

    const avgDailySurplus = totalCalorieSurplus / Math.max(dayCount, 1);
    const currentProgress =
      (totalCalorieSurplus / (500 * Math.max(dayCount, 1))) * 100;

    // Project future data
    for (let i = 1; i <= 30; i++) {
      const futureSurplus = totalCalorieSurplus + avgDailySurplus * i;
      const futureProgress =
        (futureSurplus / (500 * (dayCount + i))) * 100;

      projectedData.push({
        day: dayCount + i,
        goalProgress: Math.min(100, futureProgress),
        projected: true,
      });
    }

    const daysRemaining = calculateDaysToGoal(
      goalType,
      currentProgress,
      100,
      (avgDailySurplus / 500) * 100
    );

    return {
      historicalData,
      projectedData,
      currentProgress: Math.min(100, currentProgress),
      targetProgress: 100,
      dailyRate: avgDailySurplus / 500,
      daysRemaining,
    };
  }

  // Default: Generic progress calculation
  const maxValue = Math.max(...values, 1);
  const minValue = Math.min(...values, 0);
  const range = maxValue - minValue || 1;

  sortedDates.forEach((date, idx) => {
    const dateStr = date.toISOString().slice(0, 10);
    const value = habitData[dateStr] || 0;
    const progress = ((value - minValue) / range) * 100;

    historicalData.push({
      day: idx + 1,
      goalProgress: progress,
    });
  });

  const currentProgress = historicalData[historicalData.length - 1]?.goalProgress || 0;

  // Project future data
  for (let i = 1; i <= 30; i++) {
    projectedData.push({
      day: historicalData.length + i,
      goalProgress: Math.min(100, currentProgress + dailyRate * i),
      projected: true,
    });
  }

  return {
    historicalData,
    projectedData,
    currentProgress,
    targetProgress: 100,
    dailyRate,
    daysRemaining: calculateDaysToGoal(goalType, currentProgress, 100, dailyRate),
  };
}

export function RankingsPage() {
    const navigate = useNavigate();
  const { formData: profile } = useUserProfileStore();
  const [loading, setLoading] = useState(true);
  const [habitData, setHabitData] = useState<HabitSeries>({});
  const [selectedGoal, setSelectedGoal] = useState<string>("");

  // Get fitness goals from user profile
  const fitnessGoals = profile.fitnessGoals || [];
  const activeGoal = selectedGoal || fitnessGoals[0] || "";

  // Calculate chart data
  const chartData = useMemo(() => {
    if (!activeGoal || Object.keys(habitData).length === 0) {
      return {
        historicalData: [],
        projectedData: [],
        currentProgress: 0,
        targetProgress: 100,
        dailyRate: 0,
        daysRemaining: 0,
      };
    }

    return calculateGoalProgress(activeGoal, habitData, profile);
  }, [activeGoal, habitData, profile]);

  // Mock habit data instead of fetching from API
  useEffect(() => {
    if (!activeGoal) return;

    setLoading(true);
    
    // Generate mock data for the last 30 days
    const mockHabitData: HabitSeries = {};
    const today = new Date();
    
    // Generate realistic calorie data based on goal
    const baseCalories = activeGoal.toLowerCase().includes("lose weight") ? 1500 : 2200;
    const variation = 200; // ±200 calories variation
    
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const dateStr = date.toISOString().slice(0, 10);
      
      // Add some realistic variation and trend
      const randomVariation = (Math.random() - 0.5) * 2 * variation;
      const trend = i < 10 ? -50 : 0; // Slight downward trend for recent days (weight loss)
      const calories = Math.round(baseCalories + randomVariation + trend);
      
      mockHabitData[dateStr] = Math.max(800, Math.min(3500, calories)); // Clamp between 800-3500
    }
    
    // Simulate API delay
    setTimeout(() => {
      setHabitData(mockHabitData);
      setLoading(false);
    }, 500);
  }, [activeGoal]);

  // Combine historical and projected data for chart
  const combinedChartData = useMemo(() => {
    const historical = chartData.historicalData.map((d) => ({
      day: d.day,
      actual: d.goalProgress,
      projected: null as number | null,
    }));
    
    // Add a connecting point between historical and projected
    const lastHistorical = historical[historical.length - 1];
    const firstProjected = chartData.projectedData[0];
    
    const projected = chartData.projectedData.map((d) => ({
      day: d.day,
      actual: null as number | null,
      projected: d.goalProgress,
    }));
    
    // If there's a gap, add a connecting point
    if (lastHistorical && firstProjected && lastHistorical.day < firstProjected.day - 1) {
      const connectingPoint = {
        day: lastHistorical.day + 1,
        actual: lastHistorical.actual,
        projected: lastHistorical.actual,
      };
      return [...historical, connectingPoint, ...projected];
    }
    
    return [...historical, ...projected];
  }, [chartData]);

    return (
        <div className="min-h-screen bg-gray-50 font-sans flex flex-col">
            {/* Header */}
            <div className="bg-white p-4 sticky top-0 z-10 flex items-center gap-3 border-b border-gray-100">
                <Button variant="ghost" size="icon" onClick={() => navigate("/home")}>
                    <ArrowLeft className="w-6 h-6 text-gray-900" />
                </Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-900">Goal Progress</h1>
          <p className="text-xs text-gray-500">Track your fitness journey</p>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Goal Selector */}
        {fitnessGoals.length > 1 && (
          <div className="bg-white rounded-2xl p-4 border border-gray-200">
            <p className="text-sm font-semibold text-gray-700 mb-2">
              Select Goal:
            </p>
            <div className="flex flex-wrap gap-2">
              {fitnessGoals.map((goal) => (
                <button
                  key={goal}
                  onClick={() => setSelectedGoal(goal)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeGoal === goal
                      ? "bg-emerald-600 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {goal}
                </button>
              ))}
            </div>
                                    </div>
                                )}

        {/* Progress Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl p-4 border border-gray-200">
            <p className="text-xs text-gray-500 font-semibold mb-1">
              Current Progress
            </p>
            <p className="text-2xl font-bold text-emerald-600">
              {chartData.currentProgress.toFixed(1)}%
            </p>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-gray-200">
            <p className="text-xs text-gray-500 font-semibold mb-1">
              Days Remaining
            </p>
            <p className="text-2xl font-bold text-blue-600">
              {chartData.daysRemaining > 0 ? chartData.daysRemaining : "—"}
            </p>
          </div>
        </div>

        {/* Chart */}
        <div className="bg-white rounded-2xl p-4 border border-gray-200">
          <div className="flex items-center gap-2 mb-4">
            <Target className="w-5 h-5 text-emerald-600" />
            <h2 className="text-lg font-bold text-gray-900">
              {activeGoal || "No Goal Selected"}
            </h2>
                                    </div>

          {loading ? (
            <div className="h-64 flex items-center justify-center">
              <p className="text-sm text-gray-500">Loading chart data...</p>
            </div>
          ) : combinedChartData.length === 0 ? (
            <div className="h-64 flex items-center justify-center">
              <p className="text-sm text-gray-500">
                No data available. Start logging your habits to see progress!
              </p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={combinedChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="day"
                  label={{
                    value: "Days",
                    position: "insideBottom",
                    offset: -5,
                  }}
                  stroke="#6b7280"
                />
                <YAxis
                  label={{
                    value: "Goal Progress (%)",
                    angle: -90,
                    position: "insideLeft",
                  }}
                  domain={[0, 100]}
                  stroke="#6b7280"
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "white",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                  }}
                  formatter={(value: number | null, name: string) => {
                    if (value === null) return null;
                    return [`${value.toFixed(1)}%`, name];
                  }}
                />
                <Legend />
                <ReferenceLine y={100} stroke="#ef4444" strokeDasharray="3 3" />
                <Line
                  type="monotone"
                  dataKey="actual"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={{ fill: "#10b981", r: 3 }}
                  name="Actual Progress"
                  connectNulls={false}
                />
                <Line
                  type="monotone"
                  dataKey="projected"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={{ fill: "#3b82f6", r: 3 }}
                  name="Projected Progress"
                  connectNulls={false}
                />
              </LineChart>
            </ResponsiveContainer>
          )}

          {/* Info Box */}
          <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
            <div className="flex items-start gap-2">
              <TrendingUp className="w-4 h-4 text-blue-600 mt-0.5" />
              <div className="text-xs text-blue-800">
                <p className="font-semibold mb-1">How it works:</p>
                <p>
                  The chart shows your progress toward your goal. The solid line
                  represents actual progress based on your habit data, while the
                  dashed line projects future progress based on your current
                  trend.
                </p>
                                                </div>
                                        </div>
                                    </div>
                                </div>
            </div>
        </div>
    );
}
