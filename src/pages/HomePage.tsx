import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  MessageSquare,
  Users,
  Award,
  Zap,
  Shield,
  Send,
  CheckCircle2,
  Compass,
  Utensils,
  Dumbbell,
  Camera,
  LayoutGrid
} from "lucide-react";
import AvatarScene from "@/components/AvatarScene";
import type { VoiceType } from "@/types/voice";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

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

// --- Mock Data ---
const DAILY_QUESTS: Quest[] = [
  { id: "1", title: "Log Lunch", xp: 50, completed: false, type: "daily" },
  { id: "2", title: "Walk 5,000 Steps", xp: 100, completed: false, type: "daily" },
  { id: "3", title: "Drink 2L Water", xp: 50, completed: true, type: "daily" },
];

export function HomePage() {
  const location = useLocation();
  const navigate = useNavigate();
  // Safe access to formData with defaults
  const formData = location.state?.formData || {};
  const gender = formData.gender || "female";
  const name = formData.name || "Traveller";
  const coachName = gender === "male" ? "Atlas" : "Aria";

  // State
  // Changed "map" to "explore"
  const [activeTab, setActiveTab] = useState<"chat" | "explore" | "community">("chat");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      sender: "coach",
      text: `Welcome back, ${name}. Ready to conquer today's mission?`,
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [xp, setXp] = useState(350);
  const levelingXp = 1000;
  const level = 1;

  // Determining "Persona" styles
  const isMale = gender === "male";
  const themeColor = isMale ? "text-emerald-600" : "text-purple-700";
  const bgTheme = isMale ? "bg-emerald-50" : "bg-purple-50";
  const buttonBg = isMale ? "bg-emerald-600 hover:bg-emerald-700" : "bg-purple-700 hover:bg-purple-800";
  const accentColor = isMale ? "emerald" : "purple";

  const [isListening, setIsListening] = useState(false);

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

    // Simulated Coach Response
    setTimeout(() => {
      let responseText = "";
      if (isMale) {
        // "Drill Sergeant" Persona
        responseText = "Copy that. Stay focused on the objective. We don't stop when we're tired, we stop when we're done.";
      } else {
        // "Scientist/Guide" Persona
        responseText = "Interesting data point. My analysis suggests keeping your hydration up will optimize your recovery today.";
      }

      const coachMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: "coach",
        text: responseText,
      };
      setMessages((prev) => [...prev, coachMsg]);
    }, 1000);
  };

  const handleVoiceInput = () => {
    if (isListening) return;
    setIsListening(true);

    // Simulate Listening duration
    setTimeout(() => {
      setIsListening(false);
      // Mock "Speech to Text" result
      const spokenText = "Hey Coach, can you help me with a diet plan for today?";
      handleSendMessage(spokenText);
    }, 3000);
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
            <div className="flex items-center gap-1">
              <Zap className="w-4 h-4 text-yellow-500 fill-yellow-500" />
              <span>{xp} XP</span>
            </div>
            <div className="flex items-center gap-1">
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
                <p className="text-sm text-gray-800 font-medium">Log your lunch to maintain your 3-day streak!</p>
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

        {/* 2. Interface Tabs (Chat / Explore / Community) */}
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
              onClick={() => setActiveTab("community")}
              className={`flex-1 py-4 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${activeTab === 'community' ? `${themeColor} border-b-2 ${isMale ? 'border-emerald-500' : 'border-purple-500'}` : 'text-gray-400'}`}
            >
              <Users className="w-4 h-4" /> Squad
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
                  {DAILY_QUESTS.map(quest => (
                    <div key={quest.id} className="bg-white p-3 rounded-xl border border-gray-100 flex items-center justify-between shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${quest.completed ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                          {quest.completed ? <CheckCircle2 className="w-5 h-5" /> : <div className="w-3 h-3 rounded-full bg-gray-300" />}
                        </div>
                        <span className={`text-sm font-medium ${quest.completed ? 'text-gray-400 line-through' : 'text-gray-700'}`}>{quest.title}</span>
                      </div>
                      <span className="text-xs font-bold text-yellow-600 bg-yellow-50 px-2 py-1 rounded-md">+{quest.xp} XP</span>
                    </div>
                  ))}
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
                    className="p-4 flex flex-col items-center justify-center gap-3 cursor-pointer hover:shadow-md transition-shadow bg-white opacity-50"
                  >
                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-gray-400">
                      <LayoutGrid className="w-6 h-6" />
                    </div>
                    <span className="font-semibold text-gray-400">Coming Soon</span>
                  </Card>
                </div>

                <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-6 text-white shadow-lg">
                  <h3 className="font-bold text-lg mb-2">Weekly Challenge</h3>
                  <p className="opacity-90 text-sm mb-4">Complete 3 workouts this week to unlock the "Iron Will" badge.</p>
                  <Progress value={33} className="h-2 bg-white/30" />
                  <p className="text-xs mt-2 font-medium">1/3 Completed</p>
                </div>
              </div>
            )}

            {activeTab === "community" && (
              <div className="h-full space-y-6 max-w-2xl mx-auto">
                <Card className="p-6 border-l-4 border-l-orange-500">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-bold text-orange-500 uppercase">Current Team Challenge</p>
                      <h3 className="text-lg font-bold text-gray-900 mt-1">Movement Masters</h3>
                      <p className="text-sm text-gray-600 mt-2">Log 100k collective steps with your squad.</p>
                    </div>
                    <Award className="w-8 h-8 text-orange-500" />
                  </div>
                  <div className="mt-4 space-y-2">
                    <div className="flex justify-between text-xs font-medium text-gray-500">
                      <span>Team Progress</span>
                      <span>42,050 / 100,000 steps</span>
                    </div>
                    <Progress value={42} className="h-2" />
                  </div>
                </Card>

                <div>
                  <h4 className="font-bold text-gray-900 mb-4">Squad Leaderboard</h4>
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-white rounded-xl border border-gray-100 shadow-sm">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-bold text-gray-400">#{i}</span>
                          <div className="w-8 h-8 bg-gray-200 rounded-full" />
                          <span className="font-medium text-gray-700">User_{9000 + i}</span>
                        </div>
                        <span className="text-sm font-bold text-gray-900">{1500 - (i * 100)} XP</span>
                      </div>
                    ))}
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
