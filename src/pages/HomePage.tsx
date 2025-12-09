import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  MessageSquare,
  Zap,
  Send,
  CheckCircle2,
  Compass,
  Utensils,
  Dumbbell,
  Camera,
  Droplet,
  Footprints,
  Keyboard,
  Mic,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useUserProfileStore } from "@/store/userProfileStore";
import AvatarScene from "@/components/AvatarScene";
import type { VoiceType } from "@/types/voice";
import "@/pages/HomePage.css";
import ackoLogo from "@/assets/acko_logo.png";

// Type definitions for Speech Recognition API
interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
}

interface SpeechRecognitionEvent {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

// --- Types ---
interface Message {
  id: string;
  sender: "user" | "coach";
  text: string;
}

// Goal Chart types
interface ChartDataPoint {
  day: number;
  goalProgress: number;
  projected?: boolean;
}

interface HabitSeries {
  [date: string]: number;
}

interface HabitLog {
  id: string;
  userId: string;
  habit: string;
  value: number;
  recordedAt: string;
  meta?: {
    unit?: string;
    source?: string;
    note?: string;
    mealName?: string;
    healthNote?: string;
    items?: Array<{
      name: string;
      calories: number;
      quantity?: string;
      note?: string;
    }>;
    quickNote?: string;
    mealType?: string;
    cheatMeal?: boolean;
    food?: string | Array<string>; // Food items from metadata
    foodName?: string; // Food name for cheat meal
    [key: string]: any; // Allow additional properties
  };
}

interface DailyHabits {
  calories: number;
  water: number;
  steps: number;
}

/**
 * Calculate goal progress based on daily habit data
 * Goal starts at 0 and builds up to 100 based on cumulative progress
 */
function calculateGoalProgress(habitData: HabitSeries): {
  historicalData: ChartDataPoint[];
  projectedData: ChartDataPoint[];
  currentProgress: number;
  targetProgress: number;
  dailyRate: number;
  daysRemaining: number;
} {
  const historicalData: ChartDataPoint[] = [];
  const projectedData: ChartDataPoint[] = [];

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

  // Calculate cumulative progress starting from 0
  // Each day can contribute maximum 5% to the overall goal
  // Progress accumulates: day 1 = max 5%, day 2 = max 10%, etc.
  const MAX_DAILY_CONTRIBUTION = 5; // Maximum % contribution per day
  let totalProgress = 0;
  let dayCount = 0;
  const dailyContributions: number[] = [];

  sortedDates.forEach((date) => {
    const dateStr = date.toISOString().slice(0, 10);
    const dailyProgress = habitData[dateStr] || 0; // This is already 0-100%

    // Scale daily progress to max 5% contribution per day
    // If daily progress is 56%, it contributes: (56/100) * 5 = 2.8%
    const dailyContribution = (dailyProgress / 100) * MAX_DAILY_CONTRIBUTION;
    dailyContributions.push(dailyContribution);

    // Accumulate progress
    totalProgress += dailyContribution;
    dayCount++;

    // Cap at 100%
    const goalProgress = Math.min(100, totalProgress);

    historicalData.push({
      day: dayCount,
      goalProgress: goalProgress,
    });
  });

  const currentProgress =
    historicalData[historicalData.length - 1]?.goalProgress || 0;

  // Calculate average daily contribution for projection
  const avgDailyContribution =
    dailyContributions.length > 0
      ? dailyContributions.reduce((a, b) => a + b, 0) /
        dailyContributions.length
      : 0;
  const dailyRate = avgDailyContribution;

  // Project future data - show projection until goal is reached or 60 days max
  let projectedProgress = totalProgress;
  let projectionDay = dayCount;
  const maxProjectionDays = 60;
  let goalReachedDay = 0;

  for (let i = 1; i <= maxProjectionDays; i++) {
    projectedProgress += avgDailyContribution;
    projectionDay++;

    if (projectedProgress >= 100 && goalReachedDay === 0) {
      goalReachedDay = projectionDay;
    }

    const projectedGoalProgress = Math.min(100, projectedProgress);

    projectedData.push({
      day: dayCount + i,
      goalProgress: projectedGoalProgress,
      projected: true,
    });

    // Stop projecting once we've reached 100% and shown a bit beyond
    if (projectedProgress >= 100 && i > 5) {
      break;
    }
  }

  // Calculate days remaining to reach 100
  let daysRemaining = 0;
  if (currentProgress < 100 && avgDailyContribution > 0) {
    const remainingProgress = 100 - currentProgress;
    daysRemaining = Math.ceil(remainingProgress / avgDailyContribution);
  } else if (goalReachedDay > 0) {
    daysRemaining = goalReachedDay - dayCount;
  }

  return {
    historicalData,
    projectedData,
    currentProgress,
    targetProgress: 100,
    dailyRate,
    daysRemaining,
  };
}

const HARD_CODED_USER_ID = "9795784244";

// --- Mock Data ---
export function HomePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { formData: profile, updateFormData } = useUserProfileStore();
  const fetchedUserRef = useRef<string | null>(null);
  const goalStateRef = useRef<{ userId: string | null; hits: Set<string> }>({
    userId: null,
    hits: new Set(),
  });
  const routeFormData = location.state?.formData || {};
  // Safe access to formData with defaults
  const gender = profile.gender || routeFormData.gender || "female";
  const name = profile.name || routeFormData.name || "Traveller";
  const coachName = gender === "male" ? "Dhoni" : "Disha";

  // State
  const [activeTab, setActiveTab] = useState<"goals" | "Your Plans" | "Chat">(
    "goals"
  );
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isHabitApiLoading, setHabitApiLoading] = useState(false);
  const [showTextInput, setShowTextInput] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const xp = profile.xp ?? routeFormData.xp ?? 350;
  const setupMessageText =
    "We have created a personalized plan to help you reach your goals. Your fitness journey is no longer boring—head to Explore for curated meals and workouts, log habits, log meals in chat for calorie tracking, and unlock even more support.";
  const defaultWelcomeText = `We have created a personalized plan to help you reach your goals. Your fitness journey is no longer boring—head to Explore for curated meals and workouts, log habits, log meals in chat for calorie tracking, and unlock even more support.`;
  const repeatWelcomeText = `Great to see you again, ${name}. Let's keep the momentum going.`;
  const isPremiumReturn = location.state?.fromPremium === true;

  useEffect(() => {
    if (messages.length > 0) return;
    const messageId = Date.now().toString();
    const todayKey = new Date().toISOString().split("T")[0];
    let messageText = defaultWelcomeText;

    if (typeof window !== "undefined") {
      const fromSetup =
        window.sessionStorage.getItem("visitedSetup") === "true";
      const setupMessageShown =
        window.sessionStorage.getItem("setupHomeMessageShown") === "true";
      const lastDailyGreeting =
        window.sessionStorage.getItem("homeDailyWelcomeDate") || "";
      const defaultGreetingShown =
        window.sessionStorage.getItem("homeDefaultGreetingShown") === "true";

      if (fromSetup && !setupMessageShown) {
        messageText = setupMessageText;
        window.sessionStorage.setItem("setupHomeMessageShown", "true");
        window.sessionStorage.removeItem("visitedSetup");
      } else if (isPremiumReturn) {
        messageText = defaultWelcomeText;
        window.sessionStorage.setItem("homeDefaultGreetingShown", "true");
      } else if (!defaultGreetingShown) {
        messageText = defaultWelcomeText;
        window.sessionStorage.setItem("homeDefaultGreetingShown", "true");
        window.sessionStorage.setItem("homeDailyWelcomeDate", todayKey);
      } else if (lastDailyGreeting !== todayKey) {
        messageText = defaultWelcomeText;
        window.sessionStorage.setItem("homeDailyWelcomeDate", todayKey);
      } else {
        messageText = repeatWelcomeText;
      }
    }

    setMessages([{ id: messageId, sender: "coach", text: messageText }]);
  }, [
    defaultWelcomeText,
    isPremiumReturn,
    messages.length,
    repeatWelcomeText,
    setupMessageText,
    location.key,
  ]);
  const latestCoachMessage = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      if (messages[i].sender === "coach") {
        return messages[i];
      }
    }
    return null;
  }, [messages]);
  const latestCoachText =
    latestCoachMessage?.text ?? setupMessageText ?? defaultWelcomeText;
  const [habitStats, setHabitStats] = useState<{
    calorie?: number;
    water?: number;
    steps?: number;
  }>({});

  // Goal Chart state
  const [, setGoalChartLoading] = useState(true);
  const [goalHabitData, setGoalHabitData] = useState<HabitSeries>({});
  const [selectedGoal] = useState<string>("");
  const [fetchedUserGoal, setFetchedUserGoal] = useState<string>("");
  const fitnessGoals = profile.fitnessGoals || [];

  // Refresh trigger for goal section
  const [goalRefreshTrigger, setGoalRefreshTrigger] = useState(0);

  // Today's intake state
  const [todayIntake, setTodayIntake] = useState<{
    calories: { achieved: number; target: number };
    water: { achieved: number; target: number };
    steps: { achieved: number; target: number };
  }>({
    calories: { achieved: 0, target: 0 },
    water: { achieved: 0, target: 0 },
    steps: { achieved: 0, target: 0 },
  });
  const [todayIntakeLoading, setTodayIntakeLoading] = useState(false);

  // Cheat meals / missed meals state
  interface CheatMealEntry {
    date: string;
    meals: Array<{
      mealName?: string;
      calories?: number;
      healthNote?: string;
      note?: string;
      items?: Array<{ name: string; calories: number }>;
      food?: string | Array<string>; // Food items from metadata
      foodName?: string; // Food name for cheat meal
    }>;
  }
  const [cheatMeals, setCheatMeals] = useState<CheatMealEntry[]>([]);
  const [cheatMealsLoading, setCheatMealsLoading] = useState(false);
  // Use selected goal, fetched user goal, profile goal, or default
  const activeGoal = selectedGoal || fetchedUserGoal || fitnessGoals[0] || "";

  const levelingXp = 1000;
  const level = 1;

  const fetchUserProfile = async (userId: string) => {
    try {
      const res = await fetch(`/api/users/${encodeURIComponent(userId)}`);
      if (!res.ok) return;
      const data = await res.json();
      updateFormData(data);
    } catch (e) {
      console.error("Failed to fetch user profile", e);
    }
  };

  const awardXp = async (delta: number) => {
    try {
      // Get phone number from localStorage
      const phoneNumber = localStorage.getItem("userPhone");
      if (!phoneNumber) {
        console.warn("No phone number found in localStorage");
        return;
      }
      const res = await fetch(
        `/api/users/${encodeURIComponent(phoneNumber)}/xp?delta=${delta}`,
        {
        method: "POST",
        }
      );
      if (!res.ok) return;
      await fetchUserProfile(phoneNumber); // refresh xp
    } catch (e) {
      console.error("Failed to award XP", e);
    }
  };

  // Fetch user profile on mount
  useEffect(() => {
    const storedPhone = localStorage.getItem("userPhone");
    const routePhone = routeFormData.mobile;
    const userId =
      profile.mobile || routePhone || storedPhone || HARD_CODED_USER_ID;
    if (!userId) return;
    if (fetchedUserRef.current === userId) return;
    fetchedUserRef.current = userId;
    fetchUserProfile(userId);
  }, [profile.mobile, routeFormData.mobile, fetchUserProfile]);

  // Refresh goal section when page comes into focus (user navigated back from logging data)
  useEffect(() => {
    const handleFocus = () => {
      // Small delay to ensure data is saved before refreshing
      setTimeout(() => {
        setGoalRefreshTrigger((prev) => prev + 1);
      }, 500);
    };

    window.addEventListener("focus", handleFocus);
    return () => {
      window.removeEventListener("focus", handleFocus);
    };
  }, []);

  // Fetch user goal from API
  useEffect(() => {
    const userId = HARD_CODED_USER_ID;

    const fetchUserGoal = async () => {
      try {
        const res = await fetch(`/api/users/${encodeURIComponent(userId)}`);
        if (!res.ok) return;
        const userData = await res.json();

        // Extract first fitness goal from response
        const goals = userData.fitnessGoals || [];
        if (goals.length > 0) {
          setFetchedUserGoal(goals[0]);
        } else {
          setFetchedUserGoal("");
        }
      } catch (e) {
        console.error("Failed to fetch user goal", e);
        setFetchedUserGoal("");
      }
    };

    fetchUserGoal();
  }, []);

  // Fetch daily habit stats on mount and when refresh is triggered
  useEffect(() => {
    const userId = HARD_CODED_USER_ID;

    const fetchHabits = async () => {
      try {
        const res = await fetch(
          `/api/habits/user?userId=${encodeURIComponent(userId)}`
        );
        if (!res.ok) return;
        const habitLogs: HabitLog[] = await res.json();

        // Group habits by date and calculate daily totals
        const dailyHabitsMap: Record<string, DailyHabits> = {};

        habitLogs.forEach((log) => {
          const date = new Date(log.recordedAt);
          const dateStr = date.toISOString().slice(0, 10);

          if (!dailyHabitsMap[dateStr]) {
            dailyHabitsMap[dateStr] = {
              calories: 0,
              water: 0,
              steps: 0,
            };
          }

          const habitName = log.habit.toLowerCase();
          if (habitName === "calories" || habitName === "calorie") {
            dailyHabitsMap[dateStr].calories += log.value;
          } else if (habitName === "water") {
            dailyHabitsMap[dateStr].water += log.value;
          } else if (habitName === "steps" || habitName === "step") {
            dailyHabitsMap[dateStr].steps += log.value;
          }
        });

        // Get today's date
        const today = new Date();
        const todayStr = today.toISOString().slice(0, 10);
        const todayHabits = dailyHabitsMap[todayStr] || {
          calories: 0,
          water: 0,
          steps: 0,
        };

        setHabitStats({
          calorie: todayHabits.calories,
          water: todayHabits.water,
          steps: todayHabits.steps,
        });
      } catch (e) {
        console.error("Failed to fetch habit stats", e);
      }
    };

    fetchHabits();
  }, [goalRefreshTrigger]);

  // Fetch today's intake (calories, water, steps)
  useEffect(() => {
    const userId = HARD_CODED_USER_ID;
    setTodayIntakeLoading(true);

    const fetchTodayIntake = async () => {
      try {
        const res = await fetch(
          `/api/habits/user?userId=${encodeURIComponent(userId)}`
        );
        if (!res.ok) {
          setTodayIntakeLoading(false);
          return;
        }
        const habitLogs: HabitLog[] = await res.json();

        // Get today's date
        const today = new Date();
        const todayStr = today.toISOString().slice(0, 10);

        // Calculate today's intake for all metrics
        let todayCaloriesAchieved = 0;
        let todayWaterAchieved = 0;
        let todayStepsAchieved = 0;

        habitLogs.forEach((log) => {
          const date = new Date(log.recordedAt);
          const dateStr = date.toISOString().slice(0, 10);
          if (dateStr === todayStr) {
            const habitName = log.habit.toLowerCase();
            if (habitName === "calories" || habitName === "calorie") {
              todayCaloriesAchieved += log.value;
            } else if (habitName === "water") {
              todayWaterAchieved += log.value;
            } else if (habitName === "steps" || habitName === "step") {
              todayStepsAchieved += log.value;
            }
          }
        });

        // Get targets based on goal
        const targetCalories = activeGoal.toLowerCase().includes("lose weight")
          ? 1500
          : 2500;
        const targetWater = 2000; // ml
        const targetSteps = 10000;

        setTodayIntake({
          calories: {
            achieved: todayCaloriesAchieved,
            target: targetCalories,
          },
          water: {
            achieved: todayWaterAchieved,
            target: targetWater,
          },
          steps: {
            achieved: todayStepsAchieved,
            target: targetSteps,
          },
        });
      } catch (e) {
        console.error("Failed to fetch today's intake", e);
      } finally {
        setTodayIntakeLoading(false);
      }
    };

    fetchTodayIntake();
  }, [activeGoal, goalRefreshTrigger]);

  // Fetch cheat meals / missed meals
  useEffect(() => {
    const userId = HARD_CODED_USER_ID;
    setCheatMealsLoading(true);

    const fetchCheatMeals = async () => {
      try {
        const res = await fetch(
          `/api/habits/user?userId=${encodeURIComponent(userId)}`
        );
        if (!res.ok) {
          setCheatMealsLoading(false);
          return;
        }
        const habitLogs: HabitLog[] = await res.json();

        // Group meals by date
        const mealsByDate: Record<string, CheatMealEntry["meals"]> = {};

        habitLogs.forEach((log) => {
          const habitName = log.habit.toLowerCase();

          // Check specifically for cheat meals: habit == "calories" and meta.cheatMeal == true
          if (habitName === "calories" || habitName === "calorie") {
            const isCheatMeal = log.meta?.cheatMeal === true;

            if (isCheatMeal) {
              const date = new Date(log.recordedAt);
              const dateStr = date.toISOString().slice(0, 10);

              if (!mealsByDate[dateStr]) {
                mealsByDate[dateStr] = [];
              }

              // Extract food items from metadata
              let foodItems: string[] = [];
              if (log.meta?.food) {
                if (Array.isArray(log.meta.food)) {
                  foodItems = log.meta.food;
                } else if (typeof log.meta.food === "string") {
                  foodItems = [log.meta.food];
                }
              }

              // Also check items array if food is not present
              if (
                foodItems.length === 0 &&
                log.meta?.items &&
                Array.isArray(log.meta.items)
              ) {
                foodItems = log.meta.items
                  .map((item: any) => item.name || String(item))
                  .filter(Boolean);
              }

              // Use foodName if present, otherwise use "cheat meal"
              const displayName =
                log.meta?.foodName || log.meta?.mealName || "cheat meal";

              mealsByDate[dateStr].push({
                mealName: displayName,
                calories: log.value,
                healthNote: log.meta?.healthNote,
                note: log.meta?.note,
                items: log.meta?.items,
                food: foodItems.length > 0 ? foodItems : undefined,
                foodName: log.meta?.foodName,
              });
            }
          }
        });

        // Convert to array and sort by date (newest first)
        const cheatMealsArray: CheatMealEntry[] = Object.entries(mealsByDate)
          .map(([date, meals]) => ({ date, meals }))
          .sort(
            (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
          );

        setCheatMeals(cheatMealsArray);
      } catch (e) {
        console.error("Failed to fetch cheat meals", e);
      } finally {
        setCheatMealsLoading(false);
      }
    };

    fetchCheatMeals();
  }, [goalRefreshTrigger]);

  // Removed leaderboard fetching - using Goal Chart instead

  // Calculate goal chart data
  const goalChartData = useMemo(() => {
    console.log("Calculating goal chart data:", {
      activeGoal,
      goalHabitDataKeys: Object.keys(goalHabitData).length,
      goalHabitData,
    });

    if (!activeGoal || Object.keys(goalHabitData).length === 0) {
      console.log("No active goal or no habit data");
      return {
        historicalData: [],
        projectedData: [],
        currentProgress: 0,
        targetProgress: 100,
        dailyRate: 0,
        daysRemaining: 0,
      };
    }
    const result = calculateGoalProgress(goalHabitData);
    console.log("Calculated goal chart data:", result);
    return result;
  }, [activeGoal, goalHabitData]);

  // Fetch habit data from API and calculate daily goal progress
  useEffect(() => {
    const userId = HARD_CODED_USER_ID;

    if (!activeGoal) return;

    setGoalChartLoading(true);

    const fetchHabitData = async () => {
      try {
        console.log("Fetching habit data for userId:", userId);
        const res = await fetch(
          `/api/habits/user?userId=${encodeURIComponent(userId)}`
        );
        if (!res.ok) {
          throw new Error(`Failed to fetch habit data: ${res.status}`);
        }
        const habitLogs: HabitLog[] = await res.json();
        console.log("Fetched habit logs:", habitLogs);

        if (!habitLogs || habitLogs.length === 0) {
          console.warn("No habit logs found");
          setGoalHabitData({});
          setGoalChartLoading(false);
          return;
        }

        // Group habits by date
        const dailyHabitsMap: Record<string, DailyHabits> = {};

        habitLogs.forEach((log) => {
          const date = new Date(log.recordedAt);
          const dateStr = date.toISOString().slice(0, 10);

          if (!dailyHabitsMap[dateStr]) {
            dailyHabitsMap[dateStr] = {
              calories: 0,
              water: 0,
              steps: 0,
            };
          }

          const habitName = log.habit.toLowerCase();
          if (habitName === "calories" || habitName === "calorie") {
            dailyHabitsMap[dateStr].calories += log.value;
          } else if (habitName === "water") {
            dailyHabitsMap[dateStr].water += log.value;
          } else if (habitName === "steps" || habitName === "step") {
            dailyHabitsMap[dateStr].steps += log.value;
          }
        });

        // Calculate daily goal progress
        // Target values for each habit (can be adjusted based on user profile)
        const targetCalories = activeGoal.toLowerCase().includes("lose weight")
          ? 1500
          : 2500;
        const targetWater = 2000; // ml
        const targetSteps = 10000;

        // Convert daily habits to goal progress values
        const goalProgressData: HabitSeries = {};
        const sortedDates = Object.keys(dailyHabitsMap).sort();

        sortedDates.forEach((dateStr) => {
          const dayHabits = dailyHabitsMap[dateStr];

          // Calculate progress for each habit (0-100% each)
          const caloriesProgress = Math.min(
            100,
            (dayHabits.calories / targetCalories) * 100
          );
          const waterProgress = Math.min(
            100,
            (dayHabits.water / targetWater) * 100
          );
          const stepsProgress = Math.min(
            100,
            (dayHabits.steps / targetSteps) * 100
          );

          // Weighted average: calories 40%, water 30%, steps 30%
          const dailyGoalProgress =
            caloriesProgress * 0.4 + waterProgress * 0.3 + stepsProgress * 0.3;

          goalProgressData[dateStr] = dailyGoalProgress;
        });

        console.log("Processed goal progress data:", goalProgressData);
        console.log(
          "Number of days with data:",
          Object.keys(goalProgressData).length
        );

        setGoalHabitData(goalProgressData);
        setGoalChartLoading(false);
      } catch (e) {
        console.error("Failed to fetch habit data", e);
        setGoalChartLoading(false);
        // Fallback to empty data
        setGoalHabitData({});
      }
    };

    fetchHabitData();
  }, [activeGoal, goalRefreshTrigger]);

  // Combine historical and projected data for chart
  // Award XP when goals are reached (once per goal per user)
  useEffect(() => {
    const phoneNumber = localStorage.getItem("userPhone");
    if (!phoneNumber) return;

    // Reset goal state when user changes
    if (goalStateRef.current.userId !== phoneNumber) {
      goalStateRef.current = { userId: phoneNumber, hits: new Set() };
    }

    const goals = [
      {
        key: "steps",
        hit: habitStats.steps != null && habitStats.steps >= 5000,
        xp: 100,
      },
      {
        key: "water",
        hit: habitStats.water != null && habitStats.water >= 3000,
        xp: 50,
      },
    ];

    let delta = 0;
    goals.forEach(({ key, hit, xp }) => {
      const marker = `${phoneNumber}:${key}`;
      const alreadyHit = goalStateRef.current.hits.has(marker);

      // If goal is already achieved before this render, only award when transitioning from not-hit -> hit
      if (hit && !alreadyHit) {
        goalStateRef.current.hits.add(marker);
        delta += xp;
      }

      // If not hit, ensure we don't accidentally award next time without a transition
      if (!hit && alreadyHit) {
        goalStateRef.current.hits.delete(marker);
      }
    });

    if (delta > 0) {
      awardXp(delta);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [habitStats]);

  // Determining "Persona" styles
  const isMale = gender === "male";

  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const recognitionResultRef = useRef<string>("");
  const wakeWordRecognitionRef = useRef<SpeechRecognition | null>(null);
  const maxListeningTimeoutRef = useRef<number | null>(null);
  const silenceTimeoutRef = useRef<number | null>(null);
  const lastSpeechTimeRef = useRef<number>(0);
  const silenceMonitorRef = useRef<number | null>(null);
  const speechSynthesisRef = useRef<SpeechSynthesisUtterance | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const SILENCE_TIMEOUT_MS = 3000;

  // Function to play audio feedback - start listening sound
  const playStartSound = useCallback(() => {
    try {
      // Create AudioContext if it doesn't exist
      if (!audioContextRef.current) {
        const AudioContextClass =
          window.AudioContext ||
          (
            window as unknown as {
              webkitAudioContext?: { new (): AudioContext };
            }
          ).webkitAudioContext;
        if (AudioContextClass) {
          audioContextRef.current = new AudioContextClass();
        } else {
          console.warn("Web Audio API not supported");
          return;
        }
      }
      const audioContext = audioContextRef.current;

      // Create a pleasant start sound (higher pitch, shorter)
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      // Configure the sound
      oscillator.frequency.value = 800; // Higher pitch for start
      oscillator.type = "sine"; // Smooth sine wave

      // Envelope: quick fade in, then fade out
      const now = audioContext.currentTime;
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.3, now + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

      oscillator.start(now);
      oscillator.stop(now + 0.15);

      console.log("🔊 Played start listening sound");
    } catch (error) {
      console.warn("Failed to play start sound:", error);
    }
  }, []);

  // Function to play audio feedback - end listening sound
  const playEndSound = useCallback(() => {
    try {
      // Create AudioContext if it doesn't exist
      if (!audioContextRef.current) {
        const AudioContextClass =
          window.AudioContext ||
          (
            window as unknown as {
              webkitAudioContext?: { new (): AudioContext };
            }
          ).webkitAudioContext;
        if (AudioContextClass) {
          audioContextRef.current = new AudioContextClass();
        } else {
          console.warn("Web Audio API not supported");
          return;
        }
      }
      const audioContext = audioContextRef.current;

      // Create a pleasant end sound (lower pitch, slightly longer)
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      // Configure the sound
      oscillator.frequency.value = 600; // Lower pitch for end
      oscillator.type = "sine"; // Smooth sine wave

      // Envelope: quick fade in, then fade out
      const now = audioContext.currentTime;
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.3, now + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

      oscillator.start(now);
      oscillator.stop(now + 0.2);

      console.log("🔊 Played end listening sound");
    } catch (error) {
      console.warn("Failed to play end sound:", error);
    }
  }, []);

  // Function to speak text using browser's Speech Synthesis API
  const speakText = useCallback(
    (text: string) => {
      if (!text || !text.trim()) {
        return;
      }

      // Check if Speech Synthesis is available
      if (!("speechSynthesis" in window)) {
        console.warn("Speech synthesis not supported in this browser");
        return;
      }

      // Cancel any ongoing speech
      if (speechSynthesisRef.current) {
        window.speechSynthesis.cancel();
      }

      try {
        const utterance = new SpeechSynthesisUtterance(text);
        speechSynthesisRef.current = utterance;

        // Configure voice based on gender
        utterance.lang = "en-US";
        utterance.rate = 1.0; // Normal speed
        utterance.pitch = isMale ? 0.8 : 1.2; // Lower pitch for male, higher for female
        utterance.volume = 1.0; // Full volume

        // Try to select appropriate voice based on gender
        const voices = window.speechSynthesis.getVoices();
        if (voices.length > 0) {
          // Prefer voices that match the gender
          const preferredVoices = voices.filter((voice) => {
            const voiceName = voice.name.toLowerCase();
            if (isMale) {
              // Prefer male-sounding voices
              return (
                voiceName.includes("male") ||
                voiceName.includes("david") ||
                voiceName.includes("daniel") ||
                voiceName.includes("alex") ||
                voice.lang.startsWith("en")
              );
            } else {
              // Prefer female-sounding voices
              return (
                voiceName.includes("female") ||
                voiceName.includes("samantha") ||
                voiceName.includes("susan") ||
                voiceName.includes("karen") ||
                voiceName.includes("victoria") ||
                voice.lang.startsWith("en")
              );
            }
          });

          if (preferredVoices.length > 0) {
            utterance.voice = preferredVoices[0];
          } else if (voices.length > 0) {
            // Fallback to any English voice
            const englishVoices = voices.filter((v) => v.lang.startsWith("en"));
            if (englishVoices.length > 0) {
              utterance.voice = englishVoices[0];
            }
          }
        }

        // Handle speech events
        utterance.onstart = () => {
          console.log("🔊 Started speaking response");
        };

        utterance.onend = () => {
          console.log("🔊 Finished speaking response");
          speechSynthesisRef.current = null;
        };

        utterance.onerror = (event) => {
          console.error("❌ Speech synthesis error:", event.error);
          speechSynthesisRef.current = null;
        };

        // Speak the text
        window.speechSynthesis.speak(utterance);
        console.log("🔊 Speaking response:", text.substring(0, 50) + "...");
      } catch (error) {
        console.error("Failed to speak text:", error);
      }
    },
    [isMale]
  );

  // Load voices when they become available
  useEffect(() => {
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        console.log("🔊 Available voices loaded:", voices.length);
      }
    };

    // Voices might be loaded asynchronously
    if (window.speechSynthesis.getVoices().length > 0) {
      loadVoices();
    } else {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }

    return () => {
      // Cleanup: cancel any ongoing speech when component unmounts
      if (speechSynthesisRef.current) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Handle audio response from server
  const handleAudioResponse = async (
    data:
      | Blob
      | ArrayBuffer
      | string
      | { data?: string; type?: string; [key: string]: unknown }
  ) => {
    try {
      let audioBlob: Blob | null = null;

      if (data instanceof Blob) {
        audioBlob = data;
      } else if (data instanceof ArrayBuffer) {
        audioBlob = new Blob([data], { type: "audio/wav" });
      } else if (
        typeof data === "object" &&
        data !== null &&
        "data" in data &&
        typeof data.data === "string"
      ) {
        // Base64 encoded audio
        const binaryString = atob(data.data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        audioBlob = new Blob([bytes], {
          type: (data.type as string) || "audio/wav",
        });
      } else if (typeof data === "string") {
        // Try to parse as base64
        try {
          const binaryString = atob(data);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          audioBlob = new Blob([bytes], { type: "audio/wav" });
        } catch {
          console.log("Response is text, not audio:", data);
          return;
        }
      }

      if (audioBlob) {
        console.log(
          "🔊 Playing audio response, size:",
          audioBlob.size,
          "type:",
          audioBlob.type
        );
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        audio.play().catch((error) => {
          console.error("Failed to play audio:", error);
        });
        audio.onended = () => {
          URL.revokeObjectURL(audioUrl);
        };
      }
    } catch (error) {
      console.error("Error handling audio response:", error);
    }
  };

 

  // Helper function to stop listening and send the result
  const clearSilenceMonitor = useCallback(() => {
    if (silenceMonitorRef.current) {
      window.clearInterval(silenceMonitorRef.current);
      silenceMonitorRef.current = null;
    }
  }, []);

  const stopListeningAndSend = useCallback(() => {
    setIsListening(false);

    clearSilenceMonitor();

    // Play end sound to indicate listening has stopped
    playEndSound();

    // Clear all timeouts
    if (maxListeningTimeoutRef.current) {
      window.clearTimeout(maxListeningTimeoutRef.current);
      maxListeningTimeoutRef.current = null;
    }
    if (silenceTimeoutRef.current) {
      window.clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = null;
    }

    if (recognitionRef.current) {
      const recognition = recognitionRef.current;

      // Remove all event handlers first to prevent them from firing
      recognition.onend = null;
      recognition.onerror = null;
      recognition.onresult = null;

      // Clear ref to prevent handlers from restarting
      recognitionRef.current = null;

      try {
        // Use stop() for graceful stop (abort() triggers error events)
        recognition.stop();
        } catch {
        // If stop fails, try abort
        try {
          recognition.abort();
        } catch {
          // Ignore errors when stopping
        }
      }
    }

    // Send the transcribed text if available
  }, [isMale, playEndSound, clearSilenceMonitor]);

  const startSilenceMonitor = useCallback(() => {
    clearSilenceMonitor();
    silenceMonitorRef.current = window.setInterval(() => {
      const idle = Date.now() - lastSpeechTimeRef.current;
      if (idle >= SILENCE_TIMEOUT_MS) {
        console.log("🔇 Silence monitor triggered, stopping recognition");
        stopListeningAndSend();
      }
    }, 400);
  }, [clearSilenceMonitor, stopListeningAndSend]);

  // Voice input handler - wrapped in useCallback for use in wake word detection
  const handleVoiceInput = useCallback(() => {
    // Check if SpeechRecognition is available
    const SpeechRecognition =
      (
        window as unknown as {
          SpeechRecognition?: { new (): SpeechRecognition };
        }
      ).SpeechRecognition ||
      (
        window as unknown as {
          webkitSpeechRecognition?: { new (): SpeechRecognition };
        }
      ).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert(
        "Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari."
      );
      return;
    }

    // If already listening, stop recognition manually
    if (isListening) {
      stopListeningAndSend();
      return;
    }

    // Ensure any previous recognition is fully cleaned up
    if (recognitionRef.current) {
      try {
        const oldRecognition = recognitionRef.current;
        // Remove all event handlers to prevent conflicts
        oldRecognition.onend = null;
        oldRecognition.onerror = null;
        oldRecognition.onresult = null;
        oldRecognition.stop();
      } catch {
        // Ignore errors when cleaning up
      }
      recognitionRef.current = null;
    }

    // Small delay to ensure previous recognition is fully stopped
    setTimeout(() => {
      // Double-check we're still not listening (user might have clicked again)
      if (isListening) {
        return;
      }

      // Start speech recognition
      try {
        const recognition = new SpeechRecognition();
        recognitionRef.current = recognition;

        // Configure recognition
        recognition.continuous = true; // Keep listening until stopped
        recognition.interimResults = true; // Show interim results
        recognition.lang = "en-US"; // Set language (you can make this configurable)

        // Constants for timeout management
        const MAX_LISTENING_TIME = 35000; // 35 seconds maximum
        const SILENCE_TIMEOUT = 3000; // 3 seconds of silence to auto-stop

        // Set maximum listening time (35 seconds)
        maxListeningTimeoutRef.current = window.setTimeout(() => {
          console.log("⏱️ Maximum listening time reached (35s), stopping...");
          stopListeningAndSend();
        }, MAX_LISTENING_TIME);

        // Track speech activity
        lastSpeechTimeRef.current = Date.now();

        // Function to reset silence timeout
        const resetSilenceTimeout = () => {
          if (silenceTimeoutRef.current) {
            window.clearTimeout(silenceTimeoutRef.current);
          }
          silenceTimeoutRef.current = window.setTimeout(() => {
            const timeSinceLastSpeech = Date.now() - lastSpeechTimeRef.current;
            if (timeSinceLastSpeech >= SILENCE_TIMEOUT && isListening) {
              console.log("🔇 Silence detected for 3s, stopping...");
              stopListeningAndSend();
            }
          }, SILENCE_TIMEOUT);
        };

        // Handle recognition results
        recognition.onresult = (event: SpeechRecognitionEvent) => {
          let interimTranscript = "";
          let finalTranscript = "";

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscript += transcript + " ";
            } else {
              interimTranscript += transcript;
            }
          }

          // Update the result
          if (finalTranscript) {
            recognitionResultRef.current += finalTranscript;
            console.log("🎤 Final transcript:", finalTranscript);
            // Update last speech time when we get final results
            lastSpeechTimeRef.current = Date.now();
            // Reset silence timeout since we detected speech
            resetSilenceTimeout();
          }

          // Update last speech time for interim results too (user is still speaking)
          if (interimTranscript) {
            console.log("🎤 Interim transcript:", interimTranscript);
            lastSpeechTimeRef.current = Date.now();
            // Reset silence timeout since we detected speech
            resetSilenceTimeout();
          }
        };

        // Handle errors
        recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
          // Suppress "aborted" error - it's expected when we stop recognition
          if (event.error === "aborted") {
            // Silently handle aborted - it's intentional when stopping
            return;
          }

          // Log all errors with details
          console.log(`⚠️ Speech recognition error: ${event.error}`);

          // Log other errors
          if (event.error === "no-speech") {
            console.log("No speech detected, checking silence timeout...");
            // Don't stop immediately, let silence timeout handle it
          } else if (event.error === "audio-capture") {
            console.error("❌ Audio capture error - no microphone found");
            alert("No microphone found. Please check your microphone.");
            stopListeningAndSend();
          } else if (event.error === "not-allowed") {
            console.error("❌ Microphone access denied");
            alert("Microphone access denied. Please allow microphone access.");
            stopListeningAndSend();
          } else if (event.error === "network") {
            console.error("❌ Network error in speech recognition");
            // Try to restart if still listening
            if (isListening) {
              setTimeout(() => {
                if (isListening && recognitionRef.current === recognition) {
                  try {
                    console.log(
                      "🔄 Attempting to restart after network error..."
                    );
                    recognition.start();
                  } catch (error) {
                    console.error(
                      "Failed to restart after network error:",
                      error
                    );
                    stopListeningAndSend();
                  }
                }
              }, 500);
            }
          } else {
            // For other errors, log with details
            console.warn(
              `⚠️ Speech recognition error (non-critical): ${event.error}`,
              event
            );
          }
        };

        // Track when recognition started to prevent immediate restarts
        const recognitionStartTime = Date.now();
        const MIN_RECOGNITION_DURATION = 500; // Minimum 500ms before allowing restart

        // Handle when recognition ends
        recognition.onend = () => {
          const duration = Date.now() - recognitionStartTime;
          console.log(`🎤 Speech recognition ended (duration: ${duration}ms)`);

          // If recognition ended very quickly (< 500ms), it might be an error
          // Don't restart immediately in this case
          if (duration < MIN_RECOGNITION_DURATION) {
            console.warn(
              "⚠️ Recognition ended too quickly, might be an error. Not restarting."
            );
            // Check if we're still supposed to be listening
            if (isListening && recognitionRef.current === recognition) {
              // Wait a bit longer before trying to restart
              setTimeout(() => {
                if (isListening && recognitionRef.current === recognition) {
                  console.log(
                    "🔄 Attempting to restart recognition after quick end..."
                  );
                  try {
                    recognition.start();
                  } catch (error) {
                    console.error(
                      "Failed to restart recognition after quick end:",
                      error
                    );
                    stopListeningAndSend();
                  }
                }
              }, 1000); // Wait 1 second before restarting
            }
            return;
          }

          // Only restart if we're still supposed to be listening
          // and the recognition wasn't intentionally stopped
          if (isListening && recognitionRef.current === recognition) {
            console.log("🔄 Recognition ended normally, restarting...");
            // Small delay before restarting to avoid conflicts
            setTimeout(() => {
              if (isListening && recognitionRef.current === recognition) {
                try {
                  recognition.start();
                } catch (error) {
                  console.error("Failed to restart recognition:", error);
                  // If restart fails, stop listening
                  if (
                    error instanceof Error &&
                    error.message.includes("already started")
                  ) {
                    // Recognition might already be running, ignore
                    return;
                  }
                  stopListeningAndSend();
                }
              }
            }, 100);
          } else {
            console.log(
              "✅ Recognition ended and we're no longer listening (expected)"
            );
          }
        };

        // Start recognition
        recognition.start();
        setIsListening(true);
        recognitionResultRef.current = "";
        lastSpeechTimeRef.current = Date.now();
        startSilenceMonitor();

        // Play start sound to indicate listening has started
        playStartSound();

        // Start silence detection
        resetSilenceTimeout();

        console.log(
          "🎤 Started speech recognition (max 35s, auto-stop after 3s silence)"
        );
      } catch (error) {
        console.error("Failed to start speech recognition:", error);
        setIsListening(false);
        alert(
          "Failed to start speech recognition. Please check your microphone permissions."
        );
      }
    }, 100); // Small delay to ensure previous recognition is fully stopped
  }, [isListening, stopListeningAndSend, playStartSound]);

  // Wake word listener - listens for "okay Dhoni" or "ok Disha"
  useEffect(() => {
    const SpeechRecognition =
      (
        window as unknown as {
          SpeechRecognition?: { new (): SpeechRecognition };
        }
      ).SpeechRecognition ||
      (
        window as unknown as {
          webkitSpeechRecognition?: { new (): SpeechRecognition };
        }
      ).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.warn("Speech recognition not available for wake word detection");
      return;
    }

    // Don't start wake word detection if already listening
    if (isListening) {
      return;
    }

    let wakeWordRecognition: SpeechRecognition | null = null;

    const startWakeWordDetection = () => {
      try {
        wakeWordRecognition = new SpeechRecognition();
        wakeWordRecognitionRef.current = wakeWordRecognition;

        // Configure for wake word detection
        wakeWordRecognition.continuous = true;
        wakeWordRecognition.interimResults = true;
        wakeWordRecognition.lang = "en-US";

        // Define wake words based on coach gender
        const wakeWords = isMale
          ? ["okay Dhoni", "ok Dhoni", "hey Dhoni", "Dhoni"]
          : ["okay Disha", "ok Disha", "hey Disha", "Disha"];

        wakeWordRecognition.onresult = (event: SpeechRecognitionEvent) => {
          // Don't process if already listening
          if (isListening) {
            return;
          }

          let transcript = "";
          for (let i = event.resultIndex; i < event.results.length; i++) {
            transcript += event.results[i][0].transcript.toLowerCase() + " ";
          }

          // Check if any wake word is detected
          const detected = wakeWords.some((wakeWord) =>
            transcript.includes(wakeWord.toLowerCase())
          );

          if (detected && !isListening) {
            console.log("🔔 Wake word detected:", transcript.trim());
            // Stop wake word detection gracefully
            if (wakeWordRecognition) {
              // Clear ref first to prevent error handler from logging
              wakeWordRecognitionRef.current = null;
              try {
                // Use stop() for graceful stop (abort() triggers error events)
                wakeWordRecognition.stop();
              } catch {
                // If stop fails, try abort
                try {
                  wakeWordRecognition.abort();
                } catch {
                  // Ignore errors when stopping
                }
              }
            }
            // Small delay before starting main recognition to ensure cleanup
            setTimeout(() => {
              if (!isListening) {
                handleVoiceInput();
              }
            }, 50);
          }
        };

        wakeWordRecognition.onerror = (event: SpeechRecognitionErrorEvent) => {
          // Suppress "aborted" error - it's expected when we stop wake word detection
          if (event.error === "aborted") {
            // Silently handle aborted - it's intentional when stopping
            return;
          }
          // Ignore "no-speech" errors for wake word detection
          if (event.error === "no-speech") {
            return;
          }
          // Log other errors
          console.error("Wake word recognition error:", event.error);
        };

        wakeWordRecognition.onend = () => {
          // Only restart if:
          // 1. We're not currently listening (main recognition not active)
          // 2. The ref is null (meaning it was intentionally stopped, not just ended)
          if (!isListening && wakeWordRecognitionRef.current === null) {
            // Add a delay to avoid rapid restart loops
            setTimeout(() => {
              // Double-check state before restarting
              if (!isListening && wakeWordRecognitionRef.current === null) {
                startWakeWordDetection();
              }
            }, 200);
          }
        };

        wakeWordRecognition.start();
        console.log(
          `👂 Wake word detection started. Listening for: ${wakeWords.join(
            ", "
          )}`
        );
      } catch (error) {
        console.error("Failed to start wake word detection:", error);
      }
    };

    // Start wake word detection
    startWakeWordDetection();

    return () => {
      if (wakeWordRecognition) {
        // Clear ref first to prevent error handler from logging
        wakeWordRecognitionRef.current = null;
        try {
          wakeWordRecognition.stop();
        } catch {
          try {
            wakeWordRecognition.abort();
          } catch {
            // Ignore errors during cleanup
          }
        }
      }
    };
  }, [isListening, isMale, handleVoiceInput]);

  // Helper: Chat Response Logic (Mock Narrative AI)
  const messageListRef = useRef<HTMLDivElement | null>(null);

  const sendHabitAssistMessage = useCallback(
    async (message: string, userIdOverride?: string) => {
      const userId = userIdOverride || HARD_CODED_USER_ID;
      try {
<<<<<<< HEAD
        const params = new URLSearchParams();
        params.append("userId", userId);
        params.append("message", message);
=======
        const body = new URLSearchParams();
        body.append("userId", userId);
        body.append("message", message);
>>>>>>> e856267c23d34eb97c2699201996a70cdecb81bd
        const response = await fetch("/api/habits/ai-assist", {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
<<<<<<< HEAD
          body: params.toString(),
=======
          body,
>>>>>>> e856267c23d34eb97c2699201996a70cdecb81bd
        });

        if (!response.ok) {
          console.error("Habit assist API error", response.status);
          return "";
        }
        const data = await response.json();
        return data?.reply ?? "";
      } catch (error) {
        console.error("Habit assist request failed", error);
        return "";
      }
    },
    [profile, routeFormData]
  );

  const initialAssistSentRef = useRef(false);
  useEffect(() => {
    if (activeTab !== "Chat") return;
    if (initialAssistSentRef.current) return;
    const userId = profile.mobile?.trim();
    if (!userId) return;
    initialAssistSentRef.current = true;
    setHabitApiLoading(true);
    sendHabitAssistMessage("", userId)
      .then((reply) => {
        if (!reply) return;
        const coachMsg: Message = {
          id: (Date.now() + 3).toString(),
          sender: "coach",
          text: reply,
        };
        setMessages((prev) => [...prev, coachMsg]);
        speakText(reply);
      })
      .finally(() => setHabitApiLoading(false));
  }, [activeTab, profile.mobile, sendHabitAssistMessage, speakText]);

  const handleSendMessage = (textOverride?: string) => {
    const textToSend = textOverride || inputValue;
    if (!textToSend.trim()) return;

    // User message
    const userMsg: Message = {
      id: Date.now().toString(),
      sender: "user",
      text: textToSend,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInputValue("");
    setHabitApiLoading(true);
    const userId = profile.mobile || HARD_CODED_USER_ID;
    sendHabitAssistMessage(textToSend, userId)
      .then((reply) => {
        if (reply) {
        const coachMsg: Message = {
            id: (Date.now() + 2).toString(),
          sender: "coach",
            text: reply,
        };
        setMessages((prev) => [...prev, coachMsg]);
          speakText(reply);
        }
        // Refresh goal section after chat message
        setGoalRefreshTrigger((prev) => prev + 1);
      })
      .finally(() => setHabitApiLoading(false));
  };

  // Handle text input toggle
  const handleTextInputToggle = () => {
    setShowTextInput(!showTextInput);
    if (!showTextInput) {
      // Focus the input after a small delay to ensure it's rendered
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  };

  useEffect(() => {
    if (messageListRef.current) {
      messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
    }
  }, [messages, isHabitApiLoading]);

  return (
    <div className="h-screen bg-white font-sans flex flex-col overflow-hidden">
      {/* --- Top HUD (Head-Up Display) --- */}
      <header className="bg-white border-b border-gray-100 p-4 flex-shrink-0 z-50">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div
            className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => navigate("/profile")}
          >
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold bg-emerald-600">
              {level}
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">{name}</p>

              <div className="w-32 h-1.5 bg-gray-200 rounded-full mt-1">
                <div
                  className="h-full rounded-full bg-gray-300"
                  style={{ width: `${(xp / levelingXp) * 100}%` }}
                />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-11 h-11 bg-white rounded-full shadow-lg flex items-center justify-center overflow-hidden border border-emerald-200">
              <img
                src={ackoLogo}
                alt="ACKO logo"
                className="w-9 h-9 object-contain"
              />
            </div>
          </div>
        </div>
      </header>

      {/* --- Main Content Area --- */}
      <main className="flex-1 relative overflow-hidden flex flex-col min-h-0">
        {/* Dynamic Background */}
        <div className="absolute inset-0 pointer-events-none z-0">
          <div className="absolute top-0 left-0 right-0 h-[40%] bg-gradient-to-b from-emerald-50/30 to-transparent" />
        </div>

        {/* Avatar Section - Fixed Height */}
        <div className="home-avatar-banner flex-shrink-0 relative z-10">
          <AvatarScene
            textToSpeak={latestCoachText}
            voiceType={gender as VoiceType}
            isFullScreen={false}
          />
              </div>

        {/* 2. Interface Tabs (Chat / Explore / Chat) - Fills remaining space and scrolls */}
        <div className="flex-1 bg-white rounded-t-[2rem] relative z-20 flex flex-col min-h-0 overflow-hidden">
          {/* Tab Navigation */}
          <div className="flex border-b border-gray-100 bg-white">
            <button
              onClick={() => setActiveTab("goals")}
              className={`flex-1 py-4 text-sm font-medium flex items-center justify-center gap-2 transition-colors relative ${
                activeTab === "goals" ? "text-emerald-600" : "text-gray-400"
              }`}
            >
              <Zap className="w-4 h-4" /> Goals
              {activeTab === "goals" && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-600" />
              )}
            </button>
            <button
              onClick={() => setActiveTab("Your Plans")}
              className={`flex-1 py-4 text-sm font-medium flex items-center justify-center gap-2 transition-colors relative ${
                activeTab === "Your Plans" ? "text-emerald-600" : "text-gray-400"
              }`}
            >
              <Compass className="w-4 h-4" /> Your Plans
              {activeTab === "Your Plans" && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-600" />
              )}
            </button>
            <button
              onClick={() => setActiveTab("Chat")}
              className={`flex-1 py-4 text-sm font-medium flex items-center justify-center gap-2 transition-colors relative ${
                activeTab === "Chat" ? "text-emerald-600" : "text-gray-400"
              }`}
            >
              <MessageSquare className="w-4 h-4" /> Chat
              {activeTab === "Chat" && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-600" />
              )}
            </button>
          </div>

          {/* Tab Content */}
          <div className="flex-1 flex flex-col overflow-y-auto bg-white px-4 md:px-6 pt-4 pb-0 min-h-0">
            {activeTab === "goals" && (
              <div className="h-full space-y-6 max-w-2xl mx-auto px-4 pb-6">
                {/* Progress Stats */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-3xl p-5 border border-emerald-200 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                      <p className="text-xs text-emerald-700 font-semibold uppercase tracking-wide">
                        Current Progress
                      </p>
                    </div>
                    <p className="text-3xl font-bold text-emerald-600">
                      {goalChartData.currentProgress.toFixed(1)}%
                    </p>
                    <div className="mt-3 w-full h-2 bg-emerald-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min(
                            100,
                            goalChartData.currentProgress
                          )}%`,
                        }}
                      ></div>
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-3xl p-5 border border-purple-200 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                      <p className="text-xs text-purple-700 font-semibold uppercase tracking-wide">
                        Weeks Remaining
                      </p>
                    </div>
                    <p className="text-3xl font-bold text-purple-600">
                      {goalChartData.daysRemaining > 0
                        ? Math.ceil(goalChartData.daysRemaining / 7)
                        : "—"}
                    </p>
                    {goalChartData.daysRemaining > 0 && (
                      <p className="text-xs text-purple-600 mt-2">
                        Until goal reached
                      </p>
                    )}
                  </div>
                </div>

                {/* Section 1: Today's Intake */}
                <div className="bg-white rounded-3xl p-6 border border-gray-200 shadow-sm">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-md">
                      <Utensils className="w-5 h-5 text-white" />
                      </div>
                    <div>
                      <h2 className="text-lg font-bold text-gray-900">
                        Today's Intake
                      </h2>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Daily target progress
                      </p>
                    </div>
                  </div>
                  {todayIntakeLoading ? (
                    <div className="h-32 flex items-center justify-center">
                      <div className="w-8 h-8 border-4 border-orange-200 border-t-orange-600 rounded-full animate-spin"></div>
                    </div>
                  ) : (
                    <div className="space-y-5">
                      {/* Calories */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Utensils className="w-4 h-4 text-orange-600" />
                            <span className="text-sm font-medium text-gray-700">
                              Calories
                            </span>
                          </div>
                          <span className="text-sm font-bold text-gray-900">
                            {todayIntake.calories.achieved} /{" "}
                            {todayIntake.calories.target} kcal
                          </span>
                        </div>
                        <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-orange-500 to-orange-600 rounded-full transition-all duration-500"
                            style={{
                              width: `${Math.min(
                                100,
                                (todayIntake.calories.achieved /
                                  todayIntake.calories.target) *
                                  100
                              )}%`,
                            }}
                          ></div>
                        </div>
                        <p className="text-xs text-gray-500 text-right">
                          {(
                            (todayIntake.calories.achieved /
                              todayIntake.calories.target) *
                            100
                          ).toFixed(1)}
                          % of daily target
                        </p>
                </div>

                      {/* Water */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Droplet className="w-4 h-4 text-blue-600" />
                            <span className="text-sm font-medium text-gray-700">
                              Water
                            </span>
                          </div>
                          <span className="text-sm font-bold text-gray-900">
                            {todayIntake.water.achieved} /{" "}
                            {todayIntake.water.target} ml
                          </span>
                        </div>
                        <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-500"
                            style={{
                              width: `${Math.min(
                                100,
                                (todayIntake.water.achieved /
                                  todayIntake.water.target) *
                                  100
                              )}%`,
                            }}
                          ></div>
                        </div>
                        <p className="text-xs text-gray-500 text-right">
                          {(
                            (todayIntake.water.achieved /
                              todayIntake.water.target) *
                            100
                          ).toFixed(1)}
                          % of daily target
                        </p>
                      </div>

                      {/* Steps */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Footprints className="w-4 h-4 text-emerald-600" />
                            <span className="text-sm font-medium text-gray-700">
                              Steps
                            </span>
                          </div>
                          <span className="text-sm font-bold text-gray-900">
                            {todayIntake.steps.achieved.toLocaleString()} /{" "}
                            {todayIntake.steps.target.toLocaleString()}
                          </span>
                        </div>
                        <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-full transition-all duration-500"
                            style={{
                              width: `${Math.min(
                                100,
                                (todayIntake.steps.achieved /
                                  todayIntake.steps.target) *
                                  100
                              )}%`,
                            }}
                          ></div>
                        </div>
                        <p className="text-xs text-gray-500 text-right">
                          {(
                            (todayIntake.steps.achieved /
                              todayIntake.steps.target) *
                            100
                          ).toFixed(1)}
                          % of daily target
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Section 2: Cheat Meals / Missed Meals */}
                <div className="bg-white rounded-3xl p-6 border border-gray-200 shadow-sm">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center shadow-md">
                      <Utensils className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-gray-900">
                        Cheat Meals you took
                      </h2>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Impact on your goal timeline
                      </p>
                    </div>
                  </div>
                  {cheatMealsLoading ? (
                    <div className="h-48 flex items-center justify-center">
                      <div className="w-8 h-8 border-4 border-red-200 border-t-red-600 rounded-full animate-spin"></div>
                    </div>
                  ) : cheatMeals.length === 0 ? (
                    <div className="h-48 flex flex-col items-center justify-center text-center px-4">
                      <Utensils className="w-12 h-12 text-gray-300 mb-3" />
                      <p className="text-sm text-gray-500 font-medium">
                        No cheat meals or missed meals recorded
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        Keep up the great work!
                      </p>
                    </div>
                  ) : (
                    <div className="max-h-64 overflow-y-auto space-y-4 pr-2">
                      {cheatMeals.map((entry, idx) => {
                        const date = new Date(entry.date);
                        const formattedDate = date.toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        });
                        return (
                          <div
                            key={idx}
                            className="bg-gradient-to-br from-red-50 to-orange-50 rounded-2xl p-4 border border-red-200"
                          >
                            <div className="flex items-center justify-between mb-3">
                              <p className="text-sm font-bold text-red-700">
                                {formattedDate}
                              </p>
                              <span className="text-xs text-red-600 bg-red-100 px-2 py-1 rounded-full">
                                {entry.meals.length} meal
                                {entry.meals.length !== 1 ? "s" : ""}
                              </span>
                            </div>
                            <div className="space-y-2">
                              {entry.meals.map((meal, mealIdx) => (
                                <div
                                  key={mealIdx}
                                  className="bg-white/60 rounded-xl p-3 border border-red-200/50"
                                >
                                  <div className="flex items-start justify-between mb-1">
                                    <p className="text-sm font-semibold text-gray-800">
                                      {meal.foodName ||
                                        meal.mealName ||
                                        "cheat meal"}
                                    </p>
                                    {meal.calories && (
                                      <span className="text-xs font-medium text-red-600">
                                        {meal.calories} kcal
                                      </span>
                          )}
                        </div>
                                  {meal.healthNote && (
                                    <p className="text-xs text-gray-600 mt-1">
                                      {meal.healthNote}
                                    </p>
                                  )}
                                  {/* Display food items from metadata */}
                                  {meal.food && Array.isArray(meal.food) && meal.food.length > 0 && (
                                    <div className="mt-2 pt-2 border-t border-red-200/50">
                                      <p className="text-xs font-medium text-gray-700 mb-1">
                                        Food Items:
                                      </p>
                                      <div className="flex flex-wrap gap-1">
                                        {meal.food.map((foodItem, foodIdx) => (
                                          <span
                                            key={foodIdx}
                                            className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full"
                                          >
                                            {foodItem}
                            </span>
                                        ))}
                        </div>
                      </div>
                                  )}
                                  {/* Fallback to items array if food is not available */}
                                  {(!meal.food || (Array.isArray(meal.food) && meal.food.length === 0)) && meal.items && meal.items.length > 0 && (
                                    <div className="mt-2 pt-2 border-t border-red-200/50">
                                      <p className="text-xs font-medium text-gray-700 mb-1">
                                        Items:
                                      </p>
                                      <div className="flex flex-wrap gap-1">
                                        {meal.items.map((item, itemIdx) => (
                        <span
                                            key={itemIdx}
                                            className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full"
                        >
                                            {item.name}
                        </span>
                                        ))}
                                      </div>
                                    </div>
                      )}
                    </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Explore Tab replaced Map Tab */}
            {activeTab === "Your Plans" && (
              <div className="flex-1 max-w-2xl mx-auto space-y-6 overflow-y-auto px-4 py-5">
                <div className="grid grid-cols-2 gap-4 justify-center">
                  <div className="relative">
                    {profile.mealPlanUpdated && (
                      <span className="absolute top-2 right-2 text-[10px] font-semibold uppercase tracking-[0.3em] px-2 py-1 rounded-full bg-emerald-600 text-white shadow">
                        Plan updated
                      </span>
                    )}
                    <div
                      className="w-full max-w-[150px] p-5 flex flex-col items-center justify-center gap-3 text-center cursor-pointer hover:shadow-md transition-shadow bg-white rounded-2xl border border-gray-200 shadow-sm"
                      onClick={() => navigate("/recipes")}
                    >
                    <div className="w-14 h-14 bg-orange-100 rounded-full flex items-center justify-center text-orange-600">
                      <Utensils className="w-7 h-7" />
                    </div>
                    <span className="font-semibold text-gray-700 text-sm">
                      Curated Recipes
                    </span>
                  </div>
                  </div>

                  <div className="relative">
                    {profile.workoutPlanUpdated && (
                      <span className="absolute top-2 right-2 text-[10px] font-semibold uppercase tracking-[0.3em] px-2 py-1 rounded-full bg-emerald-600 text-white shadow">
                        Plan updated
                      </span>
                    )}
                    <div
                      className="w-full max-w-[150px] p-5 flex flex-col items-center justify-center gap-3 text-center cursor-pointer hover:shadow-md transition-shadow bg-white rounded-2xl border border-gray-200 shadow-sm"
                      onClick={() => navigate("/workouts")}
                    >
                    <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                      <Dumbbell className="w-7 h-7" />
                    </div>
                    <span className="font-semibold text-gray-700 text-sm">
                      Personalized Workout Plans
                    </span>
                  </div>
                  </div>

                  <div
                    className="w-full max-w-[150px] p-5 flex flex-col items-center justify-center gap-3 text-center cursor-pointer hover:shadow-md transition-shadow bg-white rounded-2xl border border-gray-200 shadow-sm"
                    onClick={() => navigate("/tracker")}
                  >
                    <div className="w-14 h-14 bg-purple-100 rounded-full flex items-center justify-center text-purple-600">
                      <Camera className="w-7 h-7" />
                    </div>
                    <span className="font-semibold text-gray-700 text-sm">
                      Snap Your Meal
                    </span>
                  </div>

                  <div
                    className="w-full max-w-[150px] p-5 flex flex-col items-center justify-center gap-3 text-center cursor-pointer hover:shadow-md transition-shadow bg-white rounded-2xl border border-gray-200 shadow-sm"
                    onClick={() => navigate("/habits")}
                  >
                    <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600">
                      <CheckCircle2 className="w-7 h-7" />
                    </div>
                    <span className="font-semibold text-gray-700 text-sm">
                      Habits
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Chat Tab */}
            {activeTab === "Chat" && (
              <div className="flex-1 flex flex-col max-w-2xl mx-auto min-h-0 w-full">
                <div
                  ref={messageListRef}
                  className="flex-1 min-h-0 space-y-4 overflow-y-auto pb-20"
                >
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${
                        msg.sender === "user" ? "justify-end" : "justify-start"
                      }`}
                    >
                      <div
                        className={`max-w-[80%] rounded-2xl p-4 text-sm ${
                          msg.sender === "user"
                            ? "bg-gray-900 text-white rounded-br-none"
                            : "bg-white border border-gray-200 shadow-sm text-gray-800 rounded-bl-none"
                        }`}
                      >
                        {msg.text}
                </div>
                    </div>
                  ))}
                  {isHabitApiLoading && (
                    <div className="flex justify-start">
                      <div className="flex items-center gap-2 px-3 py-2 text-xs text-gray-500">
                        <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                        thinking...
                  </div>
                    </div>
                  )}
                  </div>

                {/* Input Area - Fixed at bottom */}
                <div className="sticky bottom-0 bg-white border-t border-gray-100 pt-4 pb-4 -mx-4 md:-mx-6 px-4 md:px-6 z-10">
                  {/* Text Input (shown when user clicks keyboard icon) */}
                  {showTextInput && (
                    <div className="mb-3 animate-in slide-in-from-bottom-2">
                      <div className="relative flex items-center gap-2">
                        <Input
                          ref={inputRef}
                          value={inputValue}
                          onChange={(e) => setInputValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              handleSendMessage();
                            } else if (e.key === "Escape") {
                              setShowTextInput(false);
                              setInputValue("");
                            }
                          }}
                          placeholder={`Message ${coachName}...`}
                          className="flex-1 py-4 rounded-full border-2 border-gray-300 shadow-sm focus-visible:ring-offset-0 focus-visible:ring-2 focus-visible:border-transparent pr-12"
                          autoFocus
                        />
                        {inputValue && (
                          <Button
                            size="icon"
                            onClick={() => handleSendMessage()}
                            className={`absolute right-2 rounded-full w-9 h-9 bg-emerald-600 hover:bg-emerald-700`}
                          >
                            <Send className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 mt-1 ml-2">
                        Press Enter to send, Esc to cancel
                      </p>
                    </div>
                  )}

                  {/* Primary Input Controls */}
                  <div className="flex items-center justify-center gap-3">
                    {/* Voice Input Button (Primary) */}
                    <Button
                      size="lg"
                      onClick={handleVoiceInput}
                      className={`w-16 h-16 rounded-full shadow-lg transition-all ${
                        isListening
                          ? "bg-red-500 hover:bg-red-600 animate-pulse scale-110"
                          : "bg-emerald-600 hover:bg-emerald-700"
                      }`}
                    >
                      {isListening ? (
                        <Mic className="w-6 h-6 fill-white text-white" />
                      ) : (
                        <Mic className="w-6 h-6 fill-white text-white" />
                      )}
                    </Button>

                    {/* Text Input Toggle Button (Fallback) */}
                    <Button
                      size="lg"
                      variant="outline"
                      onClick={handleTextInputToggle}
                      className={`w-16 h-16 rounded-full shadow-md border-2 ${
                        showTextInput
                          ? "border-gray-400 bg-gray-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <Keyboard className="w-6 h-6 text-gray-600" />
                    </Button>
                    </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
