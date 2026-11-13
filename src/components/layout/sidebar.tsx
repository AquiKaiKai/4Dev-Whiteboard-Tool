import { ChevronsUpDown, PanelLeftClose, PanelLeftOpen, Check } from "lucide-react";
import { NavLink } from "react-router-dom";
import { Menu, menuItemClass } from "@/components/common/menu";
import { cn } from "@/utils/cn";
import { useUiStore } from "@/stores/ui-store";
import { primaryNav, secondaryNav, type NavItem } from "./nav-items";

function SidebarLink({ item, collapsed, onNavigate }: { item: NavItem; collapsed: boolean; onNavigate: () => void }) {
  return (
    <NavLink
      to={item.to}
      end={item.to === "/"}
      onClick={onNavigate}
      title={collapsed ? item.label : undefined}
      className={({ isActive }) =>
        cn(
          "flex h-8 items-center gap-2.5 rounded-md px-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
          isActive && "bg-accent font-medium text-foreground",
          collapsed && "justify-center px-0",
        )
      }
    >
      <item.icon className="h-4 w-4 shrink-0" aria-hidden />
      {!collapsed && <span className="truncate">{item.label}</span>}
    </NavLink>
  );
}

export function Sidebar({ mobile = false }: { mobile?: boolean }) {
  const collapsedPref = useUiStore((s) => s.sidebarCollapsed);
  const toggle = useUiStore((s) => s.toggleSidebar);
  const setMobileNav = useUiStore((s) => s.setMobileNav);
  const collapsed = collapsedPref && !mobile;
  const close = () => setMobileNav(false);

  return (
    <aside
      className={cn(
        "flex h-full flex-col border-r border-sidebar-border bg-sidebar transition-[width] duration-150",
        collapsed ? "w-14" : "w-60",
      )}
      aria-label="Primary"
    >
      <div className={cn("flex h-12 items-center gap-2 px-3", collapsed && "justify-center px-0")}>
        <div className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-primary text-[11px] font-bold text-primary-foreground">
          4D
        </div>
        {!collapsed && <span className="truncate font-semibold tracking-tight">4Dev Studio</span>}
      </div>

      {!collapsed && (
        <div className="px-2 pb-2">
          <Menu
            className="w-full"
            trigger={({ toggle: t }) => (
              <button
                onClick={t}
                className="flex h-8 w-full items-center justify-between rounded-md border bg-background px-2 text-left text-sm hover:bg-accent"
                aria-haspopup="menu"
              >
                <span className="truncate">Main workspace</span>
                <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
              </button>
            )}
          >
            {(done) => (
              <>
                <button className={menuItemClass} onClick={done}>
                  <Check className="h-3.5 w-3.5" aria-hidden /> Main workspace
                </button>
                <button className={menuItemClass} disabled title="Available once the workspace API is connected">
                  Create workspace
                </button>
              </>
            )}
          </Menu>
        </div>
      )}

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-1">
        {primaryNav.map((item) => (
          <SidebarLink key={item.to} item={item} collapsed={collapsed} onNavigate={close} />
        ))}
      </nav>

      <div className="space-y-0.5 border-t border-sidebar-border p-2">
        {secondaryNav.map((item) => (
          <SidebarLink key={item.to} item={item} collapsed={collapsed} onNavigate={close} />
        ))}
        {!mobile && (
          <button
            onClick={toggle}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className={cn(
              "flex h-8 w-full items-center gap-2.5 rounded-md px-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground",
              collapsed && "justify-center px-0",
            )}
          >
            {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
            {!collapsed && <span>Collapse</span>}
          </button>
        )}
      </div>
    </aside>
  );
}
