import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Toggle } from "@/components/ui/toggle"
import { ArrowLeft, ArrowRight, ChevronLeft, ChevronRight } from "lucide-react"

interface Step5HeightPickerProps {
  height: number
  heightUnit: "cm" | "ft-in"
  onHeightChange: (height: number) => void
  onUnitChange: (unit: "cm" | "ft-in") => void
  onNext: () => void
  onBack: () => void
}

export function Step5HeightPicker({
  height,
  heightUnit,
  onHeightChange,
  onUnitChange,
  onNext,
  onBack,
}: Step5HeightPickerProps) {
  const [displayValue, setDisplayValue] = useState(height || (heightUnit === "cm" ? 170 : 170))

  useEffect(() => {
    if (height) {
      setDisplayValue(height)
    }
  }, [height])

  const handleDecrease = () => {
    if (heightUnit === "cm") {
      const newHeight = Math.max(50, displayValue - 1)
      setDisplayValue(newHeight)
      onHeightChange(newHeight)
    } else {
      // For ft-in, we'll work with total inches
      const totalInches = displayValue
      const newInches = Math.max(36, totalInches - 1) // 3 feet minimum
      setDisplayValue(newInches)
      onHeightChange(newInches)
    }
  }

  const handleIncrease = () => {
    if (heightUnit === "cm") {
      const newHeight = Math.min(250, displayValue + 1)
      setDisplayValue(newHeight)
      onHeightChange(newHeight)
    } else {
      const totalInches = displayValue
      const newInches = Math.min(96, totalInches + 1) // 8 feet maximum
      setDisplayValue(newInches)
      onHeightChange(newInches)
    }
  }

  const getDisplayNumbers = () => {
    if (heightUnit === "cm") {
      return [displayValue - 2, displayValue - 1, displayValue, displayValue + 1, displayValue + 2]
    } else {
      const feet = Math.floor(displayValue / 12)
      const inches = displayValue % 12
      return [
        { feet: Math.floor((displayValue - 2) / 12), inches: (displayValue - 2) % 12 },
        { feet: Math.floor((displayValue - 1) / 12), inches: (displayValue - 1) % 12 },
        { feet, inches },
        { feet: Math.floor((displayValue + 1) / 12), inches: (displayValue + 1) % 12 },
        { feet: Math.floor((displayValue + 2) / 12), inches: (displayValue + 2) % 12 },
      ]
    }
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-foreground">How tall are you?</h1>
        <p className="text-muted-foreground">
          Your height will help us calculate important body stats to help you reach your goals faster.
        </p>
      </div>

      <div className="flex items-center justify-center gap-8 py-8">
        <button
          onClick={handleDecrease}
          className="p-2 text-green-600 hover:text-green-700 transition-colors"
          aria-label="Decrease height"
        >
          <ChevronLeft className="h-8 w-8" />
        </button>

        <div className="relative w-48 h-64 flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            {getDisplayNumbers().map((num, index) => {
              const isCenter = index === 2
              const distance = Math.abs(index - 2)
              const displayText =
                heightUnit === "cm"
                  ? `${num}`
                  : `${(num as { feet: number; inches: number }).feet}' ${(num as { feet: number; inches: number }).inches}"`

              return (
                <div
                  key={index}
                  className={`absolute transition-all ${
                    isCenter
                      ? "text-4xl font-bold text-green-600 opacity-100"
                      : distance === 1
                      ? "text-2xl text-gray-400 opacity-60"
                      : "text-lg text-gray-300 opacity-30"
                  }`}
                  style={{
                    transform: `translateY(${(index - 2) * 60}px)`,
                  }}
                >
                  {displayText}
                </div>
              )
            })}
          </div>
        </div>

        <button
          onClick={handleIncrease}
          className="p-2 text-green-600 hover:text-green-700 transition-colors"
          aria-label="Increase height"
        >
          <ChevronRight className="h-8 w-8" />
        </button>
      </div>

      <div className="flex justify-center gap-2">
        <Toggle
          pressed={heightUnit === "ft-in"}
          onPressedChange={(pressed) => onUnitChange(pressed ? "ft-in" : "cm")}
          className="px-6 py-2 data-[state=on]:bg-green-600 data-[state=on]:text-white"
        >
          Ft/In
        </Toggle>
        <Toggle
          pressed={heightUnit === "cm"}
          onPressedChange={(pressed) => onUnitChange(pressed ? "cm" : "ft-in")}
          className="px-6 py-2 data-[state=on]:bg-green-600 data-[state=on]:text-white"
        >
          Cm
        </Toggle>
      </div>
    </div>
  )
}

