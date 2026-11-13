import { useSessionStore } from "@/stores/session-store";
import { can, type Action } from "@/utils/permissions";

export function usePermissions() {
  const role = useSessionStore((s) => s.role);
  return (action: Action) => can(role, action);
}
