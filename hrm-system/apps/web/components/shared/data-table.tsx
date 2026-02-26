"use client";

import { Download, ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import { EmptyState } from "./empty-state";
import { SearchInput } from "./search-input";

export type ColumnDef<T> = {
  key: keyof T | string;
  header: string;
  sortable?: boolean;
  render?: (row: T) => React.ReactNode;
};

export type PaginationMeta = {
  page: number;
  pageSize: number;
  total: number;
};

export function DataTable<T extends { id?: string }>({
  data,
  columns,
  loading,
  pagination,
  onPageChange,
  onBulkAction,
}: {
  data: T[];
  columns: ColumnDef<T>[];
  loading?: boolean;
  pagination: PaginationMeta;
  onPageChange?: (page: number) => void;
  onBulkAction?: (ids: string[]) => void;
}): React.JSX.Element {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<string>(String(columns[0]?.key ?? ""));
  const [sortAsc, setSortAsc] = useState(true);
  const [selected, setSelected] = useState<string[]>([]);

  const filtered = useMemo(() => {
    const rows = data.filter((row) => JSON.stringify(row).toLowerCase().includes(search.toLowerCase()));
    const sorted = [...rows].sort((a, b) => {
      const va = (a as any)[sortKey] ?? "";
      const vb = (b as any)[sortKey] ?? "";
      return sortAsc ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va));
    });
    return sorted;
  }, [data, search, sortKey, sortAsc]);

  const exportCSV = () => {
    const header = columns.map((c) => c.header).join(",");
    const rows = filtered.map((row) => columns.map((c) => JSON.stringify((row as any)[c.key as string] ?? "")).join(","));
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "table-export.csv";
    link.click();
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <SearchInput value={search} onChange={setSearch} />
        <div className="flex items-center gap-2">
          {selected.length > 0 && onBulkAction && (
            <button className="rounded-md bg-[var(--accent)] px-3 py-2 text-sm text-white" onClick={() => onBulkAction(selected)} type="button">
              Bulk Action ({selected.length})
            </button>
          )}
          <button className="rounded-md border px-3 py-2 text-sm" onClick={exportCSV} type="button"><Download size={14} className="mr-1 inline" />CSV</button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: pagination.pageSize }).map((_, i) => <div key={i} className="h-10 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />)}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState title="No data" description="Try changing filters or search." />
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <th className="py-2"><input type="checkbox" checked={selected.length === filtered.length} onChange={(e) => setSelected(e.target.checked ? filtered.map((r) => String(r.id ?? "")) : [])} /></th>
                  {columns.map((col) => (
                    <th key={String(col.key)} className="cursor-pointer py-2" onClick={() => {
                      if (!col.sortable) return;
                      const key = String(col.key);
                      if (sortKey === key) setSortAsc(!sortAsc);
                      else {
                        setSortKey(key);
                        setSortAsc(true);
                      }
                    }}>
                      {col.header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((row, index) => (
                  <tr key={String(row.id ?? index)} className="border-b border-slate-100 dark:border-slate-800">
                    <td className="py-2"><input type="checkbox" checked={selected.includes(String(row.id ?? ""))} onChange={(e) => {
                      const id = String(row.id ?? "");
                      setSelected((prev) => e.target.checked ? [...prev, id] : prev.filter((v) => v !== id));
                    }} /></td>
                    {columns.map((col) => <td key={String(col.key)} className="py-2">{col.render ? col.render(row) : String((row as any)[col.key as string] ?? "-")}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-3 flex items-center justify-end gap-2">
            <button className="rounded border p-2 disabled:opacity-50" type="button" onClick={() => onPageChange?.(Math.max(1, pagination.page - 1))} disabled={pagination.page <= 1}><ChevronLeft size={16} /></button>
            <span className="text-xs text-slate-500">Page {pagination.page} / {Math.max(1, Math.ceil(pagination.total / pagination.pageSize))}</span>
            <button className="rounded border p-2 disabled:opacity-50" type="button" onClick={() => onPageChange?.(pagination.page + 1)} disabled={pagination.page >= Math.ceil(pagination.total / pagination.pageSize)}><ChevronRight size={16} /></button>
          </div>
        </>
      )}
    </div>
  );
}