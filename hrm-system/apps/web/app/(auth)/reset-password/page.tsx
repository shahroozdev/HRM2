"use client";

import axios from "axios";
import { useState } from "react";
import { toast } from "sonner";

export default function ResetPasswordPage(): React.JSX.Element {
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");

  return (
    <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-lg dark:bg-slate-900">
      <h1 className="mb-4 text-2xl font-semibold">Reset Password</h1>
      <div className="space-y-3">
        <input value={token} onChange={(e) => setToken(e.target.value)} placeholder="Reset token" className="w-full rounded-lg border p-3" />
        <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="New password" type="password" className="w-full rounded-lg border p-3" />
        <button onClick={async () => { await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/reset-password`, { token, newPassword: password }); toast.success("Password reset complete"); }} className="w-full rounded-lg bg-[var(--accent)] py-3 text-white" type="button">Reset Password</button>
      </div>
    </div>
  );
}