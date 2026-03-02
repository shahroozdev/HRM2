"use client";

import { createEmployeeAction } from "@/actions/mutations";
import { DataTable } from "@/components/shared/data-table";
import { PageHeader } from "@/components/shared/page-header";
import { RoleBadge } from "@/components/shared/role-badge";
import { useEmployees } from "@/hooks/use-employees";
import { useAuthSession } from "@/hooks/use-auth-session";
import { api } from "@/lib/api";
import { canEdit } from "@/lib/permissions";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8).optional(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().optional(),
  address: z.string().optional(),
  cnic: z.string().optional(),
  emergencyName: z.string().optional(),
  emergencyPhone: z.string().optional(),
  emergencyRelation: z.string().optional(),
  departmentId: z.string().optional(),
  designationId: z.string().optional(),
  reportingManagerId: z.string().optional(),
  workLocation: z.string().optional(),
  joinDate: z.string().min(1),
  employmentType: z.enum(["full_time", "part_time", "contract"]),
  status: z.enum(["active", "inactive", "terminated"]).default("active"),
  role: z.enum(["employee", "manager", "hr_manager"]),
});

type FormData = z.infer<typeof schema>;

export default function EmployeesPage(): React.JSX.Element {
  const [page, setPage] = useState(1);
  const employees = useEmployees(page);
  const { data: session } = useAuthSession();
  const canManage = canEdit(session?.user?.role, "employees");
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const departments = useQuery({
    queryKey: ["departments"],
    queryFn: async () => (await api.get("/settings/departments")).data.data ?? [],
    enabled: open && canManage,
  });
  const designations = useQuery({
    queryKey: ["designations"],
    queryFn: async () => (await api.get("/settings/designations")).data.data ?? [],
    enabled: open && canManage,
  });
  const managers = useQuery({
    queryKey: ["employees-managers"],
    queryFn: async () => (await api.get("/employees")).data.data ?? [],
    enabled: open && canManage,
  });

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      employmentType: "full_time",
      role: "employee",
      status: "active",
      joinDate: new Date().toISOString().slice(0, 10),
    },
  });

  const submit = (values: FormData) => {
    startTransition(async () => {
      if (mode === "create" && !values.password) {
        toast.error("Password is required");
        return;
      }

      const emergency =
        values.emergencyName || values.emergencyPhone || values.emergencyRelation
          ? {
              name: values.emergencyName || "",
              phone: values.emergencyPhone || "",
              relation: values.emergencyRelation || "",
            }
          : undefined;

      const payload = {
        email: values.email,
        firstName: values.firstName,
        lastName: values.lastName,
        role: values.role,
        joinDate: values.joinDate,
        employmentType: values.employmentType,
        status: values.status,
        phone: values.phone || undefined,
        address: values.address || undefined,
        cnic: values.cnic || undefined,
        departmentId: values.departmentId || undefined,
        designationId: values.designationId || undefined,
        reportingManagerId: values.reportingManagerId || undefined,
        workLocation: values.workLocation || undefined,
        emergencyContact: emergency,
      };

      if (mode === "create") {
        await createEmployeeAction({ ...payload, password: values.password });
        toast.success("Employee created");
      } else if (editingId) {
        await api.put(`/employees/${editingId}`, {
          ...payload,
          password: values.password || undefined,
        });
        toast.success("Employee updated");
      }

      await employees.refetch();
      form.reset({
        employmentType: "full_time",
        role: "employee",
        status: "active",
        joinDate: new Date().toISOString().slice(0, 10),
      } as FormData);
      setEditingId(null);
      setMode("create");
      setOpen(false);
    });
  };

  const openCreate = () => {
    form.reset({
      employmentType: "full_time",
      role: "employee",
      status: "active",
      joinDate: new Date().toISOString().slice(0, 10),
      email: "",
      password: "",
      firstName: "",
      lastName: "",
      phone: "",
      address: "",
      cnic: "",
      emergencyName: "",
      emergencyPhone: "",
      emergencyRelation: "",
      departmentId: "",
      designationId: "",
      reportingManagerId: "",
      workLocation: "",
    });
    setEditingId(null);
    setMode("create");
    setOpen(true);
  };

  const openEdit = (row: any) => {
    form.reset({
      email: row.user?.email ?? "",
      password: "",
      firstName: row.firstName ?? "",
      lastName: row.lastName ?? "",
      phone: row.phone ?? "",
      address: row.address ?? "",
      cnic: row.cnic ?? "",
      emergencyName: row.emergencyContact?.name ? String(row.emergencyContact.name) : "",
      emergencyPhone: row.emergencyContact?.phone ? String(row.emergencyContact.phone) : "",
      emergencyRelation: row.emergencyContact?.relation ? String(row.emergencyContact.relation) : "",
      departmentId: row.departmentId ?? "",
      designationId: row.designationId ?? "",
      reportingManagerId: row.reportingManagerId ?? "",
      workLocation: row.workLocation ?? "",
      joinDate: row.joinDate ?? new Date().toISOString().slice(0, 10),
      employmentType: row.employmentType ?? "full_time",
      status: row.status ?? "active",
      role: row.user?.role ?? "employee",
    });
    setEditingId(row.id);
    setMode("edit");
    setOpen(true);
  };

  const removeEmployee = (row: any) => {
    const label = `${row.firstName ?? ""} ${row.lastName ?? ""}`.trim() || row.employeeId;
    if (!window.confirm(`Delete ${label}? This cannot be undone.`)) return;

    startTransition(async () => {
      await api.delete(`/employees/${row.id}`);
      toast.success("Employee deleted");
      await employees.refetch();
    });
  };

  return (
    <div>
      <PageHeader
        title="Employees"
        description="Manage workforce records"
        action={
          canManage ? (
            <button onClick={openCreate} className="rounded-md bg-[var(--accent)] px-4 py-2 text-white" type="button">
              Add Employee
            </button>
          ) : null
        }
      />

      <DataTable
        data={employees.data?.data ?? []}
        loading={employees.isLoading}
        pagination={{ page, pageSize: 10, total: employees.data?.meta?.total ?? 0 }}
        onPageChange={setPage}
        columns={[
          {
            key: "firstName",
            header: "Name",
            sortable: true,
            render: (row: any) => (
              <Link href={`/employees/${row.id}`} className="font-medium text-[var(--accent)]">
                {row.firstName} {row.lastName}
              </Link>
            ),
          },
          { key: "employeeId", header: "EMP-ID", sortable: true },
          { key: "department", header: "Department", render: (row: any) => row.department?.name ?? "-" },
          { key: "designation", header: "Designation", render: (row: any) => row.designation?.title ?? "-" },
          { key: "status", header: "Status", render: (row: any) => <RoleBadge role={row.status} /> },
          {
            key: "actions",
            header: "Actions",
            render: (row: any) =>
              canManage ? (
                <div className="flex gap-2">
                  <button type="button" className="rounded border px-2 py-1 text-xs" onClick={() => openEdit(row)}>
                    Edit
                  </button>
                  <button type="button" className="rounded bg-rose-600 px-2 py-1 text-xs text-white" onClick={() => removeEmployee(row)}>
                    Delete
                  </button>
                </div>
              ) : (
                "-"
              ),
          },
        ]}
      />

      <AnimatePresence>
        {open && (
          <motion.div className="fixed inset-0 z-40 flex justify-end bg-black/30" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.form
              initial={{ x: 680 }}
              animate={{ x: 0 }}
              exit={{ x: 680 }}
              onSubmit={form.handleSubmit(submit)}
              className="h-full w-full max-w-3xl overflow-y-auto bg-[var(--surface-bg)] p-6"
            >
              <h3 className="mb-4 text-lg font-semibold">{mode === "create" ? "Add Employee" : "Edit Employee"}</h3>
              <div className="grid gap-3 md:grid-cols-2">
                <input {...form.register("email")} placeholder="Email" className="w-full rounded border p-2" />
                <input {...form.register("password")} type="password" placeholder={mode === "create" ? "Password" : "Password (optional)"} className="w-full rounded border p-2" />
                <input {...form.register("firstName")} placeholder="First Name" className="w-full rounded border p-2" />
                <input {...form.register("lastName")} placeholder="Last Name" className="w-full rounded border p-2" />
                <input {...form.register("phone")} placeholder="Phone" className="w-full rounded border p-2" />
                <input {...form.register("cnic")} placeholder="CNIC / National ID" className="w-full rounded border p-2" />
                <input {...form.register("workLocation")} placeholder="Work Location" className="w-full rounded border p-2" />
                <input {...form.register("joinDate")} type="date" className="w-full rounded border p-2" />
                <select {...form.register("employmentType")} className="w-full rounded border p-2">
                  <option value="full_time">Full Time</option>
                  <option value="part_time">Part Time</option>
                  <option value="contract">Contract</option>
                </select>
                <select {...form.register("status")} className="w-full rounded border p-2">
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="terminated">Terminated</option>
                </select>
                <select {...form.register("role")} className="w-full rounded border p-2">
                  <option value="employee">Employee</option>
                  <option value="manager">Manager</option>
                  <option value="hr_manager">HR Manager</option>
                </select>
                <select {...form.register("departmentId")} className="w-full rounded border p-2">
                  <option value="">Department (optional)</option>
                  {(departments.data ?? []).map((d: any) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
                <select {...form.register("designationId")} className="w-full rounded border p-2">
                  <option value="">Designation (optional)</option>
                  {(designations.data ?? []).map((d: any) => (
                    <option key={d.id} value={d.id}>
                      {d.title} ({d.department?.name ?? "No dept"})
                    </option>
                  ))}
                </select>
                <select {...form.register("reportingManagerId")} className="w-full rounded border p-2">
                  <option value="">Reporting Manager (optional)</option>
                  {(managers.data ?? []).map((emp: any) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.firstName} {emp.lastName} ({emp.employeeId})
                    </option>
                  ))}
                </select>
                <input {...form.register("emergencyName")} placeholder="Emergency Contact Name" className="w-full rounded border p-2" />
                <input {...form.register("emergencyPhone")} placeholder="Emergency Contact Phone" className="w-full rounded border p-2" />
                <input {...form.register("emergencyRelation")} placeholder="Emergency Contact Relation" className="w-full rounded border p-2" />
              </div>
              <textarea {...form.register("address")} placeholder="Address" className="mt-3 w-full rounded border p-2" rows={3} />
              <div className="mt-5 flex justify-end gap-2">
                <button type="button" onClick={() => setOpen(false)} className="rounded border px-3 py-2">
                  Cancel
                </button>
                <button disabled={pending} className="rounded bg-[var(--accent)] px-3 py-2 text-white" type="submit">
                  {pending ? "Saving..." : mode === "create" ? "Save" : "Update"}
                </button>
              </div>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
