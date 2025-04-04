import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/authOptions";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Get date range from query parameters
    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    if (!startDate || !endDate) {
      return new NextResponse("Missing date range", { status: 400 });
    }

    // Fetch posted LinkedIn posts within the date range
    const posts = await prisma.postedLinkedInPost.findMany({
      where: {
        userId: session.user.id,
        postedAt: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
      },
      orderBy: {
        postedAt: "asc",
      },
    });

    return NextResponse.json(posts);
  } catch (error) {
    console.error("[LINKEDIN_POSTS_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
} 