"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import AppLayout from "../../components/AppLayout";
import { Wand2, Play, Image, Music, Video, CheckCircle, AlertCircle, Loader, FileText } from "lucide-react";
import PlayerDialog from "./PlayerDialog";

// Define the scene structure with multiple image prompts
interface Scene {
  content: string;
  imagePrompts: string[];
}

// Define the Project structure
interface Project {
  id: number;
  title: string;
  script: string;
  scenes: Scene[];
  status: "DRAFT" | "PROCESSING" | "COMPLETED" | "FAILED";
  outputUrl?: string;
  finalVideoUrl?: string;
  generatedImages?: string[];
  scriptAudio?: string;
  transcript?: string;
  timedScenes?: string;
  userId: string;
}

// Define generation states
type GenerationStep = "idle" | "images" | "audio" | "captions" | "lipsync" | "completed" | "failed";

export default function RemotionPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  const params = useParams();
  const projectId = params?.id;

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Generation state
  const [generationStep, setGenerationStep] = useState<GenerationStep>("idle");
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Redirect if not authenticated
    if (authStatus === "unauthenticated") {
      router.push("/");
      return;
    }

    // Fetch project data
    if (projectId) {
      fetchProject();
    } else {
      setError("Project ID is missing");
      setLoading(false);
    }
  }, [projectId, authStatus, router]);

  const fetchProject = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/project/${projectId}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch project data");
      }
      
      const projectData = await response.json();
      
      if (!projectData) {
        throw new Error("Project data not found in response");
      }
      
      // Create a safe copy of the project data
      const safeProject = { ...projectData };
      
      // Handle scenes data - could be string, array, or undefined
      if (typeof safeProject.scenes === "string") {
        try {
          safeProject.scenes = JSON.parse(safeProject.scenes);
        } catch (parseError) {
          console.error("Error parsing scenes JSON:", parseError);
          safeProject.scenes = []; // Fallback to empty array
        }
      } else if (!safeProject.scenes) {
        safeProject.scenes = []; // Initialize if undefined
      }
      
      // Set the project with validated data
      setProject(safeProject);
      
      // Set generation step based on project status
      if (safeProject.status === "COMPLETED" && (safeProject.finalVideoUrl || safeProject.outputUrl)) {
        setGenerationStep("completed");
        setVideoUrl(safeProject.finalVideoUrl || safeProject.outputUrl);
      } else if (safeProject.status === "FAILED") {
        setGenerationStep("failed");
      }
      
      // Set any existing generation artifacts
      if (safeProject.generatedImages && safeProject.generatedImages.length) {
        setGeneratedImages(safeProject.generatedImages);
      }
      
      if (safeProject.scriptAudio) {
        setAudioUrl(safeProject.scriptAudio);
      }
      
      if (safeProject.outputUrl) {
        setVideoUrl(safeProject.outputUrl);
      }
      
    } catch (err) {
      console.error("Error fetching project:", err);
      setError(`Failed to load project data: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setLoading(false);
    }
  };

  const generateVideo = async () => {
    if (!project) return;
    
    try {
      setError(null);
      let currentProgress = 0;
      
      // Step 1: Generate images if not already present
      if (!project.generatedImages || project.generatedImages.length === 0) {
        setGenerationStep("images");
        setProgress(10);
        
        const imageResponse = await fetch("/api/images/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            projectId: projectId
          }),
        });
        
        if (!imageResponse.ok) {
          const errorData = await imageResponse.json();
          throw new Error(errorData.error || "Failed to generate images");
        }
        
        const imageData = await imageResponse.json();
        setGeneratedImages(imageData.imageUrls);
        currentProgress = 25;
        setProgress(currentProgress);
      } else {
        console.log("Images already generated, skipping step");
        setGeneratedImages(project.generatedImages);
        currentProgress = 25;
        setProgress(currentProgress);
      }
      
      // Step 2: Generate text-to-speech audio if not already present
      if (!project.scriptAudio) {
        setGenerationStep("audio");
        setProgress(currentProgress);
        
        const audioResponse = await fetch("/api/audio/text-to-speech", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            text: project.script,
            projectId: projectId
          }),
        });
        
        if (!audioResponse.ok) {
          const errorData = await audioResponse.json();
          throw new Error(errorData.error || "Failed to generate audio");
        }
        
        const audioData = await audioResponse.json();
        setAudioUrl(audioData.response);
        currentProgress = 50;
        setProgress(currentProgress);
      } else {
        console.log("Audio already generated, skipping step");
        setAudioUrl(project.scriptAudio);
        currentProgress = 50;
        setProgress(currentProgress);
      }
      
      // Step 3: Generate captions if not already present
      if (!project.transcript || !project.timedScenes) {
        setGenerationStep("captions");
        setProgress(currentProgress);
        
        const captionsResponse = await fetch("/api/captions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectId: projectId
          }),
        });
        
        if (!captionsResponse.ok) {
          const errorData = await captionsResponse.json();
          throw new Error(errorData.error || "Failed to generate captions");
        }
        
        const captionsData = await captionsResponse.json();
        currentProgress = 75;
        setProgress(currentProgress);
      } else {
        console.log("Captions already generated, skipping step");
        currentProgress = 75;
        setProgress(currentProgress);
      }
      
      // Step 4: Generate video with lipsync if not already present
      if (!project.outputUrl) {
        setGenerationStep("lipsync");
        setProgress(currentProgress);
        
        const videoResponse = await fetch("/api/video", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectId: projectId,
            title: project.title
          }),
        });
        
        if (!videoResponse.ok) {
          const errorData = await videoResponse.json();
          throw new Error(errorData.error || "Failed to generate final video");
        }
        
        const videoData = await videoResponse.json();
        setVideoUrl(videoData.outputUrl);
        currentProgress = 100;
        setProgress(currentProgress);
      } else {
        console.log("Video already generated, skipping step");
        setVideoUrl(project.outputUrl);
        currentProgress = 100;
        setProgress(currentProgress);
      }
      
      // Final step: Complete
      setGenerationStep("completed");
      
      // Refresh project data
      fetchProject();
      
    } catch (err) {
      console.error("Error generating video:", err);
      setError(err instanceof Error ? err.message : "An unknown error occurred");
      setGenerationStep("failed");
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader className="h-12 w-12 text-purple-500 animate-spin" />
          <span className="ml-2 text-xl text-gray-300">Loading project...</span>
        </div>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout>
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-900 border border-red-700 text-red-200 px-4 py-3 rounded flex items-center mb-4">
            <AlertCircle className="h-5 w-5 mr-2" />
            {error}
          </div>
          <button
            onClick={() => router.push('/create')}
            className="px-4 py-2 bg-gray-700 text-white rounded-md"
          >
            Return to Create Page
          </button>
        </div>
      </AppLayout>
    );
  }

  if (!project) {
    return (
      <AppLayout>
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-2 text-gray-100">Project not found</h1>
          <p className="text-gray-400 mb-4">The project you're looking for could not be found.</p>
          <button
            onClick={() => router.push('/create')}
            className="px-4 py-2 bg-purple-600 text-white rounded-md"
          >
            Create New Video
          </button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-100">{project.title}</h1>
          <div className="text-gray-400">
            Status: <span className="font-medium text-purple-400">{project.status}</span>
          </div>
        </div>

        {/* Progress indicator */}
        {generationStep !== "idle" && generationStep !== "completed" && generationStep !== "failed" && (
          <div className="mb-6">
            <div className="flex justify-between mb-2">
              <span className="text-gray-300">
                {generationStep === "images" && "Generating images..."}
                {generationStep === "audio" && "Creating voice over..."}
                {generationStep === "captions" && "Generating captions..."}
                {generationStep === "lipsync" && "Creating video..."}
              </span>
              <span className="text-gray-300">{progress}%</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div 
                className="bg-purple-600 h-2 rounded-full transition-all duration-300" 
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Main content area - split view */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left side: Script */}
          <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-md p-4">
            <h2 className="text-xl font-semibold mb-4 text-gray-200 flex items-center">
              <FileText className="h-5 w-5 mr-2 text-purple-400" />
              Script
            </h2>
            <div className="bg-gray-900 text-gray-200 p-4 rounded-md mb-4 whitespace-pre-wrap border border-gray-700 h-[500px] overflow-y-auto">
              {project.script}
            </div>
            <div className="text-gray-400 text-sm">
              {project.scenes.length} scenes with {project.scenes.flatMap(scene => scene.imagePrompts).length} image prompts
            </div>
          </div>

          {/* Right side: Video preview */}
          <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-md p-4">
            <h2 className="text-xl font-semibold mb-4 text-gray-200 flex items-center">
              <Video className="h-5 w-5 mr-2 text-purple-400" />
              Video Preview [BETA]
            </h2>
            
            {generationStep === "completed" && videoUrl ? (
              <div className="flex flex-col items-center">
                {projectId && <PlayerDialog id={Number(projectId)} />}
                <div className="flex items-center justify-center text-green-400 mt-4">
                  <CheckCircle className="h-5 w-5 mr-2" />
                  Video generation complete!
                </div>
              </div>
            ) : generationStep === "failed" ? (
              <div className="flex flex-col items-center justify-center h-[400px] bg-gray-900 text-gray-400 rounded-md mb-4">
                <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
                <p className="text-lg font-medium text-red-300 mb-2">Video generation failed</p>
                <p className="text-gray-400 text-center max-w-xs">
                  There was an error during the generation process. Please try again.
                </p>
              </div>
            ) : generationStep !== "idle" ? (
              <div className="flex flex-col items-center justify-center h-[400px] bg-gray-900 text-gray-400 rounded-md mb-4">
                <Loader className="h-12 w-12 text-purple-500 animate-spin mb-4" />
                <p className="text-lg font-medium text-purple-300 mb-2">
                  {generationStep === "images" && "Generating images..."}
                  {generationStep === "audio" && "Creating voice over..."}
                  {generationStep === "captions" && "Generating captions..."}
                  {generationStep === "lipsync" && "Creating final video..."}
                </p>
                <p className="text-gray-400 text-center max-w-xs">
                  This may take a few minutes to complete.
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-[400px] bg-gray-900 text-gray-400 rounded-md mb-4">
                <Play className="h-12 w-12 text-gray-600 mb-4" />
                <p className="text-lg font-medium text-gray-300 mb-2">No video generated yet</p>
                <p className="text-gray-400 text-center max-w-xs">
                  Click the button below to start generating your video.
                </p>
              </div>
            )}
            
            {/* Generation button */}
            {generationStep === "idle" && (
              <button
                onClick={generateVideo}
                className="w-full py-3 px-4 bg-purple-600 text-white rounded-md font-medium hover:bg-purple-700 flex items-center justify-center"
              >
                <Wand2 className="h-5 w-5 mr-2" />
                Generate Video
              </button>
            )}
            
            {generationStep === "completed" && (
              <div className="flex justify-end mt-4">
                <button
                  onClick={() => router.push('/dashboard')}
                  className="py-2 px-4 bg-green-600 text-white rounded-md font-medium hover:bg-green-700"
                >
                  Go to Dashboard
                </button>
              </div>
            )}
            
            {generationStep === "failed" && (
              <button
                onClick={() => {
                  setGenerationStep("idle");
                  setError(null);
                }}
                className="w-full py-3 px-4 bg-purple-600 text-white rounded-md font-medium hover:bg-purple-700 flex items-center justify-center"
              >
                <Wand2 className="h-5 w-5 mr-2" />
                Try Again
              </button>
            )}
          </div>
        </div>
        
        {/* Generation steps overview */}
        <div className="mt-8 bg-gray-800 border border-gray-700 rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-6 text-gray-200">Generation Process</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className={`p-4 rounded-md border ${generationStep === "images" ? "bg-purple-900 border-purple-600" : generationStep === "audio" || generationStep === "captions" || generationStep === "lipsync" || generationStep === "completed" ? "bg-green-900 border-green-600" : "bg-gray-700 border-gray-600"}`}>
              <div className="flex items-center mb-2">
                <Image className={`h-5 w-5 mr-2 ${generationStep === "images" ? "text-purple-300" : generationStep === "audio" || generationStep === "captions" || generationStep === "lipsync" || generationStep === "completed" ? "text-green-400" : "text-gray-400"}`} />
                <span className={`font-medium ${generationStep === "images" ? "text-purple-300" : generationStep === "audio" || generationStep === "captions" || generationStep === "lipsync" || generationStep === "completed" ? "text-green-400" : "text-gray-300"}`}>
                  Generate Images
                </span>
              </div>
              <p className="text-sm text-gray-400">Create visuals for each scene</p>
            </div>
            
            <div className={`p-4 rounded-md border ${generationStep === "audio" ? "bg-purple-900 border-purple-600" : generationStep === "captions" || generationStep === "lipsync" || generationStep === "completed" ? "bg-green-900 border-green-600" : "bg-gray-700 border-gray-600"}`}>
              <div className="flex items-center mb-2">
                <Music className={`h-5 w-5 mr-2 ${generationStep === "audio" ? "text-purple-300" : generationStep === "captions" || generationStep === "lipsync" || generationStep === "completed" ? "text-green-400" : "text-gray-400"}`} />
                <span className={`font-medium ${generationStep === "audio" ? "text-purple-300" : generationStep === "captions" || generationStep === "lipsync" || generationStep === "completed" ? "text-green-400" : "text-gray-300"}`}>
                  Generate Audio
                </span>
              </div>
              <p className="text-sm text-gray-400">Create voiceover from script</p>
            </div>
            
            <div className={`p-4 rounded-md border ${generationStep === "captions" ? "bg-purple-900 border-purple-600" : generationStep === "lipsync" || generationStep === "completed" ? "bg-green-900 border-green-600" : "bg-gray-700 border-gray-600"}`}>
              <div className="flex items-center mb-2">
                <FileText className={`h-5 w-5 mr-2 ${generationStep === "captions" ? "text-purple-300" : generationStep === "lipsync" || generationStep === "completed" ? "text-green-400" : "text-gray-400"}`} />
                <span className={`font-medium ${generationStep === "captions" ? "text-purple-300" : generationStep === "lipsync" || generationStep === "completed" ? "text-green-400" : "text-gray-300"}`}>
                  Generate Captions
                </span>
              </div>
              <p className="text-sm text-gray-400">Create word-level timestamps</p>
            </div>
            
            <div className={`p-4 rounded-md border ${generationStep === "lipsync" ? "bg-purple-900 border-purple-600" : generationStep === "completed" ? "bg-green-900 border-green-600" : "bg-gray-700 border-gray-600"}`}>
              <div className="flex items-center mb-2">
                <Video className={`h-5 w-5 mr-2 ${generationStep === "lipsync" ? "text-purple-300" : generationStep === "completed" ? "text-green-400" : "text-gray-400"}`} />
                <span className={`font-medium ${generationStep === "lipsync" ? "text-purple-300" : generationStep === "completed" ? "text-green-400" : "text-gray-300"}`}>
                  Apply Lip Sync
                </span>
              </div>
              <p className="text-sm text-gray-400">Create final lip-synced video</p>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}