"use client";

import axios from "axios";
import { useState } from "react";
import { toast } from "sonner";

export default function ForgotPasswordPage(): React.JSX.Element {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  return (
    <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-lg dark:bg-slate-900">
      <h1 className="mb-4 text-2xl font-semibold">Forgot Password</h1>
      <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="w-full rounded-lg border p-3" />
      <button onClick={async () => { setLoading(true); try { await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/forgot-password`, { email }); toast.success("Reset instructions sent"); } finally { setLoading(false); } }} className="mt-3 w-full rounded-lg bg-[var(--accent)] py-3 text-white" type="button">{loading ? "Sending..." : "Send reset"}</button>
    </div>
  );
}