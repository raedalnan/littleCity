import { create } from "zustand";

export const useTouchInput = create((set) => ({
  move: { x: 0, z: 0 },
  running: false,
  jumpRequested: false,
  RideRequested: false,
  setMove: (move) => set({ move }),
  setRunning: (running) => set({ running }),
  requestJump: () => set({ jumpRequested: true }),
  consumeJump: () => set({ jumpRequested: false }),
  requestRide: () => set({ RideRequested: true }),
  consumeRide: () => set({ RideRequested: false }),
}));

export const isTouchDevice = () =>
  typeof window !== "undefined" &&
  ("ontouchstart" in window || navigator.maxTouchPoints > 0);
