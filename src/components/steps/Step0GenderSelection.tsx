import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowRight, User, Users } from "lucide-react";

interface Step0GenderSelectionProps {
  gender: string;
  onGenderChange: (gender: string) => void;
  onNext: () => void;
}

export function Step0GenderSelection({
  gender,
  onGenderChange,
  onNext,
}: Step0GenderSelectionProps) {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-foreground">
          What's your gender?
        </h1>
        <p className="text-muted-foreground">
          This helps us personalize your fitness journey
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card
          className={`p-6 cursor-pointer transition-all hover:shadow-md rounded-lg text-center ${
            gender === "male"
              ? "border-green-500 border-2 bg-green-50 dark:bg-green-950/20"
              : "border border-gray-200 dark:border-gray-700"
          }`}
          onClick={() => onGenderChange("male")}
        >
          <div className="flex flex-col items-center gap-4">
            <div
              className={`p-4 rounded-full ${
                gender === "male"
                  ? "bg-green-100 dark:bg-green-900/30"
                  : "bg-gray-100 dark:bg-gray-800"
              }`}
            >
              <User
                className={`h-12 w-12 ${
                  gender === "male"
                    ? "text-green-600 dark:text-green-400"
                    : "text-gray-600 dark:text-gray-400"
                }`}
              />
            </div>
            <span
              className={`font-semibold text-lg ${
                gender === "male"
                  ? "text-green-700 dark:text-green-400"
                  : "text-gray-900 dark:text-gray-100"
              }`}
            >
              Male
            </span>
          </div>
        </Card>

        <Card
          className={`p-6 cursor-pointer transition-all hover:shadow-md rounded-lg text-center ${
            gender === "female"
              ? "border-green-500 border-2 bg-green-50 dark:bg-green-950/20"
              : "border border-gray-200 dark:border-gray-700"
          }`}
          onClick={() => onGenderChange("female")}
        >
          <div className="flex flex-col items-center gap-4">
            <div
              className={`p-4 rounded-full ${
                gender === "female"
                  ? "bg-green-100 dark:bg-green-900/30"
                  : "bg-gray-100 dark:bg-gray-800"
              }`}
            >
              <Users
                className={`h-12 w-12 ${
                  gender === "female"
                    ? "text-green-600 dark:text-green-400"
                    : "text-gray-600 dark:text-gray-400"
                }`}
              />
            </div>
            <span
              className={`font-semibold text-lg ${
                gender === "female"
                  ? "text-green-700 dark:text-green-400"
                  : "text-gray-900 dark:text-gray-100"
              }`}
            >
              Female
            </span>
          </div>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button
          onClick={onNext}
          disabled={!gender}
          className="h-12 px-8"
          size="lg"
        >
          Next
          <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}
