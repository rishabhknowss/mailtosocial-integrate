"use client";
import { useEffect, useState, useRef } from 'react';
import { AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig, Audio } from 'remotion';

// Define interface for props
interface WordTimestamp {
  text: string;
  start: number;
  end: number;
  confidence: number;
}

interface RemotionVideoProps {
  projectId: number;
  title: string;
  images: string[];
  audioUrl: string | null;
  transcript: {
    words: WordTimestamp[];
  } | null;
  timedScenes: {
    start: number;
    end: number;
    imagePrompts: string[];
    imageUrls?: string[];
  }[] | null;
  lipsyncUrl: string | null;
  audioDuration: number;
}

export default function RemotionVideo({
  projectId,
  title,
  images,
  audioUrl,
  transcript,
  timedScenes,
  lipsyncUrl,
  audioDuration
}: RemotionVideoProps) {
  console.log("Audio URL:", audioUrl);
  console.log("Lipsync URL:", lipsyncUrl);
  console.log("Transcript available:", !!transcript);
  console.log("Images count:", images?.length);
  
  // Create refs for the video elements to control them programmatically
  const splitScreenVideoRef = useRef<HTMLVideoElement>(null);
  const fullscreenVideoRef = useRef<HTMLVideoElement>(null);
  
  // State to track if the main video has actually started playing
  const [mainVideoStarted, setMainVideoStarted] = useState(false);
  
  // State to track if videos are loaded and ready
  const [splitScreenVideoReady, setSplitScreenVideoReady] = useState(false);
  const [fullscreenVideoReady, setFullscreenVideoReady] = useState(false);
  
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const [currentImage, setCurrentImage] = useState<string | null>(null);
  const [currentSceneStart, setCurrentSceneStart] = useState<number>(0);
  const [currentSceneEnd, setCurrentSceneEnd] = useState<number>(0);
  
  // Calculate current time in seconds based on frame
  const currentTimeInSeconds = frame / fps;
  
  // Define the transition point - 5 seconds where we switch from split-screen to full image
  const SPLIT_SCREEN_DURATION = 5; // 5 seconds of split-screen at the beginning
  const SPLIT_SCREEN_FRAMES = SPLIT_SCREEN_DURATION * fps;
  
  // Are we in split-screen mode (first 5 seconds)?
  const isSplitScreenMode = frame < SPLIT_SCREEN_FRAMES;
  
  // Define when the lipsync video should appear in full screen
  const getLipsyncFullscreenVisibility = () => {
    // Initially visible for first 5 seconds (split screen)
    if (frame < SPLIT_SCREEN_FRAMES) {
      return false; // Not fullscreen during the initial split screen
    }
    
    // For subsequent full-screen appearances, show for brief intervals of 2-3 seconds
    const interval = 25; // Show every 25 seconds approximately
    const appearDuration = 2.5; // Show for 2.5 seconds each time
    
    // Convert to frames
    const intervalFrames = interval * fps;
    const appearFrames = appearDuration * fps;
    
    // Check if current frame falls within any reappearance interval
    // Start checking after the initial split screen ends
    const framesSinceStart = frame - SPLIT_SCREEN_FRAMES;
    if (framesSinceStart <= 0) return false;
    
    // Simple check without animation buffer
    return (framesSinceStart % intervalFrames) < appearFrames;
  };
  
  // Determine if lipsync video should be visible in full screen
  const isLipsyncFullscreen = getLipsyncFullscreenVisibility();
  
  // Should we show the image (not fullscreen lipsync)?
  const shouldShowImage = !isLipsyncFullscreen;
  
  // Detect when the main video actually starts playing (frame > 0)
  useEffect(() => {
    if (frame > 0 && !mainVideoStarted) {
      setMainVideoStarted(true);
    }
  }, [frame, mainVideoStarted]);
  
  // Initialize video elements and preload them
  useEffect(() => {
    if (!lipsyncUrl) return;
    
    // Preload both video instances
    const preloadVideos = async () => {
      try {
        // Set up event handlers for the split screen video
        if (splitScreenVideoRef.current) {
          splitScreenVideoRef.current.addEventListener('loadeddata', () => {
            setSplitScreenVideoReady(true);
            console.log("Split screen video loaded");
            
            // Ensure background is transparent
            if (splitScreenVideoRef.current && splitScreenVideoRef.current.parentElement) {
              if (splitScreenVideoRef.current && splitScreenVideoRef.current.parentElement) {
                splitScreenVideoRef.current.parentElement.style.backgroundColor = 'transparent';
              }
            }
          });
          
          // Add error handler
          splitScreenVideoRef.current.addEventListener('error', (e) => {
            console.error("Split screen video error:", e);
          });
          
          // Force preload
          splitScreenVideoRef.current.preload = "auto";
          splitScreenVideoRef.current.load();
        }
        
        // Set up event handlers for the fullscreen video
        if (fullscreenVideoRef.current) {
          fullscreenVideoRef.current.addEventListener('loadeddata', () => {
            setFullscreenVideoReady(true);
            console.log("Fullscreen video loaded");
            
            // Ensure background is transparent
            if (fullscreenVideoRef.current && fullscreenVideoRef.current.parentElement) {
              if (fullscreenVideoRef.current && fullscreenVideoRef.current.parentElement) {
                fullscreenVideoRef.current.parentElement.style.backgroundColor = 'transparent';
              }
            }
          });
          
          // Add error handler
          fullscreenVideoRef.current.addEventListener('error', (e) => {
            console.error("Fullscreen video error:", e);
          });
          
          // Force preload
          fullscreenVideoRef.current.preload = "auto";
          fullscreenVideoRef.current.load();
        }
      } catch (error) {
        console.error("Error preloading videos:", error);
      }
    };
    
    preloadVideos();
  }, [lipsyncUrl]);
  
  // Use effect to synchronize video playback with the current frame
  // Always keep both videos synced with audio, regardless of whether they're visible
  useEffect(() => {
    if (!mainVideoStarted || !lipsyncUrl) {
      return; // Don't do anything until main video starts or if no video/url
    }
    
    // Always keep video time synced with the current frame time
    const targetTime = currentTimeInSeconds;
    
    // Handle split screen video synchronization
    if (splitScreenVideoRef.current && splitScreenVideoReady) {
      try {
        // Only update time if it's significantly different (to avoid constant small updates)
        if (Math.abs(splitScreenVideoRef.current.currentTime - targetTime) > 0.1) {
          splitScreenVideoRef.current.currentTime = targetTime;
        }
        
        // Ensure video is playing and visible
        if (splitScreenVideoRef.current.paused) {
          splitScreenVideoRef.current.play().catch(err => {
            console.warn("Couldn't play split screen video:", err);
          });
        }
        
        // Make sure video element is properly visible
        splitScreenVideoRef.current.style.visibility = 'visible';
        splitScreenVideoRef.current.style.opacity = '1';
      } catch (err) {
        console.warn("Error syncing split screen video:", err);
      }
    }
    
    // Handle fullscreen video synchronization
    if (fullscreenVideoRef.current && fullscreenVideoReady) {
      try {
        // Only update time if it's significantly different (to avoid constant small updates)
        if (Math.abs(fullscreenVideoRef.current.currentTime - targetTime) > 0.1) {
          fullscreenVideoRef.current.currentTime = targetTime;
        }
        
        // Ensure video is playing and visible
        if (fullscreenVideoRef.current.paused) {
          fullscreenVideoRef.current.play().catch(err => {
            console.warn("Couldn't play fullscreen video:", err);
          });
        }
        
        // Make sure video element is properly visible
        fullscreenVideoRef.current.style.visibility = 'visible';
        fullscreenVideoRef.current.style.opacity = '1';
      } catch (err) {
        console.warn("Error syncing fullscreen video:", err);
      }
    }
    
  }, [frame, currentTimeInSeconds, lipsyncUrl, mainVideoStarted, splitScreenVideoReady, fullscreenVideoReady]);
  
  // Function to find the appropriate image for the current time and track scene timing
  useEffect(() => {
    if (!timedScenes || timedScenes.length === 0 || !images || images.length === 0) {
      return;
    }
    
    // For image selection, we don't adjust time - images run from beginning
    // Find the current scene based on current time
    const currentScene = timedScenes.find(
      scene => currentTimeInSeconds >= scene.start / 1000 && currentTimeInSeconds < scene.end / 1000
    );
    
    if (currentScene && currentScene.imageUrls && currentScene.imageUrls.length > 0) {
      setCurrentImage(currentScene.imageUrls[0]);
      setCurrentSceneStart(currentScene.start / 1000);
      setCurrentSceneEnd(currentScene.end / 1000);
    } else if (images.length > 0) {
      // Fallback: rotate through all images if scenes not properly defined
      const imageDuration = 5; // 5 seconds per image
      const imageIndex = Math.floor((currentTimeInSeconds % (images.length * imageDuration)) / imageDuration);
      const currentIndex = imageIndex % images.length;
      
      setCurrentImage(images[currentIndex]);
      
      // Calculate scene timing for the fallback mode
      const sceneStart = Math.floor(currentTimeInSeconds / imageDuration) * imageDuration;
      setCurrentSceneStart(sceneStart);
      setCurrentSceneEnd(sceneStart + imageDuration);
    }
  }, [frame, currentTimeInSeconds, timedScenes, images, fps]);
  
  // Calculate zoom scale based on global time instead of scene-specific time
  // This ensures continuous zooming throughout the video
  const calculateZoomScale = () => {
    // If we're in split-screen mode, maintain a scale of 1
    if (isSplitScreenMode) return 1;
    
    // Calculate time elapsed since the end of split-screen mode
    const timeAfterSplitScreen = currentTimeInSeconds - SPLIT_SCREEN_DURATION;
    
    // Don't zoom if we're still in split-screen mode
    if (timeAfterSplitScreen <= 0) return 1;
    
    // Base zoom rate - adjust this value to change zoom speed
    // Smaller value = slower zoom
    const zoomRate = 0.03;
    
    // Continuous zoom based on elapsed time
    return 1 + (zoomRate * timeAfterSplitScreen);
  };
  
  const zoomScale = calculateZoomScale();
  
  // Determine what text to show based on the transcript - handle time in milliseconds
  const findCurrentWordIndex = () => {
    if (!transcript?.words || transcript.words.length === 0) return -1;
    
    // Convert current time to milliseconds for comparison with transcript times
    const currentTimeMs = currentTimeInSeconds * 1000;
    
    return transcript.words.findIndex(
      word => currentTimeMs >= word.start && currentTimeMs <= word.end
    );
  };
  
  const currentWordIndex = findCurrentWordIndex();
  
  // Get words currently being spoken (highlight current word)
  const getCurrentWords = () => {
    if (!transcript || !transcript.words || transcript.words.length === 0 || currentWordIndex === -1) {
      return '';
    }
    
    // Just return the current word
    return transcript.words[currentWordIndex].text;
  };
  
  const captionContent = getCurrentWords();
  
  // Calculate the caption styles based on the split-screen mode
  const getCaptionStyles = () => {
    const baseStyles = {
      position: 'absolute' as const,
      left: '50%',
      transform: 'translateX(-50%)',
      width: '80%',
      textAlign: 'center' as const,
      color: 'yellow',
      fontSize: 32,
      fontWeight: 'bold' as const,
      padding: '10px',
      borderRadius: '15px',
      zIndex: 30, // Above everything else
      lineHeight: '1.4'
    };

    if (isSplitScreenMode) {
      return {
        ...baseStyles,
        top: '50%',
        bottom: 'auto'
      };
    } else {
      return {
        ...baseStyles,
        top: 'auto',
        bottom: '10%'
      };
    }
  };
  
  return (
    <AbsoluteFill style={{ backgroundColor: '#000000' }}>
      {/* Background color - ensures no black screen ever appears */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: '#111', // Dark gray background as fallback
        zIndex: 1, // Below everything else
      }} />
      
      {/* Images - display only when no lipsync is showing in fullscreen mode */}
      {currentImage && shouldShowImage && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          // In split-screen mode, images take top half; otherwise, full screen
          height: isSplitScreenMode ? '50%' : '100%',
          overflow: 'hidden',
          zIndex: 5, // Lower than lipsync
        }}>
          <img 
            src={currentImage} 
            style={{
              objectFit: 'cover',
              width: '100%',
              height: '100%',
              transform: `scale(${zoomScale})`,
              transformOrigin: 'center center',
            }}
            alt="Scene"
          />
        </div>
      )}
      
      {/* Lipsync video for split-screen mode (first 5 seconds) */}
      {lipsyncUrl && isSplitScreenMode && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: 0,
          width: '100%',
          height: '50%',
          overflow: 'hidden',
          backgroundColor: 'transparent', // Changed from black to transparent
          zIndex: 10, // Ensure it appears above the image but below captions
        }}>
          <video
            ref={splitScreenVideoRef}
            src={lipsyncUrl}
            playsInline
            autoPlay={true}
            muted // Mute the video as we'll use our own audio track
            loop={false}
            style={{
              position: 'absolute',
              top: 0,
              left: '50%',
              transform: 'translateX(-50%)',
              height: '100%', // Full height
              width: 'auto', // Auto width to maintain aspect ratio
              minWidth: '100%', // Ensure it's at least full width
              objectFit: 'cover', // Cover to ensure no empty space
              objectPosition: 'center top', // Center horizontally, align to top vertically
              display: 'block', // Ensure proper rendering
            }}
            onLoadedData={() => setSplitScreenVideoReady(true)}
          />
        </div>
      )}
      
      {/* Fullscreen lipsync video - only shown when shouldShowLipsyncFullscreen is true */}
      {lipsyncUrl && isLipsyncFullscreen && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          overflow: 'hidden',
          backgroundColor: 'transparent', // Changed from black to transparent
          zIndex: 20, // Higher than images
        }}>
          <video
            ref={fullscreenVideoRef}
            src={lipsyncUrl}
            playsInline
            autoPlay={true}
            muted // Mute the video as we'll use our own audio track
            loop={false}
            style={{
              position: 'absolute',
              top: 0,
              left: '50%',
              transform: 'translateX(-50%)',
              height: '100%', // Full height
              width: 'auto', // Auto width to maintain aspect ratio
              minWidth: '100%', // Ensure it's at least full width
              objectFit: 'cover', // Cover to ensure no empty space
              objectPosition: 'center top', // Center horizontally, align to top vertically
              display: 'block', // Ensure proper rendering
              backgroundColor: 'transparent', // Ensure video background is transparent
            }}
            onLoadedData={() => setFullscreenVideoReady(true)}
          />
        </div>
      )}
      
      {/* Captions - positioned based on current mode */}
      {captionContent && (
        <div 
          style={getCaptionStyles()}
          dangerouslySetInnerHTML={{ __html: captionContent }}
        />
      )}
      
      {/* Audio track for the whole video */}
      {audioUrl && (
        <Audio 
          src={audioUrl} 
          volume={1}
          startFrom={0}
          endAt={audioDuration * fps}
        />
      )}
    </AbsoluteFill>
  );
}