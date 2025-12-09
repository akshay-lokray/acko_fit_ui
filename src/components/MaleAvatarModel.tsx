import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF, useAnimations } from '@react-three/drei';
import * as THREE from 'three';
import { MALE_DHONI_ANIM_URL, MALE_DHONI_AVATAR_URL } from '@/constants/avatarUrls';

export function MaleAvatarModel(props: any) {
  try {
    const gltf = useGLTF(MALE_DHONI_AVATAR_URL) as any;
    const { nodes, materials } = gltf || {};
    const groupRef = useRef<THREE.Group>(null);
    const lastFullScreenRef = useRef<boolean | undefined>(undefined);
    const leftArmBoneRef = useRef<THREE.Bone | null>(null);
    const rightArmBoneRef = useRef<THREE.Bone | null>(null);
    const rightForearmBoneRef = useRef<THREE.Bone | null>(null);
    const { isFullScreen = false, isSpeaking = false } = props || {};
    const scene = gltf?.scene;

    console.log('Male avatar loaded:', { nodes: !!nodes, materials: !!materials });

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
          const scale = 1.8 / maxDim;
          groupRef.current.position.sub(center);
          groupRef.current.scale.multiplyScalar(scale);
        } else {
          // Face-only (200x200): very large scale and high Y offset to show ONLY face
          const scale = 8.5 / maxDim; // Very large scale for face-only focus
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

      if ((!leftArmBoneRef.current || !rightArmBoneRef.current) && scene) {
        scene.traverse((child: THREE.Object3D) => {
          if (!(child instanceof THREE.Bone)) return;
          const name = child.name.toLowerCase();
          if (!leftArmBoneRef.current && name.includes('left') && name.includes('arm')) {
            leftArmBoneRef.current = child;
          } else if (!rightArmBoneRef.current && name.includes('right') && name.includes('arm')) {
            rightArmBoneRef.current = child;
          }
        });
      }
    }, [nodes, scene]);

    useFrame(({ clock }) => {
      const baseElbowX = 1.4;
      const baseElbowZ = -0.1;

      if (!isFullScreen || !isSpeaking) {
        if (leftArmBoneRef.current) {
          leftArmBoneRef.current.rotation.set(1.3, 0, -0.1);
        }
        if (rightArmBoneRef.current) {
          rightArmBoneRef.current.rotation.set(1.3, 0.15, baseElbowZ);
        }
        if (rightForearmBoneRef.current) {
          rightForearmBoneRef.current.rotation.set(0, 0, -0.2);
        }
        
        return;
      }

      const t = clock.getElapsedTime();
      const explainingX =4.2 + Math.sin(t * 1.7) * 0.3;
      const explainingZ = 0.15 + Math.cos(t * 1.8) * 0.08;
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
        rightForearmBoneRef.current.rotation.y = 2.2;
        rightForearmBoneRef.current.rotation.z = explainingZ;
      }
    });

    if (!nodes || !materials) {
      return null;
    }

    return (
      <group ref={groupRef} {...props} dispose={null}>
        {nodes?.Hips && <primitive object={nodes.Hips} />}
        <skinnedMesh
          geometry={nodes.Body_Mesh.geometry}
          material={materials.Body}
          skeleton={nodes.Body_Mesh.skeleton}
        />
        <skinnedMesh
          name="Eye_Mesh"
          geometry={nodes.Eye_Mesh.geometry}
          material={materials.Eyes}
          skeleton={nodes.Eye_Mesh.skeleton}
          morphTargetDictionary={nodes.Eye_Mesh.morphTargetDictionary}
          morphTargetInfluences={nodes.Eye_Mesh.morphTargetInfluences}
        />
        <skinnedMesh
          name="EyeAO_Mesh"
          geometry={nodes.EyeAO_Mesh.geometry}
          material={materials.EyeAO}
          skeleton={nodes.EyeAO_Mesh.skeleton}
          morphTargetDictionary={nodes.EyeAO_Mesh.morphTargetDictionary}
          morphTargetInfluences={nodes.EyeAO_Mesh.morphTargetInfluences}
        />
        <skinnedMesh
          name="Eyelash_Mesh"
          geometry={nodes.Eyelash_Mesh.geometry}
          material={materials.Eyelash}
          skeleton={nodes.Eyelash_Mesh.skeleton}
          morphTargetDictionary={nodes.Eyelash_Mesh.morphTargetDictionary}
          morphTargetInfluences={nodes.Eyelash_Mesh.morphTargetInfluences}
        />
        <skinnedMesh
          name="Head_Mesh"
          geometry={nodes.Head_Mesh.geometry}
          material={materials.Head}
          skeleton={nodes.Head_Mesh.skeleton}
          morphTargetDictionary={nodes.Head_Mesh.morphTargetDictionary}
          morphTargetInfluences={nodes.Head_Mesh.morphTargetInfluences}
        />
        <skinnedMesh
          name="Teeth_Mesh"
          geometry={nodes.Teeth_Mesh.geometry}
          material={materials.Teeth}
          skeleton={nodes.Teeth_Mesh.skeleton}
          morphTargetDictionary={nodes.Teeth_Mesh.morphTargetDictionary}
          morphTargetInfluences={nodes.Teeth_Mesh.morphTargetInfluences}
        />
        <skinnedMesh
          name="Tongue_Mesh"
          geometry={nodes.Tongue_Mesh.geometry}
          material={materials.Teeth}
          skeleton={nodes.Tongue_Mesh.skeleton}
          morphTargetDictionary={nodes.Tongue_Mesh.morphTargetDictionary}
          morphTargetInfluences={nodes.Tongue_Mesh.morphTargetInfluences}
        />
        {nodes?.avaturn_hair_0 && (
          <skinnedMesh
            geometry={nodes.avaturn_hair_0.geometry}
            material={materials.avaturn_hair_0_material}
            skeleton={nodes.avaturn_hair_0.skeleton}
          />
        )}
        {nodes?.avaturn_shoes_0 && (
          <skinnedMesh
            geometry={nodes.avaturn_shoes_0.geometry}
            material={materials.avaturn_shoes_0_material}
            skeleton={nodes.avaturn_shoes_0.skeleton}
          />
        )}
        {nodes?.avaturn_look_0 && (
          <skinnedMesh
            geometry={nodes.avaturn_look_0.geometry}
            material={materials.avaturn_look_0_material}
            skeleton={nodes.avaturn_look_0.skeleton}
          />
        )}
      </group>
    );
  } catch (error) {
    console.error('Error loading male avatar:', error);
    return null;
  }
}

export function MaleAnimatedAvatarModel(props: any) {
  const gltf = useGLTF(MALE_DHONI_ANIM_URL) as any;
  const { scene, animations } = gltf || {};
  const { actions } = useAnimations(animations, scene);
  const actionRef = useRef<THREE.AnimationAction | null>(null);

  useEffect(() => {
    const action = actions && Object.values(actions)[0];
    if (action) {
      actionRef.current = action;
      action.reset().play();
    }
    return () => {
      actionRef.current?.stop();
    };
  }, [actions]);

  if (!scene) {
    return null;
  }

  return <primitive object={scene} {...props} dispose={null} />;
}

useGLTF.preload(MALE_DHONI_AVATAR_URL);

