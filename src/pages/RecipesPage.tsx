import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Search,
  Bookmark,
  BookmarkCheck,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

// Types
type RecipeSuggestion = string;

interface Recipe {
  id: string;
  title: string;
  calories: number;
  image: string;
  category: string;
}

interface RecipeSection {
  title: string;
  recipes: Recipe[];
}

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

// Mock data for sections (will be replaced with API data later)
const MOCK_SECTIONS: RecipeSection[] = [
  {
    title: "Immune Support",
    recipes: [
      {
        id: "1",
        title: "Salmon Pate With Cauliflower Dippers",
        calories: 155,
        image:
          "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400",
        category: "Immune Support",
      },
      {
        id: "2",
        title: "Mushrooms, Brussels Sprouts and Farro",
        calories: 375,
        image:
          "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400",
        category: "Immune Support",
      },
    ],
  },
  {
    title: "Pantry Staples",
    recipes: [
      {
        id: "3",
        title: "Buffalo Chicken Wrap",
        calories: 321,
        image:
          "https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=400",
        category: "Pantry Staples",
      },
      {
        id: "4",
        title: "Instant Pot Chickpea Tikka Masala",
        calories: 336,
        image:
          "https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400",
        category: "Pantry Staples",
      },
    ],
  },
  {
    title: "Pre-Workout",
    recipes: [
      {
        id: "5",
        title: "Rice Cakes with Fruit",
        calories: 155,
        image:
          "https://images.unsplash.com/photo-1603048297172-c92544798d5a?w=400",
        category: "Pre-Workout",
      },
      {
        id: "6",
        title: "Peak Protein Bites",
        calories: 131,
        image:
          "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=400",
        category: "Pre-Workout",
      },
    ],
  },
  {
    title: "Post-Workout",
    recipes: [
      {
        id: "7",
        title: "Chicken and Avocado Burrito",
        calories: 368,
        image:
          "https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=400",
        category: "Post-Workout",
      },
      {
        id: "8",
        title: "Quinoa and Spinach Scramble",
        calories: 259,
        image:
          "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400",
        category: "Post-Workout",
      },
    ],
  },
  {
    title: "High Protein",
    recipes: [
      {
        id: "9",
        title: "Grilled Salmon",
        calories: 320,
        image:
          "https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=400",
        category: "High Protein",
      },
      {
        id: "10",
        title: "Protein Power Bowl",
        calories: 450,
        image:
          "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400",
        category: "High Protein",
      },
    ],
  },
];

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
  const [showNutrition, setShowNutrition] = useState(false);
  const nutrition = recipe.nutrition || {};
  const calories = recipe.calories || nutrition.calories || 0;
  const carbs = recipe.carbs || nutrition.totalCarbohydrates || 0;
  const fat = recipe.fat || nutrition.totalFat || 0;
  const protein = recipe.protein || nutrition.protein || 0;

  // Calculate percentages for circular graph
  const totalMacros = carbs + fat + protein;
  const carbsPercent = totalMacros > 0 ? (carbs / totalMacros) * 100 : 0;
  const fatPercent = totalMacros > 0 ? (fat / totalMacros) * 100 : 0;
  const proteinPercent = totalMacros > 0 ? (protein / totalMacros) * 100 : 0;

  // Calculate circumference for SVG circle
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const carbsOffset = circumference - (carbsPercent / 100) * circumference;
  const fatOffset =
    circumference -
    (fatPercent / 100) * circumference -
    (carbsPercent / 100) * circumference;
  const proteinOffset =
    circumference -
    (proteinPercent / 100) * circumference -
    (carbsPercent / 100) * circumference -
    (fatPercent / 100) * circumference;

  return (
    <div className="min-h-screen bg-white text-black">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-sm border-b border-gray-200">
        <div className="flex items-center gap-4 px-4 py-3">
          <button
            onClick={onBack}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-black" />
          </button>
          <h1 className="text-xl font-bold text-black flex-1 text-center">
            Recipe Details
          </h1>
          <button
            onClick={onBookmark}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            {isBookmarked ? (
              <BookmarkCheck className="w-6 h-6 text-emerald-500 fill-emerald-500" />
            ) : (
              <Bookmark className="w-6 h-6 text-black" />
            )}
          </button>
        </div>
      </div>

      <div className="pb-24 bg-white">
        {/* Recipe Image */}
        {recipe.image && (
          <div className="w-full aspect-[4/3] overflow-hidden bg-gray-900">
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

        <div className="px-4 py-6">
          {/* Title and Meta */}
          <h2 className="text-2xl font-bold text-black mb-2">{recipe.title}</h2>
          {recipe.serves && (
            <p className="text-black mb-3">Serves {recipe.serves}</p>
          )}
          {recipe.category && (
            <span className="inline-block px-3 py-1 bg-gray-800 text-white rounded-full text-sm mb-6">
              {recipe.category}
            </span>
          )}

          {/* Nutrition Per Serving */}
          <div className="mb-6">
          <h3 className="text-lg font-semibold text-black mb-4">
              Nutrition Per Serving
            </h3>
            <div className="flex items-center gap-6">
              {/* Circular Graph */}
              <div className="relative w-32 h-32 flex-shrink-0">
                <svg className="w-32 h-32 transform -rotate-90">
                  <circle
                    cx="64"
                    cy="64"
                    r={radius}
                    fill="none"
                    stroke="#1f2937"
                    strokeWidth="12"
                  />
                  <circle
                    cx="64"
                    cy="64"
                    r={radius}
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth="12"
                    strokeDasharray={circumference}
                    strokeDashoffset={carbsOffset}
                    strokeLinecap="round"
                  />
                  <circle
                    cx="64"
                    cy="64"
                    r={radius}
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="12"
                    strokeDasharray={circumference}
                    strokeDashoffset={fatOffset}
                    strokeLinecap="round"
                  />
                  <circle
                    cx="64"
                    cy="64"
                    r={radius}
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth="12"
                    strokeDasharray={circumference}
                    strokeDashoffset={proteinOffset}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-black">
                      {calories}
                    </div>
                    <div className="text-xs text-black">Cal</div>
                  </div>
                </div>
              </div>

              {/* Macros */}
              <div className="flex-1 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                    <span className="text-black">Carbs</span>
                  </div>
                  <div className="text-right">
                    <span className="text-black font-semibold">
                      {Math.round(carbsPercent)}%
                    </span>
                    <span className="text-black text-sm ml-1">
                      ({carbs}g)
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    <span className="text-black">Fat</span>
                  </div>
                  <div className="text-right">
                    <span className="text-black font-semibold">
                      {Math.round(fatPercent)}%
                    </span>
                    <span className="text-black text-sm ml-1">({fat}g)</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                    <span className="text-black">Protein</span>
                  </div>
                  <div className="text-right">
                    <span className="text-black font-semibold">
                      {Math.round(proteinPercent)}%
                    </span>
                    <span className="text-black text-sm ml-1">
                      ({protein}g)
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Collapsible Nutrition Section */}
          <div className="mb-6">
            <button
              onClick={() => setShowNutrition(!showNutrition)}
              className="w-full flex items-center justify-between text-blue-400 mb-2"
            >
              <span>{showNutrition ? "HIDE NUTRITION" : "SHOW NUTRITION"}</span>
              {showNutrition ? (
                <ChevronUp className="w-5 h-5" />
              ) : (
                <ChevronDown className="w-5 h-5" />
              )}
            </button>

            {showNutrition && (
              <div className="space-y-2 text-sm">
                {nutrition.calories !== undefined && (
                  <div className="flex justify-between py-2 border-b border-gray-800">
                    <span className="text-black">Calories</span>
                    <span className="text-black">{nutrition.calories}</span>
                  </div>
                )}
                {nutrition.totalFat !== undefined && (
                  <div className="flex justify-between py-2 border-b border-gray-800">
                    <span className="text-black">Total Fat (g)</span>
                    <span className="text-black">{nutrition.totalFat}</span>
                  </div>
                )}
                {nutrition.saturatedFat !== undefined && (
                  <div className="flex justify-between py-2 border-b border-gray-800">
                    <span className="text-black">Saturated Fat (g)</span>
                    <span className="text-black">{nutrition.saturatedFat}</span>
                  </div>
                )}
                {nutrition.polyunsaturatedFat !== undefined && (
                  <div className="flex justify-between py-2 border-b border-gray-800">
                    <span className="text-black">
                      Polyunsaturated Fat (g)
                    </span>
                    <span className="text-black">
                      {nutrition.polyunsaturatedFat}
                    </span>
                  </div>
                )}
                {nutrition.monounsaturatedFat !== undefined && (
                  <div className="flex justify-between py-2 border-b border-gray-800">
                    <span className="text-black">
                      Monounsaturated Fat (g)
                    </span>
                    <span className="text-black">
                      {nutrition.monounsaturatedFat}
                    </span>
                  </div>
                )}
                {nutrition.transFat !== undefined && (
                  <div className="flex justify-between py-2 border-b border-gray-800">
                    <span className="text-black">Trans Fat (g)</span>
                    <span className="text-black">{nutrition.transFat}</span>
                  </div>
                )}
                {nutrition.cholesterol !== undefined && (
                  <div className="flex justify-between py-2 border-b border-gray-800">
                    <span className="text-black">Cholesterol (mg)</span>
                    <span className="text-black">{nutrition.cholesterol}</span>
                  </div>
                )}
                {nutrition.sodium !== undefined && (
                  <div className="flex justify-between py-2 border-b border-gray-800">
                    <span className="text-black">Sodium (mg)</span>
                    <span className="text-black">{nutrition.sodium}</span>
                  </div>
                )}
                {nutrition.totalCarbohydrates !== undefined && (
                  <div className="flex justify-between py-2 border-b border-gray-800">
                    <span className="text-black">
                      Total Carbohydrates (g)
                    </span>
                    <span className="text-black">
                      {nutrition.totalCarbohydrates}
                    </span>
                  </div>
                )}
                {nutrition.dietaryFiber !== undefined && (
                  <div className="flex justify-between py-2 border-b border-gray-800">
                    <span className="text-black">Dietary Fiber (g)</span>
                    <span className="text-black">{nutrition.dietaryFiber}</span>
                  </div>
                )}
                {nutrition.sugars !== undefined && (
                  <div className="flex justify-between py-2 border-b border-gray-800">
                    <span className="text-black">Sugars (g)</span>
                    <span className="text-black">{nutrition.sugars}</span>
                  </div>
                )}
                {nutrition.addedSugars !== undefined && (
                  <div className="flex justify-between py-2 border-b border-gray-800">
                    <span className="text-black">Added Sugars (g)</span>
                    <span className="text-black">
                      {nutrition.addedSugars !== null &&
                      nutrition.addedSugars !== undefined
                        ? nutrition.addedSugars
                        : "-"}
                    </span>
                  </div>
                )}
                {nutrition.sugarAlcohols !== undefined && (
                  <div className="flex justify-between py-2 border-b border-gray-800">
                    <span className="text-black">Sugar Alcohols (g)</span>
                    <span className="text-black">
                      {nutrition.sugarAlcohols !== null &&
                      nutrition.sugarAlcohols !== undefined
                        ? nutrition.sugarAlcohols
                        : "-"}
                    </span>
                  </div>
                )}
                {nutrition.protein !== undefined && (
                  <div className="flex justify-between py-2 border-b border-gray-800">
                    <span className="text-black">Protein (g)</span>
                    <span className="text-black">{nutrition.protein}</span>
                  </div>
                )}
                {nutrition.vitaminD !== undefined && (
                  <div className="flex justify-between py-2 border-b border-gray-800">
                    <span className="text-black">Vitamin D (%)</span>
                    <span className="text-black">
                      {nutrition.vitaminD !== null &&
                      nutrition.vitaminD !== undefined
                        ? nutrition.vitaminD
                        : "-"}
                    </span>
                  </div>
                )}
                {nutrition.calcium !== undefined && (
                  <div className="flex justify-between py-2 border-b border-gray-800">
                    <span className="text-black">Calcium (%)</span>
                    <span className="text-black">{nutrition.calcium}</span>
                  </div>
                )}
                {nutrition.iron !== undefined && (
                  <div className="flex justify-between py-2 border-b border-gray-800">
                    <span className="text-black">Iron (%)</span>
                    <span className="text-black">{nutrition.iron}</span>
                  </div>
                )}
                {nutrition.potassium !== undefined && (
                  <div className="flex justify-between py-2 border-b border-gray-800">
                    <span className="text-black">Potassium (mg)</span>
                    <span className="text-black">{nutrition.potassium}</span>
                  </div>
                )}
                {nutrition.vitaminA !== undefined && (
                  <div className="flex justify-between py-2 border-b border-gray-800">
                    <span className="text-black">Vitamin A (%)</span>
                    <span className="text-black">{nutrition.vitaminA}</span>
                  </div>
                )}
                {nutrition.vitaminC !== undefined && (
                  <div className="flex justify-between py-2 border-b border-gray-800">
                    <span className="text-black">Vitamin C (%)</span>
                    <span className="text-black">{nutrition.vitaminC}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Ingredients */}
          {recipe.ingredients && recipe.ingredients.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-black mb-4">
                Ingredients
              </h3>
              <div className="space-y-3 rounded-2xl border border-gray-200 bg-gradient-to-br from-white to-gray-50 p-4 shadow-sm">
                {recipe.ingredients.map((ingredient, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-3 border-b border-gray-100 pb-3 last:border-b-0 last:pb-0"
                  >
                    <span className="mt-1 h-3 w-3 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-300 shadow-sm" />
                    <p className="text-sm text-black leading-snug">{ingredient}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Directions */}
          {recipe.directions && recipe.directions.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-black mb-4">
                Directions
              </h3>
              <ol className="space-y-3">
                {recipe.directions.map((direction, index) => (
                  <li key={index} className="text-black text-sm">
                    <span className="font-semibold text-black mr-2">
                      {index + 1}.
                    </span>
                    {direction}
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Description (fallback if no structured data) */}
          {(!recipe.ingredients || recipe.ingredients.length === 0) &&
            (!recipe.directions || recipe.directions.length === 0) &&
            recipe.description && (
              <div className="mb-6">
                <p className="text-black text-sm whitespace-pre-wrap">
                  {recipe.description}
                </p>
              </div>
            )}
        </div>
      </div>

      {/* Add to Diary Button */}
    </div>
  );
}

export function RecipesPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<RecipeSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [sections] = useState<RecipeSection[]>(MOCK_SECTIONS);
  const [bookmarkedRecipes, setBookmarkedRecipes] = useState<Set<string>>(
    new Set()
  );
  const [recipeDetail, setRecipeDetail] = useState<RecipeDetail | null>(null);
  const [loading, setLoading] = useState(false);
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

  const handleRecipeClick = async (recipe: Recipe) => {
    setLoading(true);
    const details = await fetchRecipeDetails(recipe.title);
    setLoading(false);
    if (details) {
      setRecipeDetail(details);
    }
  };

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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSearch();
    }
  };

  const toggleBookmark = (recipeId: string, e?: React.MouseEvent) => {
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
    <div className="min-h-screen bg-white text-black">
      {/* Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 bg-white/80 z-50 flex items-center justify-center">
          <div className="text-black">Loading recipe...</div>
        </div>
      )}

      {/* Header */}
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-sm border-b border-gray-200">
        <div className="flex items-center gap-4 px-4 py-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-black" />
          </button>
          <h1 className="text-xl font-bold text-black flex-1">
            Curated Recipes
          </h1>
          <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <Bookmark className="w-6 h-6 text-black" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="px-4 pb-4 relative" ref={suggestionsRef}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-black" />
            <Input
              type="text"
              placeholder="Search for recipes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => {
                if (suggestions.length > 0) setShowSuggestions(true);
              }}
              className="pl-10 bg-gray-100 border border-gray-200 text-black placeholder:text-black focus:border-gray-400"
            />
          </div>

          {/* Suggestions Dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute top-full left-4 right-4 mt-2 bg-white border border-gray-200 rounded-xl shadow-xl z-30 max-h-60 overflow-y-auto">
              {suggestions.map((suggestion, index) => (
                <button
                  key={`${suggestion}-${index}`}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="w-full px-4 py-3 text-left hover:bg-gray-100 transition-colors border-b border-gray-200 last:border-b-0"
                >
                  <span className="text-black">{suggestion}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Content Sections */}
      <div className="pb-20">
        {sections.map((section, sectionIndex) => (
          <div key={sectionIndex} className="mb-8">
            {/* Section Header */}
            <div className="flex items-center justify-between px-4 mb-4">
              <h2 className="text-lg font-bold text-black">{section.title}</h2>
              <button className="text-sm text-black hover:text-black transition-colors">
                View More &gt;
              </button>
            </div>

            {/* Horizontal Scrollable Recipe Cards */}
            <div className="flex gap-4 overflow-x-auto px-4 scrollbar-hide pb-2">
              {section.recipes.map((recipe) => {
                const isBookmarked = bookmarkedRecipes.has(recipe.id);
                return (
                  <Card
                    key={recipe.id}
                    onClick={() => handleRecipeClick(recipe)}
                    className="min-w-[160px] bg-white border border-gray-100 rounded-lg overflow-hidden cursor-pointer hover:border-gray-300 transition-all group"
                  >
                    {/* Recipe Image */}
                      <div className="relative aspect-square w-full overflow-hidden bg-gray-100">
                      <img
                        src={recipe.image}
                        alt={recipe.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          // Fallback to placeholder if image fails to load
                          e.currentTarget.src =
                            "https://via.placeholder.com/400x400/1f2937/9ca3af?text=Recipe";
                        }}
                      />
                      {/* Bookmark Button */}
                      <button
                        onClick={(e) => toggleBookmark(recipe.id, e)}
                        className="absolute bottom-2 right-2 p-1.5 bg-white/80 backdrop-blur-sm rounded-full hover:bg-white transition-colors"
                      >
                        {isBookmarked ? (
                          <BookmarkCheck className="w-4 h-4 text-green-500 fill-green-500" />
                        ) : (
                          <Bookmark className="w-4 h-4 text-black" />
                        )}
                      </button>
                    </div>

                    {/* Recipe Info */}
                    <div className="p-3">
                      <h3 className="text-sm font-semibold text-black line-clamp-2 mb-1">
                        {recipe.title}
                      </h3>
                      <p className="text-xs text-black">
                        {recipe.calories} Cal
                      </p>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
