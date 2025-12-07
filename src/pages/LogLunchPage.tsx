import { useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Upload, Camera, ArrowLeft, Info, Salad } from "lucide-react"
import { useUserProfileStore } from "@/store/userProfileStore"

export function LogLunchPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { formData: profile } = useUserProfileStore()
  const formData = (location.state as { formData?: any })?.formData || {}
  const [calories, setCalories] = useState("")
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [mealType, setMealType] = useState<"Breakfast" | "Lunch" | "Dinner" | "Snack">("Lunch")
  const [notes, setNotes] = useState("")
  const [error, setError] = useState("")
  const [successMessage, setSuccessMessage] = useState("")
  const [successCalories, setSuccessCalories] = useState<number | null>(null)

  const handleSubmit = async () => {
    const userId = profile.mobile || formData.mobile || "unknown-user"
    const quickNote = notes.trim()
    const meta = { mealType: mealType.toLowerCase(), quickNote }

    if (!photoFile && !calories.trim()) {
      setError("Add a photo or enter calories to log your meal.")
      return
    }

    try {
      if (photoFile) {
        const form = new FormData()
        form.append("userId", userId)
        form.append("image", photoFile, photoFile.name)
        form.append("meta", new Blob([JSON.stringify(meta)], { type: "application/json" }))

        const res = await fetch("/api/habits/calories/analyze-image", {
          method: "POST",
          body: form,
        })

        if (!res.ok) {
          const msg = await res.text()
          throw new Error(msg || `Image upload failed: ${res.status}`)
        }

        // Try to read calorie estimate from response (best-effort)
        let calorieValue: number | null = null
        try {
          const data = await res.json()
          const parsed = Number(data?.value ?? data?.calories ?? data?.calorie)
          calorieValue = Number.isFinite(parsed) ? parsed : null
        } catch (_) {
          // ignore parse errors; fall back to null
        }
        setSuccessCalories(calorieValue)
        setSuccessMessage(
          calorieValue != null
            ? `Calories tracked: ${calorieValue} kcal`
            : "Calories tracked successfully!"
        )
      } else {
        const payload = {
          userId,
          habit: "calorie",
          value: Number(calories),
          meta,
        }

        const res = await fetch("/api/habits", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })

        if (!res.ok) {
          const msg = await res.text()
          throw new Error(msg || `Manual calorie log failed: ${res.status}`)
        }

        const calorieValue = Number(calories)
        setSuccessCalories(Number.isFinite(calorieValue) ? calorieValue : null)
        setSuccessMessage(
          Number.isFinite(calorieValue)
            ? `Calories tracked: ${calorieValue} kcal`
            : "Calories tracked successfully!"
        )
      }

      setError("")
      setTimeout(() => {
        navigate("/home", { state: { formData } })
      }, 3000)
    } catch (err) {
      console.error(err)
      setError("Unable to save right now. Please try again.")
    }
  }

  const handleFileChange = (file: File | null) => {
    if (!file) return
    setPhotoFile(file)
    setError("")
  }

  return (
    <div className="min-h-screen bg-white p-4 pb-24 font-sans relative">
      <div className="max-w-md mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <p className="text-xs text-gray-500 uppercase font-semibold">Daily Objective</p>
            <h1 className="text-2xl font-bold text-gray-900">Log your meal</h1>
            <p className="text-sm text-gray-500">Upload a photo or enter calories manually.</p>
          </div>
        </div>

        <Card className="p-4 space-y-5">
          <div className="space-y-2">
            <p className="text-sm font-semibold text-gray-800">Meal type</p>
            <div className="flex flex-wrap gap-2">
              {(["Breakfast", "Lunch", "Dinner", "Snack"] as const).map((type) => (
                <Button
                  key={type}
                  type="button"
                  variant={mealType === type ? "default" : "outline"}
                  className={`h-9 px-3 text-sm ${mealType === type ? "bg-emerald-600 hover:bg-emerald-700" : ""}`}
                  onClick={() => setMealType(type)}
                >
                  {type}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-semibold text-gray-800">Photo of meal</p>
            <label className="flex items-center gap-3 border border-dashed border-gray-300 rounded-lg p-3 cursor-pointer hover:border-emerald-400 transition-colors">
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
              />
              <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Camera className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-800">
                  {photoFile ? photoFile.name : "Take a photo or upload from gallery"}
                </p>
                <p className="text-xs text-gray-500">JPG, PNG up to 10MB</p>
              </div>
              <Upload className="h-4 w-4 text-gray-400" />
            </label>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-semibold text-gray-800">Enter calories manually</p>
            <Input
              type="number"
              placeholder="e.g., 650"
              value={calories}
              onChange={(e) => setCalories(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <p className="text-sm font-semibold text-gray-800">Add a quick note</p>
            <textarea
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
              rows={3}
              placeholder="e.g., paneer bowl with veggies, olive oil drizzle"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <Button className="w-full h-11" onClick={handleSubmit}>
            Save lunch log
          </Button>
        </Card>

        <Card className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Info className="h-4 w-4 text-emerald-600" />
            <p className="text-sm font-semibold text-gray-800">Quick tips</p>
          </div>
          <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
            <li>Natural light helps the AI estimate portions better.</li>
            <li>Add calories if the photo isn’t clear.</li>
            <li>Homemade? Use the closest dish name for accuracy.</li>
          </ul>
        </Card>

        <Card className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Salad className="h-4 w-4 text-emerald-600" />
            <p className="text-sm font-semibold text-gray-800">What to capture</p>
          </div>
          <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
            <li>Whole plate in frame plus a reference item (fork/cup) for scale.</li>
            <li>Include sauces or sides so calories aren’t undercounted.</li>
            <li>If mixed bowl, give a quick note: e.g., “quinoa + paneer + veggies”.</li>
          </ul>
        </Card>

      </div>
      {successMessage && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/20 backdrop-blur-sm z-40">
          <div className="bg-white shadow-xl rounded-xl px-6 py-4 text-center border border-emerald-100">
            <p className="text-sm font-semibold text-emerald-700">{successMessage}</p>
            {successCalories != null && (
              <p className="text-xs text-gray-600 mt-1">Approx. {successCalories} kcal</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

