import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { VALID_ROLES, ROLES, isOwnerEmail } from "@/lib/roles";

export const runtime = "nodejs";

async function requireSuperAdmin() {
  const session = await auth();
  const role = session?.user?.role;
  if (role !== "SUPER_ADMIN") return null;
  return session!.user;
}

// PATCH /api/admin/users/[id] — change a user's role (super admin only)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const actor = await requireSuperAdmin();
  if (!actor) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const role = body.role as string | undefined;

  if (!role || !VALID_ROLES.includes(role as never)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }
  if (id === actor.id) {
    return NextResponse.json(
      { error: "You cannot change your own role" },
      { status: 400 }
    );
  }

  const target = await prisma.user.findUnique({ where: { id }, select: { email: true } });
  if (isOwnerEmail(target?.email) && role !== ROLES.SUPER_ADMIN) {
    return NextResponse.json(
      { error: "The platform owner must remain Super Admin" },
      { status: 400 }
    );
  }

  const user = await prisma.user.update({
    where: { id },
    data: { role },
    select: { id: true, email: true, name: true, role: true },
  });

  return NextResponse.json({ success: true, user });
}

// DELETE /api/admin/users/[id] — remove a user (super admin only)
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const actor = await requireSuperAdmin();
  if (!actor) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  if (id === actor.id) {
    return NextResponse.json(
      { error: "You cannot delete your own account" },
      { status: 400 }
    );
  }

  const target = await prisma.user.findUnique({ where: { id }, select: { email: true } });
  if (isOwnerEmail(target?.email)) {
    return NextResponse.json(
      { error: "The platform owner account cannot be deleted" },
      { status: 400 }
    );
  }

  await prisma.user.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
