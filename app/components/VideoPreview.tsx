"use client";

import { useEffect, useState } from 'react';
import { Player } from '@remotion/player';
import RemotionVideo from '@/app/remotion/[id]/RemotionVideo';
import { Loader2 } from 'lucide-react';

interface VideoPreviewProps {
  projectId?: number | undefined;
  generatedVideoUrl: string;
}

const LoadingState = () => (
  <div className="w-full h-64 flex items-center justify-center">
    <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
    <span className="ml-2 text-gray-400">Loading preview...</span>
  </div>
);

export default function VideoPreview({ projectId, generatedVideoUrl }: VideoPreviewProps) {
  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProject = async () => {
      if (!projectId) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/project/${projectId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch project data');
        }
        const data = await response.json();
        setProject(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load project');
        console.error('Error fetching project:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProject();
  }, [projectId]);

  if (loading) {
    return <LoadingState />;
  }

  if (error) {
    return (
      <div className="w-full p-4 bg-red-900/20 border border-red-700 rounded-md text-red-200">
        <p>Error loading preview: {error}</p>
      </div>
    );
  }

  // Calculate video dimensions while maintaining aspect ratio
  const containerWidth = 720;
  const containerHeight = 1280;
  const aspectRatio = containerWidth / containerHeight;
  
  const maxHeight = 600; // Maximum height for the player
  const calculatedWidth = Math.min(containerWidth, maxHeight * aspectRatio);
  const calculatedHeight = calculatedWidth / aspectRatio;

  return (
    <div className="w-full flex justify-center">
      <div style={{ width: calculatedWidth, height: calculatedHeight }}>
        <Player
          component={RemotionVideo}
          durationInFrames={project?.audioDuration ? project.audioDuration * 30 : 300}
          compositionWidth={containerWidth}
          compositionHeight={containerHeight}
          fps={30}
          controls
          style={{
            width: '100%',
            height: '100%',
            borderRadius: '8px',
            overflow: 'hidden',
          }}
          inputProps={{
            projectId: projectId,
            title: project?.title || "Preview",
            images: project?.generatedImages || [],
            audioUrl: project?.scriptAudio || null,
            transcript: project?.transcript ? JSON.parse(project.transcript) : null,
            timedScenes: project?.timedScenes ? JSON.parse(project.timedScenes) : [],
            lipsyncUrl: generatedVideoUrl || project?.outputUrl || null,
            audioDuration: project?.audioDuration || 30
          }}
        />
      </div>
    </div>
  );
}