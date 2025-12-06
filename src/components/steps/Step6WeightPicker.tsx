import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Toggle } from "@/components/ui/toggle"
import { ArrowLeft, ArrowRight, ChevronLeft, ChevronRight } from "lucide-react"

interface Step6WeightPickerProps {
  currentWeight: number
  weightUnit: "kg" | "lb"
  onWeightChange: (weight: number) => void
  onUnitChange: (unit: "kg" | "lb") => void
  onNext: () => void
  onBack: () => void
}

export function Step6WeightPicker({
  currentWeight,
  weightUnit,
  onWeightChange,
  onUnitChange,
  onNext,
  onBack,
}: Step6WeightPickerProps) {
  const [displayWeight, setDisplayWeight] = useState(currentWeight || (weightUnit === "kg" ? 80 : 176))
  const [decimal, setDecimal] = useState(0)

  useEffect(() => {
    if (currentWeight) {
      const whole = Math.floor(currentWeight)
      const dec = Math.round((currentWeight - whole) * 10)
      setDisplayWeight(whole)
      setDecimal(dec)
    }
  }, [currentWeight])

  const handleDecrease = () => {
    if (decimal > 0) {
      setDecimal(decimal - 1)
    } else if (displayWeight > (weightUnit === "kg" ? 20 : 44)) {
      setDisplayWeight(displayWeight - 1)
      setDecimal(9)
    }
    updateWeight()
  }

  const handleIncrease = () => {
    if (decimal < 9) {
      setDecimal(decimal + 1)
    } else if (displayWeight < (weightUnit === "kg" ? 200 : 440)) {
      setDisplayWeight(displayWeight + 1)
      setDecimal(0)
    }
    updateWeight()
  }

  const updateWeight = () => {
    const totalWeight = displayWeight + decimal / 10
    onWeightChange(totalWeight)
  }

  useEffect(() => {
    updateWeight()
  }, [displayWeight, decimal])

  const getDisplayNumbers = () => {
    return [
      { whole: displayWeight - 2, decimal: 0 },
      { whole: displayWeight - 1, decimal: 0 },
      { whole: displayWeight, decimal },
      { whole: displayWeight + 1, decimal: 0 },
      { whole: displayWeight + 2, decimal: 0 },
    ]
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-foreground">
          What's your current weight?
        </h1>
        <p className="text-muted-foreground">
          This will help us determine your goal, and monitor your progress over time.
        </p>
      </div>

      <div className="flex items-center justify-center gap-8 py-8">
        <button
          onClick={handleDecrease}
          className="p-2 text-green-600 hover:text-green-700 transition-colors"
          aria-label="Decrease weight"
        >
          <ChevronLeft className="h-8 w-8" />
        </button>

        <div className="relative w-48 h-64 flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            {getDisplayNumbers().map((num, index) => {
              const isCenter = index === 2
              const distance = Math.abs(index - 2)
              const displayText = `${num.whole} . ${num.decimal}`

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
          aria-label="Increase weight"
        >
          <ChevronRight className="h-8 w-8" />
        </button>
      </div>

      <div className="flex justify-center gap-2">
        <Toggle
          pressed={weightUnit === "kg"}
          onPressedChange={(pressed) => onUnitChange(pressed ? "kg" : "lb")}
          className="px-6 py-2 data-[state=on]:bg-green-600 data-[state=on]:text-white"
        >
          Kg
        </Toggle>
        <Toggle
          pressed={weightUnit === "lb"}
          onPressedChange={(pressed) => onUnitChange(pressed ? "lb" : "kg")}
          className="px-6 py-2 data-[state=on]:bg-green-600 data-[state=on]:text-white"
        >
          Lb
        </Toggle>
      </div>
    </div>
  )
}

