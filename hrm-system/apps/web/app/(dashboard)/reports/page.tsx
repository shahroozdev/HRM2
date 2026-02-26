"use client";

import { PageHeader } from "@/components/shared/page-header";
import { useReports } from "@/hooks/use-reports";
import { BarChart, Bar, CartesianGrid, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

function Panel({ title, children }: { title: string; children: React.ReactNode }): React.JSX.Element {
  return <div className="rounded-xl border p-4"><div className="mb-2 flex items-center justify-between"><h3 className="font-semibold">{title}</h3><button className="rounded border px-2 py-1 text-xs">Export</button></div><div className="h-72">{children}</div></div>;
}

export default function ReportsPage(): React.JSX.Element {
  const { attendance, leaves, salary, dept } = useReports();

  return (
    <div>
      <PageHeader title="Reports" description="Analytics and exports" />
      <div className="grid gap-4 xl:grid-cols-2">
        <Panel title="Attendance Summary"><ResponsiveContainer width="100%" height="100%"><BarChart data={attendance.data?.data ?? []}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="status" /><YAxis /><Tooltip /><Legend /><Bar dataKey="count" fill="#6366f1" /></BarChart></ResponsiveContainer></Panel>
        <Panel title="Leave Utilization"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={leaves.data?.data ?? []} dataKey="days" nameKey="leaveType" fill="#6366f1" /><Tooltip /></PieChart></ResponsiveContainer></Panel>
        <Panel title="Salary Expense"><ResponsiveContainer width="100%" height="100%"><LineChart data={salary.data?.data ?? []}><XAxis dataKey="month" /><YAxis /><Tooltip /><Line dataKey="netExpense" stroke="#16a34a" /></LineChart></ResponsiveContainer></Panel>
        <Panel title="Department Analytics"><ResponsiveContainer width="100%" height="100%"><BarChart data={dept.data?.data ?? []}><XAxis dataKey="department" /><YAxis /><Tooltip /><Bar dataKey="employeeCount" fill="#0284c7" /><Bar dataKey="managerCount" fill="#f59e0b" /></BarChart></ResponsiveContainer></Panel>
      </div>
    </div>
  );
}