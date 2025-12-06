import { useRef, Component } from 'react';
import type { ReactNode } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF, Float, OrbitControls, Html } from '@react-three/drei';
import * as THREE from 'three';

// Updated generic RPM Avatar URL (Standard Masculine Demo)
const DEFAULT_AVATAR_URL = "https://models.readyplayer.me/658be9e8fc8be99db69d705a.glb";

interface UserAvatar3DProps {
    url?: string;
    bodyShape?: number; // 0 to 1
    accessories?: {
        sunglasses?: boolean;
        hat?: boolean;
    };
}

// --- Error Boundary for 3D Model ---
class ModelErrorBoundary extends Component<{ children: ReactNode, fallback: ReactNode }, { hasError: boolean }> {
    constructor(props: any) {
        super(props);
        this.state = { hasError: false };
    }
    static getDerivedStateFromError() {
        return { hasError: true };
    }
    componentDidCatch(error: any, errorInfo: any) {
        console.error("3D Model Error:", error, errorInfo);
    }
    render() {
        if (this.state.hasError) return this.props.fallback;
        return this.props.children;
    }
}

function BackupModel({ bodyShape = 0.5 }: { bodyShape?: number }) {
    const meshRef = useRef<THREE.Mesh>(null);
    useFrame((state) => {
        if (meshRef.current) {
            meshRef.current.rotation.y += 0.01;
            meshRef.current.position.y = Math.sin(state.clock.elapsedTime) * 0.1 - 0.5;
            // Simulate shape scale
            const width = 1 + (bodyShape - 0.5) * 0.3;
            meshRef.current.scale.set(width, 1, width);
        }
    });

    return (
        <group>
            <mesh ref={meshRef} position={[0, -0.5, 0]}>
                <capsuleGeometry args={[0.4, 1.2, 4, 8]} />
                <meshStandardMaterial color="#10b981" wireframe />
            </mesh>
            <Html position={[0, 1.2, 0]} center>
                <div className="bg-black/80 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                    Hologram Active
                </div>
            </Html>
        </group>
    );
}

function Model({ url = DEFAULT_AVATAR_URL, bodyShape = 0.5 }: UserAvatar3DProps) {
    // fast-fail if url is bad, but useGLTF throws, so ErrorBoundary catches it.
    const { scene } = useGLTF(url);
    const modelRef = useRef<THREE.Group>(null);

    useFrame((state) => {
        if (modelRef.current) {
            modelRef.current.position.y = Math.sin(state.clock.elapsedTime) * 0.02 - 1.0;
            const widthScale = 1 + (bodyShape - 0.5) * 0.2;
            modelRef.current.scale.set(widthScale, 1, widthScale);
        }
    });

    return (
        <primitive
            object={scene}
            ref={modelRef}
            scale={1}
            position={[0, -1, 0]}
        />
    );
}

export default function UserAvatar3D(props: UserAvatar3DProps) {
    return (
        <Canvas
            camera={{ position: [0, 0, 1.8], fov: 45 }}
            style={{ background: 'transparent' }}
        >
            <ambientLight intensity={0.7} />
            <directionalLight position={[5, 10, 5]} intensity={1.5} />
            <spotLight position={[0, 5, 2]} intensity={1} angle={0.5} penumbra={1} color="#10b981" />
            <spotLight position={[-5, 5, 2]} intensity={1} angle={0.5} penumbra={1} color="#6366f1" />

            <Float speed={2} rotationIntensity={0.2} floatIntensity={0.2}>
                <ModelErrorBoundary fallback={<BackupModel bodyShape={props.bodyShape} />}>
                    <Model {...props} />
                </ModelErrorBoundary>
            </Float>

            <OrbitControls
                enablePan={false}
                enableZoom={false}
                minPolarAngle={Math.PI / 2.5}
                maxPolarAngle={Math.PI / 1.5}
            />
        </Canvas>
    );
}
