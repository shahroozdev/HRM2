"use client";

import { DataTable } from "@/components/shared/data-table";
import { FileUpload } from "@/components/shared/file-upload";
import { PageHeader } from "@/components/shared/page-header";
import { api } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { useState } from "react";

const tabs = ["overview", "job", "attendance", "leaves", "payroll", "documents"] as const;

export default function EmployeeProfilePage(): React.JSX.Element {
  const params = useParams<{ id: string }>();
  const [tab, setTab] = useState<(typeof tabs)[number]>("overview");

  const employee = useQuery({ queryKey: ["employee", params.id], queryFn: async () => (await api.get(`/employees/${params.id}`)).data.data });
  const leaveBalance = useQuery({ queryKey: ["balance", params.id], queryFn: async () => (await api.get(`/leaves/balance/${params.id}`)).data.data });
  const payroll = useQuery({ queryKey: ["emp-payroll", params.id], queryFn: async () => (await api.get("/payroll")).data.data.filter((x: any) => x.employeeId === params.id) });
  const documents = useQuery({ queryKey: ["emp-docs", params.id], queryFn: async () => (await api.get("/documents")).data.data.filter((x: any) => x.employeeId === params.id) });

  const data = employee.data;

  return (
    <div>
      <PageHeader title={`${data?.firstName ?? "Employee"} ${data?.lastName ?? "Profile"}`} description={`EMP ID: ${data?.employeeId ?? "-"}`} />
      <div className="mb-4 flex flex-wrap gap-2">{tabs.map((t) => <button key={t} onClick={() => setTab(t)} type="button" className={`rounded-md px-3 py-2 text-sm ${tab === t ? "bg-[var(--accent)] text-white" : "bg-slate-200 dark:bg-slate-800"}`}>{t.toUpperCase()}</button>)}</div>
      {tab === "overview" && <div className="grid gap-4 md:grid-cols-2"><div className="rounded-xl border p-4"><h3 className="mb-2 font-semibold">Personal</h3><p>Name: {data?.firstName} {data?.lastName}</p><p>Phone: {data?.phone ?? "-"}</p><p>Address: {data?.address ?? "-"}</p></div><div className="rounded-xl border p-4"><h3 className="mb-2 font-semibold">Emergency</h3><pre className="text-xs">{JSON.stringify(data?.emergencyContact ?? {}, null, 2)}</pre></div></div>}
      {tab === "job" && <div className="rounded-xl border p-4"><p>Department: {data?.departmentId ?? "-"}</p><p>Designation: {data?.designationId ?? "-"}</p><p>Join Date: {data?.joinDate ?? "-"}</p></div>}
      {tab === "attendance" && <div className="rounded-xl border p-4">Attendance calendar heatmap view.</div>}
      {tab === "leaves" && <DataTable data={leaveBalance.data ?? []} columns={[{ key: "leaveType", header: "Leave Type" }, { key: "totalDays", header: "Total" }, { key: "usedDays", header: "Used" }, { key: "remainingDays", header: "Remaining" }]} pagination={{ page: 1, pageSize: 10, total: leaveBalance.data?.length ?? 0 }} loading={leaveBalance.isLoading} />}
      {tab === "payroll" && <DataTable data={payroll.data ?? []} columns={[{ key: "month", header: "Month" }, { key: "year", header: "Year" }, { key: "netSalary", header: "Net Salary" }, { key: "id", header: "Payslip", render: (row: any) => <a href={`${process.env.NEXT_PUBLIC_API_URL}/payroll/${row.id}/payslip`} className="text-[var(--accent)]">Download PDF</a> }]} pagination={{ page: 1, pageSize: 10, total: payroll.data?.length ?? 0 }} loading={payroll.isLoading} />}
      {tab === "documents" && <div className="space-y-3"><FileUpload onFileSelect={() => {}} /><DataTable data={documents.data ?? []} columns={[{ key: "name", header: "Name" }, { key: "type", header: "Type" }, { key: "accessLevel", header: "Access" }]} pagination={{ page: 1, pageSize: 10, total: documents.data?.length ?? 0 }} loading={documents.isLoading} /></div>}
    </div>
  );
}