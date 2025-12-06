import { useRef, useEffect, useState, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, Html } from '@react-three/drei';
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

// Auto-zoom camera component - maximized zoom
function AutoZoomCamera({ target = [0, 0.5, 0] }: { target?: [number, number, number] }) {
  const { camera } = useThree();
  const targetRef = useRef(new THREE.Vector3(...target));
  const distanceRef = useRef(5);
  const targetDistance = 3.2; // Maximized zoom (closer)
  const minDistance = 3.0;
  const maxDistance = 3.5;
  
  useFrame(() => {
    // Smooth auto-zoom animation to max zoom
    const lerpFactor = 0.05;
    distanceRef.current += (targetDistance - distanceRef.current) * lerpFactor;
    
    // Clamp distance
    distanceRef.current = Math.max(minDistance, Math.min(maxDistance, distanceRef.current));
    
    // Calculate camera position from bottom-right perspective
    const angle = Math.PI / 4; // 45 degrees
    const cameraX = Math.cos(angle) * distanceRef.current;
    const cameraY = 0.3 + (distanceRef.current - 3) * 0.15; // Adjusted for better view
    const cameraZ = Math.sin(angle) * distanceRef.current;
    
    // Smooth camera movement
    const targetPos = new THREE.Vector3(cameraX, cameraY, cameraZ);
    camera.position.lerp(targetPos, lerpFactor);
    camera.lookAt(targetRef.current);
  });
  
  return null;
}

function AvatarWithVisemes({ 
  isSpeaking, 
  text, 
  audioTime,
  voiceType
}: { 
  isSpeaking: boolean; 
  text: string; 
  audioTime: number;
  voiceType: VoiceType;
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
        <MaleAvatarModel />
      ) : (
        <FemaleAvatarModel />
      )}
    </group>
  );
}

export default function AvatarScene({ 
  textToSpeak, 
  voiceType = 'female',
  onSpeakStart, 
  onSpeakEnd 
}: AvatarSceneProps) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [audioTime, setAudioTime] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Reset error when voice type changes
    setError(null);
  }, [voiceType]);

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
        camera={{ position: [2.2, 0.3, 3.2], fov: 50 }}
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
            isSpeaking={isSpeaking} 
            text={textToSpeak || ''} 
            audioTime={audioTime}
            voiceType={voiceType}
          />
        </Suspense>
        
        <AutoZoomCamera target={[0, 0.5, 0]} />
        
        <Environment preset="sunset" />
      </Canvas>
      
      {isSpeaking && (
        <div className="speaking-indicator">
          <div className="speaking-pulse"></div>
          <span>Speaking...</span>
        </div>
      )}
    </div>
  );
}

