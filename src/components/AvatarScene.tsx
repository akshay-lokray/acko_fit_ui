import { useRef, useEffect, useState, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, Html, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { MaleAvatarModel, MaleAnimatedAvatarModel } from './MaleAvatarModel';
import { FemaleAvatarModel } from './FemaleAvatarModel';
import SpeechController from './SpeechController';
import type { VoiceType } from '../types/voice';
import './AvatarScene.css';

const SMOOTH_VISEME_MAP: Record<string, { morphs: Record<string, number> }> = {
  silence: {
    morphs: {
      jawOpen: 0,
      mouthFunnel: 0,
      mouthPucker: 0,
      mouthSmileLeft: 0,
      mouthSmileRight: 0,
      mouthRollUpper: 0,
      mouthRollLower: 0,
    },
  },
  A: {
    morphs: {
      jawOpen: 0.2,
      mouthSmileLeft: 0.08,
      mouthSmileRight: 0.08,
      mouthDimpleLeft: 0.1,
      mouthDimpleRight: 0.1,
    },
  },
  E: {
    morphs: {
      jawOpen: 0.08,
      mouthSmileLeft: 0.18,
      mouthSmileRight: 0.18,
      mouthLowerDownLeft: 0.08,
      mouthLowerDownRight: 0.08,
    },
  },
  I: {
    morphs: {
      jawOpen: 0.1,
      mouthSmileLeft: 0.12,
      mouthSmileRight: 0.12,
      mouthShrugUpper: 0.05,
    },
  },
  O: {
    morphs: {
      jawOpen: 0.22,
      mouthFunnel: 0.5,
      mouthPucker: 0.25,
    },
  },
  U: {
    morphs: {
      jawOpen: 0.05,
      mouthPucker: 0.85,
      mouthFunnel: 0.1,
      mouthRollLower: 0.2,
    },
  },
  M: {
    morphs: {
      jawOpen: 0.05,
      mouthRollUpper: 0.15,
      mouthRollLower: 0.15,
      mouthShrugUpper: 0.1,
      mouthPucker: 0.1,
    },
  },
  F: {
    morphs: {
      jawOpen: 0.1,
      mouthRollLower: 0.35,
      mouthLowerDownLeft: 0.1,
      mouthLowerDownRight: 0.1,
    },
  },
  TH: {
    morphs: {
      jawOpen: 0.15,
      mouthFunnel: 0.15,
      mouthLowerDownLeft: 0.2,
      mouthLowerDownRight: 0.2,
    },
  },
  default: {
    morphs: {
      jawOpen: 0.02,
      mouthSmileLeft: 0.05,
      mouthSmileRight: 0.05,
    },
  },
};

SMOOTH_VISEME_MAP['B'] = SMOOTH_VISEME_MAP['M'];
SMOOTH_VISEME_MAP['P'] = SMOOTH_VISEME_MAP['M'];
SMOOTH_VISEME_MAP['V'] = SMOOTH_VISEME_MAP['F'];

interface AvatarSceneProps {
  textToSpeak?: string;
  voiceType?: VoiceType;
  onSpeakStart?: () => void;
  onSpeakEnd?: () => void;
  isFullScreen?: boolean; // true for coach-intro, false for inner pages (200x200 face-only)
}
// Simple phoneme detection from text
function getPhonemeFromText(text: string, position: number): string {
  if (position >= text.length) return 'silence';
  
  const char = text[position].toUpperCase();
  const vowels = 'AEIOU';
  const consonants = 'BCDFGHJKLMNPQRSTVWXYZ';
  
  if (vowels.includes(char)) {
    if (char === 'A') return 'A';
    if (char === 'E' || char === 'I') return 'E';
    if (char === 'O' || char === 'U') return 'O';
  }
  
  if (consonants.includes(char)) {
    if ('MPB'.includes(char)) return 'M';
    if ('FV'.includes(char)) return 'F';
    if (char === 'T' && position + 1 < text.length && text[position + 1].toUpperCase() === 'H') return 'TH';
  }
  
  return 'default';
}

// Auto-zoom camera component - different behavior for full screen vs face-only
function AutoZoomCamera({
  target = [0, 2.6, 0],
  isFullScreen = false,
  overrideDistance,
}: {
  target?: [number, number, number];
  isFullScreen?: boolean;
  overrideDistance?: number;
}) {
  const { camera } = useThree();
  const targetRef = useRef(new THREE.Vector3(...target));
  const animationCompletedRef = useRef(false);
  const previousIsFullScreenRef = useRef<boolean | null>(null);
  const shouldAnimateRef = useRef(false);
  
  // For inner pages (200x200): start from full-body view, animate to face-only
  // For full screen (coach-intro): stay closer so avatar fills below CTA
  const fullBodyDistance = 2.2; // Closer full body for intro
  const fullBodyY = 1.4; // Camera height for intro
  
  const effectiveDistance = overrideDistance ?? (isFullScreen ? 2.2 : 3.2);
  const startDistance = isFullScreen ? effectiveDistance : fullBodyDistance; // Intro stays close
  const targetDistance = effectiveDistance; // Intro stays close; inner pages zoom to show full face
  const startY = isFullScreen ? 1.4 : fullBodyY;
  const targetY = isFullScreen ? 1.4 : 8.1; // Inner pages face level
  
  const distanceRef = useRef(startDistance);
  const cameraYRef = useRef(startY);
  
  // Update target reference when target prop changes
  useEffect(() => {
    targetRef.current.set(...target);
  }, [target]);
  
  // Detect transition from full screen to inner page
  useEffect(() => {
    const wasFullScreen = previousIsFullScreenRef.current;
    const isNowInnerPage = !isFullScreen;
    
    // If transitioning from full screen to inner page, trigger animation
    if (wasFullScreen === true && isNowInnerPage) {
      console.log('🎬 Animation triggered: from full body to face-only', { 
        fullBodyDistance, 
        fullBodyY, 
        targetDistance, 
        targetY,
        wasFullScreen,
        isNowInnerPage
      });
      shouldAnimateRef.current = true;
      animationCompletedRef.current = false;
      // Set camera to full body position immediately
      distanceRef.current = fullBodyDistance;
      cameraYRef.current = fullBodyY;
      const cameraX = 0;
      const cameraZ = fullBodyDistance;
      camera.position.set(cameraX, fullBodyY, cameraZ);
      // Look at face level target
      const lookAtTarget = new THREE.Vector3(0, targetY, 0);
      camera.lookAt(lookAtTarget);
    } else if (isFullScreen) {
      // Reset when going to full screen
      shouldAnimateRef.current = false;
      animationCompletedRef.current = false;
      // Mark that we're on full screen so we can detect transition later
      previousIsFullScreenRef.current = true;
    } else if (isNowInnerPage && wasFullScreen !== true) {
      // Already on inner page (reload or first load) - no animation needed
      shouldAnimateRef.current = false;
      animationCompletedRef.current = true;
      // Go directly to target position
      distanceRef.current = targetDistance;
      cameraYRef.current = targetY;
      const cameraX = 0;
      const cameraZ = targetDistance;
      camera.position.set(cameraX, targetY, cameraZ);
      // Look at face level target
      const lookAtTarget = new THREE.Vector3(0, targetY, 0);
      camera.lookAt(lookAtTarget);
      console.log('📍 Direct load: going to face-only position', { targetDistance, targetY });
    }
    
    // Update previous state
    previousIsFullScreenRef.current = isFullScreen;
  }, [isFullScreen, camera, fullBodyDistance, fullBodyY, target, targetDistance, targetY]);
  
  // Initialize camera position
  useEffect(() => {
    if (isFullScreen) {
      // Full screen: start at initial position
      const cameraX = 0;
      const cameraZ = startDistance;
      camera.position.set(cameraX, startY, cameraZ);
      camera.lookAt(targetRef.current);
      distanceRef.current = startDistance;
      cameraYRef.current = startY;
    } else {
      // Inner pages
      if (shouldAnimateRef.current) {
        // Coming from full screen - start from full body position for animation
        distanceRef.current = fullBodyDistance;
        cameraYRef.current = fullBodyY;
        const cameraX = 0;
        const cameraZ = fullBodyDistance;
        camera.position.set(cameraX, fullBodyY, cameraZ);
        const lookAtTarget = new THREE.Vector3(0, targetY, 0);
        camera.lookAt(lookAtTarget);
      } else {
        // First load/reload - go directly to target position (no animation)
        const cameraX = 0;
        const cameraZ = targetDistance;
        camera.position.set(cameraX, targetY, cameraZ);
        const lookAtTarget = new THREE.Vector3(0, targetY, 0);
        camera.lookAt(lookAtTarget);
        distanceRef.current = targetDistance;
        cameraYRef.current = targetY;
        animationCompletedRef.current = true; // Mark as completed so no animation
      }
    }
  }, [camera, startDistance, startY, target, isFullScreen, targetDistance, targetY, fullBodyDistance, fullBodyY]);
  
  useFrame(() => {
    if (isFullScreen) {
      // Full screen: animate to zoomed out position
      const lerpFactor = 0.03;
      distanceRef.current += (targetDistance - distanceRef.current) * lerpFactor;
      const cameraX = 0;
      const cameraZ = distanceRef.current;
      const targetPos = new THREE.Vector3(cameraX, targetY, cameraZ);
      camera.position.lerp(targetPos, lerpFactor);
      camera.lookAt(targetRef.current);
    } else {
      // Inner pages: animate from full body to face-only (only once)
      if (!animationCompletedRef.current && shouldAnimateRef.current) {
        const yDiff = Math.abs(targetY - cameraYRef.current);
        const distanceDiff = Math.abs(targetDistance - distanceRef.current);
        
        // CRITICAL: Move Y to face level FIRST before any zooming
        // This prevents showing torso/center during animation
        if (yDiff > 0.1) {
          // Y not at face level yet - animate Y position quickly
          const yLerpFactor = 0.15; // Fast Y animation
          cameraYRef.current += (targetY - cameraYRef.current) * yLerpFactor;
          // Keep distance at full body while moving Y
          distanceRef.current = fullBodyDistance;
        } else {
          // Y is at face level - now zoom in
          cameraYRef.current = targetY; // Ensure Y is exactly at target
          const distanceLerpFactor = 0.06; // Smooth zoom animation
          distanceRef.current += (targetDistance - distanceRef.current) * distanceLerpFactor;
        }
        
        // Check if animation is complete
        if (distanceDiff < 0.05 && yDiff < 0.1) {
          distanceRef.current = targetDistance;
          cameraYRef.current = targetY;
          animationCompletedRef.current = true;
          console.log('✅ Animation completed');
        }
        
        const cameraX = 0;
        const cameraZ = distanceRef.current;
        const targetPos = new THREE.Vector3(cameraX, cameraYRef.current, cameraZ);
        camera.position.lerp(targetPos, 0.15);
        // Look at face level target (not the passed target prop)
        const lookAtTarget = new THREE.Vector3(0, targetY, 0);
        camera.lookAt(lookAtTarget);
      } else {
        // Animation completed or not needed: stay at target position
        const cameraX = 0;
        const cameraZ = targetDistance;
        camera.position.set(cameraX, targetY, cameraZ);
        // Look at face level target
        const lookAtTarget = new THREE.Vector3(0, targetY, 0);
        camera.lookAt(lookAtTarget);
      }
    }
  });
  
  return null;
}

function AvatarWithVisemes({ 
  isSpeaking, 
  text, 
  audioTime,
  voiceType,
  isFullScreen = false
}: { 
  isSpeaking: boolean; 
  text: string; 
  audioTime: number;
  voiceType: VoiceType;
  isFullScreen?: boolean;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.SkinnedMesh>(null);

  useEffect(() => {
    if (groupRef.current) {
      headRef.current = null;
      // Prefer meshes that already expose morph targets
      groupRef.current.traverse((child) => {
        if (headRef.current || !(child instanceof THREE.SkinnedMesh)) {
          return;
        }
        const isHeadName =
          child.name === "Wolf3D_Head" ||
          child.name === "Head_Mesh" ||
          child.name.toLowerCase().includes("head");
        if (
          isHeadName &&
          child.morphTargetInfluences &&
          child.morphTargetInfluences.length > 0
        ) {
          headRef.current = child;
        }
      });
    }
  }, [voiceType]); // Re-find head when voice type changes

  const targetHistory = useRef<Record<string, number>>({});

  useFrame(() => {
    const head = headRef.current;
    if (!head || !head.morphTargetDictionary || !head.morphTargetInfluences) {
      return;
    }

    const dict = head.morphTargetDictionary;
    const influences = head.morphTargetInfluences;

    if (!isSpeaking) {
      Object.keys(dict).forEach((name) => {
        const idx = dict[name];
        influences[idx] = THREE.MathUtils.lerp(influences[idx], 0, 0.55);
      });
      return;
    }

    const charIndex = Math.floor(audioTime * 6.67);
    const phoneme = getPhonemeFromText(text, charIndex);
    const targetData = SMOOTH_VISEME_MAP[phoneme] || SMOOTH_VISEME_MAP['default'];
    const targetMorphs = targetData.morphs;
    const blendedMorphs: Record<string, number> = {};

    Object.keys(targetMorphs).forEach((key) => {
      const previousValue = targetHistory.current[key] ?? 0;
      const targetValue = Math.min(targetMorphs[key], 0.25);
      blendedMorphs[key] = THREE.MathUtils.lerp(previousValue, targetValue, 0.45);
      targetHistory.current[key] = blendedMorphs[key];
    });

    Object.keys(dict).forEach((name) => {
      const idx = dict[name];
      const targetValue = blendedMorphs[name] ?? 0;
      influences[idx] = THREE.MathUtils.lerp(influences[idx], targetValue, 0.15);
    });
  });

  return (
    <group ref={groupRef}>
      {voiceType === 'male' ? (
        isFullScreen ? (
          <MaleAnimatedAvatarModel isFullScreen={isFullScreen} isSpeaking={isSpeaking} />
        ) : (
          <MaleAvatarModel isFullScreen={isFullScreen} isSpeaking={isSpeaking} />
        )
      ) : (
        <FemaleAvatarModel isFullScreen={isFullScreen} isSpeaking={isSpeaking} />
      )}
    </group>
  );
}

export default function AvatarScene({ 
  textToSpeak, 
  voiceType = 'female',
  onSpeakStart, 
  onSpeakEnd,
  isFullScreen = false
}: AvatarSceneProps) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [audioTime, setAudioTime] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [avatarKey, setAvatarKey] = useState(0);
  const previousIsFullScreenRef = useRef<boolean | null>(null);

  useEffect(() => {
    // Reset error when voice type changes
    setError(null);
  }, [voiceType]);

  // Force avatar remount when transitioning from full screen to inner page
  useEffect(() => {
    const wasFullScreen = previousIsFullScreenRef.current;
    const isNowInnerPage = !isFullScreen;
    
    // If transitioning from full screen to inner page, remount avatar
    if (wasFullScreen === true && isNowInnerPage) {
      console.log('Transitioning from coach-intro to inner page - remounting avatar');
      setAvatarKey(prev => prev + 1); // Force remount by changing key
    }
    
    previousIsFullScreenRef.current = isFullScreen;
  }, [isFullScreen]);

  if (error) {
    return (
      <div className="avatar-scene-container">
        <div className="avatar-placeholder">
          <div className="avatar-placeholder-icon">⚠️</div>
          <p>Error loading avatar</p>
          <p style={{ fontSize: '0.9rem', opacity: 0.8 }}>{error}</p>
          <button 
            onClick={() => setError(null)}
            style={{
              padding: '0.5rem 1rem',
              background: 'rgba(255, 255, 255, 0.2)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              borderRadius: '8px',
              color: 'white',
              cursor: 'pointer'
            }}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const isAnimatedMale = voiceType === 'male' && isFullScreen;
  const cameraDistance = isAnimatedMale ? 5 : undefined;
  const cameraHeight = isAnimatedMale ? 40.1 : undefined;
  const targetHeight = isAnimatedMale ? 1.7 : undefined;

  return (
    <div className="avatar-scene-container">
      <SpeechController
        textToSpeak={textToSpeak}
        voiceType={voiceType}
        onSpeakStart={() => {
          setIsSpeaking(true);
          onSpeakStart?.();
        }}
        onSpeakEnd={() => {
          setIsSpeaking(false);
          setAudioTime(0);
          onSpeakEnd?.();
        }}
        onSpeakingChange={setIsSpeaking}
        onAudioTimeUpdate={setAudioTime}
      />
      
        <Canvas
          camera={{
            position: isFullScreen
              ? [0, cameraHeight ?? 1.6, cameraDistance ?? 2.2]
              : [0, 2.8, 1.8],
            fov: isFullScreen ? 35 : 45,
          }}
        shadows
        gl={{ antialias: true, alpha: true }}
        onError={(err) => {
          console.error('Canvas error:', err);
          setError('Failed to render 3D scene');
        }}
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 5, 5]} intensity={1} castShadow />
        <directionalLight position={[-5, 3, -5]} intensity={0.5} />
        <pointLight position={[0, 5, 0]} intensity={0.3} />
        
        <Suspense fallback={
          <Html center>
            <div style={{ color: 'white', textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⏳</div>
              <p>Loading {voiceType} avatar...</p>
            </div>
          </Html>
        }>
          <group position={isFullScreen ? [0, 0.6, 0] : [0, 0, 0]}>
            <AvatarWithVisemes 
              key={avatarKey} // Force remount on transition
              isSpeaking={isSpeaking} 
              text={textToSpeak || ''} 
              audioTime={audioTime}
              voiceType={voiceType}
              isFullScreen={isFullScreen}
            />
          </group>
        </Suspense>
        
          <AutoZoomCamera
            target={isFullScreen ? [0, targetHeight ?? 1.2, 0] : [0, 8.1, 0]}
            isFullScreen={isFullScreen}
            overrideDistance={cameraDistance}
          />
        
        <Environment preset="sunset" />
        {isFullScreen && (
          <OrbitControls
            enablePan={false}
            enableZoom={false}
            enableRotate={true}
            minPolarAngle={Math.PI / 2}
            maxPolarAngle={Math.PI / 2}
            target={[0, targetHeight ?? 1.2, 0]}
          />
        )}
      </Canvas>
      
    </div>
  );
}

