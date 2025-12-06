import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ArrowLeft, ArrowRight, Sofa, Footprints, Footprints as Shoe, HardHat } from "lucide-react"

const ACTIVITY_LEVELS = [
  {
    id: "sitting",
    label: "Mostly Sitting",
    description: "Seated work, low movement.",
    icon: Sofa,
  },
  {
    id: "standing",
    label: "Often Standing",
    description: "Standing work, occasional walking.",
    icon: Footprints,
  },
  {
    id: "walking",
    label: "Regularly Walking",
    description: "Frequent walking, steady activity.",
    icon: Shoe,
  },
  {
    id: "intense",
    label: "Physically Intense Work",
    description: "Heavy labor, high exertion.",
    icon: HardHat,
  },
]

interface Step3ActivityLevelProps {
  activityLevel: string
  onActivityLevelChange: (level: string) => void
  onNext: () => void
  onBack: () => void
}

export function Step3ActivityLevel({
  activityLevel,
  onActivityLevelChange,
  onNext,
  onBack,
}: Step3ActivityLevelProps) {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-foreground">
          How active are you?
        </h1>
        <p className="text-muted-foreground">
          Based on your lifestyle, we can assess your daily calorie requirements.
        </p>
      </div>

      <div className="space-y-3">
        {ACTIVITY_LEVELS.map((level) => {
          const Icon = level.icon
          const isSelected = activityLevel === level.id
          return (
            <Card
              key={level.id}
              className={`p-4 cursor-pointer transition-all hover:shadow-md rounded-lg ${
                isSelected
                  ? "border-green-500 border-2 bg-green-50 dark:bg-green-950/20"
                  : "border border-gray-200 dark:border-gray-700"
              }`}
              onClick={() => onActivityLevelChange(level.id)}
            >
              <div className="flex items-center gap-4">
                <div
                  className={`p-3 rounded-lg ${
                    isSelected
                      ? "bg-green-100 dark:bg-green-900/30"
                      : "bg-gray-100 dark:bg-gray-800"
                  }`}
                >
                  <Icon
                    className={`h-6 w-6 ${
                      isSelected
                        ? "text-green-600 dark:text-green-400"
                        : "text-gray-600 dark:text-gray-400"
                    }`}
                  />
                </div>
                <div className="flex-1">
                  <div
                    className={`font-semibold text-base mb-1 ${
                      isSelected
                        ? "text-green-700 dark:text-green-400"
                        : "text-gray-900 dark:text-gray-100"
                    }`}
                  >
                    {level.label}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {level.description}
                  </div>
                </div>
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

