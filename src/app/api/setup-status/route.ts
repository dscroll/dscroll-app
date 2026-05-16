import { NextResponse } from "next/server";
import { getSetupStatus } from "@/utils/setup-check";

export async function GET() {
  try {
    const status = await getSetupStatus();
    return NextResponse.json(status);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch setup status" }, { status: 500 });
  }
}
