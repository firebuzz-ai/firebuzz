import { cookies } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { key, value } = body;
  const cookieStore = await cookies();
  cookieStore.set(key, value);
  return NextResponse.json({ success: true });
}
