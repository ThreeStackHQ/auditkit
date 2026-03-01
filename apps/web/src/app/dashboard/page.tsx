import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <div className="flex min-h-screen flex-col bg-gray-950 p-8">
      <h1 className="text-2xl font-bold text-orange-500">Dashboard</h1>
      <p className="mt-2 text-gray-400">
        Welcome back, {session.user?.name ?? session.user?.email}
      </p>
    </div>
  );
}
