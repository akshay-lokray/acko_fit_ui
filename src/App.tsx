import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AvatarPage from "./pages/AvatarPage";
import { SetupPage } from "./pages/SetupPage";
import "./App.css";

import { useEffect, useState } from "react";
import { useGLTF } from "@react-three/drei";

import { CoachSelectionPage } from "./pages/CoachSelectionPage";
import { CoachIntroPage } from "./pages/CoachIntroPage";
import { PremiumPlanPage } from "./pages/PremiumPlanPage";
import { HomePage } from "./pages/HomePage";
import { RecipesPage } from "./pages/RecipesPage";
import { WorkoutPlansPage } from "./pages/WorkoutPlansPage";
import { PhotoTrackingPage } from "./pages/PhotoTrackingPage";
import { HabitTrackerPage } from "./pages/HabitTrackerPage";
import { UserLockerPage } from "./pages/UserLockerPage";
import { DevicesPage } from "./pages/DevicesPage";
import { RewardsPage } from "./pages/RewardsPage";
import { RankingsPage } from "./pages/RankingsPage";
import { LogLunchPage } from "./pages/LogLunchPage";
import { LogStepsPage } from "./pages/LogStepsPage";
import { LogWaterPage } from "./pages/LogWaterPage";
import { HabitDetailPage } from "./pages/HabitDetailPage";
import { MALE_DHONI_AVATAR_URL, FEMALE_DEFAULT_AVATAR_URL } from "./constants/avatarUrls";

function App() {
  const [showIntro, setShowIntro] = useState(false);

  useEffect(() => {
    useGLTF.preload(MALE_DHONI_AVATAR_URL);
    useGLTF.preload(FEMALE_DEFAULT_AVATAR_URL);
  }, []);

  if (showIntro) {
    return (
      <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
        <video
          src="/intro.MOV"
          autoPlay
          muted
          playsInline
          onEnded={() => setShowIntro(false)}
          onError={(e) => console.error("Video error:", e)}
          className="w-full h-full object-cover"
        />
        <button
          onClick={() => setShowIntro(false)}
          className="absolute bottom-8 right-8 text-white/50 hover:text-white border border-white/30 hover:border-white px-6 py-2 rounded-full transition-all duration-300 backdrop-blur-sm bg-black/20 text-sm tracking-wider uppercase z-50"
        >
          Skip Intro
        </button>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<CoachSelectionPage />} />
        <Route path="/coach-intro" element={<CoachIntroPage />} />
        <Route path="/setup" element={<SetupPage />} />
        <Route path="/premium" element={<PremiumPlanPage />} />
        <Route path="/home" element={<HomePage />} />
        <Route path="/recipes" element={<RecipesPage />} />
        <Route path="/workouts" element={<WorkoutPlansPage />} />
        <Route path="/tracker" element={<PhotoTrackingPage />} />
        <Route path="/habits" element={<HabitTrackerPage />} />
        <Route path="/profile" element={<UserLockerPage />} />
        <Route path="/devices" element={<DevicesPage />} />
        <Route path="/rewards" element={<RewardsPage />} />
        <Route path="/rankings" element={<RankingsPage />} />
        <Route path="/log-meal" element={<LogLunchPage />} />
        <Route path="/log-steps" element={<LogStepsPage />} />
        <Route path="/log-water" element={<LogWaterPage />} />
        <Route path="/habit-detail" element={<HabitDetailPage />} />
        <Route path="/avatar" element={<AvatarPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
