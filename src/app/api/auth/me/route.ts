import { NextResponse } from "next/server";
import { getCurrentUser } from "@/features/auth/actions/auth.actions";

export async function GET() {
  try {
    const user = await getCurrentUser();
    return NextResponse.json({ user });
  } catch (err: any) {
    return NextResponse.json({ user: null, error: err.message }, { status: 500 });
  }
}
