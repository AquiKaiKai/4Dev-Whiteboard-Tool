import { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { useThemeSync } from "@/hooks/use-theme-sync";
import { useUiStore } from "@/stores/ui-store";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

export function AppShell() {
  useThemeSync();
  const open = useUiStore((s) => s.mobileNavOpen);
  const setMobileNav = useUiStore((s) => s.setMobileNav);
  const { pathname } = useLocation();

  useEffect(() => setMobileNav(false), [pathname, setMobileNav]);

  return (
    <div className="flex h-full">
      <div className="hidden md:block"><Sidebar /></div>
      {open && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-foreground/40" onClick={() => setMobileNav(false)} aria-hidden />
          <div className="absolute inset-y-0 left-0"><Sidebar mobile /></div>
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="min-h-0 flex-1 overflow-y-auto"><Outlet /></main>
      </div>
    </div>
  );
}
