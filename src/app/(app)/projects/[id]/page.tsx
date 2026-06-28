import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { canManageProjects } from "@/lib/roles";
import { ProjectDetailClient } from "./ProjectDetailClient";

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!canManageProjects(session.user.role)) redirect("/dashboard");
  const { id } = await params;
  return <ProjectDetailClient projectId={id} />;
}
