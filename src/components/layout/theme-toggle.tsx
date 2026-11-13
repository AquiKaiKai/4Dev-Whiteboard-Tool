import { Monitor, Moon, Sun } from "lucide-react";
import { Menu, menuItemClass } from "@/components/common/menu";
import { Button } from "@/components/ui/button";
import { useUiStore, type Theme } from "@/stores/ui-store";

const options: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

export function ThemeToggle() {
  const theme = useUiStore((s) => s.theme);
  const setTheme = useUiStore((s) => s.setTheme);
  const Current = options.find((o) => o.value === theme)?.icon ?? Sun;
  return (
    <Menu
      align="end"
      className="min-w-36"
      trigger={({ toggle }) => (
        <Button variant="ghost" size="icon" onClick={toggle} aria-label="Change theme" aria-haspopup="menu">
          <Current className="h-4 w-4" />
        </Button>
      )}
    >
      {(close) =>
        options.map((o) => (
          <button
            key={o.value}
            role="menuitemradio"
            aria-checked={theme === o.value}
            className={menuItemClass}
            onClick={() => { setTheme(o.value); close(); }}
          >
            <o.icon className="h-3.5 w-3.5" aria-hidden /> {o.label}
            {theme === o.value && <span className="ml-auto text-primary">●</span>}
          </button>
        ))
      }
    </Menu>
  );
}
