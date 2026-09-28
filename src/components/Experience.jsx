import { useEffect } from "react";
import { Perf } from "r3f-perf";
import { Physics, RigidBody } from "@react-three/rapier";
import { useGLTF } from "@react-three/drei";
import Character from "./Character.jsx";
import Scooter from "./Scooter.jsx";
import FollowCamera from "./FollowCamera.jsx";
import { useGameStore } from "../store.js";

export default function Experience() {
  const map = useGLTF("./city_physics_safe.glb");
  const isMounted = useGameStore((state) => state.isMounted);

  useEffect(() => {
    map.scene.traverse((child) => {
      if (child.isMesh) {
        child.receiveShadow = true;
        child.castShadow = true;
      }
    });
  }, [map.scene]);

  return (
    <>
      {/* <Perf position="top-left" /> */}

      <ambientLight intensity={0.5} />
      <directionalLight
        position={[20, 30, 20]}
        intensity={5}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-radius={3}
        shadow-camera-left={-25}
        shadow-camera-right={25}
        shadow-camera-top={25}
        shadow-camera-bottom={-25}
        shadow-camera-far={100}
      />

      <Physics debug={false}>
        <FollowCamera />
        {!isMounted && <Character />}
        <RigidBody type="fixed" colliders="trimesh">
          <primitive object={map.scene} />
        </RigidBody>

        <Scooter />
      </Physics>
    </>
  );
}
