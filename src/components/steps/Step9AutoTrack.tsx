import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ArrowLeft, ArrowRight, Camera, X } from "lucide-react"

interface Step9AutoTrackProps {
  autoTrackEnabled: boolean
  onAutoTrackChange: (enabled: boolean) => void
  onNext: () => void
  onBack: () => void
}

export function Step9AutoTrack({
  onAutoTrackChange,
  onNext,
  onBack,
}: Step9AutoTrackProps) {
  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button
          onClick={onNext}
          className="p-2 text-gray-600 hover:text-gray-800 transition-colors"
          aria-label="Skip"
        >
          <X className="h-6 w-6" />
        </button>
      </div>

      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-foreground">
          Snap and Auto-Track Meals with AI
        </h1>
        <p className="text-muted-foreground">
          Just snap a pic from your phone. We will auto-track food photos. Like magic!
        </p>
      </div>

      <Card className="p-6 bg-gradient-to-br from-orange-400 to-red-500 text-white">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="bg-green-100 dark:bg-green-900 px-3 py-1 rounded-full flex items-center gap-2">
              <Camera className="h-4 w-4 text-green-700 dark:text-green-300" />
              <span className="text-sm font-medium text-green-700 dark:text-green-300">
                Detected
              </span>
            </div>
          </div>
          <div>
            <h3 className="text-2xl font-bold mb-2">Oats Pancakes</h3>
            <p className="text-orange-100">1 Plate - 650 Cals</p>
          </div>
          <div className="h-48 bg-white/20 rounded-lg flex items-center justify-center">
            <div className="text-center">
              <Camera className="h-16 w-16 mx-auto mb-2 opacity-50" />
              <p className="text-sm opacity-75">Food Image</p>
            </div>
          </div>
        </div>
      </Card>

      <p className="text-center text-sm text-muted-foreground">
        Your data is secure and private to you.{" "}
        <button className="text-green-600 hover:underline">Know More</button>
      </p>

      <Button
        onClick={() => {
          onAutoTrackChange(true)
          onNext()
        }}
        className="w-full h-14 bg-teal-600 hover:bg-teal-700 text-white text-lg"
        size="lg"
      >
        Enable Auto-Track from Gallery
      </Button>

      <div className="flex justify-between gap-4">
        <Button
          onClick={onBack}
          variant="outline"
          className="h-12 px-6"
          size="lg"
        >
          <ArrowLeft className="mr-2 h-5 w-5" />
          Back
        </Button>
        <Button
          onClick={() => {
            onAutoTrackChange(false)
            onNext()
          }}
          variant="ghost"
          className="h-12 px-6"
          size="lg"
        >
          Skip
          <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
      </div>
    </div>
  )
}

