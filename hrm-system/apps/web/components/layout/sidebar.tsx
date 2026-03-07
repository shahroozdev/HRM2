"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { BarChart3, CalendarCheck2, DollarSign, FileText, LayoutDashboard, MessageSquare, Settings, Users, WalletCards } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useUIStore } from "@/store/ui-store";
import { cn } from "@/lib/utils";
import { useAuthSession } from "@/hooks/use-auth-session";
import { canView, Resource } from "@/lib/permissions";
import { useAccessPolicy } from "@/hooks/use-access-policy";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, resource: "dashboard" as Resource },
  { href: "/employees", label: "Employees", icon: Users, resource: "employees" as Resource },
  { href: "/attendance", label: "Attendance", icon: CalendarCheck2, resource: "attendance" as Resource },
  { href: "/leaves", label: "Leaves", icon: WalletCards, resource: "leaves" as Resource },
  { href: "/payroll", label: "Payroll", icon: DollarSign, resource: "payroll" as Resource },
  { href: "/documents", label: "Documents", icon: FileText, resource: "documents" as Resource },
  { href: "/reports", label: "Reports", icon: BarChart3, resource: "reports" as Resource },
  { href: "/messages", label: "Messages", icon: MessageSquare, resource: "messages" as Resource },
  { href: "/settings", label: "Settings", icon: Settings, resource: "settings" as Resource },
];

export function Sidebar(): React.JSX.Element {
  const pathname = usePathname();
  const { sidebarCollapsed } = useUIStore();
  const { data: session } = useAuthSession();
  const { data: accessPolicy } = useAccessPolicy();
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    const applyLogo = () => setLogoUrl(window.localStorage.getItem("hrm-company-logo"));
    applyLogo();
    window.addEventListener("hrm-logo-changed", applyLogo);
    return () => window.removeEventListener("hrm-logo-changed", applyLogo);
  }, []);

  return (
    <motion.aside
      animate={{ width: sidebarCollapsed ? 76 : 270 }}
      transition={{ type: "spring", stiffness: 260, damping: 24 }}
      className="sticky top-0 hidden h-screen flex-col border-r border-[var(--sidebar-border-color)] bg-[var(--sidebar-bg)] text-[var(--sidebar-text)] md:flex"
    >
      <div className="px-4 py-5">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 overflow-hidden rounded-lg border border-[var(--sidebar-border-color)] bg-black/10">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt="Company logo" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-sm font-bold">HR</div>
            )}
          </div>
          {!sidebarCollapsed && <div className="text-lg font-semibold">HRM Pro</div>}
        </div>
      </div>
      <nav className="flex-1 space-y-2 px-3">
        {nav.filter((item) => canView(session?.user?.role, item.resource, accessPolicy)).map((item) => {
          const Icon = item.icon;
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition",
                active ? "bg-[var(--accent)] text-white" : "hover:bg-[var(--sidebar-hover)]",
              )}
            >
              <Icon size={18} />
              {!sidebarCollapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>
    </motion.aside>
  );
}
