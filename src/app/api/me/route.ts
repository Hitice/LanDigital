import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getEntitlementByEmail } from "@/lib/subscriptions";

export async function GET() {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ authenticated: false });
  }
  const ent = await getEntitlementByEmail(session.user.email);
  return NextResponse.json({
    authenticated: true,
    email: session.user.email,
    name: session.user.name ?? null,
    image: session.user.image ?? null,
    ...ent,
  });
}
