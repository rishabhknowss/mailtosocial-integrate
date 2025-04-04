"use client";

import { useState, useEffect } from 'react';
import { Player } from '@remotion/player';
import RemotionVideo from './RemotionVideo';
import { Loader2 } from 'lucide-react';

interface WordTimestamp {
  text: string;
  start: number;
  end: number;
  confidence: number;
}

interface TimedScene {
  start: number;
  end: number;
  imagePrompts: string[];
  imageUrls?: string[];
}

interface Project {
  id: number;
  title: string;
  script: string;
  scenes?: string;
  sceneImageMap?: string;
  status: string;
  imagePrompts?: string[];
  generatedImages?: string[];
  outputUrl?: string; // Lip-synced video
  slideshowUrl?: string; // Slideshow of generated images
  finalVideoUrl?: string; // Split-screen combined video
  transcript?: string;
  timedScenes?: string;
  audioDuration?: number;
  scriptAudio?: string; // Added for TTS audio URL
}

interface PlayerDialogProps {
  id: number;
}

export default function PlayerDialog({ id }: PlayerDialogProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  
  // Specific data for RemotionVideo
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<{ words: WordTimestamp[] } | null>(null);
  const [timedScenes, setTimedScenes] = useState<TimedScene[]>([]);
  const [lipsyncUrl, setLipsyncUrl] = useState<string | null>(null);
  const [audioDuration, setAudioDuration] = useState<number>(0);
  const [durationInFrames, setDurationInFrames] = useState<number>(300); // Default duration

  useEffect(() => {
    const fetchProject = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/project/${id}`);
        
        if (!response.ok) {
          throw new Error("Failed to fetch project");
        }
        
        const data: Project = await response.json();
        console.log("Project data:", data);
        setProject(data);
        
        // Set images if available
        if (data.generatedImages && data.generatedImages.length > 0) {
          console.log("Setting generated images:", data.generatedImages);
          setGeneratedImages(data.generatedImages);
        }
        
        // Set audio URL if available - use scriptAudio field
        if (data.scriptAudio) {
          console.log("Setting audio URL:", data.scriptAudio);
          setAudioUrl(data.scriptAudio);
        }
        
        // Set lipsync URL if available
        if (data.outputUrl) {
          console.log("Setting lipsync URL:", data.outputUrl);
          setLipsyncUrl(data.outputUrl);
        }
        
        // Parse transcript if available
        if (data.transcript) {
          try {
            const parsedTranscript = JSON.parse(data.transcript);
            setTranscript(parsedTranscript);
          } catch (e) {
            console.error("Error parsing transcript:", e);
          }
        }
        
        // Parse timed scenes if available
        if (data.timedScenes) {
          try {
            const parsedTimedScenes = JSON.parse(data.timedScenes);
            setTimedScenes(parsedTimedScenes);
          } catch (e) {
            console.error("Error parsing timed scenes:", e);
          }
        } else if (data.generatedImages) {
          // Create simple timed scenes if we have images but no timing data
          const simpleDuration = 5; // seconds per image
          const simpleScenes: TimedScene[] = data.generatedImages.map((url, index) => ({
            start: index * simpleDuration,
            end: (index + 1) * simpleDuration,
            imagePrompts: [],
            imageUrls: [url]
          }));
          setTimedScenes(simpleScenes);
          
          // Set duration based on images (minimum 30 seconds)
          const calculatedDuration = Math.max(data.generatedImages.length * simpleDuration, 30);
          setAudioDuration(calculatedDuration);
          setDurationInFrames(calculatedDuration * 30); // 30fps
        }
        
        // Set audio duration and calculate frames
        if (data.audioDuration) {
          setAudioDuration(data.audioDuration);
          // Convert audio duration (in seconds) to frames at 30fps
          const frames = Math.ceil(data.audioDuration * 30);
          setDurationInFrames(frames);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "An unknown error occurred");
        console.error("Error fetching project:", err);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchProject();
    }
  }, [id]);

  if (loading) {
    return (
      <div className="w-full h-64 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
        <span className="ml-2 text-gray-400">Loading video...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full p-4 bg-red-900/20 border border-red-700 rounded-md text-red-200">
        <p>Error loading video: {error}</p>
      </div>
    );
  }

  // If we have a lipsync URL, show that instead of the Remotion player
 

  return (
    <div className="w-full max-w-2xl mx-auto">
      <Player
        component={RemotionVideo}
        durationInFrames={durationInFrames}
        compositionWidth={300}
        compositionHeight={450}
        fps={30}
        controls
        style={{ width: '100%', height: '400px' }}
        inputProps={{
          projectId: id,
          title: project?.title || "",
          images: generatedImages,
          audioUrl: audioUrl,
          transcript: transcript,
          timedScenes: timedScenes,
          lipsyncUrl: lipsyncUrl,
          audioDuration: audioDuration
        }}
      />
    </div>
  );
}