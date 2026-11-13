import { create } from "zustand";
import type { Role } from "@/types";

interface SessionState {
  userId: string;
  role: Role;
  setRole: (role: Role) => void;
}
/** Mock session. Replaced by real authentication data once the backend exists. */
export const useSessionStore = create<SessionState>((set) => ({
  userId: "u1",
  role: "owner",
  setRole: (role) => set({ role }),
}));
