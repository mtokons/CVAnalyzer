import { prisma } from "@/lib/prisma";

// Unique, human-readable serials. Candidate CV file names reuse the candidate
// serial so files are always traceable to a record.
export async function nextProjectSerial(): Promise<string> {
  const year = new Date().getFullYear();
  const count = await prisma.project.count();
  return `PRJ-${year}-${String(count + 1).padStart(4, "0")}`;
}

export async function nextCandidateSerial(): Promise<string> {
  const year = new Date().getFullYear();
  const count = await prisma.candidate.count();
  return `CAND-${year}-${String(count + 1).padStart(5, "0")}`;
}

/** Safe file name for a candidate document, based on its serial. */
export function candidateFileName(serial: string, fullName: string, ext: string): string {
  const slug = fullName.replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 40);
  return `${serial}_${slug || "CV"}.${ext.replace(/^\./, "")}`;
}
