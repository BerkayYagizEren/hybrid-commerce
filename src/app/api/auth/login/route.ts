import { NextResponse } from "next/server";
import { loginAction } from "@/features/auth/actions/auth.actions";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password, redirect } = body;
    const res = await loginAction({ email, password, redirect });
    return NextResponse.json(res, { status: res.success ? 200 : 401 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
