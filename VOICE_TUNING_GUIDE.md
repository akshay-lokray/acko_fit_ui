# Voice Tuning Guide for Indian Audience

## Location of Audio Tuning Code

The audio tuning is done in: **`src/components/SpeechController.tsx`**

Specifically in the `speakText` function (lines 54-85) and `selectAndSpeak` function (lines 87-203).

## Current Indian English Configuration

### Voice Parameters (Lines 67-70)

```typescript
utterance.rate = 0.95;  // Speech speed (0.1 to 10)
utterance.pitch = voiceType === 'male' ? 0.85 : 1.0;  // Pitch (0 to 2)
utterance.volume = 1.0;  // Volume (0 to 1)
utterance.lang = 'en-IN';  // Language code for Indian English
```

### Voice Selection Priority (Lines 98-155)

The code prioritizes voices in this order:

1. **Indian English voices** (`en-IN`) with gender-specific names
2. **Any Indian English voice** (`en-IN`)
3. **English voices** with Indian-sounding names (Priya, Neela, Ravi, Ajay, Kiran)
4. **Any English voice** (fallback)

## How to Tune for Indian Audience

### 1. Adjust Speech Rate (Speed)
```typescript
utterance.rate = 0.95;  // Current: Slightly slower
// Options:
// - 0.85-0.95: Slower, more deliberate (good for clarity)
// - 0.95-1.0: Normal speed
// - 1.0-1.1: Slightly faster
```

### 2. Adjust Pitch
```typescript
utterance.pitch = voiceType === 'male' ? 0.85 : 1.0;
// Options:
// - Male: 0.8-0.9 (lower, more masculine)
// - Female: 0.95-1.05 (slightly lower for Indian accent)
```

### 3. Language Code
```typescript
utterance.lang = 'en-IN';  // Indian English
// Alternative codes:
// - 'hi-IN': Hindi (India)
// - 'en-GB': British English (closer to Indian English)
```

### 4. Voice Selection
The code looks for voices with these characteristics:
- Language: `en-IN` (Indian English)
- Names: Priya, Neela, Ravi, Ajay, Kiran (common Indian names)
- Gender indicators: "female", "male"

## Testing Available Voices

Open browser console and you'll see:
```
Available voices: [list of all voices with their names and language codes]
Using voice: [selected voice name] (en-IN) for [male/female]
```

## Recommended Settings for Indian English

```typescript
// For clearer Indian English pronunciation
utterance.rate = 0.9;        // Slower for clarity
utterance.pitch = voiceType === 'male' ? 0.8 : 0.95;  // Slightly lower pitch
utterance.volume = 1.0;      // Full volume
utterance.lang = 'en-IN';    // Indian English
```

## Browser-Specific Notes

- **Chrome/Edge**: Usually has good Indian English voice support
- **Firefox**: May have limited `en-IN` voices
- **Safari**: May need to use `en-GB` as fallback

If Indian English voices aren't available, the code will fall back to regular English voices.

