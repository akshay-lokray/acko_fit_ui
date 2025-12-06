import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Toggle } from "@/components/ui/toggle"
import { Card } from "@/components/ui/card"
import { ArrowLeft, ArrowRight, ChevronLeft, ChevronRight } from "lucide-react"

interface Step8TargetWeightProps {
  targetWeight: number
  weightUnit: "kg" | "lb"
  onTargetWeightChange: (weight: number) => void
  onUnitChange: (unit: "kg" | "lb") => void
  onNext: () => void
  onBack: () => void
}

export function Step8TargetWeight({
  targetWeight,
  weightUnit,
  onTargetWeightChange,
  onUnitChange,
  onNext,
  onBack,
}: Step8TargetWeightProps) {
  const [displayWeight, setDisplayWeight] = useState(targetWeight || (weightUnit === "kg" ? 60 : 132))
  const [decimal, setDecimal] = useState(0)

  useEffect(() => {
    if (targetWeight) {
      const whole = Math.floor(targetWeight)
      const dec = Math.round((targetWeight - whole) * 10)
      setDisplayWeight(whole)
      setDecimal(dec)
    }
  }, [targetWeight])

  const handleDecrease = () => {
    if (decimal > 0) {
      setDecimal(decimal - 1)
    } else if (displayWeight > (weightUnit === "kg" ? 30 : 66)) {
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
    onTargetWeightChange(totalWeight)
  }

  useEffect(() => {
    updateWeight()
  }, [displayWeight, decimal])

  const idealRange = weightUnit === "kg" ? "54-66 Kg" : "119-146 Lb"

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
          What's your target weight?
        </h1>
        <p className="text-muted-foreground">
          Set a realistic weight goal for yourself.
        </p>
      </div>

      <Card className="p-4 bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700">
        <p className="text-center text-green-700 dark:text-green-400 font-medium">
          Your target weight is perfectly aligned with your ideal weight range of {idealRange}.
        </p>
      </Card>

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
              const displayText = `${num.whole}.${num.decimal}`

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

      <div className="flex justify-between gap-4">
        <Button
          onClick={onBack}
          variant="outline"
          className="h-12 px-6"
          size="lg"
        >
          <ArrowLeft className="mr-2 h-5 w-5" />
          Back
        </Button>
        <Button
          onClick={onNext}
          disabled={!displayWeight}
          className="h-12 px-6"
          size="lg"
        >
          Next
          <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
      </div>
    </div>
  )
}

