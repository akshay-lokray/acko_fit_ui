import { useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ArrowLeft, Droplets } from "lucide-react"
import { useUserProfileStore } from "@/store/userProfileStore"

export function LogWaterPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { formData: profile } = useUserProfileStore()
  const formData = (location.state as { formData?: any })?.formData || {}

  const [amount, setAmount] = useState("")
  const [notes, setNotes] = useState("")
  const [error, setError] = useState("")
  const [successMessage, setSuccessMessage] = useState("")

  const handleSubmit = async () => {
    if (!amount.trim() || Number(amount) <= 0) {
      setError("Enter the water amount (ml).")
      return
    }
    const userId = profile.mobile || formData.mobile || "unknown-user"
    const payload = {
      userId,
      habit: "water",
      value: Number(amount),
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
        throw new Error(msg || `Water log failed: ${res.status}`)
      }

      setError("")
      setSuccessMessage(`Water logged: ${payload.value} ml`)
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
            <h1 className="text-2xl font-bold text-gray-900">Log your water</h1>
            <p className="text-sm text-gray-500">Stay hydrated — track your intake.</p>
          </div>
        </div>

        <Card className="p-4 space-y-4">
          <div className="space-y-2">
            <p className="text-sm font-semibold text-gray-800">Water consumed (ml)</p>
            <Input
              type="number"
              placeholder="e.g., 300"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <p className="text-sm font-semibold text-gray-800">Add a quick note (optional)</p>
            <textarea
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
              rows={3}
              placeholder="e.g., after workout"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <Button className="w-full h-11" onClick={handleSubmit}>
            Save water log
          </Button>
        </Card>

        <div className="text-center text-xs text-gray-500 pb-6">
          Hydration boosts recovery — sip regularly through the day.
        </div>
      </div>

      {successMessage && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/20 backdrop-blur-sm z-40">
          <div className="bg-white shadow-xl rounded-xl px-6 py-4 text-center border border-emerald-100">
            <div className="flex items-center justify-center gap-2 text-emerald-700 font-semibold text-sm">
              <Droplets className="h-4 w-4" />
              <span>{successMessage}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

