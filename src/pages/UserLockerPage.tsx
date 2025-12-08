import { useEffect, useState, useRef } from "react";
import { useUserProfileStore } from "@/store/userProfileStore";
import { useNavigate } from "react-router-dom";
import {
    ArrowLeft,
    Shield,
    Zap,
    Shirt,
    Crown,
    Dumbbell,
    Lock,
    ScanLine,
    CheckCircle2,
    Palette,
    Upload,
    Camera,
    Image as ImageIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import UserAvatar3D from "@/components/UserAvatar3D";
import ReadyPlayerMeWebviewer from "@/components/ReadyPlayerMeWebviewer";
import { FEMALE_DEFAULT_AVATAR_URL, MALE_DHONI_AVATAR_URL } from "@/constants/avatarUrls";

// Mock Gear Inteface
interface GearItem {
    id: string;
    name: string;
    type: "head" | "body" | "legs" | "feet";
    rarity: "common" | "rare" | "epic";
    locked: boolean;
    levelReq?: number;
    icon: any;
}

const GEAR_ITEMS: GearItem[] = [
    { id: "1", name: "Novice Headband", type: "head", rarity: "common", locked: false, icon: Crown },
    { id: "2", name: "Neon Runner Info", type: "body", rarity: "rare", locked: false, icon: Shirt },
    { id: "3", name: "Titan Gym Shorts", type: "legs", rarity: "common", locked: false, icon: Shirt },
    { id: "4", name: "Cyber Kicks", type: "feet", rarity: "epic", locked: true, levelReq: 5, icon: Zap },
    { id: "5", name: "Golden Halo", type: "head", rarity: "epic", locked: true, levelReq: 10, icon: Crown },
];

const COLOR_CLASSES = [
    "bg-orange-100 text-orange-600",
    "bg-blue-100 text-blue-600",
    "bg-green-100 text-green-600",
    "bg-purple-100 text-purple-600",
    "bg-amber-100 text-amber-600",
    "bg-rose-100 text-rose-600",
    "bg-indigo-100 text-indigo-600",
];

type HabitDailyEntry = {
    value: number;
    meta?: Record<string, any>;
};
type HabitDaily = Record<string, HabitDailyEntry>;

export function UserLockerPage() {
    const navigate = useNavigate();
    const { formData: profile, updateFormData } = useUserProfileStore();

    // --- State ---
    const [hasAvatar, setHasAvatar] = useState(!!profile.avatarUrl); // Check if avatar exists
    const [showReadyPlayer, setShowReadyPlayer] = useState(false);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [selectedTab, setSelectedTab] = useState<"gear" | "stats" | "logs">("logs");
    const [bodyShape, setBodyShape] = useState(0.5); // 0-1 Normal to Muscular
    const [dailyProgress, setDailyProgress] = useState<HabitDaily>({});
    const [imagePosition, setImagePosition] = useState({ x: 0, y: 0, scale: 1 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const fileInputRef = useRef<HTMLInputElement>(null);
    const cameraInputRef = useRef<HTMLInputElement>(null);
    const imageContainerRef = useRef<HTMLDivElement>(null);
    const pinchStartRef = useRef<{ distance: number; scale: number } | null>(null);
    
    const gender = profile.gender || "female";
    const avatarName = gender === "male" ? "Dhoni" : "Disha";
    const fallbackAvatarUrl =
        profile.avatarUrl || (gender === "male" ? MALE_DHONI_AVATAR_URL : FEMALE_DEFAULT_AVATAR_URL);

    // Mock user stats impacting shape
    const stats = [
        { label: "Strength", value: 45, icon: Dumbbell, color: "text-red-500", bg: "bg-red-500" },
        { label: "Endurance", value: 72, icon: Zap, color: "text-yellow-500", bg: "bg-yellow-500" },
        { label: "Discipline", value: 88, icon: Shield, color: "text-blue-500", bg: "bg-blue-500" },
    ];

    // --- Avatar Creation Logic ---
    const handleAvatarCreated = (avatarUrl: string) => {
        // Save avatar URL and name to store
        updateFormData({
            avatarUrl,
            avatarName
        });
        setHasAvatar(true);
        setShowReadyPlayer(false);
        setSelectedImage(null);
    };

    const handleCreateFromImage = async () => {
        if (!selectedImage) {
            console.log('No image selected');
            return;
        }
        
        setIsProcessing(true);
        console.log('Creating avatar from image...');
        
        try {
            // Convert data URL to base64 (remove data:image/jpeg;base64, prefix if present)
            let base64Image = selectedImage;
            if (base64Image.includes(',')) {
                base64Image = base64Image.split(',')[1];
            }
            
            // Use the specific userId from the Bearer token
            const userId = '6933f51af17d68eff88bf6dc';
            
            // Call ReadyPlayer.me API
            const BEARER_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc0Fub255bW91cyI6dHJ1ZSwidXNlcklkIjoiNjkzM2Y1MWFmMTdkNjhlZmY4OGJmNmRjIiwicGFydG5lciI6ImRlZmF1bHQiLCJhYmlsaXR5IjpbWyJtYW5hZ2UiLCJBdmF0YXIiLHsidXNlcklkIjoiNjkzM2Y1MWFmMTdkNjhlZmY4OGJmNmRjIn1dLFsibWFuYWdlIiwiVXNlciIseyJfaWQiOiI2OTMzZjUxYWYxN2Q2OGVmZjg4YmY2ZGMifV0sWyJtYW5hZ2UiLCJJZGVudGl0eSIseyJ1c2VySWQiOiI2OTMzZjUxYWYxN2Q2OGVmZjg4YmY2ZGMifV0sWyJyZWFkLGRlbGV0ZSIsIldhbGxldCIseyJ1c2VySWQiOiI2OTMzZjUxYWYxN2Q2OGVmZjg4YmY2ZGMifV0sWyJyZWFkIiwiUGFydG5lciJdLFsiY3JlYXRlIiwiT3JnYW5pemF0aW9uIl0sWyJyZWFkIiwiQXBwbGljYXRpb24iXSxbInJlYWQiLCJBc3NldCJdLFsidXNlIiwiQXNzZXQiLHsibG9ja2VkIjp7IiRuZSI6dHJ1ZX19XSxbInVzZSIsIkFzc2V0Iix7ImlkIjp7IiRpbiI6W119fV0sWyJ1c2UiLCJBc3NldExpc3RGaWx0ZXIiLHsicXVlcnkuZmlsdGVyVXNlcklkIjoiNjkzM2Y1MWFmMTdkNjhlZmY4OGJmNmRjIn1dLFsidXNlIiwiQXNzZXQiLHsiZ3JvdXBzLmlkIjp7IiRpbiI6W119fV0sWyJwb3N0IiwiV2ViaG9va0V2ZW50Iix7InJvdXRpbmdLZXkiOiJzdHVkaW8tdWkudjEuZ2V0dGluZy1zdGFydGVkLmNvbXBsZXRlZCJ9XSxbInBvc3QiLCJXZWJob29rRXZlbnQiLHsicm91dGluZ0tleSI6InN0dWRpby11aS52MS5hZGQtYXBwbGljYXRpb24uY29tcGxldGVkIn1dLFsicmVhZCIsIkNhbXBhaWduIiwwLDAsImlkLG5hbWUsZGVzY3JpcHRpb24sYmFkZ2VJY29uVXJsLGNyZWF0ZWRBdCx1cGRhdGVkQXQsbmZ0LmNvbGxlY3Rpb25MaW5rIl0sWyJyZWFkIiwiQXNzZXQiLDAsMSwibW9kZWxVcmwsbmZ0SWQsbW9kZWxWZXJzaW9ucyJdLFsicmVhZCIsIkFwcGxpY2F0aW9uIiwwLDEsImFic3ludGhLZXkiXV0sImlhdCI6MTc2NTAxMjc2Mn0.UnpU882D0IcfG7ZvZw7YMjvXNYhOh5SFxFIAr8ZkQLc';
            const response = await fetch('https://api.readyplayer.me/v2/avatars', {
                method: 'POST',
                headers: {
                    'Accept': '*/*',
                    'Accept-Language': 'en-GB,en-US;q=0.9,en;q=0.8',
                    'Connection': 'keep-alive',
                    'content-type': 'application/json',
                    'Authorization': `Bearer ${BEARER_TOKEN}`,
                    'Origin': 'https://readyplayer.me',
                    'Referer': 'https://readyplayer.me/',
                },
                body: JSON.stringify({
                    data: {
                        userId: userId,
                        partner: 'default',
                        bodyType: 'fullbody',
                        base64Image: base64Image,
                        assets: {}
                    }
                })
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                let errorData;
                try {
                    errorData = JSON.parse(errorText);
                } catch {
                    errorData = { message: errorText || response.statusText };
                }
                console.error('API Error Response:', {
                    status: response.status,
                    statusText: response.statusText,
                    headers: Object.fromEntries(response.headers.entries()),
                    body: errorData
                });
                throw new Error(`API Error: ${response.status} - ${errorData.message || errorData.type || response.statusText}`);
            }
            
            const data = await response.json();
            console.log('Avatar created successfully:', data);
            
            // Extract avatar ID from response
            const avatarId = data?.data?.id || data?.id;
            
            if (!avatarId) {
                throw new Error('Avatar ID not found in response');
            }
            
            console.log('Avatar ID:', avatarId);
            
            // Get avatar details using GET API with bearer token
            try {
                const getResponse = await fetch(`https://api.readyplayer.me/v2/avatars/${avatarId}`, {
                    method: 'GET',
                    headers: {
                        'Accept': '*/*',
                        'Authorization': `Bearer ${BEARER_TOKEN}`,
                        'Origin': 'https://readyplayer.me',
                        'Referer': 'https://readyplayer.me/',
                    }
                });
                
                if (getResponse.ok) {
                    const avatarData = await getResponse.json();
                    console.log('Avatar data from GET API:', avatarData);
                } else {
                    const errorText = await getResponse.text();
                    console.log('GET API returned:', getResponse.status, errorText);
                }
            } catch (getError) {
                console.log('GET API error (non-fatal):', getError);
            }
            
            // Construct GLB URL from models endpoint (this is the working endpoint)
            const avatarUrl = `https://models.readyplayer.me/${avatarId}.glb`;
            console.log('Using GLB URL:', avatarUrl);
            
            handleAvatarCreated(avatarUrl);
        } catch (error) {
            console.error('Error creating avatar:', error);
            alert(`Failed to create avatar: ${error instanceof Error ? error.message : 'Unknown error'}`);
            setIsProcessing(false);
        }
    };

    // Image positioning handlers
    const handleImageMouseDown = (e: React.MouseEvent) => {
        setIsDragging(true);
        setDragStart({
            x: e.clientX - imagePosition.x,
            y: e.clientY - imagePosition.y
        });
    };

    const handleImageMouseMove = (e: React.MouseEvent) => {
        if (!isDragging) return;
        setImagePosition({
            ...imagePosition,
            x: e.clientX - dragStart.x,
            y: e.clientY - dragStart.y
        });
    };

    const handleImageMouseUp = () => {
        setIsDragging(false);
    };

    const handleImageWheel = (e: React.WheelEvent) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        setImagePosition({
            ...imagePosition,
            scale: Math.max(0.5, Math.min(3, imagePosition.scale * delta))
        });
    };

    // Touch handlers for mobile
    const handleImageTouchStart = (e: React.TouchEvent) => {
        if (e.touches.length === 1) {
            setIsDragging(true);
            setDragStart({
                x: e.touches[0].clientX - imagePosition.x,
                y: e.touches[0].clientY - imagePosition.y
            });
        } else if (e.touches.length === 2) {
            // Initialize pinch
            const touch1 = e.touches[0];
            const touch2 = e.touches[1];
            const distance = Math.hypot(
                touch2.clientX - touch1.clientX,
                touch2.clientY - touch1.clientY
            );
            pinchStartRef.current = {
                distance,
                scale: imagePosition.scale
            };
        }
    };

    const handleImageTouchMove = (e: React.TouchEvent) => {
        if (e.touches.length === 1 && isDragging) {
            setImagePosition({
                ...imagePosition,
                x: e.touches[0].clientX - dragStart.x,
                y: e.touches[0].clientY - dragStart.y
            });
        } else if (e.touches.length === 2 && pinchStartRef.current) {
            // Pinch to zoom
            const touch1 = e.touches[0];
            const touch2 = e.touches[1];
            const distance = Math.hypot(
                touch2.clientX - touch1.clientX,
                touch2.clientY - touch1.clientY
            );
            const scale = pinchStartRef.current.scale * (distance / pinchStartRef.current.distance);
            setImagePosition({
                ...imagePosition,
                scale: Math.max(0.5, Math.min(3, scale))
            });
        }
    };

    const handleImageTouchEnd = () => {
        setIsDragging(false);
        pinchStartRef.current = null;
    };

    const handleFileSelect = (file: File | null) => {
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setSelectedImage(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    const handleCaptureClick = async () => {
        // Use file input with capture attribute - this should open camera on mobile
        // On desktop, it will open file picker
        if (cameraInputRef.current) {
            cameraInputRef.current.click();
        } else {
            // Fallback: create input dynamically
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.capture = 'user'; // This should trigger camera on mobile
            input.onchange = (e) => {
                const file = (e.target as HTMLInputElement).files?.[0];
                if (file) {
                    handleFileSelect(file);
                }
            };
            input.click();
        }
    };

    // Check for existing avatar on load
    useEffect(() => {
        if (profile.avatarUrl) {
            setHasAvatar(true);
        }
    }, [profile.avatarUrl]);

    // Fetch habits and daily progress on load
    useEffect(() => {
        const userId = profile.mobile || "";
        if (!userId) return;

        const loadHabits = async () => {
            try {
                const habitsRes = await fetch(`/api/habits/names?userId=${encodeURIComponent(userId)}`);
                if (!habitsRes.ok) return;
                const habitsData: string[] = await habitsRes.json();
                const habitKeys = habitsData.filter(Boolean);
                if (habitKeys.length === 0) return;

                const dailyRes = await fetch(
                    `/api/habits/daily/batch?userId=${encodeURIComponent(userId)}&habits=${encodeURIComponent(
                        habitKeys.join(",")
                    )}`
                );
                if (!dailyRes.ok) return;
                const dailyData = await dailyRes.json();

                // Normalize to only totals numbers (avoid rendering meta objects)
                const normalized: HabitDaily = {};
                habitKeys.forEach((h) => {
                    const entry = dailyData?.[h];
                    const totals = entry?.totals;
                    const firstKey = totals && typeof totals === "object" ? Object.keys(totals)[0] : undefined;
                    const val =
                        firstKey != null ? Number(totals[firstKey] ?? 0) || 0 : 0;
                    normalized[h] = {
                        value: val,
                        meta: entry?.meta,
                    };
                });

                setDailyProgress(normalized);
            } catch (e) {
                console.error("Failed to load habits", e);
            }
        };

        loadHabits();
    }, [profile.mobile]);

    // --- Render: Avatar Creation Flow ---
    if (!hasAvatar) {
        return (
            <div className="min-h-screen bg-black text-white flex flex-col font-sans">
                {/* Back Button */}
                <div className="absolute top-4 left-4 z-20">
                    <Button 
                        variant="outline" 
                        onClick={() => navigate("/home")} 
                        className="flex items-center gap-2 bg-white/10 border-white/20 text-white hover:bg-white/20"
                    >
                        <ArrowLeft className="w-5 h-5" />
                        <span>Back</span>
                    </Button>
                </div>
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center relative overflow-hidden">

                    {/* Background Ambience */}
                    <div className="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none">
                        <div className="absolute top-[20%] left-[10%] w-[300px] h-[300px] bg-purple-600 rounded-full blur-[100px]" />
                        <div className="absolute bottom-[20%] right-[10%] w-[200px] h-[200px] bg-emerald-600 rounded-full blur-[80px]" />
                    </div>

                    {!selectedImage ? (
                        <div className="animate-fade-in-up space-y-8 z-10 w-full max-w-sm">
                            <div className="w-24 h-24 bg-gradient-to-tr from-purple-500 to-emerald-500 rounded-full mx-auto flex items-center justify-center mb-6 shadow-lg shadow-purple-500/20">
                                <Upload className="w-10 h-10 text-white" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold mb-2">Create Your Digital Twin</h1>
                                <p className="text-gray-400">
                                    Upload or capture your photo to create a personalized 3D avatar named <span className="font-bold text-white">{avatarName}</span>. Your avatar will evolve as you get fitter.
                                </p>
                            </div>

                            <div className="bg-white/5 rounded-2xl p-4 text-left space-y-3 border border-white/10">
                                <div className="flex items-center gap-3 text-sm text-gray-300">
                                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                                    <span>Visualize body transformation</span>
                                </div>
                                <div className="flex items-center gap-3 text-sm text-gray-300">
                                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                                    <span>Unlock wearable rewards</span>
                                </div>
                                <div className="flex items-center gap-3 text-sm text-gray-300">
                                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                                    <span>Track posture data</span>
                                </div>
                            </div>

                            <div className="space-y-3">
                            <Button
                                    onClick={handleUploadClick}
                                    className="w-full h-14 text-lg font-bold bg-white text-black hover:bg-gray-200 rounded-xl flex items-center justify-center gap-3"
                            >
                                    <ImageIcon className="w-5 h-5" />
                                    Upload Photo
                            </Button>
                            <Button
                                    onClick={handleCaptureClick}
                                    className="w-full h-14 text-lg font-bold bg-white/10 border-2 border-white/30 text-white hover:bg-white/20 rounded-xl flex items-center justify-center gap-3"
                            >
                                    <Camera className="w-5 h-5" />
                                    Capture Photo
                            </Button>
                            </div>
                            
                            {/* Hidden file inputs */}
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => {
                                    handleFileSelect(e.target.files?.[0] || null);
                                    // Reset input so same file can be selected again
                                    if (e.target) e.target.value = '';
                                }}
                            />
                            <input
                                ref={cameraInputRef}
                                type="file"
                                accept="image/*"
                                capture="user"
                                className="hidden"
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                        handleFileSelect(file);
                                    }
                                    // Reset input so same file can be selected again
                                    if (e.target) e.target.value = '';
                                }}
                            />
                        </div>
                    ) : (
                        <div className="animate-fade-in-up space-y-6 z-10 w-full max-w-sm">
                            <div>
                                <h2 className="text-2xl font-bold mb-2">Preview Your Photo</h2>
                                <p className="text-sm text-gray-400 mb-4">Drag to reposition, scroll to zoom</p>
                                <div 
                                    ref={imageContainerRef}
                                    className="relative w-full aspect-square rounded-2xl overflow-hidden border-2 border-white/20 mb-4 bg-black touch-none"
                                    onMouseDown={handleImageMouseDown}
                                    onMouseMove={handleImageMouseMove}
                                    onMouseUp={handleImageMouseUp}
                                    onMouseLeave={handleImageMouseUp}
                                    onWheel={handleImageWheel}
                                    onTouchStart={handleImageTouchStart}
                                    onTouchMove={handleImageTouchMove}
                                    onTouchEnd={handleImageTouchEnd}
                                    style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
                                >
                                    <img 
                                        src={selectedImage} 
                                        alt="Selected photo" 
                                        className="absolute w-full h-full object-cover select-none"
                                        style={{
                                            transform: `translate(${imagePosition.x}px, ${imagePosition.y}px) scale(${imagePosition.scale})`,
                                            transition: isDragging ? 'none' : 'transform 0.1s ease-out'
                                        }}
                                        draggable={false}
                                    />
                                </div>
                            </div>
                            
                            <div className="space-y-3">
                                <Button
                                    onClick={handleCreateFromImage}
                                    disabled={isProcessing}
                                    className="w-full h-14 text-lg font-bold bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl"
                                >
                                    {isProcessing ? "Creating Avatar..." : `Create ${avatarName} Avatar`}
                                </Button>
                            <Button
                                    onClick={() => {
                                        setSelectedImage(null);
                                        setImagePosition({ x: 0, y: 0, scale: 1 });
                                    }}
                                    className="w-full h-12 border-2 border-white/30 bg-white/5 text-white hover:bg-white/10 rounded-xl font-medium"
                                >
                                    Choose Different Photo
                            </Button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // --- Render: Main Locker ---
    return (
        <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
            <div className="bg-white p-4 shadow-sm z-10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Button variant="outline" onClick={() => navigate("/home")} className="flex items-center gap-2">
                        <ArrowLeft className="w-5 h-5" />
                        <span>Back</span>
                    </Button>
                    <h1 className="text-xl font-bold text-gray-900">Your Locker</h1>
                </div>
                <div className="flex items-center gap-2 bg-yellow-50 px-3 py-1 rounded-full border border-yellow-100">
                    <Crown className="w-4 h-4 text-yellow-600 fill-yellow-600" />
                    <span className="font-bold text-yellow-700 text-sm">Lvl 1</span>
                </div>
            </div>

            {/* Daily Update Notification */}
            <div className="bg-emerald-600 text-white px-4 py-2 text-xs font-bold text-center flex items-center justify-center gap-2 animate-in slide-in-from-top">
                <ScanLine className="w-3 h-3" />
                Avatar shape updated based on yesterday's activity. (+2% Muscle)
            </div>

            {/* Avatar Stage */}
            <div className="h-[45vh] relative bg-gradient-to-b from-gray-200 to-gray-50 flex items-center justify-center overflow-hidden">
                <UserAvatar3D bodyShape={bodyShape} url={fallbackAvatarUrl} />

                {/* Stats Overlay */}
                <div className="absolute top-4 right-4 flex flex-col gap-2">
                    <div className="p-3 bg-white/80 backdrop-blur rounded-2xl shadow-sm text-center">
                        <p className="text-xs font-bold text-gray-400 uppercase">Streak</p>
                        <p className="text-xl font-bold text-orange-500">🔥 {profile.streak ?? 0}</p>
                    </div>
                </div>
            </div>

            {/* Content Tabs */}
            <div className="flex-1 bg-white rounded-t-[2.5rem] shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.05)] relative -top-8 p-6 flex flex-col h-full z-10">

                <div className="flex p-1 bg-gray-100 rounded-xl mb-6 flex-shrink-0">
                    <button
                        onClick={() => setSelectedTab("logs")}
                        className={`flex-1 py-2.5 text-xs md:text-sm font-bold rounded-lg transition-all ${selectedTab === 'logs' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-400'}`}
                    >
                        Daily Log
                    </button>
                    <button
                        onClick={() => setSelectedTab("gear")}
                        className={`flex-1 py-2.5 text-xs md:text-sm font-bold rounded-lg transition-all ${selectedTab === 'gear' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-400'}`}
                    >
                        Gear
                    </button>
                    <button
                        onClick={() => setSelectedTab("stats")}
                        className={`flex-1 py-2.5 text-xs md:text-sm font-bold rounded-lg transition-all ${selectedTab === 'stats' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-400'}`}
                    >
                        Biometrics
                    </button>
                </div>

                <div className="overflow-y-auto flex-1 pb-10">

                    {/* Gear Grid */}
                    {selectedTab === "gear" && (
                        <div className="grid grid-cols-2 gap-4">
                            {GEAR_ITEMS.map((item) => (
                                <Card
                                    key={item.id}
                                    className={`p-3 border-2 relative cursor-pointer group transition-all 
                                    ${item.locked ? 'bg-gray-50 border-gray-100 opacity-70' : 'bg-white border-gray-100 hover:border-emerald-500 hover:shadow-md'}`}
                                >
                                    {item.locked && (
                                        <div className="absolute inset-0 bg-gray-100/50 flex items-center justify-center z-10 text-gray-400 flex-col">
                                            <Lock className="w-6 h-6 mb-1" />
                                            <span className="text-[10px] font-bold">Lvl {item.levelReq}</span>
                                        </div>
                                    )}
                                    <div className="aspect-square bg-gray-50 rounded-xl mb-3 flex items-center justify-center">
                                        <item.icon className={`w-8 h-8 ${item.rarity === 'epic' ? 'text-purple-500' : item.rarity === 'rare' ? 'text-blue-500' : 'text-gray-400'}`} />
                                    </div>
                                    <h3 className="text-xs font-bold text-gray-900">{item.name}</h3>
                                    <p className="text-[10px] text-gray-500 uppercase font-bold mt-1">{item.rarity}</p>
                                </Card>
                            ))}
                        </div>
                    )}

                    {/* Stats & Sliders */}
                    {selectedTab === "stats" && (
                        <div className="space-y-6">
                            <div className="bg-blue-50 p-4 rounded-2xl mb-4 border border-blue-100">
                                <h4 className="font-bold text-gray-900 mb-2 text-sm flex items-center gap-2">
                                    <Palette className="w-4 h-4 text-blue-500" /> Shape Simulator
                                </h4>
                                <p className="text-xs text-gray-500 mb-4">See how working out changes your avatar.</p>
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between text-xs font-bold text-gray-600">
                                        <span>Lean</span>
                                        <span>Muscular</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0"
                                        max="1"
                                        step="0.01"
                                        value={bodyShape}
                                        onChange={(e) => setBodyShape(parseFloat(e.target.value))}
                                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                                    />
                                </div>
                            </div>

                            {stats.map((stat, i) => (
                                <div key={i} className="space-y-2">
                                    <div className="flex items-center justify-between text-sm">
                                        <div className="flex items-center gap-2">
                                            <stat.icon className={`w-4 h-4 ${stat.color}`} />
                                            <span className="font-bold text-gray-700">{stat.label}</span>
                                        </div>
                                        <span className="font-bold text-gray-900">{stat.value}/100</span>
                                    </div>
                                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                        <div className={`h-full rounded-full ${stat.bg}`} style={{ width: `${stat.value}%` }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Logs */}
                    {selectedTab === "logs" && (
                        <div className="space-y-4">
                            <h3 className="font-bold text-gray-900 mb-4 px-1">Today's Timeline</h3>
                            <div className="relative border-l-2 border-gray-100 ml-4 space-y-8 pb-4">
                                {Object.keys(dailyProgress).length > 0 &&
                                    Object.entries(dailyProgress).map(([habit, entry], idx) => {
                                        const todayVal = entry?.value ?? 0;
                                        const metaName = entry?.meta?.mealName;
                                        const color = COLOR_CLASSES[idx % COLOR_CLASSES.length];
                                        const displayName = metaName
                                            ? metaName
                                            : habit
                                            ? habit.charAt(0).toUpperCase() + habit.slice(1)
                                            : habit;
                                        return (
                                            <div key={`${habit}-${idx}`} className="relative pl-8">
                                                <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full border-2 border-white shadow-sm z-10 bg-emerald-500" />
                                        <div className="bg-white border border-gray-100 rounded-xl p-3 shadow-sm flex items-start gap-3">
                                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${color} font-bold text-sm`}>
                                                        {displayName.slice(0, 1).toUpperCase()}
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex justify-between items-start">
                                                            <h4 className="font-bold text-gray-900 text-sm capitalize">{displayName}</h4>
                                                            <span className="text-[10px] font-bold text-gray-400 bg-gray-50 px-2 py-1 rounded-full">Today</span>
                                                        </div>
                                                        <p className="text-xs text-gray-500 mt-1 font-medium">
                                                            {todayVal ?? 0} logged today
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ReadyPlayer.me Webviewer */}
            {showReadyPlayer && (
                <ReadyPlayerMeWebviewer
                    visible={showReadyPlayer}
                    onClose={() => {
                        console.log('Closing webviewer');
                        setShowReadyPlayer(false);
                        setIsProcessing(false);
                    }}
                    onAvatarCreated={(avatarUrl) => {
                        console.log('Avatar created:', avatarUrl);
                        handleAvatarCreated(avatarUrl);
                    }}
                    gender={gender}
                />
            )}
        </div>
    );
}
