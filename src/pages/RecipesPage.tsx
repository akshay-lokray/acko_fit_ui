import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    ArrowLeft,
    Flame,
    Clock,
    ChevronRight,
    Minus,
    Plus,
    Check,
    ShoppingCart,
    ExternalLink,
    PlayCircle,
    Utensils,
    ChefHat,
    Bell
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

// --- Types ---
interface Ingredient {
    id: string;
    name: string;
    quantity: string;
    price: number;
}

interface Recipe {
    id: string;
    title: string;
    calories: number;
    time: string;
    image: string; // Emoji for now, or url
    rating: number;
    servings: number;
    tags: string[];
    videoUrl?: string;
    ingredients: Ingredient[];
}

// --- Mock Data ---
const RECIPES: Recipe[] = [
    {
        id: "1",
        title: "High-Protein Lentil Salad",
        calories: 320,
        time: "15 min",
        image: "🥗",
        rating: 4.8,
        servings: 2,
        tags: ["High Protein", "Vegetarian"],
        videoUrl: "https://example.com/video",
        ingredients: [
            { id: "i1", name: "Red Lentils", quantity: "2 cups", price: 80 },
            { id: "i2", name: "Cherry Tomatoes", quantity: "200g", price: 60 },
            { id: "i3", name: "Cucumber", quantity: "1 pc", price: 20 },
            { id: "i4", name: "Red Onion", quantity: "1 medium", price: 15 },
            { id: "i5", name: "Feta Cheese", quantity: "50g", price: 120 },
            { id: "i6", name: "Olive Oil", quantity: "2 tbsp", price: 40 },
        ]
    },
    {
        id: "2",
        title: "Grilled Salmon & Asparagus",
        calories: 520,
        time: "25 min",
        image: "🐟",
        rating: 4.9,
        servings: 1,
        tags: ["Keto", "Omega-3"],
        ingredients: [
            { id: "s1", name: "Salmon Fillet", quantity: "200g", price: 450 },
            { id: "s2", name: "Asparagus", quantity: "1 bunch", price: 120 },
            { id: "s3", name: "Lemon", quantity: "1 pc", price: 10 },
            { id: "s4", name: "Butter", quantity: "20g", price: 30 },
            { id: "s5", name: "Garlic", quantity: "2 cloves", price: 5 },
        ]
    },
    {
        id: "3",
        title: "Berry Blast Smoothie",
        calories: 200,
        time: "5 min",
        image: "🥤",
        rating: 4.7,
        servings: 1,
        tags: ["Breakfast", "Low Carb"],
        ingredients: [
            { id: "b1", name: "Mixed Berries", quantity: "1 cup", price: 200 },
            { id: "b2", name: "Greek Yogurt", quantity: "1/2 cup", price: 80 },
            { id: "b3", name: "Almond Milk", quantity: "200ml", price: 40 },
            { id: "b4", name: "Chia Seeds", quantity: "1 tbsp", price: 20 },
        ]
    }
];

const PROVIDERS = [
    { id: "bb", name: "BigBasket", color: "bg-green-100 text-green-700 border-green-200" },
    { id: "blinkit", name: "Blinkit", color: "bg-yellow-100 text-yellow-700 border-yellow-200" },
    { id: "zepto", name: "Zepto", color: "bg-purple-100 text-purple-700 border-purple-200" },
    { id: "instamart", name: "Instamart", color: "bg-orange-100 text-orange-700 border-orange-200" },
];

export function RecipesPage() {
    const navigate = useNavigate();
    // Added "choice" state
    const [view, setView] = useState<"list" | "choice" | "detail" | "cart" | "success">("list");
    const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
    const [servings, setServings] = useState(2);
    const [selectedIngredients, setSelectedIngredients] = useState<Set<string>>(new Set());
    const [selectedProvider, setSelectedProvider] = useState(PROVIDERS[0]);
    const [notified, setNotified] = useState(false);

    const handleSelectRecipe = (recipe: Recipe) => {
        setSelectedRecipe(recipe);
        setServings(recipe.servings);
        setSelectedIngredients(new Set(recipe.ingredients.map(i => i.id)));
        setNotified(false); // Reset notification state
        setView("choice");
    };

    const toggleIngredient = (id: string) => {
        const next = new Set(selectedIngredients);
        if (next.has(id)) {
            next.delete(id);
        } else {
            next.add(id);
        }
        setSelectedIngredients(next);
    };

    const getTotalPrice = () => {
        if (!selectedRecipe) return 0;
        return selectedRecipe.ingredients
            .filter(i => selectedIngredients.has(i.id))
            .reduce((acc, curr) => acc + curr.price, 0);
    };

    // --- Renderers ---

    const renderList = () => (
        <div className="min-h-screen bg-gray-50/50 p-6 font-sans">
            <div className="flex items-center gap-4 mb-8">
                <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                    <ArrowLeft className="w-6 h-6" />
                </Button>
                <h1 className="text-2xl font-bold text-gray-900">Health Recipes</h1>
            </div>

            <div className="grid gap-6">
                {RECIPES.map((recipe) => (
                    <Card
                        key={recipe.id}
                        className="p-4 flex gap-4 items-center hover:shadow-lg transition-all cursor-pointer bg-white border-gray-100"
                        onClick={() => handleSelectRecipe(recipe)}
                    >
                        <div className="w-24 h-24 bg-orange-50 rounded-2xl flex items-center justify-center text-5xl shadow-sm">
                            {recipe.image}
                        </div>
                        <div className="flex-1">
                            <h3 className="font-bold text-lg text-gray-900">{recipe.title}</h3>
                            <div className="flex items-center gap-4 text-sm text-gray-500 mt-2">
                                <span className="flex items-center gap-1"><Flame className="w-4 h-4 text-orange-500" /> {recipe.calories} kcal</span>
                                <span className="flex items-center gap-1"><Clock className="w-4 h-4 text-blue-500" /> {recipe.time}</span>
                            </div>
                            <div className="flex gap-2 mt-3">
                                {recipe.tags.map(tag => (
                                    <span key={tag} className="px-2.5 py-1 bg-gray-100 text-xs font-semibold rounded-lg text-gray-600 border border-gray-200">{tag}</span>
                                ))}
                            </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-300" />
                    </Card>
                ))}
            </div>
        </div>
    );

    const renderChoice = () => {
        if (!selectedRecipe) return null;
        return (
            <div className="min-h-screen bg-white font-sans flex flex-col items-center p-6">
                <div className="w-full flex items-center mb-8">
                    <Button variant="ghost" size="icon" className="-ml-2" onClick={() => setView("list")}>
                        <ArrowLeft className="w-6 h-6 text-gray-900" />
                    </Button>
                </div>

                <div className="w-32 h-32 bg-orange-50 rounded-full flex items-center justify-center text-7xl mb-6 shadow-sm">
                    {selectedRecipe.image}
                </div>
                <h1 className="text-2xl font-bold text-gray-900 text-center mb-2">{selectedRecipe.title}</h1>
                <p className="text-gray-500 text-center mb-10 max-w-xs mx-auto">
                    Choose how you want to experience this meal today.
                </p>

                <div className="w-full max-w-md space-y-4">
                    {/* Option 1: Acko EATS */}
                    <Card className="p-6 border-2 border-gray-100 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 bg-yellow-400 text-yellow-900 text-xs font-bold px-3 py-1 rounded-bl-xl z-10">
                            COMING SOON
                        </div>
                        <div className="flex gap-4 items-start opacity-70">
                            <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 shrink-0">
                                <Utensils className="w-6 h-6" />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-bold text-lg text-gray-900">Order from Acko EATS</h3>
                                <p className="text-sm text-gray-500 mt-1">
                                    Chef-prepared, healthy & hot. Delivered in 30 mins to your door.
                                </p>
                                <Button
                                    variant="outline"
                                    className={`mt-4 w-full gap-2 transition-all ${notified ? 'bg-green-50 text-green-600 border-green-200' : ''}`}
                                    onClick={() => setNotified(true)}
                                    disabled={notified}
                                >
                                    {notified ? (
                                        <>
                                            <Check className="w-4 h-4" /> We'll notify you
                                        </>
                                    ) : (
                                        <>
                                            <Bell className="w-4 h-4" /> Notify me when available
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>
                    </Card>

                    {/* Option 2: Cook Yourself */}
                    <Card
                        className="p-6 border-2 border-emerald-100 bg-emerald-50/30 cursor-pointer hover:border-emerald-500 hover:shadow-md transition-all group"
                        onClick={() => setView("detail")}
                    >
                        <div className="flex gap-4 items-start">
                            <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 shrink-0">
                                <ChefHat className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="font-bold text-lg text-gray-900 group-hover:text-emerald-700 transition-colors">Cook on your own</h3>
                                <p className="text-sm text-gray-600 mt-1">
                                    Get step-by-step instructions and order fresh ingredients instantly.
                                </p>
                                <div className="mt-4 flex items-center gap-2 text-emerald-600 font-bold text-sm">
                                    Start Cooking <ChevronRight className="w-4 h-4" />
                                </div>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
        );
    }

    const renderDetail = () => {
        if (!selectedRecipe) return null;
        return (
            <div className="min-h-screen bg-white flex flex-col font-sans">
                {/* Header Image Area */}
                <div className="h-64 bg-gray-100 relative w-full flex items-center justify-center overflow-hidden">
                    <div className="absolute inset-0 bg-orange-50 flex items-center justify-center text-9xl">
                        {selectedRecipe.image}
                    </div>
                    {/* Back goes to Choice screen now */}
                    <Button variant="secondary" size="icon" className="absolute top-4 left-4 rounded-full bg-white/50 backdrop-blur-md hover:bg-white" onClick={() => setView("choice")}>
                        <ArrowLeft className="w-6 h-6 text-gray-900" />
                    </Button>
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-16 h-16 bg-white/30 backdrop-blur rounded-full flex items-center justify-center">
                            <PlayCircle className="w-10 h-10 text-white fill-white/50" />
                        </div>
                    </div>
                </div>

                <div className="flex-1 p-6 relative -top-6 bg-white rounded-t-3xl shadow-[0_-4px_20px_rgba(0,0,0,0.05)] flex flex-col">
                    <div className="mb-6">
                        <h1 className="text-2xl font-bold text-gray-900 mb-1">{selectedRecipe.title}</h1>
                        <div className="flex items-center gap-2 text-sm">
                            <span className="text-yellow-500 font-bold">★ {selectedRecipe.rating}</span>
                            <span className="text-gray-400">•</span>
                            <span className="text-gray-500">{selectedRecipe.tags.join(", ")}</span>
                        </div>
                    </div>

                    <div className="flex items-center justify-between mb-8 bg-gray-50 p-4 rounded-2xl">
                        <span className="font-semibold text-gray-900">Servings: {servings}</span>
                        <div className="flex items-center gap-3">
                            <button className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center shadow-sm" onClick={() => setServings(Math.max(1, servings - 1))}>
                                <Minus className="w-4 h-4 text-gray-600" />
                            </button>
                            <button className="w-8 h-8 rounded-full bg-emerald-500 border border-emerald-500 flex items-center justify-center shadow-sm shadow-emerald-200" onClick={() => setServings(servings + 1)}>
                                <Plus className="w-4 h-4 text-white" />
                            </button>
                        </div>
                    </div>

                    <div className="flex-1">
                        <h3 className="font-bold text-gray-900 mb-4">Ingredients</h3>
                        <div className="space-y-3">
                            {selectedRecipe.ingredients.map(ing => {
                                const isSelected = selectedIngredients.has(ing.id);
                                return (
                                    <div
                                        key={ing.id}
                                        className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${isSelected ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-gray-100 hover:border-gray-200'}`}
                                        onClick={() => toggleIngredient(ing.id)}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`w-5 h-5 rounded flex items-center justify-center border transition-colors ${isSelected ? 'bg-emerald-500 border-emerald-500' : 'bg-white border-gray-300'}`}>
                                                {isSelected && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
                                            </div>
                                            <span className={`font-medium ${isSelected ? 'text-gray-900' : 'text-gray-500'}`}>{ing.quantity} {ing.name}</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="mt-8">
                        <Button
                            className="w-full h-14 text-lg bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-lg shadow-emerald-200"
                            onClick={() => setView("cart")}
                            disabled={selectedIngredients.size === 0}
                        >
                            Get Ingredients - Send to Cart
                        </Button>
                    </div>
                </div>
            </div>
        );
    };

    const renderCart = () => {
        if (!selectedRecipe) return null;
        const cartItems = selectedRecipe.ingredients.filter(i => selectedIngredients.has(i.id));

        return (
            <div className="min-h-screen bg-gray-50/50 flex flex-col font-sans">
                <div className="bg-white p-6 shadow-sm z-10">
                    <div className="flex items-center gap-4 mb-6">
                        <Button variant="ghost" size="icon" className="-ml-2" onClick={() => setView("detail")}>
                            <ArrowLeft className="w-6 h-6 text-gray-900" />
                        </Button>
                        <h1 className="text-xl font-bold text-gray-900">Review Your Cart</h1>
                    </div>

                    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                        {PROVIDERS.map(p => (
                            <button
                                key={p.id}
                                onClick={() => setSelectedProvider(p)}
                                className={`flex-shrink-0 px-4 py-2 rounded-full border text-sm font-bold transition-all flex items-center gap-2 ${selectedProvider.id === p.id ? p.color + ' ring-2 ring-offset-2 ring-transparent' : 'bg-white border-gray-200 text-gray-500'}`}
                            >
                                {p.name}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-4 border-b border-gray-50 bg-gray-50/50">
                            <h3 className="font-semibold text-gray-700">Ingredients ({cartItems.length})</h3>
                        </div>
                        <div className="divide-y divide-gray-50">
                            {cartItems.map(item => (
                                <div key={item.id} className="p-4 flex items-center justify-between">
                                    <div>
                                        <p className="font-medium text-gray-900">{item.name}</p>
                                        <p className="text-xs text-gray-400">{item.quantity}</p>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <span className="font-bold text-gray-600 text-sm">₹{item.price}</span>
                                        <Switch checked={true} onCheckedChange={(checked) => !checked && toggleIngredient(item.id)} />
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-between items-center">
                            <span className="font-bold text-gray-600">Total</span>
                            <span className="font-bold text-xl text-emerald-600">₹{getTotalPrice()}</span>
                        </div>
                    </div>
                </div>

                <div className="p-6 bg-white border-t border-gray-100">
                    <Button
                        className="w-full h-14 text-lg bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-lg"
                        onClick={() => setView("success")}
                    >
                        Send {cartItems.length} Items to {selectedProvider.name} Cart
                    </Button>
                </div>
            </div>
        );
    };

    const renderSuccess = () => (
        <div className="min-h-screen bg-black/50 backdrop-blur-sm flex items-center justify-center p-6 font-sans">
            <div className="bg-white w-full max-w-sm rounded-3xl p-8 flex flex-col items-center text-center animate-fade-in-up shadow-2xl">
                <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mb-6">
                    <Check className="w-10 h-10 text-emerald-600" strokeWidth={3} />
                </div>

                <h2 className="text-2xl font-bold text-gray-900 mb-2">Success! Cart Ready at {selectedProvider.name}</h2>
                <p className="text-gray-500 mb-8 leading-relaxed">
                    Your {selectedIngredients.size} items have been added to your {selectedProvider.name} account.
                </p>

                <Button
                    className="w-full h-14 text-lg bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-lg mb-4"
                    onClick={() => console.log("Open Deeplink")}
                >
                    Open {selectedProvider.name} App
                </Button>

                <Button variant="ghost" className="text-gray-400" onClick={() => {
                    setView("list");
                    setSelectedRecipe(null);
                }}>
                    Back to Recipes
                </Button>
            </div>
        </div>
    );

    return (
        <>
            {view === "list" && renderList()}
            {view === "choice" && renderChoice()}
            {view === "detail" && renderDetail()}
            {view === "cart" && renderCart()}
            {view === "success" && renderSuccess()}
        </>
    );
}
