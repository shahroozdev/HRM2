"use client";

import { DataTable } from "@/components/shared/data-table";
import { FileUpload } from "@/components/shared/file-upload";
import { PageHeader } from "@/components/shared/page-header";
import { useDocuments } from "@/hooks/use-documents";
import { api } from "@/lib/api";
import { useState } from "react";
import { toast } from "sonner";

export default function DocumentsPage(): React.JSX.Element {
  const docs = useDocuments();
  const [access, setAccess] = useState("all");
  const rows = (docs.data?.data ?? []).filter((r: any) => (access === "all" ? true : r.accessLevel === access));

  return (
    <div>
      <PageHeader title="Documents" description="Upload and manage employee documents" action={<select value={access} onChange={(e) => setAccess(e.target.value)} className="rounded border px-2 py-1"><option value="all">All Access</option><option value="employee">Employee</option><option value="manager">Manager</option><option value="hr">HR</option><option value="admin">Admin</option></select>} />
      <div className="mb-4 rounded-xl border p-4"><FileUpload onFileSelect={() => toast.info("Select a document and submit upload metadata from employee profile.")} /></div>
      <DataTable data={rows} columns={[{ key: "name", header: "Name" }, { key: "type", header: "Type" }, { key: "accessLevel", header: "Access" }, { key: "id", header: "Actions", render: (row: any) => <div className="flex gap-2"><a href={`${process.env.NEXT_PUBLIC_API_URL}/documents/${row.id}/download`} className="text-[var(--accent)]">Download</a><button onClick={async () => { await api.delete(`/documents/${row.id}`); toast.success("Deleted"); }} className="text-rose-600" type="button">Delete</button></div> }]} pagination={{ page: 1, pageSize: 10, total: rows.length }} loading={docs.isLoading} />
    </div>
  );
}