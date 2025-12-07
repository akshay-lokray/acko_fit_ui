import { useRef, useEffect, useState, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, Html, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { MaleAvatarModel } from './MaleAvatarModel';
import { FemaleAvatarModel } from './FemaleAvatarModel';
import SpeechController from './SpeechController';
import type { VoiceType } from '../types/voice';
import './AvatarScene.css';

interface AvatarSceneProps {
  textToSpeak?: string;
  voiceType?: VoiceType;
  onSpeakStart?: () => void;
  onSpeakEnd?: () => void;
  isFullScreen?: boolean; // true for coach-intro, false for inner pages (200x200 face-only)
}

// Viseme mapping - maps phonemes to mouth shapes
const VISEME_MAP: Record<string, number[]> = {
  // Silence/Closed
  'silence': [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  // A, E, I sounds - open mouth
  'A': [0.7, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  'E': [0.5, 0.3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  'I': [0.3, 0.5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  // O, U sounds - rounded mouth
  'O': [0.4, 0, 0, 0.6, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  'U': [0.3, 0, 0, 0.7, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  // M, P, B sounds - closed lips
  'M': [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  'P': [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  'B': [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  // F, V sounds - lower lip bite
  'F': [0.2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  'V': [0.2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  // Th sounds - tongue out
  'TH': [0.3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  // Default - slight open
  'default': [0.2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
};

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
function AutoZoomCamera({ target = [0, 2.6, 0], isFullScreen = false }: { target?: [number, number, number]; isFullScreen?: boolean }) {
  const { camera } = useThree();
  const targetRef = useRef(new THREE.Vector3(...target));
  const animationCompletedRef = useRef(false);
  const previousIsFullScreenRef = useRef<boolean | null>(null);
  const shouldAnimateRef = useRef(false);
  
  // For inner pages (200x200): start from full-body view, animate to face-only
  // For full screen (coach-intro): zoomed out to cover full screen
  const fullBodyDistance = 5.0; // Full body view (like coach-intro)
  const fullBodyY = 1.2; // Full body camera Y
  
  const startDistance = isFullScreen ? 1.8 : fullBodyDistance; // Start from full body for inner pages
  const targetDistance = isFullScreen ? 5.0 : 1.8; // Coach-intro: zoom out, Inner: face-only view (closer)
  const startY = isFullScreen ? 1.2 : fullBodyY; // Start from full body Y for inner pages
  const targetY = isFullScreen ? 1.2 : 8.1; // Target Y for inner pages (face level - higher)
  
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
      // Find the head mesh
      groupRef.current.traverse((child) => {
        if (child instanceof THREE.SkinnedMesh && child.name === 'Wolf3D_Head') {
          headRef.current = child;
        }
      });
    }
  }, [voiceType]); // Re-find head when voice type changes

  useFrame(() => {
    if (!headRef.current || !isSpeaking) {
      if (headRef.current?.morphTargetInfluences) {
        for (let i = 0; i < headRef.current.morphTargetInfluences.length; i++) {
          headRef.current.morphTargetInfluences[i] *= 0.9; // Fade out
        }
      }
      return;
    }

    // Calculate phoneme based on audio time
    const charIndex = Math.floor(audioTime * 6.67);
    const phoneme = getPhonemeFromText(text, charIndex);
    const viseme = VISEME_MAP[phoneme] || VISEME_MAP['default'];

    if (headRef.current?.morphTargetInfluences) {
      for (let i = 0; i < Math.min(viseme.length, headRef.current.morphTargetInfluences.length); i++) {
        const target = viseme[i];
        const current = headRef.current.morphTargetInfluences[i];
        headRef.current.morphTargetInfluences[i] = current * 0.7 + target * 0.3;
      }
    }
  });

  return (
    <group ref={groupRef}>
      {voiceType === 'male' ? (
        <MaleAvatarModel isFullScreen={isFullScreen} />
      ) : (
        <FemaleAvatarModel isFullScreen={isFullScreen} />
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
        camera={{ position: isFullScreen ? [0, 1.2, 1.8] : [0, 2.8, 0.9], fov: 50 }}
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
          <AvatarWithVisemes 
            key={avatarKey} // Force remount on transition
            isSpeaking={isSpeaking} 
            text={textToSpeak || ''} 
            audioTime={audioTime}
            voiceType={voiceType}
            isFullScreen={isFullScreen}
          />
        </Suspense>
        
        <AutoZoomCamera 
          target={isFullScreen ? [0, 1.2, 0] : [0, 8.1, 0]} 
          isFullScreen={isFullScreen}
        />
        
        {/* OrbitControls for coach-intro (full screen) - only horizontal rotation, no zoom */}
        {isFullScreen && (
          <OrbitControls
            enablePan={false}
            enableZoom={false}
            enableRotate={true}
            minDistance={5.0}
            maxDistance={5.0}
            minPolarAngle={Math.PI / 2} // Lock to horizontal rotation only
            maxPolarAngle={Math.PI / 2} // Lock to horizontal rotation only
            target={[0, 1.2, 0]}
          />
        )}
        
        <Environment preset="sunset" />
      </Canvas>
      
    </div>
  );
}

