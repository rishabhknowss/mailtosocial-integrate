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

    const twitterAccount = await db.account.findFirst({
      where: {
        userId: session.user.id,
        provider: "twitter",
      },
    });

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { twitterUsername: true },
    });

    return NextResponse.json({
      connected: !!twitterAccount,
      username: user?.twitterUsername || null,
    });
  } catch (error) {
    // Using proper type for Error object
    const typedError = error as Error;
    console.error("Error checking Twitter status:", typedError);
    return NextResponse.json(
      { connected: false, error: typedError.message },
      { status: 500 }
    );
  }
}