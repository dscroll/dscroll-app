import { NextResponse } from "next/server";
import { validateSupabaseConnection } from "@/utils/setup-check";

export async function POST() {
  try {
    const result = await validateSupabaseConnection();
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ success: false, message: "Validation failed unexpectedly" }, { status: 500 });
  }
}
