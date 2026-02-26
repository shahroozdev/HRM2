export default function AuthLayout({ children }: { children: React.ReactNode }): React.JSX.Element {
  return <main className="flex min-h-screen items-center justify-center bg-slate-100 p-4 dark:bg-slate-950">{children}</main>;
}