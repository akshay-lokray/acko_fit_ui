import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { FEMALE_DEFAULT_AVATAR_URL } from '@/constants/avatarUrls';

export function FemaleAvatarModel(props: any) {
  try {
    const gltf = useGLTF(FEMALE_DEFAULT_AVATAR_URL) as any;
    const { nodes, materials } = gltf || {};
    const groupRef = useRef<THREE.Group>(null);
    const lastFullScreenRef = useRef<boolean | undefined>(undefined);
    const leftArmBoneRef = useRef<THREE.Bone | null>(null);
    const rightArmBoneRef = useRef<THREE.Bone | null>(null);
    const rightForearmBoneRef = useRef<THREE.Bone | null>(null);
    const { isFullScreen = false, isSpeaking = false } = props || {};
    const scene = gltf?.scene;

    console.log('Female avatar loaded:', { nodes: !!nodes, materials: !!materials });

    useEffect(() => {
      // Reset positioning if isFullScreen changed
      if (lastFullScreenRef.current !== undefined && lastFullScreenRef.current !== isFullScreen) {
        if (groupRef.current) {
          groupRef.current.position.set(0, 0, 0);
          groupRef.current.scale.set(1, 1, 1);
        }
      }

      if (groupRef.current && nodes) {
        // Center and scale the model
        const box = new THREE.Box3().setFromObject(groupRef.current);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        
        if (isFullScreen) {
          // Full screen: normal scale
          const scale = 1.2 / maxDim;
          groupRef.current.position.sub(center);
          groupRef.current.scale.multiplyScalar(scale);
        } else {
          // Face-only (200x200): very large scale and high Y offset to show ONLY face
          const scale = 8.9 / maxDim; // Very large scale for face-only focus
          groupRef.current.position.sub(center);
          groupRef.current.position.y += 1.2; // High offset to position face at camera targetY
          groupRef.current.scale.multiplyScalar(scale);
        }
      }
      
      lastFullScreenRef.current = isFullScreen;
    }, [nodes, isFullScreen]);

    useEffect(() => {
      const leftCandidates = [
        nodes?.Wolf3D_LeftArm,
        nodes?.mixamorigLeftArm,
        nodes?.LeftArm,
      ] as (THREE.Bone | undefined)[];
      const rightCandidates = [
        nodes?.Wolf3D_RightArm,
        nodes?.mixamorigRightArm,
        nodes?.RightArm,
      ] as (THREE.Bone | undefined)[];
      const rightForearmCandidates = [
        nodes?.Wolf3D_RightForeArm,
        nodes?.mixamorigRightForeArm,
        nodes?.RightForeArm,
      ] as (THREE.Bone | undefined)[];

      leftArmBoneRef.current = leftCandidates.find(Boolean) ?? null;
      rightArmBoneRef.current = rightCandidates.find(Boolean) ?? null;
      rightForearmBoneRef.current =
        rightForearmCandidates.find(Boolean) ?? null;

      if (
        (!leftArmBoneRef.current ||
          !rightArmBoneRef.current ||
          !rightForearmBoneRef.current) &&
        scene
      ) {
        scene.traverse((child: THREE.Object3D) => {
          if (!(child instanceof THREE.Bone)) return;
          const name = child.name.toLowerCase();
          if (!leftArmBoneRef.current && name.includes('left') && name.includes('arm')) {
            leftArmBoneRef.current = child;
          } else if (!rightArmBoneRef.current && name.includes('right') && name.includes('arm')) {
            rightArmBoneRef.current = child;
          } else if (
            !rightForearmBoneRef.current &&
            name.includes('right') &&
            (name.includes('fore') || name.includes('forearm'))
          ) {
            rightForearmBoneRef.current = child;
          }
        });
      }
    }, [nodes, scene]);

    useFrame(({ clock }) => {
      const baseElbowX = 1.17;
      const baseElbowZ = -0.1;

      if (!isFullScreen || !isSpeaking) {
        if (leftArmBoneRef.current) {
          leftArmBoneRef.current.rotation.set(baseElbowX, 0.15, baseElbowZ);
        }
        if (rightArmBoneRef.current) {
          rightArmBoneRef.current.rotation.set(1.2, 0.15, baseElbowZ);
        }
        if (rightForearmBoneRef.current) {
          rightForearmBoneRef.current.rotation.set(0.1, 0, -0.2);
        }
        return;
      }

      const t = clock.getElapsedTime();
      const explainingX = 0.9 + Math.sin(t * 1.7) * 0.2;
      const explainingZ = -1.9 + Math.cos(t * 1.4) * 0.08;
      const leftMotion = Math.sin(t * 1.7) * 0.01;
      const leftTilt = Math.cos(t * 1.5) * 0.1;

      if (leftArmBoneRef.current) {
        leftArmBoneRef.current.rotation.set(
          baseElbowX + leftMotion,
          0.15,
          baseElbowZ + leftTilt
        );
      }

      if (rightForearmBoneRef.current) {
        rightForearmBoneRef.current.rotation.x = explainingX;
        rightForearmBoneRef.current.rotation.z = explainingZ;
      }
    });

    if (!nodes || !materials) {
      return null;
    }

    return (
      <group ref={groupRef} {...props} dispose={null}>
        {nodes?.Hips && <primitive object={nodes.Hips} />}
        {nodes?.EyeLeft && (
          <skinnedMesh
            name="EyeLeft"
            geometry={nodes.EyeLeft.geometry}
            material={materials?.Wolf3D_Eye}
            skeleton={nodes.EyeLeft.skeleton}
            morphTargetDictionary={nodes.EyeLeft.morphTargetDictionary}
            morphTargetInfluences={nodes.EyeLeft.morphTargetInfluences}
          />
        )}
        {nodes?.EyeRight && (
          <skinnedMesh
            name="EyeRight"
            geometry={nodes.EyeRight.geometry}
            material={materials?.Wolf3D_Eye}
            skeleton={nodes.EyeRight.skeleton}
            morphTargetDictionary={nodes.EyeRight.morphTargetDictionary}
            morphTargetInfluences={nodes.EyeRight.morphTargetInfluences}
          />
        )}
        {nodes?.Wolf3D_Head && (
          <skinnedMesh
            name="Wolf3D_Head"
            geometry={nodes.Wolf3D_Head.geometry}
            material={materials?.Wolf3D_Skin}
            skeleton={nodes.Wolf3D_Head.skeleton}
            morphTargetDictionary={nodes.Wolf3D_Head.morphTargetDictionary}
            morphTargetInfluences={nodes.Wolf3D_Head.morphTargetInfluences}
          />
        )}
        {nodes?.Wolf3D_Teeth && (
          <skinnedMesh
            name="Wolf3D_Teeth"
            geometry={nodes.Wolf3D_Teeth.geometry}
            material={materials?.Wolf3D_Teeth}
            skeleton={nodes.Wolf3D_Teeth.skeleton}
            morphTargetDictionary={nodes.Wolf3D_Teeth.morphTargetDictionary}
            morphTargetInfluences={nodes.Wolf3D_Teeth.morphTargetInfluences}
          />
        )}
        {nodes?.Wolf3D_Hair && (
          <skinnedMesh
            geometry={nodes.Wolf3D_Hair.geometry}
            material={materials?.Wolf3D_Hair}
            skeleton={nodes.Wolf3D_Hair.skeleton}
          />
        )}
        {nodes?.Wolf3D_Body && (
          <skinnedMesh
            geometry={nodes.Wolf3D_Body.geometry}
            material={materials?.Wolf3D_Body}
            skeleton={nodes.Wolf3D_Body.skeleton}
          />
        )}
        {nodes?.Wolf3D_Outfit_Bottom && (
          <skinnedMesh
            geometry={nodes.Wolf3D_Outfit_Bottom.geometry}
            material={materials?.Wolf3D_Outfit_Bottom}
            skeleton={nodes.Wolf3D_Outfit_Bottom.skeleton}
          />
        )}
        {nodes?.Wolf3D_Outfit_Footwear && (
          <skinnedMesh
            geometry={nodes.Wolf3D_Outfit_Footwear.geometry}
            material={
              materials?.['aleksandr@readyplayer'] ||
              materials?.Wolf3D_Outfit_Footwear
            }
            skeleton={nodes.Wolf3D_Outfit_Footwear.skeleton}
          />
        )}
        {nodes?.Wolf3D_Outfit_Top && (
          <skinnedMesh
            geometry={nodes.Wolf3D_Outfit_Top.geometry}
            material={materials?.Wolf3D_Outfit_Top}
            skeleton={nodes.Wolf3D_Outfit_Top.skeleton}
          />
        )}
      </group>
    );
  } catch (error) {
    console.error('Error loading female avatar:', error);
    return null;
  }
}

useGLTF.preload(FEMALE_DEFAULT_AVATAR_URL);

