import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { canManageProjects } from "@/lib/roles";
import { ProjectsClient } from "./ProjectsClient";

export default async function ProjectsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!canManageProjects(session.user.role)) redirect("/dashboard");
  return <ProjectsClient />;
}
