import { NextResponse } from "next/server";
import { logoutAction } from "@/features/auth/actions/auth.actions";

export async function POST() {
  try {
    const res = await logoutAction();
    return NextResponse.json(res);
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
