import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AdminDashboard } from "./AdminDashboard";

export default async function AdminPage() {
  const session = await auth();
  const role = session?.user?.role;
  if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
    redirect("/dashboard");
  }

  return <AdminDashboard isSuperAdmin={role === "SUPER_ADMIN"} currentUserId={session!.user.id} />;
}
