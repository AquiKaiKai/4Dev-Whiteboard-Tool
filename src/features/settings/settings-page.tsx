import { Card, inputCls } from "@/components/common/primitives";
import { useSessionStore } from "@/stores/session-store";
import type { Role } from "@/types";
import { roleLabel } from "@/utils/labels";

export function SettingsPage() {
  const role = useSessionStore((s) => s.role);
  const setRole = useSessionStore((s) => s.setRole);
  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4 md:p-6">
      <h2 className="text-lg font-semibold">Settings</h2>
      <Card className="space-y-2 p-4">
        <label htmlFor="role" className="font-medium">Preview as role</label>
        <p className="text-muted-foreground">Mock session only. Controls are hidden according to the role, so you can check the viewer and editor experience. The real role will come from the backend.</p>
        <select id="role" className={`${inputCls} max-w-48`} value={role} onChange={(e) => setRole(e.target.value as Role)}>
          {(Object.keys(roleLabel) as Role[]).map((r) => <option key={r} value={r}>{roleLabel[r]}</option>)}
        </select>
      </Card>
    </div>
  );
}
