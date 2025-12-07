import { create } from "zustand"
import { devtools, persist } from "zustand/middleware"
import type { FormData } from "@/types/form"

const initialFormData = (): FormData => ({
  gender: "",
  name: "",
  mobile: "",
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
})

interface UserProfileStore {
  step: number
  formData: FormData
  setStep: (step: number) => void
  nextStep: () => void
  prevStep: () => void
  updateFormData: (updates: Partial<FormData>) => void
  resetForm: () => void
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
            const nextFormData = { ...state.formData, ...updates }
            console.log("[userProfileStore] updateFormData", { updates, nextFormData })
            return { formData: nextFormData }
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
)

