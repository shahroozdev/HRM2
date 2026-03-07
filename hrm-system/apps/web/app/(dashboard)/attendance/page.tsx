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
  const [syncing, setSyncing] = useState(false);
  const [tableFilter, setTableFilter] = useState<"all" | "present" | "absent" | "leave" | "late">("all");
  const [syncConfirmOpen, setSyncConfirmOpen] = useState(false);
  const [syncResetData, setSyncResetData] = useState(false);
  const rows = attendance.data?.data ?? [];
  const employeeRows = employees.data?.data ?? [];
  const leaveRows = leaves.data?.data ?? [];
  const canPickEmployee = ["super_admin", "hr_manager", "manager"].includes(
    session?.user?.role ?? "",
  );
  const canManageAttendance = canEdit(session?.user?.role, "attendance");

  const monthStart = useMemo(
    () => new Date(monthCursor.getFullYear(), monthCursor.getMonth(), 1),
    [monthCursor],
  );
  const monthEnd = useMemo(
    () => new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 0),
    [monthCursor],
  );
  const monthAttendance = useAttendance({
    from: toDateString(monthStart),
    to: toDateString(monthEnd),
  });

  const calendarStats = useMemo(() => {
    const monthRows = monthAttendance.data?.data ?? [];
    const stats: Record<
      string,
      { present: number; absent: number; leave: number; late: number }
    > = {};
    const totalEmployees = employeeRows.length;
    const leaveSetByDay = new Map<string, Set<string>>();

    for (const row of monthRows) {
      const key = String(row.date);
      if (!stats[key]) stats[key] = { present: 0, absent: 0, leave: 0, late: 0 };
      const status = String(row.status);
      if (status === "late") {
        stats[key].late += 1;
      } else if (status === "on_leave") {
        stats[key].leave += 1;
      } else {
        stats[key].present += 1;
      }
    }

    for (const leave of leaveRows) {
      if (leave.status !== "approved") continue;
      const leaveEmployeeId = String(leave.employeeId);
      let day = new Date(`${leave.startDate}T00:00:00`);
      const end = new Date(`${leave.endDate}T00:00:00`);
      while (day <= end) {
        const key = toDateString(day);
        if (!stats[key]) stats[key] = { present: 0, absent: 0, leave: 0, late: 0 };
        const set = leaveSetByDay.get(key) ?? new Set<string>();
        if (leaveEmployeeId) {
          set.add(leaveEmployeeId);
          leaveSetByDay.set(key, set);
        }
        day = new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1);
      }
    }

    for (const [day, set] of leaveSetByDay.entries()) {
      if (!stats[day]) stats[day] = { present: 0, absent: 0, leave: 0, late: 0 };
      stats[day].leave = set.size;
    }

    for (const key of Object.keys(stats)) {
      const presentLike = stats[key].present + stats[key].late;
      stats[key].absent = Math.max(0, totalEmployees - presentLike - stats[key].leave);
    }

    return stats;
  }, [monthAttendance.data, leaveRows, employeeRows.length]);

  const dayRows = useMemo(() => {
    const leaveSet = new Set<string>(
      leaveRows
        .filter((leave: any) => leave.status === "approved" && leave.startDate <= date && leave.endDate >= date)
        .map((leave: any) => String(leave.employeeId)),
    );
    const byEmployee = new Map<string, any>();
    for (const row of rows) {
      const employeeIdFromRow = String(row.employee?.id ?? row.employeeId ?? "");
      if (employeeIdFromRow) {
        byEmployee.set(employeeIdFromRow, row);
      }
    }

    const merged = [...rows];
    for (const employee of employeeRows) {
      if (byEmployee.has(String(employee.id))) continue;
      const status = leaveSet.has(String(employee.id)) ? "on_leave" : "absent";
      merged.push({
        id: `synthetic-${employee.id}-${date}`,
        employeeId: employee.id,
        employeeCode: employee.biometricCode ?? employee.employeeId,
        employee,
        date,
        checkIn: null,
        checkOut: null,
        status,
        notes: status === "on_leave" ? "Approved leave" : "No attendance log found",
        source: "inferred",
      });
    }

    return merged;
  }, [rows, employeeRows, leaveRows, date]);

  const filteredRows = useMemo(() => {
    if (tableFilter === "all") return dayRows;
    if (tableFilter === "leave") return dayRows.filter((r: any) => r.status === "on_leave");
    return dayRows.filter((r: any) => r.status === tableFilter);
  }, [dayRows, tableFilter]);

  const calendarCells = useMemo(() => {
    const startOffset = monthStart.getDay();
    const daysInMonth = monthEnd.getDate();
    const cells: Array<{ date: string | null; day: number | null }> = [];
    for (let i = 0; i < startOffset; i += 1)
      cells.push({ date: null, day: null });
    for (let day = 1; day <= daysInMonth; day += 1) {
      const current = new Date(
        monthStart.getFullYear(),
        monthStart.getMonth(),
        day,
      );
      cells.push({ date: toDateString(current), day });
    }
    while (cells.length % 7 !== 0) cells.push({ date: null, day: null });
    return cells;
  }, [monthStart, monthEnd]);

  const submitManualMark = async () => {
    try {
      setSaving(true);
      const payload: Record<string, string> = { notes };
      if (canPickEmployee && employeeId.trim())
        payload.employeeId = employeeId.trim();
      payload.date = date;
      await api.post(`/attendance/${action}`, payload);
      toast.success(`Manual ${action} recorded`);
      setMarkModal(false);
      setNotes("");
      setEmployeeId("");
      await attendance.refetch();
    } catch (error: any) {
      toast.error(
        error?.response?.data?.error?.message ??
          "Unable to record manual attendance",
      );
    } finally {
      setSaving(false);
    }
  };
  const syncBiometricLogs = async (resetData: boolean) => {
    try {
      setSyncing(true);
      await api.post("/biotime/sync/attendance", {
        from: toDateString(monthStart),
        to: toDateString(monthEnd),
        resetData,
      });
      toast.success(resetData ? "Attendance reset and biometric logs synced" : "Biometric logs synced");
      await Promise.all([attendance.refetch(), monthAttendance.refetch()]);
    } catch (error: any) {
      toast.error(error?.response?.data?.error?.message ?? "Unable to sync biometric logs");
    } finally {
      setSyncing(false);
      setSyncConfirmOpen(false);
      setSyncResetData(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Attendance"
        description="Daily attendance tracking"
        action={
          <div className="flex gap-2">
            <input
              value={date}
              onChange={(e) => setDate(e.target.value)}
              type="date"
              className="rounded border px-3"
            />
            {canManualAttendance(session?.user?.role, accessPolicy) && (
              <button
                onClick={() => setMarkModal(true)}
                className="rounded bg-[var(--accent)] px-3 py-2 text-white"
                type="button"
              >
                Manual Mark
              </button>
            )}
            {canManageAttendance && (
              <button
                onClick={() => setSyncConfirmOpen(true)}
                disabled={syncing}
                className="rounded border border-[var(--accent)] px-3 py-2 text-[var(--accent)] disabled:opacity-50"
                type="button"
              >
                {syncing ? "Syncing..." : "Sync Logs"}
              </button>
            )}
          </div>
        }
      />
      <div className="mb-4 rounded-xl border p-4">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Attendance Calendar</h3>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="rounded border px-3 py-1"
              onClick={() =>
                setMonthCursor(
                  (prev) =>
                    new Date(prev.getFullYear(), prev.getMonth() - 1, 1),
                )
              }
            >
              Prev
            </button>
            <span className="min-w-40 text-center font-medium">
              {monthStart.toLocaleString("en-US", {
                month: "long",
                year: "numeric",
              })}
            </span>
            <button
              type="button"
              className="rounded border px-3 py-1"
              onClick={() =>
                setMonthCursor(
                  (prev) =>
                    new Date(prev.getFullYear(), prev.getMonth() + 1, 1),
                )
              }
            >
              Next
            </button>
          </div>
        </div>
        <div className="mb-3 flex flex-wrap gap-2 text-xs">
          <span className="rounded-full bg-emerald-100 px-2 py-1 text-emerald-700">
            Present
          </span>
          <span className="rounded-full bg-rose-100 px-2 py-1 text-rose-700">
            Absent
          </span>
          <span className="rounded-full bg-sky-100 px-2 py-1 text-sky-700">
            Leave
          </span>
          <span className="rounded-full bg-amber-100 px-2 py-1 text-amber-700">
            Late
          </span>
        </div>
        <div className="grid grid-cols-7 border-l border-t text-center text-xs font-semibold text-(--muted-text)">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div key={day} className="border-b border-r p-2">
              {day}
            </div>
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
                {cell.day ? (
                  <div className="mb-2 text-sm font-semibold">{cell.day}</div>
                ) : null}
                {stats && (
                  <div className="space-y-1 text-[11px]">
                    {stats.present > 0 && (
                      <div className="rounded bg-emerald-100 px-2 py-1 text-emerald-700">
                        Present: {stats.present}
                      </div>
                    )}
                    {stats.absent > 0 && (
                      <div className="rounded bg-rose-100 px-2 py-1 text-rose-700">
                        Absent: {stats.absent}
                      </div>
                    )}
                    {stats.leave > 0 && (
                      <div className="rounded bg-sky-100 px-2 py-1 text-sky-700">
                        Leave: {stats.leave}
                      </div>
                    )}
                    {stats.late > 0 && (
                      <div className="rounded bg-amber-100 px-2 py-1 text-amber-700">
                        Late: {stats.late}
                      </div>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
      <div className="mb-4 flex gap-2 text-xs">
        <span className="rounded-full bg-emerald-100 px-2 py-1">
          Present: {dayRows.filter((r: any) => r.status === "present").length}
        </span>
        <span className="rounded-full bg-rose-100 px-2 py-1">
          Absent: {dayRows.filter((r: any) => r.status === "absent").length}
        </span>
        <span className="rounded-full bg-sky-100 px-2 py-1">
          Leave: {dayRows.filter((r: any) => r.status === "on_leave").length}
        </span>
        <span className="rounded-full bg-amber-100 px-2 py-1">
          Late: {dayRows.filter((r: any) => r.status === "late").length}
        </span>
      </div>
      <div className="mb-3 flex flex-wrap gap-2">
        {[
          { key: "all", label: "All" },
          { key: "present", label: "Present" },
          { key: "absent", label: "Absent" },
          { key: "leave", label: "Leave" },
          { key: "late", label: "Late" },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setTableFilter(tab.key as typeof tableFilter)}
            className={`rounded-full px-3 py-1 text-sm ${tableFilter === tab.key ? "bg-[var(--accent)] text-white" : "border border-slate-300 text-slate-600"}`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <DataTable
        data={filteredRows}
        columns={[
          { key: "employeeCode", header: "Bridge Employee ID" },
          { key: "employee.firstName", header: "First Name" },
          { key: "date", header: "Date", type: "date" },
          { key: "checkIn", header: "Check In", type: "time" },
          { key: "checkOut", header: "Check Out", type: "time" },
          { key: "status", header: "Status", type: "status" },
        ]}
        pagination={{ page: 1, pageSize: 20, total: filteredRows.length }}
        loading={attendance.isLoading}
      />
      {markModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-[var(--surface-bg)] p-5">
            <h3 className="text-lg font-semibold">Manual Attendance</h3>
            <p className="mt-1 text-sm text-[var(--muted-text)]">
              For your own attendance, leave Employee ID empty. Managers/HR can
              enter employee ID.
            </p>
            <div className="mt-4 space-y-3">
              <select
                value={action}
                onChange={(e) =>
                  setAction(e.target.value as "check-in" | "check-out")
                }
                className="w-full rounded border p-2"
              >
                <option value="check-in">Check In</option>
                <option value="check-out">Check Out</option>
              </select>
              {canPickEmployee && (
                <select
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  className="w-full rounded border p-2"
                >
                  <option value="">Select employee (optional)</option>
                  {(employees.data?.data ?? []).map((emp: any) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.firstName} {emp.lastName} ({emp.employeeId})
                    </option>
                  ))}
                </select>
              )}
              <input
                value={date}
                onChange={(e) => setDate(e.target.value)}
                type="date"
                className="w-full rounded border p-2"
              />
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notes (optional)"
                className="w-full rounded border p-2"
              />
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setMarkModal(false)}
                className="rounded border px-3 py-2"
                type="button"
              >
                Cancel
              </button>
              <button
                disabled={saving}
                onClick={submitManualMark}
                className="rounded bg-[var(--accent)] px-3 py-2 text-white"
                type="button"
              >
                {saving ? "Saving..." : "Submit"}
              </button>
            </div>
          </div>
        </div>
      )}
      {syncConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-[var(--surface-bg)] p-5">
            <h3 className="text-lg font-semibold">Sync Options</h3>
            <label className="mt-3 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={syncResetData}
                onChange={(e) => setSyncResetData(e.target.checked)}
              />
              Reset existing attendance before rebuild
            </label>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className="rounded border px-3 py-2"
                onClick={() => {
                  setSyncConfirmOpen(false);
                  setSyncResetData(false);
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded bg-[var(--accent)] px-3 py-2 text-white"
                onClick={() => syncBiometricLogs(syncResetData)}
                disabled={syncing}
              >
                {syncing ? "Syncing..." : "Start Sync"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
