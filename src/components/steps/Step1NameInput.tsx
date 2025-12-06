import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { ArrowRight, ArrowLeft } from "lucide-react"

interface Step1NameInputProps {
  name: string
  onNameChange: (name: string) => void
  onNext: () => void
  onBack: () => void
}

export function Step1NameInput({ name, onNameChange, onNext, onBack }: Step1NameInputProps) {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-foreground">
          What's your name?
        </h1>
        <p className="text-muted-foreground">
          Let's personalize your fitness journey
        </p>
      </div>

      <Card className="p-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="name" className="text-sm font-medium">
              Name
            </label>
            <Input
              id="name"
              type="text"
              placeholder="Enter your name"
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              className="h-12 text-base"
              autoFocus
            />
          </div>
        </div>
      </Card>
    </div>
  )
}

