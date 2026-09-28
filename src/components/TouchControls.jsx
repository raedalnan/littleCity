import { useCallback, useEffect, useRef, useState } from "react";
import { isTouchDevice, useTouchInput } from "../store/touchInput";

const JOYSTICK_RADIUS = 50; // px of max stick travel from center

export default function TouchControls() {
  const [show, setShow] = useState(false);
  const setMove = useTouchInput((s) => s.setMove);
  const setRunning = useTouchInput((s) => s.setRunning);
  const requestJump = useTouchInput((s) => s.requestJump);
  const requestRide = useTouchInput((s) => s.requestRide);

  const baseRef = useRef(null);
  const stickRef = useRef(null);
  const activePointerId = useRef(null);
  const originRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    setShow(isTouchDevice());
  }, []);

  const updateStick = (clientX, clientY) => {
    const dx = clientX - originRef.current.x;
    const dy = clientY - originRef.current.y;
    const dist = Math.min(Math.hypot(dx, dy), JOYSTICK_RADIUS);
    const angle = Math.atan2(dy, dx);
    const stickX = Math.cos(angle) * dist;
    const stickY = Math.sin(angle) * dist;

    if (stickRef.current) {
      stickRef.current.style.transform = `translate(${stickX}px, ${stickY}px)`;
    }
    // Screen Y grows downward; "up" on the pad should mean "forward".
    setMove({ x: stickX / JOYSTICK_RADIUS, z: -stickY / JOYSTICK_RADIUS });
  };

  const handlePointerDown = useCallback((e) => {
    if (activePointerId.current !== null) return;
    activePointerId.current = e.pointerId;
    const rect = baseRef.current.getBoundingClientRect();
    originRef.current = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    };
    updateStick(e.clientX, e.clientY);
    e.target.setPointerCapture(e.pointerId);
  }, []);

  const handlePointerMove = useCallback((e) => {
    if (activePointerId.current !== e.pointerId) return;
    updateStick(e.clientX, e.clientY);
  }, []);

  const handlePointerUp = useCallback(
    (e) => {
      if (activePointerId.current !== e.pointerId) return;
      activePointerId.current = null;
      if (stickRef.current)
        stickRef.current.style.transform = "translate(0px, 0px)";
      setMove({ x: 0, z: 0 });
    },
    [setMove],
  );

  if (!show) return null;

  return (
    <div style={styles.container}>
      <div
        ref={baseRef}
        style={styles.joystickBase}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <div ref={stickRef} style={styles.joystickStick} />
      </div>

      <div style={styles.actionCluster}>
        <button
          style={styles.runButton}
          onPointerDown={() => setRunning(true)}
          onPointerUp={() => setRunning(false)}
          onPointerCancel={() => setRunning(false)}
        >
          Run
        </button>
        <button style={styles.jumpButton} onPointerDown={() => requestJump()}>
          Jump
        </button>
        <button style={styles.rideButton} onPointerDown={() => requestRide()}>
          Ride
        </button>
      </div>
    </div>
  );
}

const styles = {
  container: {
    position: "fixed",
    inset: 0,
    pointerEvents: "none",
    touchAction: "none",
    zIndex: 20,
  },
  joystickBase: {
    position: "absolute",
    left: 24,
    bottom: 24,
    width: 110,
    height: 110,
    borderRadius: "50%",
    background: "rgba(255,255,255,0.12)",
    border: "1px solid rgba(255,255,255,0.3)",
    pointerEvents: "auto",
    touchAction: "none",
  },
  joystickStick: {
    position: "absolute",
    left: "50%",
    top: "50%",
    width: 48,
    height: 48,
    marginLeft: -24,
    marginTop: -24,
    borderRadius: "50%",
    background: "rgba(255,255,255,0.5)",
    transition: "transform 0.05s linear",
  },
  actionCluster: {
    position: "absolute",
    right: 24,
    bottom: 24,
    display: "flex",
    flexDirection: "column",
    gap: 12,
    alignItems: "center",
  },
  runButton: {
    width: 64,
    height: 64,
    borderRadius: "50%",
    background: "rgba(255,255,255,0.18)",
    border: "1px solid rgba(255,255,255,0.35)",
    color: "white",
    fontFamily: "monospace",
    fontSize: 11,
    pointerEvents: "auto",
    touchAction: "none",
  },
  jumpButton: {
    width: 76,
    height: 76,
    borderRadius: "50%",
    background: "rgba(255,255,255,0.25)",
    border: "1px solid rgba(255,255,255,0.4)",
    color: "white",
    fontFamily: "monospace",
    fontSize: 12,
    fontWeight: "bold",
    pointerEvents: "auto",
    touchAction: "none",
  },
  rideButton: {
    width: 76,
    height: 76,
    borderRadius: "50%",
    background: "rgba(255,255,255,0.25)",
    border: "1px solid rgba(255,255,255,0.4)",
    color: "white",
    fontFamily: "monospace",
    fontSize: 12,
    fontWeight: "bold",
    pointerEvents: "auto",
    touchAction: "none",
  },
};
