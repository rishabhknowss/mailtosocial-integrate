import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/authOptions";
import prisma from "@/prisma/db";
import { getTranscriptWithTimestamps, groupWordsIntoScenes } from "@/app/lib/assemblyai";

export async function POST(req: NextRequest) {
  // Check authentication
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Parse request body
    const body = await req.json();
    const { projectId } = body;
    
    if (!projectId) {
      return NextResponse.json({ 
        error: "Project ID is required" 
      }, { status: 400 });
    }

    // Get project data
    const project = await prisma.project.findUnique({
      where: { 
        id: Number(projectId),
        userId: session.user.id
      },
      select: {
        id: true,
        title: true,
        scriptAudio: true,
        imagePrompts: true,
        generatedImages: true
      }
    });

    if (!project) {
      return NextResponse.json({ 
        error: "Project not found or unauthorized" 
      }, { status: 404 });
    }

    if (!project.scriptAudio) {
      return NextResponse.json({ 
        error: "No audio file found for this project" 
      }, { status: 400 });
    }

    console.log("Starting caption generation for project:", projectId);
    console.log("Audio URL:", project.scriptAudio);

    // Update project status to PROCESSING
    await prisma.project.update({
      where: { id: Number(projectId) },
      data: {
        status: "PROCESSING",
      },
    });

    // Call AssemblyAI to get transcript with timestamps
    const transcriptResult = await getTranscriptWithTimestamps(project.scriptAudio);
    
    console.log("Transcript generated with", transcriptResult.words.length, "words");
    console.log("Audio duration:", transcriptResult.audio_duration, "seconds");

    // Group words into scenes based on image prompts
    const timedScenes = project.imagePrompts && project.imagePrompts.length > 0
      ? groupWordsIntoScenes(
          transcriptResult.words,
          project.imagePrompts,
          transcriptResult.audio_duration
        )
      : [];

    // If we have generated images, add them to the timed scenes
    const enhancedTimedScenes = timedScenes.map((scene, index) => {
      const imageUrls = project.generatedImages && index < project.generatedImages.length
        ? [project.generatedImages[index]]
        : [];
        
      return {
        ...scene,
        imageUrls,
        imagePrompts: [scene.imagePrompt]
      };
    });
    
    console.log("Created", enhancedTimedScenes.length, "timed scenes");

    // Update project with transcript and timed scenes
    await prisma.project.update({
      where: { id: Number(projectId) },
      data: {
        transcript: JSON.stringify(transcriptResult),
        timedScenes: JSON.stringify(enhancedTimedScenes),
        audioDuration: transcriptResult.audio_duration,
        status: "COMPLETED",
      },
    });

    return NextResponse.json({ 
      success: true, 
      message: "Captions generated successfully",
      transcript: transcriptResult,
      timedScenes: enhancedTimedScenes,
      audioDuration: transcriptResult.audio_duration
    });
    
  } catch (error) {
    console.error("Caption generation error:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    
    // Update project status to FAILED if there was an error
    try {
      const { projectId } = await req.json().catch(() => ({ projectId: null }));
      if (projectId) {
        await prisma.project.update({
          where: { id: Number(projectId) },
          data: {
            status: "FAILED",
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