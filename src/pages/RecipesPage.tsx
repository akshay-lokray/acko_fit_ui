import { useState, useEffect, useRef } from "react";
import type {
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
} from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Search,
  Bookmark,
  BookmarkCheck,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

const HARD_CODED_USER_ID = "9795784244";

// Types
type RecipeSuggestion = string;

interface RecipeDetail {
  title: string;
  description: string;
  image?: string;
  serves?: number;
  category?: string;
  calories?: number;
  carbs?: number;
  fat?: number;
  protein?: number;
  ingredients?: string[];
  directions?: string[];
  nutrition?: {
    calories?: number;
    totalFat?: number;
    saturatedFat?: number;
    polyunsaturatedFat?: number;
    monounsaturatedFat?: number;
    transFat?: number;
    cholesterol?: number;
    sodium?: number;
    totalCarbohydrates?: number;
    dietaryFiber?: number;
    sugars?: number;
    addedSugars?: number;
    sugarAlcohols?: number;
    protein?: number;
    vitaminD?: number;
    calcium?: number;
    iron?: number;
    potassium?: number;
    vitaminA?: number;
    vitaminC?: number;
  };
}

interface MealDetail {
  name: string;
  description: string;
  nutrition?: {
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
  };
}

interface MealPlanResponse {
  userId: string;
  breakfastDetail?: MealDetail;
  lunchDetail?: MealDetail;
  eveningSnackDetail?: MealDetail;
  dinnerDetail?: MealDetail;
}

// API Functions
const fetchSuggestions = async (
  query: string,
  signal?: AbortSignal
): Promise<RecipeSuggestion[]> => {
  try {
    const response = await fetch(
      `/api/ai/recipes/suggestions?query=${encodeURIComponent(query)}`,
      { signal }
    );
    if (!response.ok) throw new Error("Failed to fetch suggestions");
    const data = await response.json();
    // API returns an array of strings (recipe names)
    if (Array.isArray(data)) {
      return data.filter((item): item is string => typeof item === "string");
    }
    return [];
  } catch (error) {
    // Ignore abort errors
    if (error instanceof Error && error.name === "AbortError") {
      return [];
    }
    console.error("Error fetching suggestions:", error);
    return [];
  }
};

const fetchRecipeDetails = async (
  dishName: string
): Promise<RecipeDetail | null> => {
  try {
    const response = await fetch(
      `/api/ai/recipes/search?dishName=${encodeURIComponent(dishName)}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    if (!response.ok) throw new Error("Failed to fetch recipe details");
    const data = await response.json();

    // Parse the API response (which is likely a description string)
    return parseRecipeDescription(data, dishName);
  } catch (error) {
    console.error("Error fetching recipe details:", error);
    return null;
  }
};

const fetchMealPlan = async (userId: string): Promise<MealPlanResponse | null> => {
  try {
    const response = await fetch(`/api/users/${encodeURIComponent(userId)}/meal-plan`);
    if (!response.ok) throw new Error("Failed to fetch meal plan");
    const data = await response.json();
    return data as MealPlanResponse;
  } catch (error) {
    console.error("Error fetching meal plan:", error);
    return null;
  }
};

// Parse recipe description from API response
const parseRecipeDescription = (
  data: unknown,
  dishName: string
): RecipeDetail => {
  // If data is already structured, use it
  if (typeof data === "object" && data !== null && !Array.isArray(data)) {
    const obj = data as Record<string, unknown>;
    const nutrition = (obj.nutrition as Record<string, unknown>) || {};

    // Parse recipe/directions string into array
    const recipeText = (obj.recipe as string) || "";
    const directions = recipeText
      ? recipeText
          .split(/\d+\./)
          .map((step) => step.trim())
          .filter((step) => step.length > 0)
      : [];

    return {
      title:
        (obj.dishName as string) ||
        (obj.title as string) ||
        (obj.name as string) ||
        dishName,
      description:
        (obj.healthAssessment as string) ||
        (obj.description as string) ||
        (obj.text as string) ||
        "",
      image: (obj.imageUrl as string) || (obj.image as string) || "",
      serves: (obj.serves as number) || (obj.servings as number) || 4,
      category:
        (obj.cuisine as string) ||
        (obj.category as string) ||
        (obj.tag as string) ||
        "",
      calories: (nutrition.calories as number) || (obj.calories as number),
      carbs:
        (nutrition.carbs as number) ||
        (nutrition.carbohydrates as number) ||
        (obj.carbs as number) ||
        (obj.carbohydrates as number),
      fat: (nutrition.fat as number) || (obj.fat as number),
      protein: (nutrition.protein as number) || (obj.protein as number),
      ingredients: Array.isArray(obj.ingredients)
        ? (obj.ingredients as string[])
        : typeof obj.ingredients === "string"
        ? obj.ingredients.split("\n").filter((s: string) => s.trim())
        : undefined,
      directions:
        directions.length > 0
          ? directions
          : Array.isArray(obj.directions)
          ? (obj.directions as string[])
          : Array.isArray(obj.instructions)
          ? (obj.instructions as string[])
          : typeof obj.directions === "string"
          ? obj.directions.split("\n").filter((s: string) => s.trim())
          : typeof obj.instructions === "string"
          ? obj.instructions.split("\n").filter((s: string) => s.trim())
          : [],
      nutrition: {
        calories: nutrition.calories as number,
        totalFat: nutrition.fat as number,
        protein: nutrition.protein as number,
        totalCarbohydrates: nutrition.carbs as number,
        dietaryFiber: nutrition.fiber as number,
        sugars: nutrition.sugar as number,
        sodium: nutrition.sodium as number,
        ...(nutrition as RecipeDetail["nutrition"]),
      },
    };
  }

  // If data is a string (description), try to parse it
  const description = typeof data === "string" ? data : JSON.stringify(data);

  // Extract ingredients (lines starting with numbers, dashes, or bullet points)
  const ingredientMatches = description.match(
    /(?:^|\n)[\s]*[-•\d]+[\s]+(.+?)(?=\n|$)/gm
  );
  const ingredients = ingredientMatches
    ? ingredientMatches.map((m) => m.replace(/^[\s]*[-•\d]+[\s]+/, "").trim())
    : [];

  // Extract directions/steps (numbered steps)
  const directionMatches = description.match(
    /(?:^|\n)[\s]*\d+[.)][\s]+(.+?)(?=\n|$)/gm
  );
  const directions = directionMatches
    ? directionMatches.map((m) => m.replace(/^[\s]*\d+[.)][\s]+/, "").trim())
    : [];

  return {
    title: dishName,
    description,
    serves: 4,
    ingredients: ingredients.length > 0 ? ingredients : undefined,
    directions: directions.length > 0 ? directions : undefined,
  };
};


// Recipe Detail View Component
function RecipeDetailView({
  recipe,
  onBack,
  onBookmark,
  isBookmarked,
}: {
  recipe: RecipeDetail;
  onBack: () => void;
  onBookmark: () => void;
  isBookmarked: boolean;
}) {
  const nutrition = recipe.nutrition || {};
  const calories = recipe.calories || nutrition.calories || 0;
  const carbs = recipe.carbs || nutrition.totalCarbohydrates || 0;
  const fat = recipe.fat || nutrition.totalFat || 0;
  const protein = recipe.protein || nutrition.protein || 0;
  const totalMacros = carbs + fat + protein;

  const radius = 48;
  const circumference = 2 * Math.PI * radius;
  const calorieProgress = Math.min(calories / 400, 1);
  const arcLength = calorieProgress * circumference;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      <div className="sticky top-0 z-20 bg-white border-b border-gray-200 shadow-sm">
        <div className="flex items-center gap-4 px-4 py-3">
          <button
            onClick={onBack}
            className="p-2 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-purple-600" />
          </button>
          <h1 className="text-xl font-bold text-slate-900 flex-1 text-center">
            Recipe Details
          </h1>
          <button
            onClick={onBookmark}
            className="p-2 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors aspect-square"
          >
            {isBookmarked ? (
              <BookmarkCheck className="w-6 h-6 text-emerald-500 fill-emerald-500" />
            ) : (
              <Bookmark className="w-6 h-6 text-purple-600" />
            )}
          </button>
        </div>
        <div className="h-1 bg-gradient-to-r from-purple-600 via-blue-500 to-emerald-500" />
      </div>

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
          {recipe.image && (
            <div className="rounded-3xl overflow-hidden bg-slate-100 shadow-xl">
              <img
                src={recipe.image}
                alt={recipe.title}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            </div>
          )}

          <div className="space-y-3">
            <p className="text-[10px] uppercase tracking-[0.5em] text-slate-400">
              Nutrition
            </p>
            <h2 className="text-3xl font-bold text-slate-900">{recipe.title}</h2>
            <p className="text-xs uppercase tracking-[0.4em] text-slate-400">
              Per serving
            </p>
            {recipe.description && (
              <p className="text-sm text-slate-600">{recipe.description}</p>
            )}
          </div>

          <Card className="rounded-[30px] border border-slate-100 bg-white p-5 shadow-[0_30px_60px_rgba(15,23,42,0.08)]">
            <div className="flex flex-wrap items-center gap-5">
              <div className="relative w-32 h-32">
                <svg className="w-32 h-32" viewBox="0 0 128 128">
                  <circle
                    cx="64"
                    cy="64"
                    r={radius}
                    fill="none"
                    stroke="#e2e8f0"
                    strokeWidth="14"
                  />
                  <circle
                    cx="64"
                    cy="64"
                    r={radius}
                    fill="none"
                    stroke="#f97316"
                    strokeWidth="14"
                    strokeDasharray={`${arcLength} ${circumference}`}
                    strokeDashoffset={circumference * 0.25}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <p className="text-3xl font-bold text-slate-900">{calories}</p>
                  <p className="text-[10px] tracking-[0.5em] text-slate-400">CAL</p>
                </div>
              </div>

              <div className="flex-1 grid grid-cols-2 gap-3">
                {[
                  { label: "Carbs", value: `${carbs}g` },
                  { label: "Fat", value: `${fat}g` },
                  { label: "Protein", value: `${protein}g` },
                  { label: "Total", value: `${Math.max(totalMacros, 0)}g` },
                ].map((metric) => (
                  <div
                    key={metric.label}
                    className="rounded-2xl bg-slate-50 border border-slate-100 px-4 py-3 text-center"
                  >
                    <p className="text-[10px] uppercase tracking-[0.3em] text-slate-400 mb-1">
                      {metric.label}
                    </p>
                    <p className="text-xl font-semibold text-slate-900">
                      {metric.value}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          {recipe.ingredients && recipe.ingredients.length > 0 && (
            <Card className="rounded-[2rem] shadow-lg border border-slate-100 bg-white">
              <div className="px-5 py-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-slate-900">Ingredients</h3>
                  <span className="text-xs text-slate-400">
                    {recipe.ingredients.length} items
                  </span>
                </div>
                <ul className="space-y-2 text-sm text-slate-600">
                  {recipe.ingredients.map((item, index) => (
                    <li key={`ing-${index}`} className="flex items-start gap-2">
                      <span className="mt-1 h-1.5 w-1.5 rounded-full bg-purple-500" />
                      <span className="leading-tight">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Card>
          )}

          {recipe.directions && recipe.directions.length > 0 && (
            <Card className="rounded-[2rem] shadow-lg border border-slate-100 bg-white">
              <div className="px-5 py-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-slate-900">Directions</h3>
                </div>
                <ol className="space-y-3 text-sm text-slate-600">
                  {recipe.directions.map((step, index) => (
                    <li key={`dir-${index}`} className="flex items-start gap-3">
                      <span className="text-xs font-semibold text-emerald-500">
                        {index + 1}.
                      </span>
                      <span className="leading-tight">{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </Card>
          )}

          {(!recipe.ingredients || recipe.ingredients.length === 0) &&
            (!recipe.directions || recipe.directions.length === 0) &&
            recipe.description && (
              <div className="rounded-[2rem] border border-slate-100 bg-white/80 px-5 py-4 shadow-lg text-sm text-slate-600">
                {recipe.description}
              </div>
            )}
        </div>
      </main>
    </div>
  );
}

export function RecipesPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<RecipeSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [recipeDetail, setRecipeDetail] = useState<RecipeDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [mealPlan, setMealPlan] = useState<MealPlanResponse | null>(null);
  const [mealPlanLoading, setMealPlanLoading] = useState(false);
  const [bookmarkedRecipes, setBookmarkedRecipes] = useState<Set<string>>(
    () => new Set()
  );
  const searchTimeoutRef = useRef<number | null>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const suggestionClickedRef = useRef<boolean>(false);

  // Handle search with debouncing and race condition prevention
  useEffect(() => {
    // Reset suggestion clicked flag when query changes
    suggestionClickedRef.current = false;

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    if (searchQuery.trim().length > 3) {
      // Create new AbortController for this request
      abortControllerRef.current = new AbortController();
      const currentController = abortControllerRef.current;

      searchTimeoutRef.current = window.setTimeout(async () => {
        // Only fetch if suggestion wasn't clicked
        if (!suggestionClickedRef.current) {
          try {
            const results = await fetchSuggestions(
              searchQuery,
              currentController.signal
            );
            // Only update if this is still the current request and suggestion wasn't clicked
            if (
              !currentController.signal.aborted &&
              !suggestionClickedRef.current
            ) {
              setSuggestions(results);
              setShowSuggestions(true);
            }
          } catch (error) {
            // Ignore abort errors
            if (
              !(error instanceof Error && error.name === "AbortError") &&
              !suggestionClickedRef.current
            ) {
              console.error("Error fetching suggestions:", error);
            }
          }
        }
      }, 300);
    } else {
      // Use setTimeout to avoid synchronous setState in effect
      setTimeout(() => {
        if (!suggestionClickedRef.current) {
          setSuggestions([]);
          setShowSuggestions(false);
        }
      }, 0);
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [searchQuery]);

  const mealRows: Array<[string, MealDetail | undefined]> = mealPlan
    ? [
        ["Breakfast", mealPlan.breakfastDetail],
        ["Lunch", mealPlan.lunchDetail],
        ["Evening Snack", mealPlan.eveningSnackDetail],
        ["Dinner", mealPlan.dinnerDetail],
      ]
    : [];

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const loadMealPlan = async () => {
      setMealPlanLoading(true);
      try {
        const plan = await fetchMealPlan(HARD_CODED_USER_ID);
        setMealPlan(plan);
      } finally {
        setMealPlanLoading(false);
      }
    };

    loadMealPlan();
  }, []);

  const handleSuggestionClick = async (suggestion: string) => {
    // Mark that suggestion was clicked to prevent re-rendering
    suggestionClickedRef.current = true;

    // Cancel any pending suggestion requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    setSearchQuery(suggestion);
    setShowSuggestions(false);
    setSuggestions([]); // Clear suggestions immediately
    setLoading(true);
    const details = await fetchRecipeDetails(suggestion);
    setLoading(false);
    if (details) {
      setRecipeDetail(details);
    }
  };

  const handleSearch = async () => {
    if (searchQuery.trim().length > 0) {
      // Mark that we're doing a direct search
      suggestionClickedRef.current = true;

      // Cancel any pending suggestion requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      setShowSuggestions(false);
      setSuggestions([]);
      setLoading(true);
      const details = await fetchRecipeDetails(searchQuery.trim());
      setLoading(false);
      if (details) {
        setRecipeDetail(details);
      }
    }
  };

  const handleMealDetail = async (mealName?: string) => {
    if (!mealName?.trim()) return;
    setShowSuggestions(false);
    setSuggestions([]);
    setLoading(true);
    const details = await fetchRecipeDetails(mealName.trim());
    setLoading(false);
    if (details) {
      setRecipeDetail(details);
    }
  };

  const handleKeyDown = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSearch();
    }
  };

  const toggleBookmark = (
    recipeId: string,
    e?: ReactMouseEvent<HTMLButtonElement>
  ) => {
    if (e) e.stopPropagation();
    setBookmarkedRecipes((prev) => {
      const next = new Set(prev);
      if (next.has(recipeId)) {
        next.delete(recipeId);
      } else {
        next.add(recipeId);
      }
      return next;
    });
  };

  // Show recipe detail view if available
  if (recipeDetail) {
    return (
      <RecipeDetailView
        recipe={recipeDetail}
        onBack={() => setRecipeDetail(null)}
        onBookmark={() => toggleBookmark(recipeDetail.title)}
        isBookmarked={bookmarkedRecipes.has(recipeDetail.title)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {/* Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 bg-white/80 z-50 flex items-center justify-center">
          <div className="text-black">Loading recipe...</div>
        </div>
      )}

      {mealPlanLoading && (
        <div className="fixed inset-0 bg-white/80 z-50 flex items-center justify-center">
          <div className="text-black">Loading meal plan...</div>
        </div>
      )}

      {/* Header */}
      <div className="sticky top-0 z-20 bg-white border-b border-purple-100 shadow-sm">
        <div className="flex items-center gap-4 px-4 py-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-purple-600" />
          </button>
          <h1 className="text-xl font-bold text-slate-900 flex-1 text-center">
            Recipes
          </h1>
          <button className="p-2 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors aspect-square flex items-center justify-center">
            <Bookmark className="w-6 h-6 text-emerald-600" />
          </button>
        </div>
      </div>

      {/* Hero */}
      <section className="bg-gradient-to-br from-purple-600 via-purple-500 to-emerald-500 text-white">
        <div className="max-w-4xl mx-auto px-6 py-10 space-y-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-white/70">
                Daily fuel
              </p>
              <h2 className="text-3xl font-bold">Plan every meal</h2>
              <p className="text-sm text-white/80 mt-1">
                Fresh ideas, tailored for you. Tap into the day’s meal plan instantly.
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs">Synced with your goals</p>
              <p className="text-lg font-semibold mt-1">Balanced • Flexible • Smart</p>
            </div>
          </div>
          <div className="bg-white/90 rounded-2xl p-4 shadow-2xl relative" ref={suggestionsRef}>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-purple-500" />
              <Input
                type="text"
                placeholder="Search for recipes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={() => {
                  if (suggestions.length > 0) setShowSuggestions(true);
                }}
                className="pl-10 bg-white text-slate-900 border border-transparent focus:border-purple-500 focus-visible:ring-purple-500"
              />
            </div>
            {/* Suggestions Dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute inset-x-4 top-full mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl z-40 max-h-60 overflow-y-auto text-slate-900">
                {suggestions.map((suggestion, index) => (
                  <button
                    key={`${suggestion}-${index}`}
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="w-full px-4 py-3 text-left hover:bg-slate-50 transition-colors border-b border-slate-200 last:border-b-0"
                  >
                    <span className="text-slate-900">{suggestion}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Content Sections */}
      {mealRows.length > 0 && (
        <section className="px-4 py-6 space-y-4 max-w-3xl mx-auto">
          {mealRows.map(([label, detail]) =>
            detail ? (
              <Card
                key={label}
                className="p-4 border border-purple-100 rounded-2xl shadow-lg bg-white text-slate-900 cursor-pointer transition hover:-translate-y-0.5 hover:shadow-2xl"
                onClick={() => handleMealDetail(detail.name)}
              >
                <p className="text-xs uppercase tracking-[0.4em] text-purple-400">
                  {label}
                </p>
                <h3 className="text-xl font-bold text-black mt-1">{detail.name}</h3>
                <p className="text-sm text-gray-500 mb-2">{detail.description}</p>
                <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                  <span>Calories: {detail.nutrition?.calories ?? "-"}</span>
                  <span>Protein: {detail.nutrition?.protein ?? "-"}</span>
                  <span>Carbs: {detail.nutrition?.carbs ?? "-"}</span>
                  <span>Fat: {detail.nutrition?.fat ?? "-"}</span>
                </div>
              </Card>
            ) : null
          )}
        </section>
      )}

      <div className="flex-1 overflow-y-auto pb-20" />
    </div>
  );
}
