import { getServerSession } from "@/lib/session";
import { MobileTabs } from "@/components/layout/mobile-tabs";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { redirect } from "next/navigation";

export default async function DashboardLayout({ children }: { children: React.ReactNode }): Promise<React.JSX.Element> {
  const session = await getServerSession();

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex min-h-screen flex-1 flex-col bg-[var(--content-bg)]">
        <Topbar title="Human Resources" />
        <main className="flex-1 p-4 pb-24 md:p-6">{children}</main>
        <MobileTabs />
      </div>
    </div>
  );
}
