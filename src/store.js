import { create } from "zustand";

export const useGameStore = create((set) => ({
  isMounted: false,

  lastLocation: { x: 0, y: 0, z: 0 },
  targetPosition: { x: 0, y: 0, z: 0 },
  speed: 0,

  setIsMounted: (val) => set({ isMounted: val }),
  setLastLocation: (val) => set({ lastLocation: val }),
  setTargetPosition: (val) => set({ targetPosition: val }),
  setSpeed: (val) => set({ speed: val }),
}));
