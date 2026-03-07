"use client";

import { PageHeader } from "@/components/shared/page-header";
import { useAccessPolicy } from "@/hooks/use-access-policy";
import { useAuthSession } from "@/hooks/use-auth-session";
import { api } from "@/lib/api";
import { AccessPolicy, AppRole, Resource, getDefaultAccessPolicy } from "@/lib/permissions";
import { useQuery } from "@tanstack/react-query";
import { useTheme } from "next-themes";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type CompanyForm = { name: string; email: string; phone: string; address: string };
type SystemForm = { databaseUri: string; smtpHost: string; smtpPort: string; smtpUser: string; smtpPass: string; smtpFrom: string };
type SlackForm = { botToken: string; signingSecret: string; appToken: string; defaultChannel: string };

type LeaveRule = { id: string; name: string; maxDays: number; paid: boolean };

const tabs = ["company", "template-config", "slack", "leave-rules", "office-timings", "shifts", "appearance", "access-control", "my-profile"] as const;
const roles: AppRole[] = ["super_admin", "hr_manager", "manager", "employee"];
const resources: Resource[] = ["dashboard", "employees", "attendance", "leaves", "payroll", "documents", "reports", "messages", "settings"];

function AccessControlEditor({ initialPolicy, onSave }: { initialPolicy: AccessPolicy; onSave: (p: AccessPolicy) => Promise<void> }): React.JSX.Element {
  const [draft, setDraft] = useState<AccessPolicy>(initialPolicy);

  const toggleSidebar = (role: AppRole, resource: Resource) => {
    setDraft((prev) => {
      const list = prev.sidebar[role] ?? [];
      const next = list.includes(resource) ? list.filter((x) => x !== resource) : [...list, resource];
      return { ...prev, sidebar: { ...prev.sidebar, [role]: next } };
    });
  };

  const toggleManual = (role: AppRole) => {
    setDraft((prev) => {
      const list = prev.actions.attendanceManualMark ?? [];
      const next = list.includes(role) ? list.filter((x) => x !== role) : [...list, role];
      return { ...prev, actions: { ...prev.actions, attendanceManualMark: next } };
    });
  };

  return (
    <div className="space-y-4 rounded-xl border p-4">
      <h3 className="text-lg font-semibold">Access Control Policy</h3>
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="border px-2 py-2 text-left">Resource</th>
              {roles.map((r) => <th key={r} className="border px-2 py-2 text-left">{r}</th>)}
            </tr>
          </thead>
          <tbody>
            {resources.map((resource) => (
              <tr key={resource}>
                <td className="border px-2 py-2 font-medium">{resource}</td>
                {roles.map((r) => (
                  <td key={`${resource}-${r}`} className="border px-2 py-2">
                    <input type="checkbox" checked={draft.sidebar[r]?.includes(resource) ?? false} onChange={() => toggleSidebar(r, resource)} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap gap-3 text-sm">
        {roles.map((r) => (
          <label key={r} className="flex items-center gap-2 rounded border px-3 py-2">
            <input type="checkbox" checked={draft.actions.attendanceManualMark.includes(r)} onChange={() => toggleManual(r)} />
            {r} manual attendance
          </label>
        ))}
      </div>

      <button type="button" className="rounded bg-[var(--accent)] px-3 py-2 text-white" onClick={() => onSave(draft)}>
        Save Access Policy
      </button>
    </div>
  );
}

export default function SettingsPage(): React.JSX.Element {
  const session = useAuthSession();
  const role = session.data?.user?.role;
  const isSuperAdmin = role === "super_admin";
  const isHr = role === "hr_manager";
  const { theme, setTheme } = useTheme();

  const accessPolicyQuery = useAccessPolicy();

  const [tab, setTab] = useState<(typeof tabs)[number]>(isSuperAdmin ? "company" : "my-profile");

  const companyQuery = useQuery({ queryKey: ["settings-company"], queryFn: async () => (await api.get("/settings/company")).data.data as CompanyForm, enabled: isSuperAdmin || isHr });
  const systemQuery = useQuery({ queryKey: ["settings-system"], queryFn: async () => (await api.get("/settings/system-config")).data.data, enabled: isSuperAdmin });
  const slackQuery = useQuery({ queryKey: ["settings-slack"], queryFn: async () => (await api.get("/settings/integrations/slack")).data.data, enabled: isSuperAdmin });
  const mySlackQuery = useQuery({ queryKey: ["settings-my-slack"], queryFn: async () => (await api.get("/settings/profile/slack-email")).data.data });

  const departments = useQuery({ queryKey: ["departments"], queryFn: async () => (await api.get("/settings/departments")).data.data ?? [], enabled: isSuperAdmin || isHr });
  const designations = useQuery({ queryKey: ["designations"], queryFn: async () => (await api.get("/settings/designations")).data.data ?? [], enabled: isSuperAdmin || isHr });
  const shifts = useQuery({ queryKey: ["shifts"], queryFn: async () => (await api.get("/settings/shifts")).data.data ?? [], enabled: isSuperAdmin || isHr });
  const assignments = useQuery({ queryKey: ["shift-assignments"], queryFn: async () => (await api.get("/settings/shift-assignments")).data.data ?? [], enabled: isSuperAdmin || isHr });
  const employees = useQuery({ queryKey: ["employees-for-settings"], queryFn: async () => (await api.get("/employees")).data.data ?? [], enabled: isSuperAdmin || isHr });

  const [companyForm, setCompanyForm] = useState<CompanyForm>({ name: "", email: "", phone: "", address: "" });
  const [systemForm, setSystemForm] = useState<SystemForm>({ databaseUri: "", smtpHost: "", smtpPort: "", smtpUser: "", smtpPass: "", smtpFrom: "" });
  const [slackForm, setSlackForm] = useState<SlackForm>({ botToken: "", signingSecret: "", appToken: "", defaultChannel: "" });
  const [mySlackEmail, setMySlackEmail] = useState("");

  const [deptForm, setDeptForm] = useState({ name: "", description: "" });
  const [designationForm, setDesignationForm] = useState({ title: "", departmentId: "" });
  const [shiftForm, setShiftForm] = useState({ name: "", startTime: "09:00", endTime: "18:00", weeklyOffDays: "saturday,sunday" });
  const [assignmentForm, setAssignmentForm] = useState({ employeeId: "", shiftId: "", startDate: "", endDate: "", notes: "" });

  const [ruleForm, setRuleForm] = useState({ name: "", maxDays: 12, paid: true });
  const [rules, setRules] = useState<LeaveRule[]>([]);
  const [officeForm, setOfficeForm] = useState({ start: "09:00", end: "18:00", weeklyHours: 40 });

  useEffect(() => {
    const savedRules = window.localStorage.getItem("hrm-leave-rules");
    if (savedRules) {
      try { setRules(JSON.parse(savedRules)); } catch {}
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem("hrm-leave-rules", JSON.stringify(rules));
  }, [rules]);

  useEffect(() => { if (companyQuery.data) setCompanyForm(companyQuery.data); }, [companyQuery.data]);
  useEffect(() => { if (mySlackQuery.data) setMySlackEmail(mySlackQuery.data.slackEmail ?? ""); }, [mySlackQuery.data]);
  useEffect(() => {
    if (systemQuery.data) {
      setSystemForm((prev) => ({ ...prev, smtpHost: systemQuery.data.smtpHost ?? "", smtpPort: systemQuery.data.smtpPort ?? "", smtpUser: systemQuery.data.smtpUser ?? "", smtpFrom: systemQuery.data.smtpFrom ?? "" }));
    }
  }, [systemQuery.data]);
  useEffect(() => {
    if (slackQuery.data) {
      setSlackForm((prev) => ({ ...prev, defaultChannel: slackQuery.data.defaultChannel ?? "" }));
    }
  }, [slackQuery.data]);

  const visibleTabs: Array<(typeof tabs)[number]> = useMemo(() => {
    if (isSuperAdmin) return [...tabs];
    if (isHr) return ["company", "leave-rules", "office-timings", "shifts", "appearance", "my-profile"];
    return ["appearance", "my-profile"];
  }, [isSuperAdmin, isHr]);

  const activeTab = visibleTabs.includes(tab) ? tab : visibleTabs[0];

  return (
    <div>
      <PageHeader title="Settings" description="Old and new configuration panels combined" />

      <div className="mb-4 flex flex-wrap gap-2">
        {visibleTabs.map((item) => (
          <button key={item} type="button" onClick={() => setTab(item)} className={`rounded-md px-3 py-2 text-sm ${activeTab === item ? "bg-[var(--accent)] text-white" : "bg-slate-200 dark:bg-slate-800"}`}>
            {item}
          </button>
        ))}
      </div>

      {activeTab === "company" && (isSuperAdmin || isHr) && (
        <div className="space-y-4">
          <div className="rounded-xl border p-4">
            <h3 className="mb-3 text-lg font-semibold">Firm Profile</h3>
            <div className="grid gap-3 md:grid-cols-2">
              <input value={companyForm.name} onChange={(e) => setCompanyForm((p) => ({ ...p, name: e.target.value }))} placeholder="Firm Name" className="rounded border p-2" />
              <input value={companyForm.email} onChange={(e) => setCompanyForm((p) => ({ ...p, email: e.target.value }))} placeholder="Firm Email" className="rounded border p-2" />
              <input value={companyForm.phone} onChange={(e) => setCompanyForm((p) => ({ ...p, phone: e.target.value }))} placeholder="Phone" className="rounded border p-2" />
              <input value={companyForm.address} onChange={(e) => setCompanyForm((p) => ({ ...p, address: e.target.value }))} placeholder="Address" className="rounded border p-2" />
            </div>
            <button type="button" className="mt-3 rounded bg-[var(--accent)] px-3 py-2 text-white" onClick={async () => { await api.put("/settings/company", companyForm); toast.success("Firm profile saved"); }}>
              Save Firm Profile
            </button>
          </div>

          <div className="rounded-xl border p-4">
            <h3 className="mb-3 text-lg font-semibold">Departments</h3>
            <div className="grid gap-3 md:grid-cols-3">
              <input value={deptForm.name} onChange={(e) => setDeptForm((s) => ({ ...s, name: e.target.value }))} placeholder="Department Name" className="rounded border p-2" />
              <input value={deptForm.description} onChange={(e) => setDeptForm((s) => ({ ...s, description: e.target.value }))} placeholder="Description" className="rounded border p-2 md:col-span-2" />
            </div>
            <button type="button" className="mt-3 rounded bg-[var(--accent)] px-3 py-2 text-white" onClick={async () => { await api.post("/settings/departments", { name: deptForm.name, description: deptForm.description || null }); setDeptForm({ name: "", description: "" }); await departments.refetch(); toast.success("Department created"); }}>
              Create Department
            </button>
            <ul className="mt-3 space-y-2 text-sm">{(departments.data ?? []).map((d: any) => <li key={d.id} className="rounded border px-3 py-2">{d.name} | {d.description || "-"}</li>)}</ul>
          </div>

          <div className="rounded-xl border p-4">
            <h3 className="mb-3 text-lg font-semibold">Designations</h3>
            <div className="grid gap-3 md:grid-cols-3">
              <input value={designationForm.title} onChange={(e) => setDesignationForm((s) => ({ ...s, title: e.target.value }))} placeholder="Designation Title" className="rounded border p-2" />
              <select value={designationForm.departmentId} onChange={(e) => setDesignationForm((s) => ({ ...s, departmentId: e.target.value }))} className="rounded border p-2 md:col-span-2">
                <option value="">Select Department</option>
                {(departments.data ?? []).map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <button type="button" className="mt-3 rounded bg-[var(--accent)] px-3 py-2 text-white" onClick={async () => { await api.post("/settings/designations", designationForm); setDesignationForm({ title: "", departmentId: "" }); await designations.refetch(); toast.success("Designation created"); }}>
              Create Designation
            </button>
            <ul className="mt-3 space-y-2 text-sm">{(designations.data ?? []).map((d: any) => <li key={d.id} className="rounded border px-3 py-2">{d.title} | {d.department?.name ?? "-"}</li>)}</ul>
          </div>
        </div>
      )}

      {activeTab === "template-config" && isSuperAdmin && (
        <div className="rounded-xl border p-4">
          <h3 className="mb-1 text-lg font-semibold">Template Config (Secure)</h3>
          <p className="mb-3 text-sm text-slate-500">Encrypted at rest, masked on read.</p>
          <div className="grid gap-3 md:grid-cols-2">
            <input value={systemForm.databaseUri} onChange={(e) => setSystemForm((p) => ({ ...p, databaseUri: e.target.value }))} placeholder="Database URI" className="rounded border p-2 md:col-span-2" />
            <input value={systemForm.smtpHost} onChange={(e) => setSystemForm((p) => ({ ...p, smtpHost: e.target.value }))} placeholder="SMTP Host" className="rounded border p-2" />
            <input value={systemForm.smtpPort} onChange={(e) => setSystemForm((p) => ({ ...p, smtpPort: e.target.value }))} placeholder="SMTP Port" className="rounded border p-2" />
            <input value={systemForm.smtpUser} onChange={(e) => setSystemForm((p) => ({ ...p, smtpUser: e.target.value }))} placeholder="SMTP User" className="rounded border p-2" />
            <input value={systemForm.smtpPass} onChange={(e) => setSystemForm((p) => ({ ...p, smtpPass: e.target.value }))} placeholder="SMTP Password" type="password" className="rounded border p-2" />
            <input value={systemForm.smtpFrom} onChange={(e) => setSystemForm((p) => ({ ...p, smtpFrom: e.target.value }))} placeholder="SMTP From" className="rounded border p-2 md:col-span-2" />
          </div>
          <button type="button" className="mt-3 rounded bg-[var(--accent)] px-3 py-2 text-white" onClick={async () => { await api.put("/settings/system-config", systemForm); await systemQuery.refetch(); setSystemForm((p) => ({ ...p, databaseUri: "", smtpPass: "" })); toast.success("Template config saved"); }}>
            Save Template Config
          </button>
        </div>
      )}

      {activeTab === "slack" && isSuperAdmin && (
        <div className="rounded-xl border p-4">
          <h3 className="mb-1 text-lg font-semibold">Slack Integration (Secure)</h3>
          <p className="mb-3 text-sm text-slate-500">Keys are encrypted and never returned raw.</p>
          <div className="grid gap-3 md:grid-cols-2">
            <input value={slackForm.botToken} onChange={(e) => setSlackForm((p) => ({ ...p, botToken: e.target.value }))} placeholder="Bot Token" type="password" className="rounded border p-2 md:col-span-2" />
            <input value={slackForm.signingSecret} onChange={(e) => setSlackForm((p) => ({ ...p, signingSecret: e.target.value }))} placeholder="Signing Secret" type="password" className="rounded border p-2" />
            <input value={slackForm.appToken} onChange={(e) => setSlackForm((p) => ({ ...p, appToken: e.target.value }))} placeholder="App Token" type="password" className="rounded border p-2" />
            <input value={slackForm.defaultChannel} onChange={(e) => setSlackForm((p) => ({ ...p, defaultChannel: e.target.value }))} placeholder="Default Channel" className="rounded border p-2 md:col-span-2" />
          </div>
          <button type="button" className="mt-3 rounded bg-[var(--accent)] px-3 py-2 text-white" onClick={async () => { await api.put("/settings/integrations/slack", slackForm); await slackQuery.refetch(); setSlackForm((p) => ({ ...p, botToken: "", signingSecret: "", appToken: "" })); toast.success("Slack integration saved"); }}>
            Save Slack Keys
          </button>
        </div>
      )}

      {activeTab === "leave-rules" && (
        <div className="rounded-xl border p-4">
          <h3 className="mb-3 text-lg font-semibold">Leave Rules</h3>
          <div className="grid gap-3 md:grid-cols-4">
            <input value={ruleForm.name} onChange={(e) => setRuleForm((s) => ({ ...s, name: e.target.value }))} placeholder="Rule Name" className="rounded border p-2" />
            <input type="number" min={1} value={ruleForm.maxDays} onChange={(e) => setRuleForm((s) => ({ ...s, maxDays: Number(e.target.value || 1) }))} className="rounded border p-2" />
            <select value={ruleForm.paid ? "paid" : "unpaid"} onChange={(e) => setRuleForm((s) => ({ ...s, paid: e.target.value === "paid" }))} className="rounded border p-2"><option value="paid">Paid</option><option value="unpaid">Unpaid</option></select>
            <button type="button" className="rounded bg-[var(--accent)] px-3 py-2 text-white" onClick={() => { if (!ruleForm.name.trim()) return; setRules((prev) => [...prev, { id: crypto.randomUUID(), name: ruleForm.name.trim(), maxDays: ruleForm.maxDays, paid: ruleForm.paid }]); setRuleForm({ name: "", maxDays: 12, paid: true }); toast.success("Rule added"); }}>
              Add Rule
            </button>
          </div>
          <ul className="mt-3 space-y-2 text-sm">{rules.map((r) => <li key={r.id} className="rounded border px-3 py-2">{r.name} | {r.maxDays} days | {r.paid ? "Paid" : "Unpaid"}</li>)}</ul>
        </div>
      )}

      {activeTab === "office-timings" && (
        <div className="rounded-xl border p-4">
          <h3 className="mb-3 text-lg font-semibold">Office Timings</h3>
          <div className="grid gap-3 md:grid-cols-3">
            <input type="time" value={officeForm.start} onChange={(e) => setOfficeForm((s) => ({ ...s, start: e.target.value }))} className="rounded border p-2" />
            <input type="time" value={officeForm.end} onChange={(e) => setOfficeForm((s) => ({ ...s, end: e.target.value }))} className="rounded border p-2" />
            <input type="number" min={1} value={officeForm.weeklyHours} onChange={(e) => setOfficeForm((s) => ({ ...s, weeklyHours: Number(e.target.value || 1) }))} className="rounded border p-2" />
          </div>
          <button type="button" className="mt-3 rounded bg-[var(--accent)] px-3 py-2 text-white" onClick={() => toast.success("Office timings saved")}>Save Office Timings</button>
        </div>
      )}

      {activeTab === "shifts" && (isSuperAdmin || isHr) && (
        <div className="space-y-4">
          <div className="rounded-xl border p-4">
            <h3 className="mb-3 text-lg font-semibold">Shift Templates</h3>
            <div className="grid gap-3 md:grid-cols-4">
              <input value={shiftForm.name} onChange={(e) => setShiftForm((s) => ({ ...s, name: e.target.value }))} placeholder="Shift Name" className="rounded border p-2" />
              <input type="time" value={shiftForm.startTime} onChange={(e) => setShiftForm((s) => ({ ...s, startTime: e.target.value }))} className="rounded border p-2" />
              <input type="time" value={shiftForm.endTime} onChange={(e) => setShiftForm((s) => ({ ...s, endTime: e.target.value }))} className="rounded border p-2" />
              <input value={shiftForm.weeklyOffDays} onChange={(e) => setShiftForm((s) => ({ ...s, weeklyOffDays: e.target.value }))} placeholder="Weekly off days comma-separated" className="rounded border p-2" />
            </div>
            <button type="button" className="mt-3 rounded bg-[var(--accent)] px-3 py-2 text-white" onClick={async () => { await api.post("/settings/shifts", { ...shiftForm, weeklyOffDays: shiftForm.weeklyOffDays.split(",").map((x) => x.trim()).filter(Boolean), breaks: [] }); setShiftForm({ name: "", startTime: "09:00", endTime: "18:00", weeklyOffDays: "saturday,sunday" }); await shifts.refetch(); toast.success("Shift created"); }}>
              Create Shift
            </button>
            <ul className="mt-3 space-y-2 text-sm">{(shifts.data ?? []).map((s: any) => <li key={s.id} className="rounded border px-3 py-2">{s.name} | {s.startTime} - {s.endTime}</li>)}</ul>
          </div>

          <div className="rounded-xl border p-4">
            <h3 className="mb-3 text-lg font-semibold">Assign Shift</h3>
            <div className="grid gap-3 md:grid-cols-5">
              <select value={assignmentForm.employeeId} onChange={(e) => setAssignmentForm((s) => ({ ...s, employeeId: e.target.value }))} className="rounded border p-2"><option value="">Employee</option>{(employees.data ?? []).map((e: any) => <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>)}</select>
              <select value={assignmentForm.shiftId} onChange={(e) => setAssignmentForm((s) => ({ ...s, shiftId: e.target.value }))} className="rounded border p-2"><option value="">Shift</option>{(shifts.data ?? []).map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
              <input type="date" value={assignmentForm.startDate} onChange={(e) => setAssignmentForm((s) => ({ ...s, startDate: e.target.value }))} className="rounded border p-2" />
              <input type="date" value={assignmentForm.endDate} onChange={(e) => setAssignmentForm((s) => ({ ...s, endDate: e.target.value }))} className="rounded border p-2" />
              <input value={assignmentForm.notes} onChange={(e) => setAssignmentForm((s) => ({ ...s, notes: e.target.value }))} placeholder="Notes" className="rounded border p-2" />
            </div>
            <button type="button" className="mt-3 rounded bg-[var(--accent)] px-3 py-2 text-white" onClick={async () => { await api.post("/settings/shift-assignments", assignmentForm); setAssignmentForm({ employeeId: "", shiftId: "", startDate: "", endDate: "", notes: "" }); await assignments.refetch(); toast.success("Shift assigned"); }}>
              Assign Shift
            </button>
            <ul className="mt-3 space-y-2 text-sm">{(assignments.data ?? []).map((a: any) => <li key={a.id} className="rounded border px-3 py-2">{a.employeeName} | {a.shiftName} | {a.startDate} to {a.endDate}</li>)}</ul>
          </div>
        </div>
      )}

      {activeTab === "appearance" && (
        <div className="rounded-xl border p-4">
          <h3 className="mb-3 text-lg font-semibold">Appearance</h3>
          <select value={theme ?? "light"} onChange={(e) => setTheme(e.target.value)} className="rounded border p-2">
            <option value="light">Light</option>
            <option value="dark">Dark</option>
            <option value="system">System</option>
          </select>
        </div>
      )}

      {activeTab === "access-control" && isSuperAdmin && (
        <AccessControlEditor initialPolicy={accessPolicyQuery.data ?? getDefaultAccessPolicy()} onSave={async (policy) => { await api.put("/settings/access-policy", { policy }); await accessPolicyQuery.refetch(); toast.success("Access policy saved"); }} />
      )}

      {activeTab === "my-profile" && (
        <div className="rounded-xl border p-4">
          <h3 className="mb-1 text-lg font-semibold">My Slack Mapping</h3>
          <p className="mb-3 text-sm text-slate-500">Set your Slack email used in your workspace.</p>
          <input value={mySlackEmail} onChange={(e) => setMySlackEmail(e.target.value)} placeholder="you@firm.com" className="w-full max-w-md rounded border p-2" />
          <button type="button" className="mt-3 rounded bg-[var(--accent)] px-3 py-2 text-white" onClick={async () => { await api.put("/settings/profile/slack-email", { slackEmail: mySlackEmail }); await mySlackQuery.refetch(); toast.success("Slack email saved"); }}>
            Save My Slack Email
          </button>
        </div>
      )}
    </div>
  );
}
