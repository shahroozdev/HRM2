import { getServerSession } from "@/lib/session";
import { redirect } from "next/navigation";

export default async function Home(): Promise<never> {
  const session = await getServerSession();
  if (session) redirect("/dashboard");
  redirect("/login");
}
