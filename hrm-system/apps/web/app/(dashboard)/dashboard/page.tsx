"use client";

import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { DataTable } from "@/components/shared/data-table";
import { useAttendance } from "@/hooks/use-attendance";
import { useLeaves } from "@/hooks/use-leaves";
import { Building2, CalendarClock, Clock3, Users } from "lucide-react";
import { LineChart, Line, ResponsiveContainer, PieChart, Pie, Cell, Tooltip, XAxis, YAxis } from "recharts";

export default function DashboardPage(): React.JSX.Element {
  const attendance = useAttendance({});
  const leaves = useLeaves();

  const rows = leaves.data?.data ?? [];
  const attendanceRows = attendance.data?.data ?? [];

  const trend = Array.from({ length: 30 }).map((_, i) => ({ day: i + 1, present: 58 + ((i * 7) % 26) }));
  const dept = [{ name: "Engineering", value: 36 }, { name: "HR", value: 10 }, { name: "Sales", value: 20 }, { name: "Operations", value: 14 }];

  return (
    <div>
      <PageHeader title="Dashboard" description="Overview of HR metrics and operations" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Total Employees" value={128} trend={5.2} color="#e0e7ff" icon={<Users size={20} />} sparkline={[20, 30, 40, 70, 66, 90]} />
        <StatCard title="Present Today" value={attendanceRows.length} trend={2.3} color="#dbeafe" icon={<Clock3 size={20} />} sparkline={[30, 50, 49, 70, 72, 81]} />
        <StatCard title="On Leave" value={rows.filter((r: any) => r.status === "approved").length} trend={-1.4} color="#fef3c7" icon={<CalendarClock size={20} />} sparkline={[12, 22, 26, 30, 28, 24]} />
        <StatCard title="Pending Approvals" value={rows.filter((r: any) => r.status === "pending").length} trend={1.1} color="#ede9fe" icon={<Building2 size={20} />} sparkline={[6, 8, 7, 9, 8, 10]} />
      </div>
      <div className="mt-5 grid gap-4 xl:grid-cols-3">
        <div className="rounded-xl border p-4 xl:col-span-2"><h3 className="mb-4 font-semibold">Attendance Trend (30 days)</h3><div className="h-72"><ResponsiveContainer width="100%" height="100%"><LineChart data={trend}><XAxis dataKey="day" /><YAxis /><Tooltip /><Line type="monotone" dataKey="present" stroke="#6366f1" strokeWidth={2} /></LineChart></ResponsiveContainer></div></div>
        <div className="rounded-xl border p-4"><h3 className="mb-4 font-semibold">Departments</h3><div className="h-72"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={dept} dataKey="value" nameKey="name" innerRadius={60} outerRadius={90}>{dept.map((_, i) => <Cell key={i} fill={["#6366f1", "#22c55e", "#f59e0b", "#06b6d4"][i % 4]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer></div></div>
      </div>
      <div className="mt-5"><DataTable data={rows} columns={[{ key: "employeeId", header: "Employee" }, { key: "leaveTypeId", header: "Type" }, { key: "status", header: "Status" }, { key: "totalDays", header: "Days" }]} pagination={{ page: 1, pageSize: 5, total: rows.length }} loading={leaves.isLoading} /></div>
    </div>
  );
}
