import { NextResponse } from "next/server";
import { signupAction } from "@/features/auth/actions/auth.actions";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, password, role, redirect } = body;
    const res = await signupAction({ name, email, password, role, redirect });
    return NextResponse.json(res, { status: res.success ? 200 : 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
