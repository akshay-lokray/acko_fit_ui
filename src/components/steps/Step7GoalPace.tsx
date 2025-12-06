import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Card } from "@/components/ui/card"
import { ArrowLeft, ArrowRight } from "lucide-react"

interface Step7GoalPaceProps {
  goalPace: number
  onGoalPaceChange: (pace: number) => void
  onNext: () => void
  onBack: () => void
}

export function Step7GoalPace({
  goalPace,
  onGoalPaceChange,
  onNext,
  onBack,
}: Step7GoalPaceProps) {
  const [pace, setPace] = useState(goalPace || 0.25)
  const [months, setMonths] = useState(18)

  useEffect(() => {
    if (goalPace) {
      setPace(goalPace)
    }
  }, [goalPace])

  useEffect(() => {
    // Calculate months based on pace (simplified calculation)
    // Assuming target weight loss of ~20kg, adjust based on pace
    const estimatedMonths = Math.ceil(20 / (pace * 4)) // 4 weeks per month
    setMonths(estimatedMonths)
  }, [pace])

  const handleSliderChange = (value: number[]) => {
    const newPace = value[0]
    setPace(newPace)
    onGoalPaceChange(newPace)
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-foreground">
          How fast do you want to reach your goal?
        </h1>
        <p className="text-muted-foreground">
          This is a good, sustainable pace to reach your goal weight.
        </p>
      </div>

      <div className="space-y-8 py-8">
        <div className="text-center">
          <div className="text-6xl font-bold text-foreground mb-2">
            {pace.toFixed(2)} kg
          </div>
          <div className="text-xl text-muted-foreground">per week</div>
        </div>

        <div className="px-4">
          <Slider
            value={[pace]}
            onValueChange={handleSliderChange}
            min={0.25}
            max={2.0}
            step={0.25}
            className="w-full"
          />
        </div>

        <Card className="p-4 bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
          <p className="text-center text-green-700 dark:text-green-400 font-medium">
            You will reach your goal in {months} months.
          </p>
        </Card>
      </div>
    </div>
  )
}

