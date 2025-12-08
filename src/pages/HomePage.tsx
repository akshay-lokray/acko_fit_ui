
import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  MessageSquare,
  Zap,
  Shield,
  Send,
  CheckCircle2,
  Compass,
  Utensils,
  Dumbbell,
  Camera,
  MapPin,
  Trophy,
} from "lucide-react";
import AvatarScene from "@/components/AvatarScene";
import type { VoiceType } from "@/types/voice";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useUserProfileStore } from "@/store/userProfileStore";

// --- Types ---
interface Message {
  id: string;
  sender: "user" | "coach";
  text: string;
}

interface Quest {
  id: string;
  title: string;
  xp: number;
  completed: boolean;
  type: "daily" | "weekly";
}

interface LeaderboardUser {
  userId: string;
  rank: number;
  name: string;
  xp: number;
}

type LeaderboardApiResponse = {
  topUsers: Array<{ userId: string; name: string | null; xp: number; rank: number }>;
  currentUser: { userId: string; name: string | null; xp: number; rank: number; percentile?: number };
};

// --- Mock Data ---
const DAILY_QUESTS: Quest[] = [
  { id: "1", title: "Track Your Meal", xp: 50, completed: false, type: "daily" },
  { id: "2", title: "Crush 5k Steps", xp: 100, completed: false, type: "daily" },
  { id: "3", title: "Hydrate Now · Goal 3000 ml", xp: 50, completed: false, type: "daily" },
];

const FALLBACK_LEADERBOARD: LeaderboardUser[] = [
  { userId: "1", rank: 1, name: "Aarav P.", xp: 15400 },
  { userId: "2", rank: 2, name: "Sneha K.", xp: 14200 },
  { userId: "3", rank: 3, name: "Rohan M.", xp: 13850 },
  { userId: "you", rank: 144, name: "You", xp: 350 },
];

export function HomePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { formData: profile, updateFormData } = useUserProfileStore();
  const fetchedUserRef = useRef<string | null>(null);
  const goalStateRef = useRef<{ userId: string | null; hits: Set<string> }>({ userId: null, hits: new Set() });
  const routeFormData = location.state?.formData || {};
  // Safe access to formData with defaults
  const gender = profile.gender || routeFormData.gender || "female";
  const name = profile.name || routeFormData.name || "Traveller";
  const coachName = gender === "male" ? "Atlas" : "Aria";

  // State
  // Changed "community" to "leaderboard"
  const [activeTab, setActiveTab] = useState<"chat" | "explore" | "leaderboard">("chat");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      sender: "coach",
      text: `Welcome back, ${name}. Ready to conquer today's mission?`,
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const xp = profile.xp ?? routeFormData.xp ?? 350;
  const userLocation = "India"; // Default location (show actual percentile from API)
  const [habitStats, setHabitStats] = useState<{ calorie?: number; water?: number; steps?: number }>({});
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardApiResponse | null>(null);
  const currentPercentile = Math.round(leaderboardData?.currentUser?.percentile ?? 15);

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

  const awardXp = async (userId: string, delta: number) => {
    try {
      const res = await fetch(`/api/users/${encodeURIComponent(userId)}/xp?delta=${delta}`, {
        method: "POST",
      });
      if (!res.ok) return;
      await fetchUserProfile(userId); // refresh xp
    } catch (e) {
      console.error("Failed to award XP", e);
    }
  };

  // Fetch user profile on mount
  useEffect(() => {
    const userId = profile.mobile || routeFormData.mobile || "";
    if (!userId) return;
    if (fetchedUserRef.current === userId) return;
    fetchedUserRef.current = userId;

    fetchUserProfile(userId);
  }, [profile.mobile, routeFormData.mobile]);

  // Fetch daily habit stats on mount
  useEffect(() => {
    const userId = profile.mobile || routeFormData.mobile || "";
    if (!userId) return;

    const fetchHabits = async () => {
      try {
        const res = await fetch(
          `/api/habits/daily/batch?userId=${encodeURIComponent(userId)}&habits=water,calorie,steps`
        );
        if (!res.ok) return;
        const data = await res.json();
        const calorie = data?.calorie ?? {};
        const water = data?.water ?? {};
        const steps = data?.steps ?? {};

        const parseTotals = (totals: any) => {
          if (!totals || typeof totals !== "object") return undefined;
          const firstKey = Object.keys(totals)[0];
          const val = totals[firstKey];
          return Number(val ?? 0) || 0;
        };

        setHabitStats({
          calorie: parseTotals(calorie.totals),
          water: parseTotals(water.totals),
          steps: parseTotals(steps.totals),
        });
      } catch (e) {
        console.error("Failed to fetch habit stats", e);
      }
    };

    fetchHabits();
  }, [profile.mobile, routeFormData.mobile]);

  useEffect(() => {
    const userId = profile.mobile || routeFormData.mobile || "";
    if (!userId) return;

    const loadLeaderboard = async () => {
      try {
        const res = await fetch(`/api/users/leaderboard?userId=${encodeURIComponent(userId)}`);
        if (!res.ok) return;
        const data: LeaderboardApiResponse = await res.json();
        setLeaderboardData(data);
      } catch (e) {
        console.error("Failed to load leaderboard", e);
      }
    };

    loadLeaderboard();
  }, [profile.mobile, routeFormData.mobile]);

  // Award XP when goals are reached (once per goal per user)
  useEffect(() => {
    const userId = profile.mobile || routeFormData.mobile || "";
    if (!userId) return;

    // Reset goal state when user changes
    if (goalStateRef.current.userId !== userId) {
      goalStateRef.current = { userId, hits: new Set() };
    }

    const goals = [
      { key: "steps", hit: habitStats.steps != null && habitStats.steps >= 5000, xp: 100 },
      { key: "water", hit: habitStats.water != null && habitStats.water >= 3000, xp: 50 },
    ];

    let delta = 0;
    goals.forEach(({ key, hit, xp }) => {
      const marker = `${userId}:${key}`;
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
      awardXp(userId, delta);
    }
  }, [habitStats, profile.mobile, routeFormData.mobile]);

  // Determining "Persona" styles
  const isMale = gender === "male";
  const themeColor = isMale ? "text-emerald-600" : "text-purple-700";
  const buttonBg = isMale ? "bg-emerald-600 hover:bg-emerald-700" : "bg-purple-700 hover:bg-purple-800";

  const [isListening, setIsListening] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const WS_URL = import.meta.env.VITE_WS_URL ?? "ws://localhost:5000/ws";

  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectTimer: number | null = null;

    const connect = () => {
      ws = new WebSocket(WS_URL);
      
      wsRef.current = ws;
      ws.onopen = () => {
        console.log("WebSocket connected:", WS_URL);
        try {
          ws?.send(JSON.stringify({ type: "connect" }));
        } catch (e) {
          console.warn("WebSocket connect event send failed", e);
        }
      };
      ws.onerror = (e) => {
        console.error("WebSocket error", { event: e, url: WS_URL, readyState: ws?.readyState });
      };
      ws.onmessage = (event) => {
        const raw = event.data;
        let text = "";
        try {
          const parsed = JSON.parse(raw);
          text = parsed.text ?? String(raw);
        } catch {
          text = String(raw);
        }
        const coachMsg: Message = {
          id: Date.now().toString(),
          sender: "coach",
          text,
        };
        setMessages((prev) => [...prev, coachMsg]);
        setIsListening(false);
      };
      ws.onclose = (evt) => {
        console.log("WebSocket closed", {
          code: evt.code,
          reason: evt.reason,
          wasClean: evt.wasClean,
          readyState: ws?.readyState,
        });
        wsRef.current = null;
        if (!reconnectTimer) reconnectTimer = window.setTimeout(connect, 2000);
      };
    };

    connect();

    return () => {
      if (reconnectTimer) window.clearTimeout(reconnectTimer);
      if (ws) {
        ws.onclose = null;
        if (ws.readyState === WebSocket.OPEN) {
          try {
            ws.send(JSON.stringify({ type: "disconnect" }));
          } catch (e) {
            console.warn("WebSocket disconnect event send failed", e);
          }
        }
        ws.close();
      }
      wsRef.current = null;
    };
  }, [WS_URL]);

  // Helper: Chat Response Logic (Mock Narrative AI)
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
    const sendFallbackCoachResponse = () => {
      let responseText = "";
      if (isMale) {
        responseText = "Copy that. Stay focused on the objective. We don't stop when we're tired, we stop when we're done.";
      } else {
        responseText = "Interesting data point. My analysis suggests keeping your hydration up will optimize your recovery today.";
      }
      const coachMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: "coach",
        text: responseText,
      };
      setMessages((prev) => [...prev, coachMsg]);
    };

    const socket = wsRef.current;
    if (socket && socket.readyState === WebSocket.OPEN) {
      const payload = { type: "chat", text: textToSend, user_id: "user" };
      try {
        socket.send(JSON.stringify(payload));
      } catch {
        sendFallbackCoachResponse();
      }
    } else {
      sendFallbackCoachResponse();
    }
  };

  const handleVoiceInput = () => {
    if (isListening) return;
    setIsListening(true);
    const socket = wsRef.current;
    const payload = { type: "voice_start" };
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(payload));
    } else {
      setTimeout(() => {
        setIsListening(false);
        const spokenText = "Hey Coach, can you help me with a diet plan for today?";
        const coachMsg: Message = {
          id: (Date.now() + 1).toString(),
          sender: "coach",
          text: spokenText,
        };
        setMessages((prev) => [...prev, coachMsg]);
      }, 3000);
    }
  };

  return (
    <div className="min-h-screen bg-white font-sans flex flex-col">
      {/* --- Top HUD (Head-Up Display) --- */}
      <header className="bg-white border-b border-gray-100 p-4 sticky top-0 z-50 shadow-sm">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div
            className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => navigate("/profile")}
          >
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${isMale ? 'bg-emerald-600' : 'bg-purple-600'}`}>
              {level}
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Level {level} Novice</p>
              <div className="w-32 h-2 bg-gray-100 rounded-full mt-1">
                <div
                  className={`h-full rounded-full ${isMale ? 'bg-emerald-500' : 'bg-purple-500'}`}
                  style={{ width: `${(xp / levelingXp) * 100}%` }}
                />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm font-medium text-gray-600">
            <div
              className="flex items-center gap-1 cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => navigate("/rewards")}
            >
              <Zap className="w-4 h-4 text-yellow-500 fill-yellow-500" />
              <span>{xp} XP</span>
            </div>
            <div
              className="flex items-center gap-1 cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => navigate("/rankings")}
            >
              <Shield className="w-4 h-4 text-blue-500" />
              <span>Warrior</span>
            </div>
          </div>
        </div>
      </header>

      {/* --- Main Content Area --- */}
      <main className="flex-1 relative overflow-hidden flex flex-col">

        {/* Dynamic Background */}
        <div className="absolute inset-0 pointer-events-none z-0 opacity-30">
          <div className={`absolute top-[-20%] left-[-20%] w-[80%] h-[80%] ${isMale ? 'bg-emerald-100' : 'bg-purple-100'} rounded-full blur-[120px]`} />
        </div>

        {/* 1. The Coach View (Bigger Height) */}
        {/* Increased height from h-[40vh] to h-[55vh] */}
        <div className="relative z-10 h-[55vh] md:h-[60vh] flex-shrink-0">
          <AvatarScene
            textToSpeak={messages[messages.length - 1].sender === 'coach' ? messages[messages.length - 1].text : ""}
            voiceType={gender as VoiceType}
          />

          {/* Contextual Nudge Bubble (Hidden if listening to avoid clutter) */}
          {!isListening && (
            <div className="absolute bottom-4 left-4 right-4 md:left-auto md:right-8 md:w-80">
              <div className="bg-white/90 backdrop-blur-md p-4 rounded-2xl border border-gray-100 shadow-lg animate-fade-in-up">
                <p className={`text-xs font-bold uppercase mb-1 ${themeColor}`}>Current Mission</p>
                <p className="text-sm text-gray-800 font-medium">
                  Log your meal to keep your progress rolling!
                </p>
              </div>
            </div>
          )}

          {/* Listening Overlay */}
          {isListening && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/20 backdrop-blur-sm animate-in fade-in">
              <div className={`w-24 h-24 rounded-full flex items-center justify-center ${isMale ? 'bg-emerald-500' : 'bg-purple-500'} animate-pulse shadow-[0_0_40px_rgba(0,0,0,0.2)]`}>
                <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center">
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center animate-ping ${isMale ? 'bg-emerald-100' : 'bg-purple-100'}`}>
                    <Zap className={`w-8 h-8 ${themeColor}`} />
                  </div>
                </div>
              </div>
              <p className="mt-6 text-white font-bold text-lg drop-shadow-md">Listening...</p>
            </div>
          )}
        </div>

        {/* 2. Interface Tabs (Chat / Explore / Leaderboard) */}
        <div className="flex-1 bg-white rounded-t-[2rem] shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)] relative z-20 overflow-hidden flex flex-col">

          {/* Tab Navigation */}
          <div className="flex border-b border-gray-100">
            <button
              onClick={() => setActiveTab("chat")}
              className={`flex-1 py-4 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${activeTab === 'chat' ? `${themeColor} border-b-2 ${isMale ? 'border-emerald-500' : 'border-purple-500'}` : 'text-gray-400'}`}
            >
              <MessageSquare className="w-4 h-4" /> Comms
            </button>
            <button
              onClick={() => setActiveTab("explore")}
              className={`flex-1 py-4 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${activeTab === 'explore' ? `${themeColor} border-b-2 ${isMale ? 'border-emerald-500' : 'border-purple-500'}` : 'text-gray-400'}`}
            >
              <Compass className="w-4 h-4" /> Explore
            </button>
            <button
              onClick={() => setActiveTab("leaderboard")}
              className={`flex-1 py-4 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${activeTab === 'leaderboard' ? `${themeColor} border-b-2 ${isMale ? 'border-emerald-500' : 'border-purple-500'}` : 'text-gray-400'}`}
            >
              <Trophy className="w-4 h-4" /> Ranking
            </button>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-gray-50/50">

            {activeTab === "chat" && (
              <div className="h-full flex flex-col max-w-2xl mx-auto">
                <div className="flex-1 space-y-4 mb-4">
                  {messages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] rounded-2xl p-4 text-sm ${msg.sender === 'user' ? 'bg-gray-900 text-white rounded-br-none' : 'bg-white border border-gray-100 shadow-sm text-gray-800 rounded-bl-none'}`}>
                        {msg.text}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Task List (Mini) */}
                <div className="mb-4 space-y-2">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Daily Objectives</p>
                  {DAILY_QUESTS.map(quest => {
                    const goalHit =
                      (quest.title === "Crush 5k Steps" && habitStats.steps != null && habitStats.steps >= 5000) ||
                      (quest.title.startsWith("Hydrate Now") && habitStats.water != null && habitStats.water >= 3000);

                    return (
                    <div
                      key={quest.id}
                      className={`bg-white p-3 rounded-xl border border-gray-100 flex items-center justify-between shadow-sm ${
                        quest.title === "Track Your Meal" || quest.title === "Crush 5k Steps" || quest.title.startsWith("Hydrate Now")
                          ? "cursor-pointer hover:border-emerald-300 hover:shadow-md"
                          : ""
                      } ${
                        goalHit
                          ? "border-emerald-400 bg-emerald-50"
                          : ""
                      }`}
                      onClick={() => {
                        if (quest.title === "Track Your Meal") {
                          navigate("/log-meal", { state: { profile } })
                        }
                        if (quest.title === "Crush 5k Steps") {
                          navigate("/log-steps", { state: { profile } })
                        }
                        if (quest.title.startsWith("Hydrate Now")) {
                          navigate("/log-water", { state: { profile } })
                        }
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            quest.completed || goalHit ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-400'
                          }`}
                        >
                          {quest.completed ? (
                            <CheckCircle2 className="w-5 h-5" />
                          ) : goalHit ? (
                            <div className="w-3 h-3 rounded-full bg-emerald-500" />
                          ) : (
                            <div className="w-3 h-3 rounded-full bg-gray-300" />
                          )}
                        </div>
                        <div className="flex flex-col">
                        <span className={`text-sm font-medium ${quest.completed ? 'text-gray-400 line-through' : 'text-gray-700'}`}>{quest.title}</span>
                          {quest.title === "Track Your Meal" && habitStats.calorie != null && (
                            <span className="text-xs text-emerald-600">{habitStats.calorie} kcal today</span>
                          )}
                          {quest.title === "Crush 5k Steps" && habitStats.steps != null && (
                            <span className="text-xs text-emerald-600">
                              {habitStats.steps} steps today
                              {habitStats.steps >= 5000 ? " · Goal hit!" : ""}
                            </span>
                          )}
                          {quest.title.startsWith("Hydrate Now") && habitStats.water != null && (
                            <span className="text-xs text-emerald-600">
                              {habitStats.water} ml today
                              {habitStats.water >= 3000 ? " · Goal hit!" : ""}
                              {" · Goal: 3000 ml"}
                            </span>
                          )}
                        </div>
                      </div>
                      {quest.title !== "Track Your Meal" && (
                        <span
                          className={`text-xs font-bold px-2 py-1 rounded-md ${
                            goalHit ? "text-emerald-700 bg-emerald-100" : "text-yellow-600 bg-yellow-50"
                          }`}
                        >
                          +{quest.xp} XP
                        </span>
                      )}
                    </div>
                  )})}
                </div>

                {/* Input Area */}
                <div className="relative flex items-center gap-2">
                  <Input
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder={`Message ${coachName}...`}
                    className="flex-1 py-6 rounded-full border-gray-200 shadow-sm focus-visible:ring-offset-0 focus-visible:ring-1 pr-12"
                  />
                  {inputValue ? (
                    <Button
                      size="icon"
                      onClick={() => handleSendMessage()}
                      className={`absolute right-14 top-2 rounded-full w-8 h-8 ${buttonBg}`}
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  ) : null}

                  <Button
                    size="icon"
                    onClick={handleVoiceInput}
                    className={`w-12 h-12 rounded-full shadow-md transition-all ${isListening ? 'bg-red-500 animate-pulse' : buttonBg}`}
                  >
                    <Zap className="w-5 h-5 fill-white text-white" />
                  </Button>
                </div>
              </div>
            )}

            {/* Explore Tab replaced Map Tab */}
            {activeTab === "explore" && (
              <div className="h-full max-w-2xl mx-auto space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <Card
                    className="p-4 flex flex-col items-center justify-center gap-3 cursor-pointer hover:shadow-md transition-shadow bg-white"
                    onClick={() => navigate("/recipes")}
                  >
                    <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center text-orange-600">
                      <Utensils className="w-6 h-6" />
                    </div>
                    <span className="font-semibold text-gray-700">Recipes</span>
                  </Card>

                  <Card
                    className="p-4 flex flex-col items-center justify-center gap-3 cursor-pointer hover:shadow-md transition-shadow bg-white"
                    onClick={() => navigate("/workouts")}
                  >
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                      <Dumbbell className="w-6 h-6" />
                    </div>
                    <span className="font-semibold text-gray-700">Workouts</span>
                  </Card>

                  <Card
                    className="p-4 flex flex-col items-center justify-center gap-3 cursor-pointer hover:shadow-md transition-shadow bg-white"
                    onClick={() => navigate("/tracker")}
                  >
                    <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center text-purple-600">
                      <Camera className="w-6 h-6" />
                    </div>
                    <span className="font-semibold text-gray-700">Photo Track</span>
                  </Card>

                  <Card
                    className="p-4 flex flex-col items-center justify-center gap-3 cursor-pointer hover:shadow-md transition-shadow bg-white"
                    onClick={() => navigate("/habits")}
                  >
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-green-600">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <span className="font-semibold text-gray-700">Habits</span>
                  </Card>

                  <Card
                    className="p-4 flex flex-col items-center justify-center gap-3 cursor-pointer hover:shadow-md transition-shadow bg-white md:col-span-2"
                    onClick={() => navigate("/devices")}
                  >
                    <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600">
                      <Zap className="w-6 h-6" />
                    </div>
                    <span className="font-semibold text-gray-700">Wearable Sync</span>
                  </Card>
                </div>
              </div>
            )}

            {/* Leaderboard Tab (Replaces Squad) */}
            {activeTab === "leaderboard" && (
              <div className="h-full space-y-6 max-w-2xl mx-auto">
                {/* Location Header */}
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Leaderboard</h2>
                    <div className="flex items-center gap-1 text-sm text-gray-500 mt-1">
                      <MapPin className="w-4 h-4 text-emerald-500" />
                      <span>Ranking in <span className="font-bold text-gray-900">{userLocation}</span></span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 items-end pt-4 mb-8">
                  {[0, 1, 2].map((position) => {
                    const topUsers = leaderboardData?.topUsers ?? FALLBACK_LEADERBOARD;
                    const user = topUsers[position] || topUsers[position % topUsers.length];
                    const medal =
                      position === 1 ? "🥈" : position === 0 ? "🥇" : "🥉";
                    const badgeColor =
                      position === 1 ? "bg-gray-200" : position === 0 ? "bg-yellow-100" : "bg-orange-100";
                    const borderColor =
                      position === 1 ? "border-gray-300" : position === 0 ? "border-yellow-400" : "border-orange-300";

                    return (
                      <div key={`podium-${position}`} className="flex flex-col items-center">
                        <div className={`w-14 h-14 rounded-full border-4 flex items-center justify-center mb-2 relative ${badgeColor} ${borderColor}`}>
                          <span className="text-xl">{medal}</span>
                          <div className="absolute -bottom-2 bg-gray-600 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
                            #{user.rank}
                          </div>
                        </div>
                        <p className="font-bold text-xs text-center truncate w-full">{user.name || "Unknown"}</p>
                        <p className="text-[10px] text-gray-400">{user.xp} XP</p>
                      </div>
                    );
                  })}
                </div>

                <Card className="bg-gradient-to-r from-gray-900 to-gray-800 p-4 rounded-xl flex items-center justify-between text-white shadow-lg transform scale-105 border-2 border-emerald-500/50">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center font-bold text-sm border-2 border-white/20">
                      You
                    </div>
                    <div>
                      <p className="font-bold text-sm">Your Rank</p>
                      <p className="text-xs text-gray-400">Top {currentPercentile}% in {userLocation}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-emerald-400">
                      #{leaderboardData?.currentUser?.rank ?? FALLBACK_LEADERBOARD[3].rank}
                    </p>
                    <p className="text-xs text-gray-400">
                      {leaderboardData?.currentUser?.xp ?? FALLBACK_LEADERBOARD[3].xp} XP
                    </p>
                  </div>
                </Card>

                <div className="space-y-4 pt-2">
                  <p className="text-xs font-bold text-gray-400 uppercase">Runners Up</p>
                  {(leaderboardData?.topUsers?.slice(3) ?? FALLBACK_LEADERBOARD.slice(3)).map((user) => (
                    <div key={`runner-${user.userId}`} className="flex items-center justify-between p-3 bg-white rounded-xl border border-gray-100">
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-gray-400 text-sm w-6">#{user.rank}</span>
                        <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-xs font-bold text-gray-500">
                          {user.name ? user.name.charAt(0) : "U"}
                        </div>
                        <span className="font-medium text-sm text-gray-700">{user.name || "Unknown"}</span>
                      </div>
                      <span className="text-xs font-bold text-gray-500">{user.xp} XP</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>
      </main>
    </div>
  );
}
