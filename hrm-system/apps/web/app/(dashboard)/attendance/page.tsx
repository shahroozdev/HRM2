"use client";

import { DataTable } from "@/components/shared/data-table";
import { PageHeader } from "@/components/shared/page-header";
import { useAttendance } from "@/hooks/use-attendance";
import { useState } from "react";
import { canEdit } from "@/lib/permissions";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { useAuthSession } from "@/hooks/use-auth-session";

export default function AttendancePage(): React.JSX.Element {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const { data: session } = useAuthSession();
  const attendance = useAttendance({ from: date, to: date });
  const [markModal, setMarkModal] = useState(false);
  const rows = attendance.data?.data ?? [];

  return (
    <div>
      <PageHeader title="Attendance" description="Daily attendance tracking" action={<div className="flex gap-2"><input value={date} onChange={(e) => setDate(e.target.value)} type="date" className="rounded border px-3" />{canEdit(session?.user?.role, "attendance") && <button onClick={() => setMarkModal(true)} className="rounded bg-[var(--accent)] px-3 py-2 text-white" type="button">Manual Mark</button>}</div>} />
      <div className="mb-4 flex gap-2 text-xs"><span className="rounded-full bg-emerald-100 px-2 py-1">Present: {rows.filter((r: any) => r.status === "present").length}</span><span className="rounded-full bg-rose-100 px-2 py-1">Absent: {rows.filter((r: any) => r.status === "absent").length}</span><span className="rounded-full bg-amber-100 px-2 py-1">Late: {rows.filter((r: any) => r.status === "late").length}</span></div>
      <DataTable data={rows} columns={[{ key: "employeeId", header: "Employee" }, { key: "date", header: "Date" }, { key: "checkIn", header: "Check In" }, { key: "checkOut", header: "Check Out" }, { key: "status", header: "Status" }]} pagination={{ page: 1, pageSize: 20, total: rows.length }} loading={attendance.isLoading} />
      <ConfirmDialog open={markModal} title="Manual Mark" description="Use employee portal for complete manual marking workflow." onCancel={() => setMarkModal(false)} onConfirm={() => setMarkModal(false)} />
    </div>
  );
}
