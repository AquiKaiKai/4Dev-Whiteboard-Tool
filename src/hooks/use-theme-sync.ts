import { useEffect } from "react";
import { useUiStore } from "@/stores/ui-store";

/** Applies the chosen theme to <html> and follows OS changes in "system" mode. */
export function useThemeSync() {
  const theme = useUiStore((s) => s.theme);
  useEffect(() => {
    const mq = matchMedia("(prefers-color-scheme: dark)");
    const apply = () =>
      document.documentElement.classList.toggle("dark", theme === "dark" || (theme === "system" && mq.matches));
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [theme]);
}
