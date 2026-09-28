import { useEffect, useRef } from "react";
import { useAnimations, useGLTF, useKeyboardControls } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { CapsuleCollider, RigidBody, useRapier } from "@react-three/rapier";
import { Vector3 } from "three";
import { useGameStore } from "../store";
import { useTouchInput } from "../store/touchInput";

const WALK_SPEED = 3;
const RUN_SPEED = 6;
const ROTATION_SPEED = 3;
const JUMP_VELOCITY = 5;
const GROUND_RAY_LENGTH = 1.3;
const MOVE_EPS = 0.05;
const CATEGORY_FADE = 0.15;
const JUMP_FADE = 0.1;

const GROUND_ACCEL = 10;
const AIR_ACCEL = 3;

function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v));
}

function damp(current, target, lambda, delta) {
  return current + (target - current) * (1 - Math.exp(-lambda * delta));
}

export default function Character() {
  const modelRef = useRef();
  const rigidBodyRef = useRef();

  const rotation = useRef(0);
  const currentSpeed = useRef(0);
  const isJumping = useRef(false);
  const jumpKeyLatch = useRef(false);
  const currentCategory = useRef("idle");

  const directionScratch = useRef(new Vector3());
  const upAxis = useRef(new Vector3(0, 1, 0));

  const { world, rapier } = useRapier();

  const lastLocation = useGameStore((state) => state.lastLocation);
  const setTargetPosition = useGameStore((state) => state.setTargetPosition);
  const setSpeed = useGameStore((state) => state.setSpeed);

  const model = useGLTF("./Character.glb");
  const [, getKeys] = useKeyboardControls();
  const { actions } = useAnimations(model.animations, modelRef);

  function checkGrounded() {
    if (!rigidBodyRef.current) return false;
    const origin = rigidBodyRef.current.translation();
    const ray = new rapier.Ray(origin, { x: 0, y: -1, z: 0 });
    const hit = world.castRay(
      ray,
      GROUND_RAY_LENGTH,
      true,
      undefined,
      undefined,
      undefined,
      rigidBodyRef.current,
    );
    return hit !== null;
  }

  useEffect(() => {
    if (!rigidBodyRef.current) return;
    rigidBodyRef.current.setTranslation(
      { x: lastLocation.x + 1, y: lastLocation.y + 2, z: lastLocation.z },
      true,
    );
    rigidBodyRef.current.setLinvel({ x: 0, y: 0, z: 0 }, true);
    actions.idle?.reset().fadeIn(0.2).play();
    currentCategory.current = "idle";
  }, []);

  useEffect(() => {
    model.scene.traverse((child) => {
      if (child.isMesh) {
        child.receiveShadow = true;
        child.castShadow = true;
      }
    });
  }, [model.scene]);

  useFrame((_, delta) => {
    if (!modelRef.current || !rigidBodyRef.current) return;

    const {
      forward,
      backward,
      left,
      right,
      run: keyRunning,
      jump: keyJumpHeld,
    } = getKeys();
    const touch = useTouchInput.getState();

    const analogTurn = clamp(
      (left ? 1 : 0) - (right ? 1 : 0) - touch.move.x,
      -1,
      1,
    );
    const analogForward = clamp(
      (forward ? 1 : 0) - (backward ? 1 : 0) + touch.move.z,
      -1,
      1,
    );
    const running = keyRunning || touch.running;

    const jumpEdge =
      (keyJumpHeld && !jumpKeyLatch.current) || touch.jumpRequested;
    jumpKeyLatch.current = keyJumpHeld;
    if (touch.jumpRequested) touch.consumeJump();

    const grounded = checkGrounded();

    rotation.current += ROTATION_SPEED * analogTurn * delta;
    modelRef.current.rotation.y = rotation.current;

    const direction = directionScratch.current
      .set(0, 0, 1)
      .applyAxisAngle(upAxis.current, rotation.current);

    const targetSpeed =
      analogForward === 0
        ? 0
        : analogForward > 0
          ? (running ? RUN_SPEED : WALK_SPEED) * analogForward
          : WALK_SPEED * 0.4 * analogForward;

    const accelRate = grounded ? GROUND_ACCEL : AIR_ACCEL;
    currentSpeed.current = damp(
      currentSpeed.current,
      targetSpeed,
      accelRate,
      delta,
    );

    const currentVel = rigidBodyRef.current.linvel();
    let verticalVel = currentVel.y;

    if (jumpEdge && grounded && !isJumping.current) {
      verticalVel = JUMP_VELOCITY;
      isJumping.current = true;
    }
    if (isJumping.current && grounded && verticalVel <= 0.01) {
      isJumping.current = false;
    }

    rigidBodyRef.current.setLinvel(
      {
        x: direction.x * currentSpeed.current,
        y: verticalVel,
        z: direction.z * currentSpeed.current,
      },
      true,
    );

    const category = isJumping.current
      ? "jump"
      : currentSpeed.current < -MOVE_EPS
        ? "backward"
        : Math.abs(currentSpeed.current) > MOVE_EPS
          ? "move"
          : "idle";

    if (currentCategory.current !== category) {
      if (currentCategory.current === "idle")
        actions.idle?.fadeOut(CATEGORY_FADE);
      if (currentCategory.current === "backward")
        actions.walkingBackwards?.fadeOut(CATEGORY_FADE);
      if (currentCategory.current === "jump")
        actions.jumping?.fadeOut(CATEGORY_FADE);
      if (currentCategory.current === "move") {
        actions.walking?.fadeOut(CATEGORY_FADE);
        actions.running?.fadeOut(CATEGORY_FADE);
      }

      if (category === "idle")
        actions.idle?.reset().fadeIn(CATEGORY_FADE).play();
      if (category === "backward")
        actions.walkingBackwards?.reset().fadeIn(CATEGORY_FADE).play();
      if (category === "jump")
        actions.jumping?.reset().fadeIn(JUMP_FADE).play();
      if (category === "move") {
        actions.walking?.reset().fadeIn(CATEGORY_FADE).play();
        actions.running?.reset().fadeIn(CATEGORY_FADE).play();
      }
      currentCategory.current = category;
    }

    if (category === "move") {
      const blend = clamp(
        (Math.abs(currentSpeed.current) - WALK_SPEED) /
          (RUN_SPEED - WALK_SPEED),
        0,
        1,
      );
      actions.walking?.setEffectiveWeight(1 - blend);
      actions.running?.setEffectiveWeight(blend);
    }

    const pos = rigidBodyRef.current.translation();
    setTargetPosition({ x: pos.x, y: pos.y, z: pos.z });
    setSpeed(Math.abs(currentSpeed.current) * 3.6);
  });

  return (
    <RigidBody
      colliders={false}
      type="dynamic"
      ref={rigidBodyRef}
      enabledRotations={[false, false, false]}
      name="player"
    >
      <CapsuleCollider args={[0.5, 0.3]} />
      <primitive object={model.scene} ref={modelRef} position={[0, -0.8, 0]} />
    </RigidBody>
  );
}
