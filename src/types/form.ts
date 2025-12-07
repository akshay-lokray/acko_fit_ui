export interface FormData {
  gender: string;
  name: string;
  selectedOptions: string[];
  activityLevel: string;
  age: number;
  height: number;
  heightUnit: "cm" | "ft-in";
  currentWeight: number;
  weightUnit: "kg" | "lb";
  goalPace: number; // kg per week
  targetWeight: number;
  autoTrackEnabled: boolean;
  medicalConditions: string[];
}
