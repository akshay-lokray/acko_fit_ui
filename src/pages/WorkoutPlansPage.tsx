import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, PlayCircle, Dumbbell, Timer } from "lucide-react";
import { Card } from "@/components/ui/card";

export function WorkoutPlansPage() {
    const navigate = useNavigate();

    const plans = [
        {
            title: "HIIT Intensity",
            duration: "30 min",
            level: "Advanced",
            image: "🔥",
            exercises: 8
        },
        {
            title: "Morning Yoga Flow",
            duration: "20 min",
            level: "Beginner",
            image: "🧘",
            exercises: 5
        },
        {
            title: "Core Crusher",
            duration: "15 min",
            level: "Intermediate",
            image: "💪",
            exercises: 6
        }
    ];

    return (
        <div className="min-h-screen bg-white p-6 font-sans">
            <div className="flex items-center gap-4 mb-8">
                <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                    <ArrowLeft className="w-6 h-6" />
                </Button>
                <h1 className="text-2xl font-bold">Workout Plans</h1>
            </div>

            <div className="grid gap-6">
                {plans.map((plan, i) => (
                    <Card key={i} className="group relative overflow-hidden cursor-pointer">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <Dumbbell className="w-24 h-24" />
                        </div>

                        <div className="p-6 relative z-10">
                            <div className="flex justify-between items-start mb-4">
                                <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center text-2xl">
                                    {plan.image}
                                </div>
                                <span className="px-3 py-1 bg-gray-100 text-xs font-semibold rounded-full uppercase tracking-wide">
                                    {plan.level}
                                </span>
                            </div>

                            <h3 className="text-xl font-bold text-gray-900 mb-2">{plan.title}</h3>

                            <div className="flex items-center gap-4 text-sm text-gray-600">
                                <span className="flex items-center gap-1"><Timer className="w-4 h-4" /> {plan.duration}</span>
                                <span className="flex items-center gap-1"><Dumbbell className="w-4 h-4" /> {plan.exercises} exercises</span>
                            </div>

                            <Button className="w-full mt-6 gap-2" variant="secondary">
                                Start Workout <PlayCircle className="w-4 h-4" />
                            </Button>
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    );
}
