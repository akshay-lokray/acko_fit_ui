import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useUserProfileStore } from "@/store/userProfileStore";
import AvatarScene from "./AvatarScene";
import "./MultiStepForm.css";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight } from "lucide-react";
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
  const { step, setStep, formData, nextStep, prevStep, updateFormData } = useUserProfileStore();
  const [fetchingUser, setFetchingUser] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const submitUserData = async () => {
    const payload = {
      ...formData,
      userId: formData.mobile,
    };

    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        console.error("Failed to submit user data", await response.text());
      }
    } catch (error) {
      console.error("Failed to submit user data", error);
    }
  };

  // Ensure gender from navigation state is captured once when arriving
  useEffect(() => {
    if (initialGender && formData.gender !== initialGender) {
      updateFormData({ gender: initialGender });
    }
  }, [initialGender, formData.gender, updateFormData]);

  useEffect(() => {
    setStep(1);
  }, [setStep]);

  const handleNext = async () => {
    if (step === 1) {
      const found = await handleFetchUser();
      if (found) return;
    }
    if (step < TOTAL_STEPS) {
      nextStep();
    } else {
      await submitUserData();
      // Navigate to premium page with form data
      navigate("/premium", { state: { formData } });
    }
  };

  const handleBack = () => {
    if (step > 1) {
      prevStep();
    }
  };

  // Validation logic for each step to enable/disable Next button
  const canProceed = () => {
    const isMobileValid = /^\d{10}$/.test(formData.mobile || "");
    switch (step) {
      case 1:
        return formData.name.trim().length > 0 && isMobileValid;
      case 2:
        return formData.selectedOptions.length > 0;
      case 3:
        return formData.activityLevel.length > 0;
      case 4:
        return formData.age > 0 && formData.age <= 120;
      case 5:
        return formData.height > 0;
      case 6:
        return formData.currentWeight > 0;
      case 7:
        return formData.goalPace > 0;
      case 8:
        return formData.targetWeight > 0;
      case 9:
        return true; // Auto track is optional
      case 10:
        return formData.medicalConditions.length > 0;
      default:
        return false;
    }
  };

  // Determine voice type based on gender selection
  const voiceType = formData.gender === "male" ? "male" : "female";

  // Generate contextual text based on current step
  const getStepText = () => {
    switch (step) {
      case 1:
        return `Hi! I'm your fitness coach. Let's start by getting to know you, ${
          formData.name || "friend"
        }! Please share your name and mobile number so I can stay in touch.`;
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

  const handleFetchUser = async (): Promise<boolean> => {
    const mobile = formData.mobile || "";
    if (!/^\d{10}$/.test(mobile)) {
      setFetchError("Enter a valid 10-digit mobile number first.");
      return false;
    }
    setFetchError(null);
    setFetchingUser(true);
    try {
      const res = await fetch(`/api/users/${encodeURIComponent(mobile)}`);
      if (res.ok) {
        const data = await res.json();
        updateFormData(data);
        navigate("/home");
        return true;
      }
      if (res.status === 404) {
        setFetchError("No profile found. Please continue with the steps.");
      } else {
        throw new Error("Unexpected status");
      }
    } catch (error) {
      console.error("Failed to load user", error);
      setFetchError("Unable to fetch your profile right now.");
    } finally {
      setFetchingUser(false);
    }
    return false;
  };

  return (
    <div className="min-h-screen bg-white p-4 font-sans pb-24 setup-page">
      {/* Avatar Section - Fixed at bottom right */}
      <div className="avatar-container-form">
        <AvatarScene textToSpeak={getStepText()} voiceType={voiceType} isFullScreen={false} />
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
                mobile={formData.mobile}
                onNameChange={(name) => updateFormData({ name })}
                onMobileChange={(mobile) => updateFormData({ mobile })}
              />
            )}
            {step === 1 && fetchError && (
              <p className="text-xs text-red-500 text-center mt-2">{fetchError}</p>
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

      {/* Fixed Bottom Navigation Buttons */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 z-20">
        <div className="max-w-md mx-auto">
          <div className="flex flex-wrap gap-2 justify-between">
            {step !== 9 && (
              <Button
                onClick={handleBack}
                variant="outline"
                className="h-12 px-6 flex-1"
                size="lg"
                disabled={step === 1}
              >
                <ArrowLeft className="mr-2 h-5 w-5" />
                Back
              </Button>
            )}
            <Button
              onClick={handleNext}
              disabled={!canProceed() || (step === 1 && fetchingUser)}
              className={`h-12 px-8 ${step === 9 ? 'flex-1' : 'flex-1'}`}
              size="lg"
            >
              Next
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              className="h-12 px-6 flex-1 text-gray-600 border border-gray-200 hover:bg-gray-100"
              onClick={() => navigate("/home", { state: { formData } })}
            >
              Back to Home
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
