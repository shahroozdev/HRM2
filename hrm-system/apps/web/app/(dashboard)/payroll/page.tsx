"use client";

import { processPayrollAction } from "@/actions/mutations";
import { DataTable } from "@/components/shared/data-table";
import { PageHeader } from "@/components/shared/page-header";
import { usePayroll } from "@/hooks/use-payroll";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useTransition } from "react";

export default function PayrollPage(): React.JSX.Element {
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const payroll = usePayroll(month, year);
  const [pending, startTransition] = useTransition();
  const [preview, setPreview] = useState<string | null>(null);
  const rows = payroll.data?.data ?? [];

  return (
    <div>
      <PageHeader title="Payroll" description="Generate and review monthly payroll" action={<div className="flex gap-2"><select value={month} onChange={(e) => setMonth(Number(e.target.value))} className="rounded border px-2">{Array.from({ length: 12 }).map((_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}</select><input value={year} onChange={(e) => setYear(Number(e.target.value))} className="w-24 rounded border px-2" /><button onClick={() => startTransition(async () => processPayrollAction({ month, year }))} className="rounded bg-[var(--accent)] px-3 py-2 text-white" type="button">{pending ? "Processing..." : "Process Payroll"}</button></div>} />
      <DataTable data={rows} columns={[{ key: "employeeId", header: "Employee" }, { key: "grossSalary", header: "Gross" }, { key: "netSalary", header: "Net" }, { key: "status", header: "Status" }, { key: "id", header: "Payslip", render: (row: any) => <button className="text-[var(--accent)]" onClick={() => setPreview(`${process.env.NEXT_PUBLIC_API_URL}/payroll/${row.id}/payslip`)} type="button">View</button> }]} pagination={{ page: 1, pageSize: 10, total: rows.length }} loading={payroll.isLoading} />
      <AnimatePresence>{preview && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/60 p-5"><motion.div initial={{ y: 20 }} animate={{ y: 0 }} exit={{ y: 20 }} className="mx-auto h-full max-w-4xl rounded-xl bg-white p-4"><div className="mb-2 flex justify-end gap-2"><a href={preview} className="rounded bg-[var(--accent)] px-3 py-2 text-sm text-white">Download</a><button onClick={() => setPreview(null)} className="rounded border px-3 py-2 text-sm" type="button">Close</button></div><iframe src={preview} className="h-[90%] w-full rounded border" /></motion.div></motion.div>}</AnimatePresence>
    </div>
  );
}