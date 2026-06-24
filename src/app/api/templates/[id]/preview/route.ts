import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/session";
import { aiService, type ProfileData } from "@/services/ai.service";
import { GERMAN_CV_TEMPLATES } from "@/lib/cv-templates";

export const runtime = "nodejs";

const SAMPLE_PROFILE: ProfileData = {
  fullName: "Alex Schmidt",
  email: "alex.schmidt@email.de",
  phone: "+49 170 1234567",
  location: "Berlin, Deutschland",
  linkedin: "linkedin.com/in/alexschmidt",
  github: "github.com/alexschmidt",
  summary:
    "Erfahrener Software Engineer / Solution Architect mit über 8 Jahren Erfahrung im Entwurf skalierbarer, cloud-nativer Systeme und der Leitung crossfunktionaler Teams.",
  experience: [
    {
      company: "TechWerk GmbH",
      title: "Senior Solution Architect",
      location: "Berlin",
      startDate: "2021",
      current: true,
      description:
        "Design and delivery of microservice platforms on Kubernetes serving 2M+ users.",
      achievements: [
        "Reduced infrastructure costs by 35% through cloud optimisation.",
        "Led migration of a monolith to event-driven microservices.",
      ],
      technologies: ["AWS", "Kubernetes", "Go", "TypeScript", "Kafka"],
    },
    {
      company: "Digital Solutions AG",
      title: "Software Engineer",
      location: "München",
      startDate: "2017",
      endDate: "2021",
      description: "Full-stack development of enterprise web applications.",
      achievements: ["Shipped a real-time analytics dashboard used by 500+ clients."],
      technologies: ["React", "Node.js", "PostgreSQL"],
    },
  ],
  education: [
    {
      institution: "Technische Universität München",
      degree: "M.Sc. Informatik",
      field: "Software Engineering",
      startDate: "2014",
      endDate: "2016",
    },
  ],
  skills: [
    "System Design",
    "Cloud Architecture",
    "Microservices",
    "TypeScript",
    "Go",
    "Kubernetes",
    "AWS",
    "CI/CD",
    "Domain-Driven Design",
  ],
  certifications: [
    { name: "AWS Solutions Architect – Professional", issuer: "Amazon", date: "2023" },
  ],
  languages: [
    { name: "Deutsch", proficiency: "Native" },
    { name: "English", proficiency: "Fluent" },
  ],
  projects: [],
};

// GET /api/templates/[id]/preview — render a template as standalone HTML
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  if (!GERMAN_CV_TEMPLATES.some((t) => t.id === id)) {
    return NextResponse.json({ error: "Unknown template" }, { status: 404 });
  }

  // Use the user's real profile when available, otherwise a representative sample.
  const profile = await prisma.profile.findUnique({ where: { userId } });
  const data: ProfileData = profile
    ? {
        fullName: profile.fullName ?? SAMPLE_PROFILE.fullName,
        email: profile.email ?? SAMPLE_PROFILE.email,
        phone: profile.phone ?? undefined,
        location: profile.location ?? undefined,
        linkedin: profile.linkedin ?? undefined,
        github: profile.github ?? undefined,
        summary: profile.summary ?? SAMPLE_PROFILE.summary,
        experience: (profile.experience as unknown as ProfileData["experience"]) ?? SAMPLE_PROFILE.experience,
        education: (profile.education as unknown as ProfileData["education"]) ?? SAMPLE_PROFILE.education,
        skills: (profile.skills as unknown as string[]) ?? SAMPLE_PROFILE.skills,
        certifications: (profile.certifications as unknown as ProfileData["certifications"]) ?? [],
        languages: (profile.languages as unknown as ProfileData["languages"]) ?? [],
        projects: (profile.projects as unknown as ProfileData["projects"]) ?? [],
      }
    : SAMPLE_PROFILE;

  // If the profile has no experience, fall back to sample so the preview is meaningful.
  if (!data.experience || data.experience.length === 0) {
    data.experience = SAMPLE_PROFILE.experience;
    data.skills = (data.skills && data.skills.length ? data.skills : SAMPLE_PROFILE.skills);
  }

  const html = aiService.renderCVHTML(data, id);
  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
