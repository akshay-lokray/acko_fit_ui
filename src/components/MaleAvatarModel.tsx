import { useRef, useEffect } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

export function MaleAvatarModel(props: any) {
  try {
    const gltf = useGLTF('/male.glb') as any;
    const { nodes, materials } = gltf || {};
    const groupRef = useRef<THREE.Group>(null);

    console.log('Male avatar loaded:', { nodes: !!nodes, materials: !!materials });

    useEffect(() => {
      if (groupRef.current && nodes) {
        // Center and scale the model
        const box = new THREE.Box3().setFromObject(groupRef.current);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 1.8 / maxDim; // Scale to fit in view
        
        groupRef.current.position.sub(center);
        groupRef.current.scale.multiplyScalar(scale);
      }
    }, [nodes]);

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
            material={materials?.Wolf3D_Outfit_Footwear}
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
    console.error('Error loading male avatar:', error);
    return null;
  }
}

useGLTF.preload('/male.glb');

