import { useState } from "react";
import type { FormData } from "@/types/form";
import { Step1NameInput } from "./steps/Step1NameInput";
import { Step2OptionsSelection } from "./steps/Step2OptionsSelection";
import { Step3ActivityLevel } from "./steps/Step3ActivityLevel";
import { Step4AgePicker } from "./steps/Step4AgePicker";
import { Step5HeightPicker } from "./steps/Step5HeightPicker";
import { Step6WeightPicker } from "./steps/Step6WeightPicker";
import { Step7GoalPace } from "./steps/Step7GoalPace";
import { Step8TargetWeight } from "./steps/Step8TargetWeight";
import { Step9AutoTrack } from "./steps/Step9AutoTrack";
import { Step10MedicalConditions } from "./steps/Step10MedicalConditions";

const TOTAL_STEPS = 10;

export function MultiStepForm() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<FormData>({
    name: "",
    selectedOptions: [],
    activityLevel: "",
    age: 20,
    height: 170,
    heightUnit: "cm",
    currentWeight: 80,
    weightUnit: "kg",
    goalPace: 0.25,
    targetWeight: 60,
    autoTrackEnabled: false,
    medicalConditions: ["None"],
  });

  const handleNext = () => {
    if (step < TOTAL_STEPS) {
      setStep(step + 1);
    } else {
      // Handle form submission
      console.log("Form submitted:", formData);
      alert(`Thank you, ${formData.name}! Your preferences have been saved.`);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const updateFormData = (updates: Partial<FormData>) => {
    setFormData({ ...formData, ...updates });
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Progress dots */}
        <div className="flex justify-center gap-2 mb-8">
          {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map((s) => (
            <div
              key={s}
              className={`h-2 w-2 rounded-full transition-colors ${
                s <= step ? "bg-green-600" : "bg-gray-300"
              }`}
            />
          ))}
        </div>

        {/* Step 1: Name Input */}
        {step === 1 && (
          <Step1NameInput
            name={formData.name}
            onNameChange={(name) => updateFormData({ name })}
            onNext={handleNext}
          />
        )}

        {/* Step 2: Options Selection */}
        {step === 2 && (
          <Step2OptionsSelection
            selectedOptions={formData.selectedOptions}
            onToggleOption={(optionId) => {
              const newOptions = formData.selectedOptions.includes(optionId)
                ? formData.selectedOptions.filter((id) => id !== optionId)
                : [...formData.selectedOptions, optionId];
              updateFormData({ selectedOptions: newOptions });
            }}
            onNext={handleNext}
            onBack={handleBack}
          />
        )}

        {/* Step 3: Activity Level */}
        {step === 3 && (
          <Step3ActivityLevel
            activityLevel={formData.activityLevel}
            onActivityLevelChange={(level) =>
              updateFormData({ activityLevel: level })
            }
            onNext={handleNext}
            onBack={handleBack}
          />
        )}

        {/* Step 4: Age Picker */}
        {step === 4 && (
          <Step4AgePicker
            age={formData.age}
            onAgeChange={(age) => updateFormData({ age })}
            onNext={handleNext}
            onBack={handleBack}
          />
        )}

        {/* Step 5: Height Picker */}
        {step === 5 && (
          <Step5HeightPicker
            height={formData.height}
            heightUnit={formData.heightUnit}
            onHeightChange={(height) => updateFormData({ height })}
            onUnitChange={(unit) => updateFormData({ heightUnit: unit })}
            onNext={handleNext}
            onBack={handleBack}
          />
        )}

        {/* Step 6: Current Weight Picker */}
        {step === 6 && (
          <Step6WeightPicker
            currentWeight={formData.currentWeight}
            weightUnit={formData.weightUnit}
            onWeightChange={(weight) =>
              updateFormData({ currentWeight: weight })
            }
            onUnitChange={(unit) => updateFormData({ weightUnit: unit })}
            onNext={handleNext}
            onBack={handleBack}
          />
        )}

        {/* Step 7: Goal Pace */}
        {step === 7 && (
          <Step7GoalPace
            goalPace={formData.goalPace}
            onGoalPaceChange={(pace) => updateFormData({ goalPace: pace })}
            onNext={handleNext}
            onBack={handleBack}
          />
        )}

        {/* Step 8: Target Weight */}
        {step === 8 && (
          <Step8TargetWeight
            targetWeight={formData.targetWeight}
            weightUnit={formData.weightUnit}
            onTargetWeightChange={(weight) =>
              updateFormData({ targetWeight: weight })
            }
            onUnitChange={(unit) => updateFormData({ weightUnit: unit })}
            onNext={handleNext}
            onBack={handleBack}
          />
        )}

        {/* Step 9: Auto Track */}
        {step === 9 && (
          <Step9AutoTrack
            autoTrackEnabled={formData.autoTrackEnabled}
            onAutoTrackChange={(enabled) =>
              updateFormData({ autoTrackEnabled: enabled })
            }
            onNext={handleNext}
            onBack={handleBack}
          />
        )}

        {/* Step 10: Medical Conditions */}
        {step === 10 && (
          <Step10MedicalConditions
            medicalConditions={formData.medicalConditions}
            onMedicalConditionsChange={(conditions) =>
              updateFormData({ medicalConditions: conditions })
            }
            onNext={handleNext}
            onBack={handleBack}
          />
        )}
      </div>
    </div>
  );
}
