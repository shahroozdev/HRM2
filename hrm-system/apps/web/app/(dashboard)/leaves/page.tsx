"use client";

import { applyLeaveAction } from "@/actions/mutations";
import { DataTable } from "@/components/shared/data-table";
import { PageHeader } from "@/components/shared/page-header";
import { useLeaves } from "@/hooks/use-leaves";
import { useState, useTransition } from "react";
import { canView } from "@/lib/permissions";
import { useAuthSession } from "@/hooks/use-auth-session";

export default function LeavesPage(): React.JSX.Element {
  const [tab, setTab] = useState<"my" | "all">("my");
  const [pending, startTransition] = useTransition();
  const leaves = useLeaves();
  const { data: session } = useAuthSession();
  const rows = leaves.data?.data ?? [];

  return (
    <div>
      <PageHeader title="Leaves" description="Apply and manage leave requests" />
      <div className="mb-4 flex gap-2"><button onClick={() => setTab("my")} className={`rounded px-3 py-2 ${tab === "my" ? "bg-[var(--accent)] text-white" : "bg-slate-200"}`} type="button">My Leaves</button>{canView(session?.user?.role, "leaves") && <button onClick={() => setTab("all")} className={`rounded px-3 py-2 ${tab === "all" ? "bg-[var(--accent)] text-white" : "bg-slate-200"}`} type="button">All Leaves</button>}</div>
      {tab === "my" && <div className="space-y-4"><form action={(fd) => { const payload = Object.fromEntries(fd.entries()); startTransition(async () => applyLeaveAction(payload)); }} className="grid gap-3 rounded-xl border p-4 md:grid-cols-4"><input name="leaveTypeId" placeholder="Leave Type ID" className="rounded border p-2" required /><input name="startDate" type="date" className="rounded border p-2" required /><input name="endDate" type="date" className="rounded border p-2" required /><button className="rounded bg-[var(--accent)] px-3 py-2 text-white" type="submit">{pending ? "Applying..." : "Apply"}</button><textarea name="reason" placeholder="Reason" className="md:col-span-4 rounded border p-2" required /></form><DataTable data={rows} columns={[{ key: "leaveTypeId", header: "Type" }, { key: "startDate", header: "Start" }, { key: "endDate", header: "End" }, { key: "status", header: "Status" }]} pagination={{ page: 1, pageSize: 10, total: rows.length }} loading={leaves.isLoading} /></div>}
      {tab === "all" && <DataTable data={rows} columns={[{ key: "employeeId", header: "Employee" }, { key: "leaveTypeId", header: "Type" }, { key: "status", header: "Status" }, { key: "id", header: "Action", render: () => <div className="flex gap-2"><button className="rounded bg-emerald-600 px-2 py-1 text-xs text-white" type="button">Approve</button><button className="rounded bg-rose-600 px-2 py-1 text-xs text-white" type="button">Reject</button></div> }]} pagination={{ page: 1, pageSize: 10, total: rows.length }} loading={leaves.isLoading} />}
    </div>
  );
}
