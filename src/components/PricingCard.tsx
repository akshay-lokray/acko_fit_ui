import React from "react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";

interface PricingCardProps {
  finalPremium: number;
  mockXp: number;
  setMockXp: (value: number) => void;
  buttonBg: string;
  themeColor: string;
  borderColor: string;
}

const PricingCard: React.FC<PricingCardProps> = ({
  finalPremium,
  mockXp,
  setMockXp,
  buttonBg,
  themeColor,
  borderColor,
}) => {
  return (
    <div
      className={`p-8 rounded-3xl bg-white border-2 ${borderColor} shadow-xl relative overflow-hidden group transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl animate-fade-in`}
      style={{ animationDelay: "500ms" }}
    >
      <div className="space-y-1 mb-6">
        <p className="text-sm text-gray-500 font-medium">Your Monthly Premium</p>
        <div className="flex items-baseline gap-2">
          <span className="text-5xl font-bold text-gray-900 transition-all duration-300 ease-in-out">₹{finalPremium}</span>
          <span className="text-lg text-gray-400 line-through">₹499</span>
        </div>
        <p className={`text-sm ${themeColor} font-medium`}>Based on your XP in the next month!</p>
      </div>

      <div className="space-y-4 mb-6">
        <p className="text-sm text-gray-500 font-medium">
          Projected XP for next month: <span className="font-bold text-gray-900">{mockXp}</span>
        </p>
        <Slider
          defaultValue={[mockXp]}
          max={3000}
          step={100}
          onValueChange={(value) => setMockXp(value[0])}
          className="w-full"
        />
        <p className="text-xs text-gray-500">Slide to see how your XP can reduce your premium.</p>
      </div>

      <Button
        onClick={() => {}}
        className={`w-full py-6 text-lg shadow-lg hover:shadow-2xl transition-all hover:scale-105 ${buttonBg}`}
      >
        START FREE TRIAL & EARN XP
      </Button>
      <p className="text-xs text-center text-gray-400 mt-4">No commitment. Cancel anytime.</p>
    </div>
  );
};

export default PricingCard;