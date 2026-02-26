"use client";

import { createEmployeeAction } from "@/actions/mutations";
import { DataTable } from "@/components/shared/data-table";
import { PageHeader } from "@/components/shared/page-header";
import { RoleBadge } from "@/components/shared/role-badge";
import { useEmployees } from "@/hooks/use-employees";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

const schema = z.object({ email: z.string().email(), password: z.string().min(8), firstName: z.string().min(1), lastName: z.string().min(1), joinDate: z.string().min(1), employmentType: z.enum(["full_time", "part_time", "contract"]) });
type FormData = z.infer<typeof schema>;

export default function EmployeesPage(): React.JSX.Element {
  const [page, setPage] = useState(1);
  const employees = useEmployees(page);
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const form = useForm<FormData>({ resolver: zodResolver(schema), defaultValues: { employmentType: "full_time" } as any });

  return (
    <div>
      <PageHeader title="Employees" description="Manage workforce records" action={<button onClick={() => setOpen(true)} className="rounded-md bg-[var(--accent)] px-4 py-2 text-white" type="button">Add Employee</button>} />
      <DataTable data={employees.data?.data ?? []} loading={employees.isLoading} pagination={{ page, pageSize: 10, total: employees.data?.meta?.total ?? 0 }} onPageChange={setPage} columns={[{ key: "firstName", header: "Name", sortable: true, render: (row: any) => <Link href={`/employees/${row.id}`} className="font-medium text-[var(--accent)]">{row.firstName} {row.lastName}</Link> }, { key: "employeeId", header: "EMP-ID", sortable: true }, { key: "departmentId", header: "Department" }, { key: "designationId", header: "Designation" }, { key: "status", header: "Status", render: (row: any) => <RoleBadge role={row.status} /> }]} />
      <AnimatePresence>{open && <motion.div className="fixed inset-0 z-40 flex justify-end bg-black/30" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><motion.form initial={{ x: 480 }} animate={{ x: 0 }} exit={{ x: 480 }} onSubmit={form.handleSubmit((values) => { startTransition(async () => { await createEmployeeAction(values); toast.success("Employee created"); setOpen(false); }); })} className="h-full w-full max-w-md bg-white p-6 dark:bg-slate-900"><h3 className="mb-4 text-lg font-semibold">Add Employee</h3><div className="space-y-3"><input {...form.register("email")} placeholder="Email" className="w-full rounded border p-2" /><input {...form.register("password")} type="password" placeholder="Password" className="w-full rounded border p-2" /><input {...form.register("firstName")} placeholder="First Name" className="w-full rounded border p-2" /><input {...form.register("lastName")} placeholder="Last Name" className="w-full rounded border p-2" /><input {...form.register("joinDate")} type="date" className="w-full rounded border p-2" /><select {...form.register("employmentType")} className="w-full rounded border p-2"><option value="full_time">Full Time</option><option value="part_time">Part Time</option><option value="contract">Contract</option></select></div><div className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => setOpen(false)} className="rounded border px-3 py-2">Cancel</button><button disabled={pending} className="rounded bg-[var(--accent)] px-3 py-2 text-white" type="submit">Save</button></div></motion.form></motion.div>}</AnimatePresence>
    </div>
  );
}