"use client";
import React, { useEffect, useState } from 'react';
import { AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig, Audio, interpolate } from 'remotion';

// Define interfaces for props
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

// Use a more general type for the component props to satisfy Remotion's typing requirements
type RemotionVideoProps = {
  projectId?: number;
  title?: string;
  images?: string[];
  audioUrl?: string | null;
  transcript?: {
    words: WordTimestamp[];
  } | null;
  timedScenes?: TimedScene[] | null;
  lipsyncUrl?: string | null;
  audioDuration?: number;
}

// Loading state component
const LoadingState = () => (
  <AbsoluteFill style={{ backgroundColor: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <div style={{ 
      width: '40px', 
      height: '40px', 
      border: '4px solid rgba(255, 255, 255, 0.1)', 
      borderTopColor: '#7C3AED', 
      borderRadius: '50%', 
      animation: 'spin 1s linear infinite' 
    }} />
  </AbsoluteFill>
);

const RemotionVideo: React.FC<RemotionVideoProps> = ({
  projectId = 0,
  title = "Preview",
  images = [],
  audioUrl = null,
  transcript = null,
  timedScenes = [],
  lipsyncUrl = null,
  audioDuration = 30
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const [isLoading, setIsLoading] = useState(true);
  const [loadedImages, setLoadedImages] = useState<string[]>([]);
  
  // Calculate current time in seconds
  const currentTimeInSeconds = frame / fps;
  
  // Preload images
  useEffect(() => {
    if (!images || images.length === 0) {
      setIsLoading(false);
      return;
    }

    const preloadImages = async () => {
      try {
        const preloadPromises = images.map(url => {
          return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(url);
            img.onerror = reject;
            img.src = url;
          });
        });

        const loadedUrls = await Promise.all(preloadPromises) as string[];
        setLoadedImages(loadedUrls);
        setIsLoading(false);
      } catch (error) {
        console.error('Error preloading images:', error);
        // Continue even if some images fail to load
        setIsLoading(false);
      }
    };

    preloadImages();
  }, [images]);

  // Calculate current image index (simple approach: change every 5 seconds)
  const imageIndex = Math.floor(currentTimeInSeconds / 5) % (images.length || 1);
  const nextImageIndex = (imageIndex + 1) % (images.length || 1);
  
  // Calculate transition progress
  const transitionDuration = 1; // 1 second transition
  const sceneProgress = (currentTimeInSeconds % 5) / transitionDuration;
  const isTransitioning = sceneProgress <= 1;
  const opacity = isTransitioning ? interpolate(sceneProgress, [0, 1], [1, 0]) : 1;

  // Get current word from transcript
  const getCurrentWord = () => {
    if (!transcript?.words || transcript.words.length === 0) return '';
    
    // Convert current time to milliseconds for transcript comparison
    const currentTimeMs = currentTimeInSeconds * 1000;
    
    const currentWord = transcript.words.find(
      word => currentTimeMs >= word.start && currentTimeMs <= word.end
    );
    
    return currentWord?.text || '';
  };

  if (isLoading) {
    return <LoadingState />;
  }

  // Add a placeholder when no images are available
  if (!images || images.length === 0) {
    return (
      <AbsoluteFill style={{ backgroundColor: '#111' }}>
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
          color: '#666',
        }}>
          <p>No preview available</p>
        </div>
      </AbsoluteFill>
    );
  }

  return (
    <AbsoluteFill style={{ backgroundColor: '#111' }}>
      {/* Main Image */}
      {images.length > 0 && (
        <AbsoluteFill style={{ opacity }}>
          <img
            src={images[imageIndex]}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transform: `scale(${1 + (currentTimeInSeconds % 5) * 0.05})`,
              transformOrigin: 'center center',
            }}
            alt={`Scene ${imageIndex + 1}`}
          />
        </AbsoluteFill>
      )}

      {/* Next Image (for transition) */}
      {images.length > 1 && isTransitioning && (
        <AbsoluteFill style={{ opacity: 1 - opacity }}>
          <img
            src={images[nextImageIndex]}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transform: 'scale(1)',
              transformOrigin: 'center center',
            }}
            alt={`Scene ${nextImageIndex + 1}`}
          />
        </AbsoluteFill>
      )}

      {/* Video Title */}
      <Sequence from={0} durationInFrames={90}>
        <div style={{
          position: 'absolute',
          top: '10%',
          left: '10%',
          right: '10%',
          padding: '20px',
          backgroundColor: 'rgba(0,0,0,0.6)',
          borderRadius: '10px',
          opacity: interpolate(frame, [0, 15, 75, 90], [0, 1, 1, 0], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          }),
        }}>
          <h1 style={{
            color: 'white',
            fontSize: '32px',
            margin: 0,
            fontWeight: 'bold',
            textAlign: 'center',
          }}>
            {title}
          </h1>
        </div>
      </Sequence>

      {/* Captions */}
      {transcript && (
        <div style={{
          position: 'absolute',
          bottom: '10%',
          left: '10%',
          right: '10%',
          padding: '15px',
          backgroundColor: 'rgba(0,0,0,0.7)',
          color: 'white',
          fontSize: '24px',
          textAlign: 'center',
          borderRadius: '10px',
          zIndex: 10,
        }}>
          {getCurrentWord()}
        </div>
      )}

      {/* Audio Track */}
      {audioUrl && <Audio src={audioUrl} />}
    </AbsoluteFill>
  );
}

export default RemotionVideo;