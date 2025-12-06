import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ArrowRight } from "lucide-react"

interface Step1GenderSelectionProps {
    gender: 'male' | 'female' | ''
    onGenderChange: (gender: 'male' | 'female') => void
    onNext: () => void
}

export function Step1GenderSelection({ gender, onGenderChange, onNext }: Step1GenderSelectionProps) {
    return (
        <div className="space-y-6">
            <div className="text-center space-y-2">
                <h1 className="text-3xl font-bold text-foreground">
                    Select your gender
                </h1>
                <p className="text-muted-foreground">
                    This helps us calculate your personalized plan
                </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
                {[
                    { id: 'male', label: 'Male', emoji: '👨' },
                    { id: 'female', label: 'Female', emoji: '👩' }
                ].map((option) => (
                    <Card
                        key={option.id}
                        className={`p-6 cursor-pointer transition-all hover:shadow-md text-center space-y-4 ${gender === option.id
                            ? "border-green-500 border-2 bg-green-50 dark:bg-green-950/20"
                            : "border border-gray-200 dark:border-gray-700"
                            }`}
                        onClick={() => onGenderChange(option.id as 'male' | 'female')}
                    >
                        <div className="text-6xl">{option.emoji}</div>
                        <div className={`font-semibold text-lg ${gender === option.id
                            ? "text-green-700 dark:text-green-400"
                            : "text-gray-900 dark:text-gray-100"
                            }`}>
                            {option.label}
                        </div>
                    </Card>
                ))}
            </div>

            <div className="flex justify-end p-2">
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
    )
}
