import { cn } from "@/lib/utils";

const roleStyles: Record<string, string> = {
  super_admin: "bg-red-100 text-red-700",
  hr_manager: "bg-indigo-100 text-indigo-700",
  manager: "bg-amber-100 text-amber-700",
  employee: "bg-emerald-100 text-emerald-700",
};

export function RoleBadge({ role }: { role: string }): React.JSX.Element {
  return <span className={cn("rounded-full px-2 py-1 text-xs font-medium", roleStyles[role] ?? "bg-slate-100 text-slate-700")}>{role.replace("_", " ")}</span>;
}