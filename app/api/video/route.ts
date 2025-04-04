// app/api/video/route.ts
import { NextRequest, NextResponse } from "next/server";
import { fal } from "@fal-ai/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/authOptions";
import prisma from "@/prisma/db";

export async function POST(req: NextRequest) {
  let projectId: number | undefined;
  
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    projectId = body.projectId;
    
    // Get project data with audio URL
    const project = await prisma.project.findUnique({
      where: { 
        id: Number(projectId),
        userId: session.user.id 
      },
      select: { scriptAudio: true },
    });

    if (!project?.scriptAudio) {
      throw new Error("Audio not found for project");
    }

    // Get user's video URL
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { videoUrl: true },
    });

    if (!user?.videoUrl) {
      throw new Error("Please upload a video first");
    }

    // Validate URLs
    try {
      new URL(project.scriptAudio);
      new URL(user.videoUrl);
    } catch {
      throw new Error("Invalid audio or video URL format");
    }

    // Ensure URLs are publicly accessible
    const videoUrl = user.videoUrl.replace('http://', 'https://');
    const audioUrl = project.scriptAudio.replace('http://', 'https://');

    console.log('Processing with URLs:', { videoUrl, audioUrl });

    // Configure fal.ai
    fal.config({
      credentials: process.env.FAL_AI_API_KEY,
    });

    const result = await fal.subscribe("fal-ai/wav2lip", {
      input: {
        video_url: videoUrl,
        audio_url: audioUrl,
        pad_top: 0,
        pad_bottom: 0,
        pad_left: 0,
        pad_right: 0,
        resize_factor: 1,
        checkpoint_name: "wav2lip_gan",
      },
      logs: true,
    });

    if (!result.data?.video?.url) {
      throw new Error("Failed to generate video output");
    }

    // Update project with output URL
    await prisma.project.update({
      where: { id: Number(projectId) },
      data: {
        outputUrl: result.data.video.url,
        status: "COMPLETED",
      },
    });

    return NextResponse.json({ 
      success: true,
      outputUrl: result.data.video.url,
    });

  } catch (error) {
    console.error("Video processing error:", error);
    
    // Update project status to FAILED if we have a projectId
    if (projectId) {
      await prisma.project.update({
        where: { id: Number(projectId) },
        data: { status: "FAILED" },
      });
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Video generation failed" },
      { status: 500 }
    );
  }
}