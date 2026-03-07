"use client";

import { applyLeaveAction } from "@/actions/mutations";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DataTable } from "@/components/shared/data-table";
import { PageHeader } from "@/components/shared/page-header";
import { useLeaves } from "@/hooks/use-leaves";
import { useAuthSession } from "@/hooks/use-auth-session";
import { canView } from "@/lib/permissions";
import { api } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { useState, useTransition } from "react";
import { toast } from "sonner";

export default function LeavesPage(): React.JSX.Element {
  const [tab, setTab] = useState<"my" | "all">("my");
  const [pending, startTransition] = useTransition();
  const leaves = useLeaves();
  const { data: session } = useAuthSession();
  const role = session?.user?.role ?? "";
  const rows = leaves.data?.data ?? [];
  const isManagerRole = ["super_admin", "hr_manager", "manager"].includes(role);
  const [editTarget, setEditTarget] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({ startDate: "", endDate: "", reason: "" });
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [reviewTarget, setReviewTarget] = useState<any | null>(null);
  const [reviewAction, setReviewAction] = useState<"approve" | "reject">("approve");
  const [reviewRemarks, setReviewRemarks] = useState("");

  const leaveTypes = useQuery({
    queryKey: ["leave-types"],
    queryFn: async () => (await api.get("/leaves/types")).data.data ?? [],
  });

  const editLeave = async (row: any) => {
    setEditTarget(row);
    setEditForm({
      startDate: row.startDate ?? "",
      endDate: row.endDate ?? "",
      reason: row.reason ?? "",
    });
  };

  const deleteLeave = async (row: any) => {
    setDeleteTarget(row);
  };

  const reviewLeave = async (row: any, action: "approve" | "reject") => {
    setReviewTarget(row);
    setReviewAction(action);
    setReviewRemarks("");
  };

  const submitEditLeave = async () => {
    if (!editTarget) return;
    await api.put(`/leaves/${editTarget.id}`, {
      startDate: editForm.startDate.trim(),
      endDate: editForm.endDate.trim(),
      reason: editForm.reason.trim(),
    });
    toast.success("Leave request updated");
    setEditTarget(null);
    await leaves.refetch();
  };

  const confirmDeleteLeave = async () => {
    if (!deleteTarget) return;
    await api.delete(`/leaves/${deleteTarget.id}`);
    toast.success("Leave request deleted");
    setDeleteTarget(null);
    await leaves.refetch();
  };

  const submitReviewLeave = async () => {
    if (!reviewTarget) return;
    await api.put(`/leaves/${reviewTarget.id}/${reviewAction}`, {
      remarks: reviewRemarks.trim() || undefined,
    });
    toast.success(`Leave ${reviewAction}d`);
    setReviewTarget(null);
    setReviewRemarks("");
    await leaves.refetch();
  };

  return (
    <div>
      <PageHeader title="Leaves" description="Apply and manage leave requests" />
      <div className="mb-4 flex gap-2">
        <button onClick={() => setTab("my")} className={`rounded px-3 py-2 ${tab === "my" ? "bg-[var(--accent)] text-white" : "bg-slate-200"}`} type="button">
          My Leaves
        </button>
        {canView(role, "leaves") && (
          <button onClick={() => setTab("all")} className={`rounded px-3 py-2 ${tab === "all" ? "bg-[var(--accent)] text-white" : "bg-slate-200"}`} type="button">
            All Leaves
          </button>
        )}
      </div>

      {tab === "my" && (
        <div className="space-y-4">
          <form
            action={(fd) => {
              const payload = Object.fromEntries(fd.entries());
              startTransition(async () => {
                try {
                  await applyLeaveAction(payload);
                  toast.success("Leave request submitted");
                  await leaves.refetch();
                } catch (error: any) {
                  toast.error(error?.message ?? "Unable to submit leave request");
                }
              });
            }}
            className="grid gap-3 rounded-xl border p-4 md:grid-cols-4"
          >
            <select name="leaveTypeId" className="rounded border p-2" required defaultValue="">
              <option value="" disabled>
                Select Leave Type
              </option>
              {(leaveTypes.data ?? []).map((type: any) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </select>
            <input name="startDate" type="date" className="rounded border p-2" required />
            <input name="endDate" type="date" className="rounded border p-2" required />
            <button className="rounded bg-[var(--accent)] px-3 py-2 text-white" type="submit">
              {pending ? "Applying..." : "Apply"}
            </button>
            <textarea name="reason" placeholder="Reason" className="rounded border p-2 md:col-span-4" required />
          </form>

          <DataTable
            data={rows}
            columns={[
              { key: "leaveType", header: "Type", render: (row: any) => row.leaveType?.name ?? "-" },
              { key: "startDate", header: "Start" },
              { key: "endDate", header: "End" },
              { key: "status", header: "Status" },
              {
                key: "actions",
                header: "Actions",
                render: (row: any) => (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="rounded border px-2 py-1 text-xs"
                      disabled={row.status !== "pending"}
                      onClick={() => editLeave(row)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="rounded bg-rose-600 px-2 py-1 text-xs text-white"
                      disabled={row.status !== "pending" && !isManagerRole}
                      onClick={() => deleteLeave(row)}
                    >
                      Delete
                    </button>
                  </div>
                ),
              },
            ]}
            pagination={{ page: 1, pageSize: 10, total: rows.length }}
            loading={leaves.isLoading}
          />
        </div>
      )}

      {tab === "all" && (
        <DataTable
          data={rows}
          columns={[
            { key: "employee", header: "Employee", render: (row: any) => `${row.employee?.firstName ?? ""} ${row.employee?.lastName ?? ""}`.trim() || row.employeeId },
            { key: "leaveType", header: "Type", render: (row: any) => row.leaveType?.name ?? "-" },
            { key: "status", header: "Status" },
            {
              key: "id",
              header: "Actions",
              render: (row: any) => (
                <div className="flex gap-2">
                  <button className="rounded border px-2 py-1 text-xs" type="button" onClick={() => editLeave(row)} disabled={row.status !== "pending"}>
                    Edit
                  </button>
                  {isManagerRole && (
                    <>
                      <button className="rounded bg-emerald-600 px-2 py-1 text-xs text-white" type="button" onClick={() => reviewLeave(row, "approve")} disabled={row.status !== "pending"}>
                        Approve
                      </button>
                      <button className="rounded bg-amber-600 px-2 py-1 text-xs text-white" type="button" onClick={() => reviewLeave(row, "reject")} disabled={row.status !== "pending"}>
                        Reject
                      </button>
                    </>
                  )}
                  <button className="rounded bg-rose-600 px-2 py-1 text-xs text-white" type="button" onClick={() => deleteLeave(row)}>
                    Delete
                  </button>
                </div>
              ),
            },
          ]}
          pagination={{ page: 1, pageSize: 10, total: rows.length }}
          loading={leaves.isLoading}
        />
      )}

      <AnimatePresence>
        {editTarget && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="w-full max-w-lg rounded-xl bg-[var(--surface-bg)] p-5"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
            >
              <h3 className="text-lg font-semibold">Edit Leave Request</h3>
              <div className="mt-4 grid gap-3">
                <input
                  type="date"
                  value={editForm.startDate}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, startDate: e.target.value }))}
                  className="rounded border p-2"
                />
                <input
                  type="date"
                  value={editForm.endDate}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, endDate: e.target.value }))}
                  className="rounded border p-2"
                />
                <textarea
                  value={editForm.reason}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, reason: e.target.value }))}
                  className="rounded border p-2"
                  rows={3}
                  placeholder="Reason"
                />
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <button type="button" className="rounded border px-3 py-2" onClick={() => setEditTarget(null)}>
                  Cancel
                </button>
                <button type="button" className="rounded bg-[var(--accent)] px-3 py-2 text-white" onClick={submitEditLeave}>
                  Save
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {reviewTarget && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="w-full max-w-lg rounded-xl bg-[var(--surface-bg)] p-5"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
            >
              <h3 className="text-lg font-semibold">{reviewAction === "approve" ? "Approve Leave" : "Reject Leave"}</h3>
              <textarea
                value={reviewRemarks}
                onChange={(e) => setReviewRemarks(e.target.value)}
                className="mt-4 w-full rounded border p-2"
                rows={3}
                placeholder="Remarks (optional)"
              />
              <div className="mt-4 flex justify-end gap-2">
                <button type="button" className="rounded border px-3 py-2" onClick={() => setReviewTarget(null)}>
                  Cancel
                </button>
                <button
                  type="button"
                  className={`rounded px-3 py-2 text-white ${reviewAction === "approve" ? "bg-emerald-600" : "bg-amber-600"}`}
                  onClick={submitReviewLeave}
                >
                  {reviewAction === "approve" ? "Approve" : "Reject"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete Leave Request"
        description="Delete this leave request? This action cannot be undone."
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmDeleteLeave}
      />
    </div>
  );
}
