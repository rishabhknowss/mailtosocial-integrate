// app/api/video/route.ts
import { NextRequest, NextResponse } from "next/server";
import { fal } from "@fal-ai/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/authOptions";
import prisma from "@/prisma/db";

export async function POST(req: NextRequest) {
  // Check authentication
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Parse request body
    const body = await req.json();
    const { projectId, title } = body;
    
    if (!projectId) {
      return NextResponse.json({ 
        error: "Project ID is required" 
      }, { status: 400 });
    }

    // Get audio URL from project
    const projectData = await prisma.project.findUnique({
      where: { id: Number(projectId) },
      select: { scriptAudio: true },
    });

    if (!projectData || !projectData.scriptAudio) {
      return NextResponse.json({ 
        error: "Audio not found for this project" 
      }, { status: 404 });
    }

    // Get video URL from user
    const userData = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { videoUrl: true },
    });

    if (!userData || !userData.videoUrl) {
      return NextResponse.json({ 
        error: "Video URL not found for user" 
      }, { status: 404 });
    }

    const audio_url = projectData.scriptAudio;
    const video_url = userData.videoUrl;
    
    // Validate URLs
    try {
      new URL(audio_url);
      new URL(video_url);
    } catch (e) {
      return NextResponse.json({ 
        error: "Invalid URL format" 
      }, { status: 400 });
    }

    // Update project status to PROCESSING
    await prisma.project.update({
      where: { id: Number(projectId) },
      data: {
        status: "PROCESSING",
        updatedAt: new Date(),
      },
    });
    
    // Configure fal.ai client with API key
    fal.config({
      credentials: process.env.FAL_AI_API_KEY,
    });
    
    console.log("Starting lipsync processing with:");
    console.log("- Audio URL:", audio_url);
    console.log("- Video URL:", video_url);

    // Process with fal.ai
    const result = await fal.subscribe("fal-ai/sync-lipsync", {
      input: {
        video_url,
        audio_url
      },
      logs: true, 
      onQueueUpdate: (update) => {
        if (update.status === "IN_PROGRESS") {
          update.logs.map((log) => log.message).forEach(console.log);
        }
      },
    });
    
    console.log("fal.ai response:", result);
    
    // Check if the result has the expected data structure
    if (!result.data || !result.data.video || !result.data.video.url) {
      console.error("Invalid response format:", result);
      return NextResponse.json({ 
        error: "Failed to generate video output - invalid response format" 
      }, { status: 500 });
    }
    
    // Get the output URL from the correct property path
    const outputUrl = result.data.video.url;
    
    // Update existing project
    const project = await prisma.project.update({
      where: { id: Number(projectId) },
      data: {
        outputUrl: outputUrl,
        status: "COMPLETED",
        updatedAt: new Date(),
      },
    });
    
    return NextResponse.json({ 
      success: true, 
      outputUrl: outputUrl,
      project: {
        id: project.id,
        title: project.title,
        status: project.status,
      },
      request_id: result.requestId 
    });
    
  } catch (error) {
    console.error("Video processing error:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    
    // Update project status to FAILED if projectId was provided
    try {
      const { projectId } = await req.json().catch(() => ({ projectId: null }));
      if (projectId) {
        await prisma.project.update({
          where: { id: Number(projectId) },
          data: {
            status: "FAILED",
            updatedAt: new Date(),
          },
        });
      }
    } catch (dbError) {
      console.error("Error updating project status:", dbError);
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}