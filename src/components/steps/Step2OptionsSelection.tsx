import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import {
  ArrowLeft,
  ArrowRight,
  Users,
  Camera,
  UtensilsCrossed,
  Scale,
  Pill,
  Clock,
  ForkKnife,
  Dumbbell,
} from "lucide-react"

const OPTIONS = [
  { id: "coach", label: "COACH GUIDANCE", icon: Users },
  { id: "snap", label: "SNAP", icon: Camera },
  { id: "diet", label: "DIET PLAN", icon: UtensilsCrossed },
  { id: "weight-loss", label: "WEIGHT LOSS", icon: Scale },
  { id: "glp1", label: "GLP-1", icon: Pill },
  { id: "fasting", label: "INTERMITTENT FASTING", icon: Clock },
  { id: "calories", label: "COUNT CALORIES", icon: ForkKnife },
  { id: "muscle", label: "MUSCLE GAIN", icon: Dumbbell },
]

interface Step2OptionsSelectionProps {
  selectedOptions: string[]
  onToggleOption: (optionId: string) => void
  onNext: () => void
  onBack: () => void
}

export function Step2OptionsSelection({
  selectedOptions,
  onToggleOption,
  onNext,
  onBack,
}: Step2OptionsSelectionProps) {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-foreground">
          What are you looking for?
        </h1>
        <p className="text-muted-foreground">
          Selecting one or more options would help us tailor your experience.
        </p>
      </div>

      <div className="space-y-3">
        {OPTIONS.map((option) => {
          const Icon = option.icon
          const isSelected = selectedOptions.includes(option.id)
          return (
            <Card
              key={option.id}
              className={`p-4 cursor-pointer transition-all hover:shadow-md rounded-lg ${
                isSelected
                  ? "border-green-500 border-2 bg-green-50 dark:bg-green-950/20"
                  : "border border-gray-200 dark:border-gray-700"
              }`}
              onClick={() => onToggleOption(option.id)}
            >
              <div className="flex items-center justify-between">
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
                  <span
                    className={`font-semibold text-base ${
                      isSelected
                        ? "text-green-700 dark:text-green-400"
                        : "text-gray-900 dark:text-gray-100"
                    }`}
                  >
                    {option.label}
                  </span>
                </div>
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => onToggleOption(option.id)}
                  className={`h-6 w-6 border-2 rounded ${
                    isSelected
                      ? "border-green-500 bg-green-500 data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500 data-[state=checked]:text-white"
                      : "border-gray-300 bg-transparent"
                  }`}
                />
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

