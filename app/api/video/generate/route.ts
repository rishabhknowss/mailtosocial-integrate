import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/authOptions";
import prisma from "@/prisma/db";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { title, content, description, tone } = await req.json();

    // Step 1: Generate script and scenes
    const scriptResponse = await fetch(`${req.nextUrl.origin}/api/ai/generate-video-script`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, content, description, tone }),
    });

    if (!scriptResponse.ok) {
      throw new Error("Failed to generate script");
    }

    const scriptData = await scriptResponse.json();
    const { projectId, scenes, script } = scriptData;

    // Step 2: Generate images for each scene
    const imageResponse = await fetch(`${req.nextUrl.origin}/api/images/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId }),
    });

    if (!imageResponse.ok) {
      throw new Error("Failed to generate images");
    }

    // Step 3: Generate audio from script
    const audioResponse = await fetch(`${req.nextUrl.origin}/api/audio/text-to-speech`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        text: script,
        projectId 
      }),
    });

    if (!audioResponse.ok) {
      throw new Error("Failed to generate audio");
    }

    // Step 4: Generate captions
    const captionsResponse = await fetch(`${req.nextUrl.origin}/api/captions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId }),
    });

    if (!captionsResponse.ok) {
      throw new Error("Failed to generate captions");
    }

    // Step 5: Generate final video with lip sync
    const videoResponse = await fetch(`${req.nextUrl.origin}/api/video`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        projectId,
        title 
      }),
    });

    const videoData = await videoResponse.json();

    if (!videoResponse.ok) {
      throw new Error(videoData.error || "Failed to generate video");
    }

    // Check if the video generation was successful
    if (!videoData.success || !videoData.outputUrl) {
      throw new Error("Video generation failed or output URL is missing");
    }

    return NextResponse.json({
      success: true,
      projectId,
      outputUrl: videoData.outputUrl,
      status: "COMPLETED"
    });

  } catch (error) {
    console.error("Video generation process error:", error);
    
    // Log detailed error information
    if (error instanceof Error) {
      console.error("Error details:", {
        message: error.message,
        stack: error.stack
      });
    }

    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : "Unknown error",
        details: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
} 