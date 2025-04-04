import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/authOptions";
import db from "@/prisma/db";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ connected: false }, { status: 401 });
    }

    const userId = session.user.id;
    
    // Get the user's LinkedIn account
    const linkedinAccount = await db.account.findFirst({
      where: {
        userId: userId,
        provider: "linkedin",
      },
    });

    // Get the user profile data
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { 
        linkedinProfileId: true,
        linkedinName: true  // Include the LinkedIn name
      },
    });

    // Check if token is valid
    let tokenValid = false;
    if (linkedinAccount?.access_token && linkedinAccount?.expires_at) {
      const currentTimestamp = Math.floor(Date.now() / 1000);
      tokenValid = linkedinAccount.expires_at > currentTimestamp;
      
      if (!tokenValid) {
        console.log('LinkedIn token has expired for user:', userId);
      }
    }

    return NextResponse.json({
      connected: !!linkedinAccount && tokenValid,
      profileId: user?.linkedinProfileId || null,
      profileName: user?.linkedinName || null,  // Return the LinkedIn name
      tokenExpired: linkedinAccount && !tokenValid,
    });
  } catch (error: unknown) {
    console.error("Error checking LinkedIn status:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { connected: false, error: errorMessage },
      { status: 500 }
    );
  }
}