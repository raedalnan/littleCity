import { Canvas } from "@react-three/fiber";
import { KeyboardControls, Loader } from "@react-three/drei";
import { PCFSoftShadowMap } from "three";
import Experience from "./components/Experience.jsx";
import { useGameStore } from "./store.js";
import TouchControls from "./components/TouchControls.jsx";

const keyboardMap = [
  { name: "forward", keys: ["ArrowUp", "KeyW"] },
  { name: "backward", keys: ["ArrowDown", "KeyS"] },
  { name: "left", keys: ["ArrowLeft", "KeyA"] },
  { name: "right", keys: ["ArrowRight", "KeyD"] },
  { name: "run", keys: ["Shift"] },
  { name: "jump", keys: ["Space"] },
  { name: "mount", keys: ["KeyF"] },
];

function Hud() {
  const speed = useGameStore((state) => state.speed) ?? 0;
  const targetPosition = useGameStore((state) => state.targetPosition) ?? {
    x: 0,
    y: 0,
    z: 0,
  };
  const isMounted = useGameStore((state) => state.isMounted);

  return (
    <div style={styles.container}>
      <div style={styles.speedometer}>
        <div style={styles.speedValue}>{Math.round(speed)}</div>
        <div style={styles.speedUnit}>KM/H</div>
      </div>

      <div style={styles.coords}>
        X {targetPosition.x.toFixed(1)} · Y {targetPosition.y.toFixed(1)} · Z{" "}
        {targetPosition.z.toFixed(1)}
      </div>
      {isMounted && <div style={styles.prompt}>[F] Dismount</div>}
    </div>
  );
}

const styles = {
  container: {
    position: "fixed",
    inset: 0,
    pointerEvents: "none",
    fontFamily: "monospace",
    color: "white",
    userSelect: "none",
  },
  speedometer: {
    position: "absolute",
    top: 24,
    right: 24,
    textAlign: "center",
    background: "rgba(0,0,0,0.55)",
    borderRadius: "50%",
    width: 90,
    height: 90,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
  },
  speedValue: { fontSize: 28, fontWeight: "bold", lineHeight: 1 },
  speedUnit: { fontSize: 11, opacity: 0.8, marginTop: 2 },
  coords: {
    position: "absolute",
    bottom: 24,
    left: 24,
    background: "rgba(0,0,0,0.55)",
    padding: "6px 10px",
    borderRadius: 6,
    fontSize: 12,
  },
  prompt: {
    position: "absolute",
    top: 24,
    left: "50%",
    transform: "translateX(-50%)",
    background: "rgba(0,0,0,0.55)",
    padding: "4px 12px",
    borderRadius: 6,
    fontSize: 12,
  },
};

export default function App() {
  return (
    <>
      <KeyboardControls map={keyboardMap}>
        <Canvas
          shadows={{ type: PCFSoftShadowMap }}
          camera={{
            fov: 45,
            near: 0.1,
            far: 200,
            position: [15, 4, -5],
          }}
        >
          <Experience />
        </Canvas>

        <Hud />
        <TouchControls />
      </KeyboardControls>
      <Loader />
    </>
  );
}
