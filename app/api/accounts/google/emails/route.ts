// app/api/accounts/google/emails/route.ts
import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(
    { 
      error: "Email access has been disabled for security reasons. Google authentication is used for sign-in only.",
      messages: [],
      nextPageToken: null,
      resultSizeEstimate: 0
    }, 
    { status: 403 }
  );
}