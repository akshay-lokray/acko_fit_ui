import React from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface PricingCardProps {
  finalPremium: number;
  mockXp: number;
  setMockXp: (value: number) => void;
}

const PricingCard: React.FC<PricingCardProps> = ({
  finalPremium,
  mockXp,
  setMockXp,
}) => {
  const navigate = useNavigate();

  const handleStartTrial = () => {
    navigate("/home");
  };

  return (
    <div className="relative bg-white rounded-3xl overflow-hidden">
      {/* Light green gradient at bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-emerald-50/50 to-transparent pointer-events-none" />
      
      <div className="relative p-6 space-y-6">
        {/* Monthly Premium Display */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-600">Your Monthly Premium</p>
          <div className="flex items-baseline gap-3">
            <span className="text-5xl font-bold bg-gradient-to-r from-purple-700 to-emerald-600 bg-clip-text text-transparent transition-all duration-300">
              ₹{finalPremium}
            </span>
            <span className="text-lg text-gray-400 line-through">₹499</span>
          </div>
          <p className="text-sm font-medium text-emerald-600">Based on your XP in the next month!</p>
        </div>

        {/* XP Projection Slider */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <p className="text-sm font-medium text-gray-600">Projected XP for next month:</p>
            <span className="text-sm font-bold text-gray-900">{mockXp.toLocaleString()}</span>
          </div>
          
          {/* Custom gradient slider */}
          <div className="relative">
            <SliderPrimitive.Root
              value={[mockXp]}
              max={5000}
              step={100}
              onValueChange={(value) => setMockXp(value[0])}
              className="relative flex w-full touch-none select-none items-center"
            >
              <SliderPrimitive.Track className="relative h-2 w-full grow overflow-hidden rounded-full bg-gradient-to-r from-purple-600 to-emerald-600">
                <SliderPrimitive.Range className="absolute h-full bg-gradient-to-r from-purple-600 to-emerald-600" />
              </SliderPrimitive.Track>
              <SliderPrimitive.Thumb className="block h-5 w-5 rounded-full border-2 border-emerald-600 bg-white shadow-lg ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50" />
            </SliderPrimitive.Root>
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>0 XP</span>
              <span>5,000 XP</span>
            </div>
          </div>
          
          <p className="text-xs text-gray-500">Slide to see how your XP can reduce your premium.</p>
        </div>

        {/* CTA Button */}
        <div className="space-y-3">
          <Button
            onClick={handleStartTrial}
            className="w-full py-6 text-base font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-lg hover:shadow-xl transition-all"
          >
            START FREE TRIAL & EARN XP
          </Button>
          <p className="text-xs text-center text-gray-400">No commitment. Cancel anytime.</p>
        </div>
      </div>
    </div>
  );
};

export default PricingCard;