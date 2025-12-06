import { useState } from "react";
import type { FormData } from "@/types/form";
import { useLocation, useNavigate } from "react-router-dom";
import AvatarScene from "./AvatarScene";
import "./MultiStepForm.css";
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
  const location = useLocation();
  const navigate = useNavigate();
  const initialGender = location.state?.gender || "female"; // Default fallback
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<FormData>({
    gender: initialGender,
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
      // Navigate to premium page with form data
      navigate("/premium", { state: { formData } });
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

  // Determine voice type based on form data (you can customize this logic)
  const voiceType = formData.gender === "male"
    ? "male"
    : "female";

  // Generate contextual text based on current step
  const getStepText = () => {
    switch (step) {
      case 1:
        return `Hi! I'm your fitness coach. Let's start by getting to know you, ${formData.name || "friend"
          }!`;
      case 2:
        return "Great! Now let's see what you're looking for in your fitness journey.";
      case 3:
        return "Understanding your activity level helps me create the perfect plan for you.";
      case 4:
        return "Your age is important for calculating your metabolic needs.";
      case 5:
        return "Let's measure your height to calculate your body metrics accurately.";
      case 6:
        return "Knowing your current weight helps us track your progress.";
      case 7:
        return "Setting a realistic pace ensures sustainable results.";
      case 8:
        return "Your target weight is your destination. Let's get there together!";
      case 9:
        return "Auto-tracking makes it easy to monitor your meals. Want to enable it?";
      case 10:
        return "Any medical conditions help me guide you safely to your goals.";
      default:
        return "Welcome! Let's start your fitness journey together.";
    }
  };

  return (
    <div className="min-h-screen bg-white p-4 font-sans">
      {/* Avatar Section - Fixed at bottom right */}
      <div className="avatar-container-form">
        <AvatarScene textToSpeak={getStepText()} voiceType={voiceType} />
      </div>

      <div className="max-w-7xl mx-auto">
        <div className="w-full max-w-md mx-auto">
          {/* Progress dots */}
          <div className="flex justify-center gap-2 mb-8">
            {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map((s) => (
              <div
                key={s}
                className={`h-2 w-2 rounded-full transition-colors ${s <= step ? "bg-green-600" : "bg-gray-300"
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
              onBack={handleBack}
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
    </div>
  );
}
