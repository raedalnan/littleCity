import { useEffect, useState, useRef } from "react";
import { RigidBody, CylinderCollider, BallCollider } from "@react-three/rapier";
import {
  useGLTF,
  Html,
  useKeyboardControls,
  useAnimations,
} from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { Vector3, Quaternion, MathUtils } from "three";
import { useGameStore } from "../store.js";
import { useTouchInput } from "../store/touchInput";

// Tunables --------------------------------------------------------------
const MAX_SPEED = 12;
const REVERSE_MAX_SPEED = MAX_SPEED * 0.3;
const ACCEL_RATE = 6;
const BRAKE_RATE = 9;
const DRAG_RATE = 3;
const STOP_THRESHOLD = 0.05;
const MAX_TURN_RATE = 2.4;
const MIN_TURN_RATE = 0.7;
const MAX_LEAN = 0.35;
const LEAN_DAMP = 6;

export default function Scooter() {
  const scooter0 = useGLTF("./scooter.glb");
  const scooter1 = useGLTF("./rider1.glb");

  const [isPlayerNear, setIsPlayerNear] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  const modelRef = useRef();
  const rigidBodyRef = useRef();
  const rotation = useRef(0);
  const currentSpeed = useRef(0);

  const [subscribeKeys, getKeys] = useKeyboardControls();

  const zuSetIsMounted = useGameStore((state) => state.setIsMounted);
  const setLastLocation = useGameStore((state) => state.setLastLocation);
  const setTargetPosition = useGameStore((state) => state.setTargetPosition);
  const setSpeed = useGameStore((state) => state.setSpeed);

  const move = useTouchInput((state) => state.move);
  const rideRequested = useTouchInput((state) => state.RideRequested);
  const consumeRide = useTouchInput((state) => state.consumeRide);

  const { actions } = useAnimations(scooter1.animations, modelRef);

  useEffect(() => {
    scooter0.scene.traverse((child) => {
      if (child.isMesh) {
        child.receiveShadow = true;
        child.castShadow = true;
      }
    });
    scooter1.scene.traverse((child) => {
      if (child.isMesh) {
        child.receiveShadow = true;
        child.castShadow = true;
      }
    });
  }, [scooter0.scene, scooter1.scene]);

  useEffect(() => {
    if (!rideRequested) return;

    if (isPlayerNear && !isMounted) {
      setIsMounted(true);
      zuSetIsMounted(true);
    } else if (isMounted) {
      setIsMounted(false);
      zuSetIsMounted(false);

      const pos = rigidBodyRef.current?.translation();

      if (pos) {
        setLastLocation({
          x: pos.x,
          y: pos.y,
          z: pos.z,
        });
      }
    }

    consumeRide();
  }, [
    rideRequested,
    isPlayerNear,
    isMounted,
    consumeRide,
    zuSetIsMounted,
    setLastLocation,
  ]);

  useEffect(() => {
    return subscribeKeys(
      (state) => state.mount,
      (pressed) => {
        if (!pressed) return;
        if (isPlayerNear && !isMounted) {
          setIsMounted(true);
          zuSetIsMounted(true);
        } else if (isMounted) {
          setIsMounted(false);
          zuSetIsMounted(false);
          const pos = rigidBodyRef.current?.translation();
          if (pos) setLastLocation({ x: pos.x, y: pos.y, z: pos.z });
        }
      },
    );
  }, [isPlayerNear, isMounted, subscribeKeys, zuSetIsMounted, setLastLocation]);

  useFrame((_, delta) => {
    if (!modelRef.current || !rigidBodyRef.current || !isMounted) return;

    actions["Action"]?.play();

    const { forward, backward, left, right } = getKeys();

    // Touch joystick
    const touchForward = move.z > 0.15;
    const touchBackward = move.z < -0.15;
    const touchLeft = move.x < -0.15;
    const touchRight = move.x > 0.15;

    // Combine keyboard + touch input
    const isForward = forward || touchForward;
    const isBackward = backward || touchBackward;
    const isLeft = left || touchLeft;
    const isRight = right || touchRight;
    const currentVel = rigidBodyRef.current.linvel();

    const speedRatio = MathUtils.clamp(
      Math.abs(currentSpeed.current) / MAX_SPEED,
      0,
      1,
    );
    const turnRate = MathUtils.lerp(MAX_TURN_RATE, MIN_TURN_RATE, speedRatio);
    const canTurn = Math.abs(currentSpeed.current) > STOP_THRESHOLD;
    let turnInput = 0;
    if (canTurn) {
      if (isLeft) {
        rotation.current += turnRate * delta;
        turnInput = 1;
      }

      if (isRight) {
        rotation.current -= turnRate * delta;
        turnInput = -1;
      }
    }

    const quat = new Quaternion().setFromAxisAngle(
      { x: 0, y: 1, z: 0 },
      rotation.current,
    );
    rigidBodyRef.current.setRotation(quat, true);

    let targetSpeed = 0;
    if (isForward) targetSpeed = MAX_SPEED;
    else if (isBackward) targetSpeed = -REVERSE_MAX_SPEED;

    const isBraking =
      (targetSpeed === 0 && Math.abs(currentSpeed.current) > STOP_THRESHOLD) ||
      (isForward && currentSpeed.current < 0) ||
      (isBackward && currentSpeed.current > 0);

    const rate =
      targetSpeed !== 0 && !isBraking
        ? ACCEL_RATE
        : isBraking
          ? BRAKE_RATE
          : DRAG_RATE;
    currentSpeed.current = MathUtils.damp(
      currentSpeed.current,
      targetSpeed,
      rate,
      delta,
    );
    if (Math.abs(currentSpeed.current) < STOP_THRESHOLD)
      currentSpeed.current = 0;

    const direction = new Vector3(0, 0, 1).applyAxisAngle(
      new Vector3(0, 1, 0),
      rotation.current,
    );
    rigidBodyRef.current.setLinvel(
      {
        x: direction.x * currentSpeed.current,
        y: currentVel.y,
        z: direction.z * currentSpeed.current,
      },
      true,
    );

    const targetLean = -turnInput * MAX_LEAN * speedRatio;
    modelRef.current.rotation.z = MathUtils.damp(
      modelRef.current.rotation.z,
      targetLean,
      LEAN_DAMP,
      delta,
    );

    const pos = rigidBodyRef.current.translation();
    setTargetPosition({ x: pos.x, y: pos.y, z: pos.z });
    setSpeed(Math.abs(currentSpeed.current) * 3.6); // m/s -> km/h
  });

  return (
    <RigidBody
      position={[0, 2, 0]}
      type="dynamic"
      colliders={false}
      enabledRotations={[false, false, false]}
      ref={rigidBodyRef}
      interpolate={true}
    >
      <CylinderCollider
        args={[1, 2]}
        sensor={true}
        onIntersectionEnter={(enter) => {
          if (enter.other.rigidBodyObject?.name === "player")
            setIsPlayerNear(true);
        }}
        onIntersectionExit={(exit) => {
          if (exit.other.rigidBodyObject?.name === "player")
            setIsPlayerNear(false);
        }}
      />
      <BallCollider args={[0.19]} position={[0, 0.12, 0.5]} friction={0.5} />
      <BallCollider args={[0.19]} position={[0, 0.12, -0.45]} friction={0.5} />

      {isPlayerNear && !isMounted && (
        <Html position={[0, 1.5, 0]} center>
          <div
            style={{
              background: "rgba(0,0,0,0.7)",
              color: "white",
              padding: "6px 12px",
              borderRadius: "6px",
              whiteSpace: "nowrap",
              fontFamily: "monospace",
              fontSize: 12,
            }}
          >
            Press F or tap Ride
          </div>
        </Html>
      )}

      {!isMounted && (
        <primitive
          object={scooter0.scene}
          ref={modelRef}
          position={[0, 0, 0]}
        />
      )}
      {isMounted && (
        <primitive
          object={scooter1.scene}
          ref={modelRef}
          position={[0, 0, 0]}
        />
      )}
    </RigidBody>
  );
}
