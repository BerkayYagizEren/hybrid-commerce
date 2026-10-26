import { NextResponse } from "next/server";
import { demoLoginAction } from "@/features/auth/actions/auth.actions";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const role = body.role || "CUSTOMER";
    const redirect = body.redirect || undefined;
    const res = await demoLoginAction(role, redirect);
    return NextResponse.json(res);
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
