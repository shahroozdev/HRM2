"use client";

import Link from "next/link";
import { CalendarCheck2, LayoutDashboard, Users, WalletCards } from "lucide-react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Home" },
  { href: "/employees", icon: Users, label: "Employees" },
  { href: "/attendance", icon: CalendarCheck2, label: "Attendance" },
  { href: "/leaves", icon: WalletCards, label: "Leaves" },
];

export function MobileTabs(): React.JSX.Element {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around border-t border-[var(--surface-border)] bg-[var(--surface-bg)] p-2 md:hidden">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        return (
          <Link key={tab.href} href={tab.href} className={cn("flex flex-col items-center rounded-md px-3 py-2 text-xs", pathname.startsWith(tab.href) ? "text-[var(--accent)]" : "text-[var(--muted-text)]")}>
            <Icon size={18} />
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
