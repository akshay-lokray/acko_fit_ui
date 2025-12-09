export interface AdditionalInfo {
  info_type: string;
  info_value: string;
  restrictions: string;
  meta_data: string;
}

export interface FormData {
  userId?: string;
  name: string;
  mobile: string;
  gender: string;
  age: number;
  height: number;
  heightUnit: "cm" | "ft-in";
  currentWeight: number | null;
  targetWeight: number | null;
  weightUnit: "kg" | "lb";
  goalPace: number | null; // kg per week
  autoTrackEnabled: boolean | null;
  activityLevel: string | null;
  selectedOptions: string[];
  medicalConditions: string[];
  streak: number | null;
  lastActivityDate: string | null;
  xp: number | null;
  xpUpdatedDate: string | null;
  xpIncrementsToday: number | null;
  mealLoggerEnabled: boolean | null;
  mealLoggerRelation: string | null;
  mealLoggerPhone: string | null;
  mealLoggerName: string | null;
  mealLoggerEmail: string | null;
  mealLoggerMeta: string | null;
  weightCategory: string | null;
  foodStyle: string | null;
  mealCount: string | null;
  fitnessGoals: string[];
  additionalInfo: AdditionalInfo[];
  avatarUrl?: string; // ReadyPlayer.me avatar URL
  avatarName?: string; // Dhoni or Aria
  mealPlanUpdated?: boolean;
  workoutPlanUpdated?: boolean;
}

