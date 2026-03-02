"use client";

import { DataTable } from "@/components/shared/data-table";
import { PageHeader } from "@/components/shared/page-header";
import { useAttendance } from "@/hooks/use-attendance";
import { useState, useMemo } from "react";
import { canEdit, canManualAttendance } from "@/lib/permissions";
import { useAuthSession } from "@/hooks/use-auth-session";
import { useAccessPolicy } from "@/hooks/use-access-policy";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { useEmployees } from "@/hooks/use-employees";
import { useLeaves } from "@/hooks/use-leaves";

function toDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function AttendancePage(): React.JSX.Element {
  const [date, setDate] = useState(() => toDateString(new Date()));
  const [monthCursor, setMonthCursor] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const { data: session } = useAuthSession();
  const { data: accessPolicy } = useAccessPolicy();
  const attendance = useAttendance({ from: date, to: date });
  const employees = useEmployees(1, "");
  const leaves = useLeaves();
  const [markModal, setMarkModal] = useState(false);
  const [employeeId, setEmployeeId] = useState("");
  const [notes, setNotes] = useState("");
  const [action, setAction] = useState<"check-in" | "check-out">("check-in");
  const [saving, setSaving] = useState(false);
  const rows = attendance.data?.data ?? [];
  const canPickEmployee = ["super_admin", "hr_manager", "manager"].includes(session?.user?.role ?? "");
  const canManageAttendance = canEdit(session?.user?.role, "attendance");

  const monthStart = useMemo(() => new Date(monthCursor.getFullYear(), monthCursor.getMonth(), 1), [monthCursor]);
  const monthEnd = useMemo(() => new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 0), [monthCursor]);
  const monthAttendance = useAttendance({ from: toDateString(monthStart), to: toDateString(monthEnd) });

  const calendarStats = useMemo(() => {
    const monthRows = monthAttendance.data?.data ?? [];
    const stats: Record<string, { present: number; absent: number; leave: number }> = {};
    for (const row of monthRows) {
      const key = String(row.date);
      if (!stats[key]) stats[key] = { present: 0, absent: 0, leave: 0 };
      const status = String(row.status);
      if (status === "absent") {
        stats[key].absent += 1;
      } else {
        stats[key].present += 1;
      }
    }

    const leaveRows = leaves.data?.data ?? [];
    for (const leave of leaveRows) {
      if (leave.status !== "approved") continue;
      let day = new Date(`${leave.startDate}T00:00:00`);
      const end = new Date(`${leave.endDate}T00:00:00`);
      while (day <= end) {
        const key = toDateString(day);
        if (!stats[key]) stats[key] = { present: 0, absent: 0, leave: 0 };
        stats[key].leave += 1;
        day = new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1);
      }
    }

    return stats;
  }, [monthAttendance.data, leaves.data]);

  const calendarCells = useMemo(() => {
    const startOffset = monthStart.getDay();
    const daysInMonth = monthEnd.getDate();
    const cells: Array<{ date: string | null; day: number | null }> = [];
    for (let i = 0; i < startOffset; i += 1) cells.push({ date: null, day: null });
    for (let day = 1; day <= daysInMonth; day += 1) {
      const current = new Date(monthStart.getFullYear(), monthStart.getMonth(), day);
      cells.push({ date: toDateString(current), day });
    }
    while (cells.length % 7 !== 0) cells.push({ date: null, day: null });
    return cells;
  }, [monthStart, monthEnd]);

  const submitManualMark = async () => {
    try {
      setSaving(true);
      const payload: Record<string, string> = { notes };
      if (canPickEmployee && employeeId.trim()) payload.employeeId = employeeId.trim();
      payload.date = date;
      await api.post(`/attendance/${action}`, payload);
      toast.success(`Manual ${action} recorded`);
      setMarkModal(false);
      setNotes("");
      setEmployeeId("");
      await attendance.refetch();
    } catch (error: any) {
      toast.error(error?.response?.data?.error?.message ?? "Unable to record manual attendance");
    } finally {
      setSaving(false);
    }
  };

  const editRecord = async (row: any) => {
    const status = window.prompt("Status (present/absent/late/half_day)", row.status ?? "present");
    if (status === null) return;
    const notesInput = window.prompt("Notes", row.notes ?? "");
    if (notesInput === null) return;
    await api.put(`/attendance/${row.id}`, { status: status.trim(), notes: notesInput.trim() || null });
    toast.success("Attendance updated");
    await attendance.refetch();
  };

  const deleteRecord = async (row: any) => {
    if (!window.confirm(`Delete attendance for ${row.date}?`)) return;
    await api.delete(`/attendance/${row.id}`);
    toast.success("Attendance deleted");
    await attendance.refetch();
  };

  return (
    <div>
      <PageHeader title="Attendance" description="Daily attendance tracking" action={<div className="flex gap-2"><input value={date} onChange={(e) => setDate(e.target.value)} type="date" className="rounded border px-3" />{canManualAttendance(session?.user?.role, accessPolicy) && <button onClick={() => setMarkModal(true)} className="rounded bg-[var(--accent)] px-3 py-2 text-white" type="button">Manual Mark</button>}</div>} />
      <div className="mb-4 rounded-xl border p-4">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Attendance Calendar</h3>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="rounded border px-3 py-1"
              onClick={() => setMonthCursor((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
            >
              Prev
            </button>
            <span className="min-w-40 text-center font-medium">
              {monthStart.toLocaleString("en-US", { month: "long", year: "numeric" })}
            </span>
            <button
              type="button"
              className="rounded border px-3 py-1"
              onClick={() => setMonthCursor((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
            >
              Next
            </button>
          </div>
        </div>
        <div className="mb-3 flex flex-wrap gap-2 text-xs">
          <span className="rounded-full bg-emerald-100 px-2 py-1 text-emerald-700">Present</span>
          <span className="rounded-full bg-rose-100 px-2 py-1 text-rose-700">Absent</span>
          <span className="rounded-full bg-sky-100 px-2 py-1 text-sky-700">Leave</span>
        </div>
        <div className="grid grid-cols-7 border-l border-t text-center text-xs font-semibold text-[var(--muted-text)]">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div key={day} className="border-b border-r p-2">{day}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 border-l">
          {calendarCells.map((cell, index) => {
            const stats = cell.date ? calendarStats[cell.date] : null;
            const selected = cell.date === date;
            return (
              <button
                key={`${cell.date ?? "empty"}-${index}`}
                type="button"
                disabled={!cell.date}
                onClick={() => {
                  if (cell.date) setDate(cell.date);
                }}
                className={`min-h-28 border-b border-r p-2 text-left align-top ${selected ? "bg-[var(--surface-bg)] ring-1 ring-[var(--accent)]" : ""}`}
              >
                {cell.day ? <div className="mb-2 text-sm font-semibold">{cell.day}</div> : null}
                {stats && (
                  <div className="space-y-1 text-[11px]">
                    {stats.present > 0 && <div className="rounded bg-emerald-100 px-2 py-1 text-emerald-700">Present: {stats.present}</div>}
                    {stats.absent > 0 && <div className="rounded bg-rose-100 px-2 py-1 text-rose-700">Absent: {stats.absent}</div>}
                    {stats.leave > 0 && <div className="rounded bg-sky-100 px-2 py-1 text-sky-700">Leave: {stats.leave}</div>}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
      <div className="mb-4 flex gap-2 text-xs"><span className="rounded-full bg-emerald-100 px-2 py-1">Present: {rows.filter((r: any) => r.status === "present").length}</span><span className="rounded-full bg-rose-100 px-2 py-1">Absent: {rows.filter((r: any) => r.status === "absent").length}</span><span className="rounded-full bg-amber-100 px-2 py-1">Late: {rows.filter((r: any) => r.status === "late").length}</span></div>
      <DataTable
        data={rows}
        columns={[
          { key: "employeeId", header: "Employee" },
          { key: "date", header: "Date" },
          { key: "checkIn", header: "Check In" },
          { key: "checkOut", header: "Check Out" },
          { key: "status", header: "Status" },
          {
            key: "actions",
            header: "Actions",
            render: (row: any) =>
              canManageAttendance ? (
                <div className="flex gap-2">
                  <button type="button" className="rounded border px-2 py-1 text-xs" onClick={() => editRecord(row)}>
                    Edit
                  </button>
                  <button type="button" className="rounded bg-rose-600 px-2 py-1 text-xs text-white" onClick={() => deleteRecord(row)}>
                    Delete
                  </button>
                </div>
              ) : (
                "-"
              ),
          },
        ]}
        pagination={{ page: 1, pageSize: 20, total: rows.length }}
        loading={attendance.isLoading}
      />
      {markModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-[var(--surface-bg)] p-5">
            <h3 className="text-lg font-semibold">Manual Attendance</h3>
            <p className="mt-1 text-sm text-[var(--muted-text)]">For your own attendance, leave Employee ID empty. Managers/HR can enter employee ID.</p>
            <div className="mt-4 space-y-3">
              <select value={action} onChange={(e) => setAction(e.target.value as "check-in" | "check-out")} className="w-full rounded border p-2">
                <option value="check-in">Check In</option>
                <option value="check-out">Check Out</option>
              </select>
              {canPickEmployee && (
                <select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} className="w-full rounded border p-2">
                  <option value="">Select employee (optional)</option>
                  {(employees.data?.data ?? []).map((emp: any) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.firstName} {emp.lastName} ({emp.employeeId})
                    </option>
                  ))}
                </select>
              )}
              <input value={date} onChange={(e) => setDate(e.target.value)} type="date" className="w-full rounded border p-2" />
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes (optional)" className="w-full rounded border p-2" />
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setMarkModal(false)} className="rounded border px-3 py-2" type="button">Cancel</button>
              <button disabled={saving} onClick={submitManualMark} className="rounded bg-[var(--accent)] px-3 py-2 text-white" type="button">
                {saving ? "Saving..." : "Submit"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
