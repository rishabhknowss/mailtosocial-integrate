"use client";

import React, { useState, useEffect } from 'react';
import { Player } from '@remotion/player';
import RemotionVideo from './RemotionVideo';
import { Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

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
  script?: string;
  scenes?: string;
  sceneImageMap?: string;
  status: string;
  imagePrompts?: string[];
  generatedImages?: string[];
  outputUrl?: string;
  slideshowUrl?: string;
  finalVideo?: string;
  transcript?: string;
  timedScenes?: string;
  audioDuration?: number;
  scriptAudio?: string;
  createdAt?: string | Date;
}

interface PlayerDialogProps {
  id: number;
}

const LoadingState = () => (
  <div className="w-full h-96 flex items-center justify-center">
    <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
    <span className="ml-2 text-gray-400">Loading preview...</span>
  </div>
);

export default function PlayerDialog({ id }: PlayerDialogProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [previousProjects, setPreviousProjects] = useState<Project[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<{ words: WordTimestamp[] } | null>(null);
  const [timedScenes, setTimedScenes] = useState<TimedScene[]>([]);
  const [durationInFrames, setDurationInFrames] = useState<number>(300);
  const [activeVideoType, setActiveVideoType] = useState<'main' | 'slideshow' | 'lipsync'>('main');
  
  // Fetch the main project
  useEffect(() => {
    const fetchProject = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/project/${id}`);
        
        if (!response.ok) {
          throw new Error("Failed to fetch project");
        }
        
        const data: Project = await response.json();
        setProject(data);
        
        // Set images
        if (data.generatedImages && data.generatedImages.length > 0) {
          setGeneratedImages(data.generatedImages);
        }
        
        // Set audio URL
        if (data.scriptAudio) {
          setAudioUrl(data.scriptAudio);
        }
        
        // Parse transcript
        if (data.transcript) {
          try {
            const parsedTranscript = JSON.parse(data.transcript);
            setTranscript(parsedTranscript);
          } catch (e) {
            console.error("Error parsing transcript:", e);
          }
        }
        
        // Parse timed scenes
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
            start: index * simpleDuration * 1000, // Convert to milliseconds
            end: (index + 1) * simpleDuration * 1000,
            imagePrompts: [],
            imageUrls: [url]
          }));
          setTimedScenes(simpleScenes);
          
          // Set duration based on images (minimum 30 seconds)
          const calculatedDuration = Math.max(data.generatedImages.length * simpleDuration, 30);
          setDurationInFrames(calculatedDuration * 30); // 30fps
        }
        
        // Set audio duration and calculate frames
        if (data.audioDuration) {
          // Convert audio duration (in seconds) to frames at 30fps
          const frames = Math.ceil(data.audioDuration * 30);
          setDurationInFrames(frames);
        }

        // Fetch previous videos once we have the current project
        fetchPreviousProjects(data.id);
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

  // Fetch previous projects from the API
  const fetchPreviousProjects = async (currentId: number) => {
    try {
      setIsLoadingHistory(true);
      const response = await fetch(`/api/projects?limit=10&excludeId=${currentId}`);
      
      if (!response.ok) {
        throw new Error("Failed to fetch project history");
      }
      
      const data = await response.json();
      setPreviousProjects(data);
    } catch (error) {
      console.error("Error fetching project history:", error);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const renderVideoPlayer = () => {
    // Calculate video dimensions while maintaining aspect ratio
    const containerWidth = 720;
    const containerHeight = 1280;
    const aspectRatio = containerWidth / containerHeight;
    
    const maxHeight = 600; // Maximum height for the player
    const calculatedWidth = Math.min(containerWidth, maxHeight * aspectRatio);
    const calculatedHeight = calculatedWidth / aspectRatio;

    return (
      <div className="w-full flex justify-center rounded-lg overflow-hidden">
        <div style={{ width: calculatedWidth, height: calculatedHeight }} className="relative">
          <Player
            component={RemotionVideo}
            durationInFrames={durationInFrames}
            compositionWidth={containerWidth}
            compositionHeight={containerHeight}
            fps={30}
            controls
            style={{
              width: '100%',
              height: '100%',
              borderRadius: '8px',
              overflow: 'hidden',
              backgroundColor: '#111',
            }}
            inputProps={{
              projectId: id,
              title: project?.title || "",
              images: generatedImages,
              audioUrl: audioUrl,
              transcript: transcript,
              timedScenes: timedScenes,
              lipsyncUrl: project?.outputUrl || null,
              audioDuration: project?.audioDuration || 30
            }}
          />
        </div>
      </div>
    );
  };

  const renderVideoTypeTabs = () => {
    const videoTypes = [
      { id: 'main', label: 'Final Video', available: !!project?.finalVideo },
      { id: 'slideshow', label: 'Slideshow', available: !!project?.slideshowUrl },
      { id: 'lipsync', label: 'Lipsync', available: !!project?.outputUrl }
    ];

    const availableTypes = videoTypes.filter(type => type.available);
    
    if (availableTypes.length <= 1) return null;

    return (
      <div className="flex mb-4 bg-[rgba(255,255,255,0.05)] rounded-lg p-1">
        {availableTypes.map(type => (
          <button
            key={type.id}
            className={`flex-1 px-4 py-2 text-sm rounded-md transition-colors ${
              activeVideoType === type.id 
                ? 'bg-[#0077B5] text-white' 
                : 'text-gray-400 hover:text-white'
            }`}
            onClick={() => setActiveVideoType(type.id as 'main' | 'slideshow' | 'lipsync')}
          >
            {type.label}
          </button>
        ))}
      </div>
    );
  };

  const formatDate = (date: string | Date) => {
    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      return formatDistanceToNow(dateObj, { addSuffix: true });
    } catch (error) {
      return 'Invalid date';
    }
  };

  const renderPreviousVideos = () => {
    if (isLoadingHistory) {
      return (
        <div className="mt-6">
          <h3 className="text-lg font-medium text-white mb-4">Your Previous Videos</h3>
          <div className="flex overflow-x-auto pb-4 space-x-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex-none w-[280px] bg-[rgba(255,255,255,0.02)] rounded-lg overflow-hidden">
                <div className="aspect-video bg-[rgba(255,255,255,0.04)] animate-pulse"></div>
                <div className="p-3">
                  <div className="h-5 bg-[rgba(255,255,255,0.04)] rounded animate-pulse mb-2"></div>
                  <div className="h-3 bg-[rgba(255,255,255,0.04)] rounded animate-pulse w-2/3"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (previousProjects.length === 0) {
      return (
        <div className="mt-6">
          <h3 className="text-lg font-medium text-white mb-4">Your Previous Videos</h3>
          <div className="bg-[rgba(255,255,255,0.04)] rounded-lg p-6 text-center">
            <p className="text-gray-400">You haven't created any other videos yet.</p>
          </div>
        </div>
      );
    }

    return (
      <div className="mt-6">
        <h3 className="text-lg font-medium text-white mb-4">Your Previous Videos</h3>
        <div className="relative">
          <div className="flex overflow-x-auto pb-4 space-x-4 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
            {previousProjects.map((project) => (
              <div 
                key={project.id} 
                className="flex-none w-[280px] bg-[rgba(255,255,255,0.04)] rounded-lg overflow-hidden hover:bg-[rgba(255,255,255,0.08)] transition-colors cursor-pointer"
                onClick={() => window.location.href = `/video/${project.id}`}
              >
                <div className="aspect-video bg-black relative">
                  {project.generatedImages && project.generatedImages[0] ? (
                    <img 
                      src={project.generatedImages[0]} 
                      alt={project.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-[rgba(255,255,255,0.02)] flex items-center justify-center">
                      <svg className="w-12 h-12 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 bg-black/40 transition-opacity">
                    <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                      <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                  </div>
                </div>
                <div className="p-3">
                  <h4 className="text-white font-medium truncate">{project.title}</h4>
                  <p className="text-xs text-gray-400 mt-1">
                    {project.createdAt ? formatDate(project.createdAt) : 'Unknown date'}
                  </p>
                </div>
              </div>
            ))}
          </div>
          {previousProjects.length > 3 && (
            <>
              <div className="absolute left-0 top-1/2 transform -translate-y-1/2 -ml-4 z-10">
                <button className="w-8 h-8 bg-black/50 rounded-full flex items-center justify-center text-white hover:bg-black/70 transition-colors">
                  <ChevronLeft size={18} />
                </button>
              </div>
              <div className="absolute right-0 top-1/2 transform -translate-y-1/2 -mr-4 z-10">
                <button className="w-8 h-8 bg-black/50 rounded-full flex items-center justify-center text-white hover:bg-black/70 transition-colors">
                  <ChevronRight size={18} />
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  };

  if (!project || loading) {
    return <LoadingState />;
  }

  if (error) {
    return (
      <div className="w-full p-4 bg-red-900/20 border border-red-700 rounded-md text-red-200">
        <p>Error loading preview: {error}</p>
      </div>
    );
  }

  return (
    <div className="w-full bg-[rgba(255,255,255,0.02)] rounded-lg overflow-hidden p-4">
      {renderVideoTypeTabs()}
      {renderVideoPlayer()}
      {renderPreviousVideos()}
    </div>
  );
}