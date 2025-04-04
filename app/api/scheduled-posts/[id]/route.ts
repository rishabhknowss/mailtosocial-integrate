import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/authOptions";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// GET a specific scheduled post
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const scheduledPostId = (await params).id;

    const post = await prisma.scheduledPost.findFirst({
      where: {
        id: scheduledPostId,
        userId: session.user.id,
      },
    });

    if (!post) {
      return new NextResponse("Post not found", { status: 404 });
    }

    return NextResponse.json(post);
  } catch (error) {
    console.error("[SCHEDULED_POST_GET]", error);
    const typedError = error as Error;
    return NextResponse.json(
      { error: typedError.message || "Failed to fetch scheduled post" },
      { status: 500 }
    );
  }
}

// Update a specific scheduled post
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const scheduledPostId = (await params).id;

    // Check if the post exists and belongs to the user
    const existingPost = await prisma.scheduledPost.findFirst({
      where: {
        id: scheduledPostId,
        userId: session.user.id,
      },
    });

    if (!existingPost) {
      return new NextResponse("Post not found", { status: 404 });
    }

    const body = await req.json();
    const { content, scheduledFor, status } = body;

    // Validate the status if provided
    if (status && !["pending", "posted", "failed"].includes(status)) {
      return new NextResponse("Invalid status", { status: 400 });
    }

    // Update the post
    const updatedPost = await prisma.scheduledPost.update({
      where: {
        id: scheduledPostId,
      },
      data: {
        ...(content && { content }),
        ...(scheduledFor && { scheduledFor: new Date(scheduledFor) }),
        ...(status && { status }),
      },
    });

    return NextResponse.json(updatedPost);
  } catch (error) {
    console.error("[SCHEDULED_POST_PATCH]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

// DELETE a specific scheduled post
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const scheduledPostId = (await params).id;

    // Check if the post exists and belongs to the user before deleting
    const post = await prisma.scheduledPost.findFirst({
      where: {
        id: scheduledPostId,
        userId: session.user.id,
      },
    });

    if (!post) {
      return new NextResponse("Post not found or not authorized to delete", { status: 404 });
    }

    // Delete the post
    await prisma.scheduledPost.delete({
      where: {
        id: scheduledPostId,
      },
    });

    return NextResponse.json({ message: "Scheduled post deleted successfully" });
  } catch (error) {
    console.error("[SCHEDULED_POST_DELETE]", error);
    const typedError = error as Error;
    return NextResponse.json(
      { error: typedError.message || "Failed to delete scheduled post" },
      { status: 500 }
    );
  }
} 