import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { ArrowLeft, ArrowRight } from "lucide-react"

const MEDICAL_CONDITIONS = [
  "None",
  "Diabetes",
  "Pre-Diabetes",
  "Cholesterol",
  "Hypertension",
  "PCOS",
  "Thyroid",
  "Physical Injury",
  "Excessive stress/anxiety",
  "Sleep issues",
  "Depression",
  "Anger issues",
  "Loneliness",
  "Relationship stress",
]

interface Step10MedicalConditionsProps {
  medicalConditions: string[]
  onMedicalConditionsChange: (conditions: string[]) => void
  onNext: () => void
  onBack: () => void
}

export function Step10MedicalConditions({
  medicalConditions,
  onMedicalConditionsChange,
  onNext,
  onBack,
}: Step10MedicalConditionsProps) {
  const handleToggle = (condition: string) => {
    if (condition === "None") {
      onMedicalConditionsChange(["None"])
    } else {
      const newConditions = medicalConditions.includes(condition)
        ? medicalConditions.filter((c) => c !== condition)
        : [...medicalConditions.filter((c) => c !== "None"), condition]
      onMedicalConditionsChange(newConditions.length === 0 ? ["None"] : newConditions)
    }
  }

  const isSelected = (condition: string) => {
    return medicalConditions.includes(condition)
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-foreground">
          Any Medical Condition we should be aware of?
        </h1>
        <p className="text-muted-foreground">
          This info will help us guide you to your fitness goals safely and quickly.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {MEDICAL_CONDITIONS.map((condition) => {
          const selected = isSelected(condition)
          const isNone = condition === "None"

          return (
            <Card
              key={condition}
              className={`p-4 cursor-pointer transition-all hover:shadow-md rounded-lg ${
                selected
                  ? isNone
                    ? "border-green-500 border-2 bg-green-50 dark:bg-green-950/20"
                    : "border-green-500 border-2 bg-green-50 dark:bg-green-950/20"
                  : "border border-gray-200 dark:border-gray-700"
              }`}
              onClick={() => handleToggle(condition)}
            >
              <div className="flex items-center gap-3">
                <Checkbox
                  checked={selected}
                  onCheckedChange={() => handleToggle(condition)}
                  className={`h-5 w-5 border-2 rounded ${
                    selected
                      ? "border-green-500 bg-green-500 data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500 data-[state=checked]:text-white"
                      : "border-gray-300 bg-transparent"
                  }`}
                />
                <span
                  className={`text-sm font-medium ${
                    selected
                      ? "text-green-700 dark:text-green-400"
                      : "text-gray-900 dark:text-gray-100"
                  }`}
                >
                  {condition}
                </span>
              </div>
            </Card>
          )
        })}
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
          disabled={medicalConditions.length === 0}
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

