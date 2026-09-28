import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { useRapier } from "@react-three/rapier";
import { Vector3, MathUtils } from "three";
import { useGameStore } from "../store.js";

// --- Tunables -------------------------------------------------------------
const MIN_FOV = 45;
const MAX_FOV = 65;
const REFERENCE_SPEED_KMH = 45;
const TARGET_DAMP_SPEED = 6;
const FOV_DAMP_SPEED = 4;
const MIN_CAM_DISTANCE = 1.5;
const MAX_CAM_DISTANCE = 6;
const COLLISION_MARGIN = 0.25;

export default function FollowCamera() {
  const controlsRef = useRef();
  const { camera } = useThree();
  const { world, rapier } = useRapier();

  const targetPosition = useGameStore((state) => state.targetPosition);
  const speed = useGameStore((state) => state.speed);

  const smoothedTarget = useRef(new Vector3());
  const initialized = useRef(false);

  useFrame((_, delta) => {
    if (!controlsRef.current) return;

    const desired = new Vector3(
      targetPosition.x,
      targetPosition.y + 1.2,
      targetPosition.z,
    );

    if (!initialized.current) {
      smoothedTarget.current.copy(desired);
      initialized.current = true;
    } else {
      const t = 1 - Math.exp(-TARGET_DAMP_SPEED * delta);
      smoothedTarget.current.lerp(desired, t);
    }
    controlsRef.current.target.copy(smoothedTarget.current);

    // Dynamic FOV -------------------------------------------------
    const speedRatio = MathUtils.clamp(
      Math.abs(speed) / REFERENCE_SPEED_KMH,
      0,
      1,
    );
    const targetFov = MathUtils.lerp(MIN_FOV, MAX_FOV, speedRatio);
    camera.fov = MathUtils.damp(camera.fov, targetFov, FOV_DAMP_SPEED, delta);
    camera.updateProjectionMatrix();

    if (world) {
      const camDir = new Vector3().subVectors(
        camera.position,
        smoothedTarget.current,
      );
      const currentDistance = camDir.length();

      if (currentDistance > 0.0001) {
        camDir.normalize();
        const ray = new rapier.Ray(
          {
            x: smoothedTarget.current.x,
            y: smoothedTarget.current.y,
            z: smoothedTarget.current.z,
          },
          { x: camDir.x, y: camDir.y, z: camDir.z },
        );
        const hit = world.castRay(ray, MAX_CAM_DISTANCE, true);
        const obstructedDistance = hit
          ? Math.max(hit.timeOfImpact - COLLISION_MARGIN, MIN_CAM_DISTANCE)
          : MAX_CAM_DISTANCE;
        controlsRef.current.maxDistance = obstructedDistance;
      }
    }

    controlsRef.current.update();
  });

  return (
    <OrbitControls
      ref={controlsRef}
      minDistance={MIN_CAM_DISTANCE}
      maxDistance={MAX_CAM_DISTANCE}
      minPolarAngle={0.3}
      maxPolarAngle={Math.PI / 2 - 0.1}
      enablePan={false}
    />
  );
}
