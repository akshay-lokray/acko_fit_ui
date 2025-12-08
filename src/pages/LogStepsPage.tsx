import { useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ArrowLeft, Footprints } from "lucide-react"
import { useUserProfileStore } from "@/store/userProfileStore"

export function LogStepsPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { formData: profile } = useUserProfileStore()
  const formData = (location.state as { formData?: any })?.formData || {}

  const [steps, setSteps] = useState("")
  const [notes, setNotes] = useState("")
  const [error, setError] = useState("")
  const [successMessage, setSuccessMessage] = useState("")

  const handleSubmit = async () => {
    if (!steps.trim() || Number(steps) <= 0) {
      setError("Enter your step count to log.")
      return
    }
    const userId = profile.mobile || formData.mobile || "unknown-user"
    const payload = {
      userId,
      habit: "steps",
      value: Number(steps),
      meta: {
        quickNote: notes.trim(),
      },
    }

    try {
      const res = await fetch("/api/habits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const msg = await res.text()
        throw new Error(msg || `Step log failed: ${res.status}`)
      }

      setError("")
      setSuccessMessage(`Steps tracked: ${payload.value}`)
      setTimeout(() => {
        navigate("/home", { state: { formData } })
      }, 3000)
    } catch (err) {
      console.error(err)
      setError("Unable to save right now. Please try again.")
    }
  }

  return (
    <div className="min-h-screen bg-white p-4 font-sans relative">
      <div className="max-w-md mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <p className="text-xs text-gray-500 uppercase font-semibold">Daily Objective</p>
            <h1 className="text-2xl font-bold text-gray-900">Log your steps</h1>
            <p className="text-sm text-gray-500">Target: 5,000 steps today.</p>
          </div>
        </div>

        <Card className="p-4 space-y-4">
          <div className="space-y-2">
            <p className="text-sm font-semibold text-gray-800">Steps walked</p>
            <Input
              type="number"
              placeholder="e.g., 5200"
              value={steps}
              onChange={(e) => setSteps(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <p className="text-sm font-semibold text-gray-800">Add a quick note (optional)</p>
            <textarea
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
              rows={3}
              placeholder="e.g., morning walk + evening jog"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <Button className="w-full h-11" onClick={handleSubmit}>
            Save steps
          </Button>
        </Card>

        <div className="text-center text-xs text-gray-500 pb-6">
          Keep moving — every step counts toward your 5k goal today.
        </div>
      </div>

      {successMessage && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/20 backdrop-blur-sm z-40">
          <div className="bg-white shadow-xl rounded-xl px-6 py-4 text-center border border-emerald-100">
            <div className="flex items-center justify-center gap-2 text-emerald-700 font-semibold text-sm">
              <Footprints className="h-4 w-4" />
              <span>{successMessage}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

