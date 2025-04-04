import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await params; // Removed the assignment to 'id' as it was not used
  return NextResponse.json(
    { 
      error: "Email access has been disabled for security reasons. Google authentication is used for sign-in only."
    }, 
    { status: 403 }
  );
} 