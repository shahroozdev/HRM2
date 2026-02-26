"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

const schema = z.object({ email: z.string().email(), password: z.string().min(6) });
type FormData = z.infer<typeof schema>;

export default function LoginPage(): React.JSX.Element {
  const router = useRouter();
  const { register, handleSubmit, formState } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormData) => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });

    if (res.ok) {
      toast.success("Logged in");
      router.push("/dashboard");
      router.refresh();
    } else {
      toast.error("Invalid credentials");
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-lg dark:bg-slate-900">
      <h1 className="mb-4 text-2xl font-semibold">Sign In</h1>
      <div className="space-y-3">
        <input {...register("email")} placeholder="Email" className="w-full rounded-lg border p-3" />
        <input {...register("password")} type="password" placeholder="Password" className="w-full rounded-lg border p-3" />
        <button disabled={formState.isSubmitting} className="w-full rounded-lg bg-[var(--accent)] py-3 text-white" type="submit">
          {formState.isSubmitting ? "Signing in..." : "Login"}
        </button>
      </div>
      <div className="mt-3 flex justify-between text-sm">
        <a href="/forgot-password" className="text-[var(--accent)]">Forgot password?</a>
        <span className="text-slate-500">admin@hrm.com / Admin@123</span>
      </div>
    </form>
  );
}
