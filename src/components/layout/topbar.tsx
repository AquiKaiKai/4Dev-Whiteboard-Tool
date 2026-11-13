import { Bell, Menu as MenuIcon, Search } from "lucide-react";
import { useEffect, useRef } from "react";
import { Menu, menuItemClass } from "@/components/common/menu";
import { Button } from "@/components/ui/button";
import { useUiStore } from "@/stores/ui-store";
import { Breadcrumbs } from "./breadcrumbs";
import { ThemeToggle } from "./theme-toggle";

export function Topbar() {
  const setMobileNav = useUiStore((s) => s.setMobileNav);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <header className="flex h-12 shrink-0 items-center gap-3 border-b bg-background px-3 md:px-4">
      <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open navigation" onClick={() => setMobileNav(true)}>
        <MenuIcon className="h-4 w-4" />
      </Button>
      <div className="min-w-0 flex-1"><Breadcrumbs /></div>

      <div className="relative hidden w-64 sm:block">
        <Search className="pointer-events-none absolute left-2 top-2 h-4 w-4 text-muted-foreground" aria-hidden />
        <input
          ref={searchRef}
          type="search"
          placeholder="Search projects, tasks, boards"
          aria-label="Global search"
          className="h-8 w-full rounded-md border bg-muted pl-8 pr-10 text-sm placeholder:text-muted-foreground"
        />
        <kbd className="pointer-events-none absolute right-2 top-1.5 rounded border bg-background px-1 text-[10px] text-muted-foreground">Ctrl K</kbd>
      </div>

      <Menu
        align="end"
        className="w-72"
        trigger={({ toggle }) => (
          <Button variant="ghost" size="icon" onClick={toggle} aria-label="Notifications" aria-haspopup="menu">
            <Bell className="h-4 w-4" />
          </Button>
        )}
      >
        {() => <p className="px-3 py-6 text-center text-sm text-muted-foreground">No notifications yet.</p>}
      </Menu>

      <ThemeToggle />

      <Menu
        align="end"
        trigger={({ toggle }) => (
          <button
            onClick={toggle}
            aria-label="Account menu"
            aria-haspopup="menu"
            className="grid h-7 w-7 place-items-center rounded-full bg-primary/15 text-xs font-semibold text-primary"
          >
            JJ
          </button>
        )}
      >
        {(close) => (
          <>
            <div className="px-2 py-1.5">
              <p className="font-medium">Jander Juan</p>
              <p className="text-xs text-muted-foreground">Signed in as a mock user</p>
            </div>
            <button className={menuItemClass} disabled title="Available once authentication is connected" onClick={close}>
              Sign out
            </button>
          </>
        )}
      </Menu>
    </header>
  );
}
