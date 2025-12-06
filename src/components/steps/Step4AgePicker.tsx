import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { ArrowLeft, ArrowRight, ChevronLeft, ChevronRight } from "lucide-react"

interface Step4AgePickerProps {
  age: number
  onAgeChange: (age: number) => void
  onNext: () => void
  onBack: () => void
}

export function Step4AgePicker({
  age,
  onAgeChange,
  onNext,
  onBack,
}: Step4AgePickerProps) {
  const [displayAge, setDisplayAge] = useState(age || 20)

  useEffect(() => {
    if (age) {
      setDisplayAge(age)
    }
  }, [age])

  const handleDecrease = () => {
    const newAge = Math.max(1, displayAge - 1)
    setDisplayAge(newAge)
    onAgeChange(newAge)
  }

  const handleIncrease = () => {
    const newAge = Math.min(120, displayAge + 1)
    setDisplayAge(newAge)
    onAgeChange(newAge)
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-foreground">
          What's your Age?
        </h1>
        <p className="text-muted-foreground">
          Your age determines how much you should consume. (Select your age in years)
        </p>
      </div>

      <div className="flex items-center justify-center gap-8 py-8">
        <button
          onClick={handleDecrease}
          className="p-2 text-green-600 hover:text-green-700 transition-colors"
          aria-label="Decrease age"
        >
          <ChevronLeft className="h-8 w-8" />
        </button>

        <div className="relative w-32 h-64 flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            {[displayAge - 2, displayAge - 1, displayAge, displayAge + 1, displayAge + 2].map(
              (num, index) => {
                const isCenter = index === 2
                const distance = Math.abs(index - 2)
                return (
                  <div
                    key={num}
                    className={`absolute transition-all ${
                      isCenter
                        ? "text-5xl font-bold text-green-600 opacity-100"
                        : distance === 1
                        ? "text-3xl text-gray-400 opacity-60"
                        : "text-xl text-gray-300 opacity-30"
                    }`}
                    style={{
                      transform: `translateY(${(index - 2) * 60}px)`,
                    }}
                  >
                    {num > 0 ? num : ""}
                  </div>
                )
              }
            )}
          </div>
        </div>

        <button
          onClick={handleIncrease}
          className="p-2 text-green-600 hover:text-green-700 transition-colors"
          aria-label="Increase age"
        >
          <ChevronRight className="h-8 w-8" />
        </button>
      </div>
    </div>
  )
}

