"use client";

import { PageHeader } from "@/components/shared/page-header";
import { api } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const tabs = ["company", "leave-rules", "office-timings", "appearance"] as const;

type LeaveRule = {
  id: string;
  name: string;
  maxDays: number;
  paid: boolean;
};

export default function SettingsPage(): React.JSX.Element {
  const [tab, setTab] = useState<(typeof tabs)[number]>("company");
  const { theme, setTheme } = useTheme();
  const company = useQuery({ queryKey: ["company"], queryFn: async () => (await api.get("/settings/company")).data.data });
  const departments = useQuery({ queryKey: ["departments"], queryFn: async () => (await api.get("/settings/departments")).data.data ?? [] });

  const [companyForm, setCompanyForm] = useState({ name: "", email: "", phone: "", address: "" });
  const [deptForm, setDeptForm] = useState({ name: "", description: "" });
  const [ruleForm, setRuleForm] = useState({ name: "", maxDays: 12, paid: true });
  const [officeForm, setOfficeForm] = useState({ start: "09:00", end: "18:00", weeklyHours: 40 });
  const [logoUrl, setLogoUrl] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem("hrm-company-logo");
  });

  const [rules, setRules] = useState<LeaveRule[]>(() => {
    if (typeof window === "undefined") return [];
    const stored = window.localStorage.getItem("hrm-leave-rules");
    if (!stored) return [];
    try {
      return JSON.parse(stored) as LeaveRule[];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("hrm-leave-rules", JSON.stringify(rules));
    }
  }, [rules]);

  const saveCompany = async () => {
    const payload = {
      name: companyForm.name || company.data?.name || "",
      email: companyForm.email || company.data?.email || "",
      phone: companyForm.phone || company.data?.phone || "",
      address: companyForm.address || company.data?.address || "",
    };
    await api.put("/settings/company", payload);
    toast.success("Company settings updated");
  };

  const createDepartment = async () => {
    if (!deptForm.name.trim()) {
      toast.error("Department name is required");
      return;
    }
    await api.post("/settings/departments", {
      name: deptForm.name.trim(),
      description: deptForm.description.trim() || null,
    });
    setDeptForm({ name: "", description: "" });
    await departments.refetch();
    toast.success("Department created");
  };

  const addRule = () => {
    if (!ruleForm.name.trim()) {
      toast.error("Rule name is required");
      return;
    }
    setRules((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        name: ruleForm.name.trim(),
        maxDays: Number(ruleForm.maxDays),
        paid: ruleForm.paid,
      },
    ]);
    setRuleForm({ name: "", maxDays: 12, paid: true });
    toast.success("Rule added");
  };

  const onLogoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? "");
      setLogoUrl(result);
      window.localStorage.setItem("hrm-company-logo", result);
      window.dispatchEvent(new Event("hrm-logo-changed"));
      toast.success("Company logo updated");
    };
    reader.readAsDataURL(file);
  };

  return (
    <div>
      <PageHeader title="Settings" description="Configure HRM system defaults" />
      <div className="mb-4 flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded px-3 py-2 text-sm ${tab === t ? "bg-[var(--accent)] text-white" : "bg-[var(--surface-bg)]"}`}
            type="button"
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "company" && (
        <div className="space-y-4">
          <div className="rounded-xl border p-4">
            <div className="grid gap-3 md:grid-cols-2">
              <input value={companyForm.name || company.data?.name || ""} onChange={(e) => setCompanyForm((s) => ({ ...s, name: e.target.value }))} placeholder="Company Name" className="rounded border p-2" />
              <input value={companyForm.email || company.data?.email || ""} onChange={(e) => setCompanyForm((s) => ({ ...s, email: e.target.value }))} placeholder="Company Email" className="rounded border p-2" />
              <input value={companyForm.phone || company.data?.phone || ""} onChange={(e) => setCompanyForm((s) => ({ ...s, phone: e.target.value }))} placeholder="Phone" className="rounded border p-2" />
              <input value={companyForm.address || company.data?.address || ""} onChange={(e) => setCompanyForm((s) => ({ ...s, address: e.target.value }))} placeholder="Address" className="rounded border p-2" />
            </div>
            <button className="mt-3 rounded bg-[var(--accent)] px-3 py-2 text-white" onClick={saveCompany} type="button">
              Save Company Profile
            </button>
          </div>

          <div className="rounded-xl border p-4">
            <h3 className="mb-3 font-semibold">Department Rules</h3>
            <div className="grid gap-3 md:grid-cols-3">
              <input value={deptForm.name} onChange={(e) => setDeptForm((s) => ({ ...s, name: e.target.value }))} placeholder="Department Name" className="rounded border p-2" />
              <input value={deptForm.description} onChange={(e) => setDeptForm((s) => ({ ...s, description: e.target.value }))} placeholder="Description" className="rounded border p-2 md:col-span-2" />
            </div>
            <button className="mt-3 rounded bg-[var(--accent)] px-3 py-2 text-white" onClick={createDepartment} type="button">
              Create Department
            </button>
            <ul className="mt-4 space-y-2 text-sm">
              {(departments.data ?? []).map((d: any) => (
                <li key={d.id} className="rounded border px-3 py-2">
                  <div className="font-medium">{d.name}</div>
                  <div className="text-[var(--muted-text)]">{d.description || "No description"}</div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {tab === "leave-rules" && (
        <div className="rounded-xl border p-4">
          <h3 className="mb-3 font-semibold">Leave Rule Builder</h3>
          <div className="grid gap-3 md:grid-cols-4">
            <input value={ruleForm.name} onChange={(e) => setRuleForm((s) => ({ ...s, name: e.target.value }))} placeholder="Rule Name" className="rounded border p-2" />
            <input value={ruleForm.maxDays} onChange={(e) => setRuleForm((s) => ({ ...s, maxDays: Number(e.target.value || 0) }))} type="number" min={1} className="rounded border p-2" />
            <select value={ruleForm.paid ? "paid" : "unpaid"} onChange={(e) => setRuleForm((s) => ({ ...s, paid: e.target.value === "paid" }))} className="rounded border p-2">
              <option value="paid">Paid</option>
              <option value="unpaid">Unpaid</option>
            </select>
            <button onClick={addRule} className="rounded bg-[var(--accent)] px-3 py-2 text-white" type="button">
              Create Rule
            </button>
          </div>
          <ul className="mt-4 space-y-2 text-sm">
            {rules.map((rule) => (
              <li key={rule.id} className="flex items-center justify-between rounded border px-3 py-2">
                <span>{rule.name} | {rule.maxDays} days | {rule.paid ? "Paid" : "Unpaid"}</span>
                <button type="button" className="rounded bg-rose-600 px-2 py-1 text-white" onClick={() => setRules((prev) => prev.filter((r) => r.id !== rule.id))}>
                  Delete
                </button>
              </li>
            ))}
            {!rules.length && <li className="text-[var(--muted-text)]">No rules yet. Create one above.</li>}
          </ul>
        </div>
      )}

      {tab === "office-timings" && (
        <div className="rounded-xl border p-4">
          <h3 className="mb-3 font-semibold">Office Timings</h3>
          <div className="grid gap-3 md:grid-cols-3">
            <input type="time" value={officeForm.start} onChange={(e) => setOfficeForm((s) => ({ ...s, start: e.target.value }))} className="rounded border p-2" />
            <input type="time" value={officeForm.end} onChange={(e) => setOfficeForm((s) => ({ ...s, end: e.target.value }))} className="rounded border p-2" />
            <input type="number" min={1} value={officeForm.weeklyHours} onChange={(e) => setOfficeForm((s) => ({ ...s, weeklyHours: Number(e.target.value || 0) }))} className="rounded border p-2" />
          </div>
          <button className="mt-3 rounded bg-[var(--accent)] px-3 py-2 text-white" type="button" onClick={() => toast.success("Office timings saved")}>
            Save Office Timings
          </button>
        </div>
      )}

      {tab === "appearance" && (
        <div className="space-y-4">
          <div className="rounded-xl border p-4">
            <h3 className="mb-3 font-semibold">Theme</h3>
            <select value={theme ?? "light"} onChange={(e) => setTheme(e.target.value)} className="w-full max-w-xs rounded border p-2">
              <option value="light">Light</option>
              <option value="dark">Dark</option>
              <option value="ocean">Ocean</option>
              <option value="forest">Forest</option>
              <option value="sunset">Sunset</option>
            </select>
            <p className="mt-2 text-sm text-[var(--muted-text)]">Theme preference is remembered per user browser.</p>
          </div>

          <div className="rounded-xl border p-4">
            <h3 className="mb-3 font-semibold">Company Logo</h3>
            <div className="mb-3 h-16 w-16 overflow-hidden rounded-lg border">
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoUrl} alt="Company logo preview" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs text-[var(--muted-text)]">No logo</div>
              )}
            </div>
            <input type="file" accept="image/*" onChange={onLogoChange} className="block w-full max-w-xs rounded border p-2 text-sm" />
          </div>
        </div>
      )}
    </div>
  );
}
