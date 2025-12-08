import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"

interface Step1NameInputProps {
  name: string
  mobile: string
  onNameChange: (name: string) => void
  onMobileChange: (mobile: string) => void
}

export function Step1NameInput({
  name,
  mobile,
  onNameChange,
  onMobileChange,
}: Step1NameInputProps) {
  const handleMobileChange = (value: string) => {
    const numericValue = value.replace(/\D/g, "")
    onMobileChange(numericValue)
  }

  const isMobileValid = /^\d{10}$/.test(mobile)

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
          <div className="space-y-2">
            <label htmlFor="mobile" className="text-sm font-medium">
              Mobile number
            </label>
            <Input
              id="mobile"
              type="tel"
              inputMode="numeric"
              placeholder="Enter your mobile number"
              value={mobile}
              maxLength={10}
              onChange={(e) => handleMobileChange(e.target.value)}
              className="h-12 text-base"
            />
            {!isMobileValid && mobile.length > 0 && (
              <p className="text-sm text-destructive">
                Please enter a valid 10-digit mobile number
              </p>
            )}
          </div>
        </div>
      </Card>
    </div>
  )
}

