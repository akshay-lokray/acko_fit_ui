import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import type { FormData } from "@/types/form";

const HARD_CODED_ID = "9795784244";

const initialFormData = (): FormData => ({
  userId: HARD_CODED_ID,
  name: "",
  mobile: HARD_CODED_ID,
  gender: "",
  age: 0,
  height: 0,
  heightUnit: "cm",
  currentWeight: null,
  targetWeight: null,
  weightUnit: "kg",
  goalPace: null,
  autoTrackEnabled: null,
  activityLevel: null,
  selectedOptions: [],
  medicalConditions: [],
  streak: null,
  lastActivityDate: null,
  xp: null,
  xpUpdatedDate: null,
  xpIncrementsToday: null,
  mealLoggerEnabled: null,
  mealLoggerRelation: null,
  mealLoggerPhone: null,
  mealLoggerName: null,
  mealLoggerEmail: null,
  mealLoggerMeta: null,
  weightCategory: null,
  foodStyle: null,
  mealCount: null,
  fitnessGoals: [],
  additionalInfo: [],
});

interface UserProfileStore {
  step: number;
  formData: FormData;
  setStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  updateFormData: (updates: Partial<FormData>) => void;
  resetForm: () => void;
}

export const useUserProfileStore = create<UserProfileStore>()(
  devtools(
    persist(
      (set) => ({
        step: 1,
        formData: initialFormData(),
        setStep: (step) => set({ step }),
        nextStep: () => set((state) => ({ step: state.step + 1 })),
        prevStep: () => set((state) => ({ step: Math.max(1, state.step - 1) })),
        updateFormData: (updates) =>
          set((state) => {
            const sanitizedUpdates = {
              ...updates,
              userId: HARD_CODED_ID,
              mobile: HARD_CODED_ID,
            };
            const nextFormData = { ...state.formData, ...sanitizedUpdates };
            console.log("[userProfileStore] updateFormData", {
              updates,
              sanitizedUpdates,
              nextFormData,
            });
            return { formData: nextFormData };
          }),
        resetForm: () =>
          set({
            step: 1,
            formData: initialFormData(),
          }),
      }),
      {
        name: "userProfileStore-storage",
        version: 1,
      }
    ),
    { name: "userProfileStore" }
  )
);
