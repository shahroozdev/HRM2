"use client";

import { Bell, Menu, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import { useUIStore } from "@/store/ui-store";
import { RoleBadge } from "@/components/shared/role-badge";
import { useAuthSession } from "@/hooks/use-auth-session";

export function Topbar({ title }: { title: string }): React.JSX.Element {
  const { setTheme, theme } = useTheme();
  const router = useRouter();
  const { data } = useAuthSession();
  const { toggleSidebar } = useUIStore();

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  return (
    <header className="sticky top-0 z-20 flex items-center justify-between border-b border-[var(--surface-border)] bg-[var(--surface-bg)] px-4 py-3">
      <div className="flex items-center gap-3">
        <button onClick={toggleSidebar} className="rounded-md border border-[var(--surface-border)] p-2" type="button">
          <Menu size={18} />
        </button>
        <div>
          <div className="text-xs text-[var(--muted-text)]">HRM / Workspace</div>
          <h1 className="text-lg font-semibold">{title}</h1>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button className="relative rounded-md border border-[var(--surface-border)] p-2" type="button">
          <Bell size={18} />
          <span className="absolute -right-1 -top-1 rounded-full bg-[var(--accent)] px-1 text-[10px] text-white">3</span>
        </button>
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="rounded-md border border-[var(--surface-border)] p-2"
          type="button"
        >
          {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        <RoleBadge role={data?.user?.role ?? "employee"} />
        <button onClick={handleLogout} className="rounded-md bg-[var(--accent)] px-3 py-2 text-sm text-white" type="button">
          Logout
        </button>
      </div>
    </header>
  );
}
