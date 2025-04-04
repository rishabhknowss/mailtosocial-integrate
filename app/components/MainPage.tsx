// app/components/MainPageSimplified.tsx
"use client";

import { useState, useEffect } from "react";
import { PostCreator } from "./PostCreator";
import { GeneratePosts } from "./GeneratedPosts";
import { PostEditorView } from "./PostEditorView";
import { Email, Post, UrlContent } from "../types/types";
import { Sidebar } from "./Sidebar";
import { VideoIcon, FileTextIcon } from "lucide-react";
import UrlContentFetcher from "./UrlContentFetcher";
import { useSession } from "next-auth/react";
import PlayerDialog from "@/app/remotion/[id]/PlayerDialog";

// Helper function to safely interact with localStorage
const getLocalStorageItem = <T,>(key: string, defaultValue: T): T => {
  if (typeof window === "undefined") return defaultValue;

  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.error(`Error reading ${key} from localStorage:`, error);
    return defaultValue;
  }
};

const setLocalStorageItem = <T,>(key: string, value: T): void => {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Error saving ${key} to localStorage:`, error);
  }
};

// Helper to clear all app state (for debugging)
const clearAllStoredState = (): void => {
  if (typeof window === "undefined") return;

  const keys = [
    "selectedEmail",
    "urlContent",
    "contentMode",
    "selectedTone",
    "selectedPlatform",
    "generatedPosts",
    "editingPost",
    "viewMode",
  ];

  keys.forEach((key) => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error(`Error removing ${key} from localStorage:`, error);
    }
  });

  // Force a page reload to reset all state
  window.location.reload();
};

// Extend Window interface
declare global {
  interface Window {
    clearMailToSocialState: () => void;
  }
}

// Add this to window for debugging (access from console)
if (typeof window !== "undefined") {
  window.clearMailToSocialState = clearAllStoredState;
}

// Video content UI component
const VideoContentView = ({
  selectedTone,
  onSelectTone,
  urlContent,
  onUrlContentFetched,
  currentProjectId,
  generatedVideoUrl,
  setCurrentProjectId,
  setGeneratedVideoUrl,
}: {
  selectedTone: string;
  onSelectTone: (tone: string) => void;
  urlContent: UrlContent | null;
  onUrlContentFetched: (content: UrlContent) => void;
  currentProjectId: number | undefined;
  generatedVideoUrl: string;
  setCurrentProjectId: React.Dispatch<React.SetStateAction<number | undefined>>;
  setGeneratedVideoUrl: React.Dispatch<React.SetStateAction<string>>;
}) => {
  const { data: session } = useSession();
  const [videoFiles, setVideoFiles] = useState<File[]>([]);
  const [audioFiles, setAudioFiles] = useState<File[]>([]);
  const [videoPreviewUrls, setVideoPreviewUrls] = useState<string[]>([]);
  const [audioPreviewUrls, setAudioPreviewUrls] = useState<string[]>([]);
  const [generatedScript, setGeneratedScript] = useState<string>("");
  const [isGeneratingScript, setIsGeneratingScript] = useState<boolean>(false);
  const [isUrlContentExpanded, setIsUrlContentExpanded] =
    useState<boolean>(false);
  const [isScriptModalOpen, setIsScriptModalOpen] = useState<boolean>(false);
  const [editedScript, setEditedScript] = useState<string>("");
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isTrainingVoice, setIsTrainingVoice] = useState<boolean>(false);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState<boolean>(false);
  const [generationProgress, setGenerationProgress] = useState<string>("");

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Add video dimension validation
      const video = document.createElement('video');
      video.preload = 'metadata';
      
      video.onloadedmetadata = async () => {
        // Check video dimensions
        if (video.videoWidth < 360 || video.videoHeight < 360) {
          alert('Video dimensions must be at least 360x360 pixels');
          return;
        }
        
        try {
          setIsUploading(true);
          setUploadProgress(0);
          
          // 1. Get pre-signed URL
          const presignedUrlResponse = await fetch("/api/preSignUrl", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              fileType: file.type,
              fileName: file.name,
              contentType: file.type,
            }),
          });

          if (!presignedUrlResponse.ok) {
            throw new Error("Failed to get pre-signed URL");
          }

          const { url, key } = await presignedUrlResponse.json();
          setUploadProgress(25);

          // 2. Upload to S3
          const uploadResponse = await fetch(url, {
            method: "PUT",
            body: file,
            headers: { "Content-Type": file.type },
          });

          if (!uploadResponse.ok) {
            throw new Error("Failed to upload to S3");
          }
          setUploadProgress(75);

          // 3. Use the full S3 URL from the response instead of constructing it
          const videoUrl = url.split('?')[0]; // Remove query parameters to get the base URL

          // 4. Save URL to database
          const updateResponse = await fetch("/api/user/updateVideo", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ videoUrl }),
          });

          if (!updateResponse.ok) {
            throw new Error("Failed to update video URL in database");
          }

          setUploadProgress(100);

          // Show preview
          const newPreviewUrl = URL.createObjectURL(file);
          setVideoPreviewUrls([...videoPreviewUrls, newPreviewUrl]);
          setVideoFiles([...videoFiles, file]);

          alert("Video uploaded successfully!");

        } catch (error) {
          console.error("Error uploading video:", error);
          alert("Failed to upload video. Please try again.");
        } finally {
          setIsUploading(false);
        }
      };
      
      video.src = URL.createObjectURL(file);
    }
  };

  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      try {
        const audioUrl = await uploadFileToS3(file, "audio");
        const newFiles = [...audioFiles, file];
        setAudioFiles(newFiles);

        const newPreviewUrl = URL.createObjectURL(file);
        setAudioPreviewUrls([...audioPreviewUrls, newPreviewUrl]);

      } catch (error) {
        alert("Failed to upload audio. Please try again.");
      }
    }
  };

  const removeVideo = (index: number) => {
    const newFiles = [...videoFiles];
    newFiles.splice(index, 1);
    setVideoFiles(newFiles);

    const newUrls = [...videoPreviewUrls];
    URL.revokeObjectURL(newUrls[index]);
    newUrls.splice(index, 1);
    setVideoPreviewUrls(newUrls);
  };

  const removeAudio = (index: number) => {
    const newFiles = [...audioFiles];
    newFiles.splice(index, 1);
    setAudioFiles(newFiles);

    const newUrls = [...audioPreviewUrls];
    URL.revokeObjectURL(newUrls[index]);
    newUrls.splice(index, 1);
    setAudioPreviewUrls(newUrls);
  };

  // Generate script based on URL content and selected tone
  const generateVideoScript = async () => {
    if (!urlContent) {
      alert("Please fetch URL content first");
      return;
    }

    setIsGeneratingScript(true);
    try {
      const response = await fetch("/api/ai/generate-video-script", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: urlContent.title,
          content: urlContent.content,
          description: urlContent.description,
          tone: selectedTone,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate video script");
      }

      const data = await response.json();
      setGeneratedScript(data.script);
      setEditedScript(data.script); // Initialize edited script with generated script
    } catch (error) {
      console.error("Error generating video script:", error);
      alert("Failed to generate video script. Please try again.");
    } finally {
      setIsGeneratingScript(false);
    }
  };

  // Generate script when URL content changes
  useEffect(() => {
    if (urlContent) {
      setIsUrlContentExpanded(true); // Expand URL content when new content is fetched
      generateVideoScript();
    }
  }, [urlContent, selectedTone]);

  // Clean up object URLs when component unmounts
  useEffect(() => {
    return () => {
      videoPreviewUrls.forEach((url) => URL.revokeObjectURL(url));
      audioPreviewUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  // Toggle expanded states
  const toggleUrlContent = () => setIsUrlContentExpanded(!isUrlContentExpanded);

  // Open script edit modal
  const openScriptModal = () => {
    setEditedScript(generatedScript);
    setIsScriptModalOpen(true);
  };

  // Save edited script
  const saveScript = () => {
    setGeneratedScript(editedScript);
    setIsScriptModalOpen(false);
  };

  // Add this function to handle file uploads to S3
  const uploadFileToS3 = async (file: File, fileType: "video" | "audio") => {
    try {
      setIsUploading(true);
      setUploadProgress(0);

      // 1. Get pre-signed URL
      const presignedUrlResponse = await fetch("/api/preSignUrl", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fileType: file.type,
          fileName: file.name,
          contentType: file.type,
        }),
      });

      if (!presignedUrlResponse.ok) {
        throw new Error("Failed to get pre-signed URL");
      }

      const { url, key } = await presignedUrlResponse.json();

      // 2. Upload file to S3
      const uploadResponse = await fetch(url, {
        method: "PUT",
        body: file,
        headers: {
          "Content-Type": file.type,
        },
      });

      if (!uploadResponse.ok) {
        throw new Error("Failed to upload file");
      }

      // 3. Construct the S3 URL
      const s3Url = `https://${process.env.NEXT_PUBLIC_S3_BUCKET_NAME}.s3.${
        process.env.NEXT_PUBLIC_AWS_REGION || "us-west-1"
      }.amazonaws.com/${key}`;

      // 4. Update user's video/audio URL
      const updateEndpoint = fileType === "video" ? "updateVideo" : "updateAudio";
      const updateResponse = await fetch(`/api/user/${updateEndpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          [`${fileType}Url`]: s3Url,
        }),
      });

      if (!updateResponse.ok) {
        throw new Error(`Failed to update ${fileType} URL`);
      }

      // 5. If it's audio, initiate voice training
      if (fileType === "audio") {
        setIsTrainingVoice(true);
        const trainResponse = await fetch("/api/audio/train", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            audio: s3Url,
          }),
        });

        if (!trainResponse.ok) {
          throw new Error("Failed to train voice");
        }
        setIsTrainingVoice(false);
      }

      setUploadProgress(100);
      return s3Url;

    } catch (error) {
      console.error(`Error uploading ${fileType}:`, error);
      throw error;
    } finally {
      setIsUploading(false);
    }
  };

  // Add upload progress indicator in the UI
  const renderUploadProgress = () => {
    if (isUploading || isTrainingVoice || isGeneratingVideo) {
      return (
        <div className="fixed bottom-4 right-4 bg-[#1b1d23] p-4 rounded-lg shadow-lg z-50">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span className="text-white">
                {isUploading
                  ? `Uploading: ${uploadProgress}%`
                  : isTrainingVoice
                  ? "Training voice model..."
                  : generationProgress || "Generating video..."}
              </span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  const handleGenerateVideo = async () => {
    if (!urlContent || !generatedScript) {
      alert("Please fetch URL content and generate script first");
      return;
    }

    try {
      setIsGeneratingVideo(true);
      setGenerationProgress("Generating script...");

      // Step 1: Generate script and scenes
      const scriptResponse = await fetch("/api/ai/generate-video-script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: urlContent.title,
          content: urlContent.content,
          description: urlContent.description,
          tone: selectedTone,
        }),
      });

      if (!scriptResponse.ok) {
        throw new Error("Failed to generate script");
      }

      const scriptData = await scriptResponse.json();
      const { projectId, scenes, script } = scriptData;
      setCurrentProjectId(Number(projectId));

      setGenerationProgress("Generating images...");
      // Step 2: Generate images
      const imageResponse = await fetch("/api/images/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });

      if (!imageResponse.ok) {
        throw new Error("Failed to generate images");
      }

      setGenerationProgress("Generating audio...");
      // Step 3: Generate audio
      const audioResponse = await fetch("/api/audio/text-to-speech", {
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

      setGenerationProgress("Generating captions...");
      // Step 4: Generate captions
      const captionsResponse = await fetch("/api/captions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });

      if (!captionsResponse.ok) {
        throw new Error("Failed to generate captions");
      }

      setGenerationProgress("Generating final video...");
      // Step 5: Generate final video
      const videoResponse = await fetch("/api/video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          projectId,
          title: urlContent.title 
        }),
      });

      if (!videoResponse.ok) {
        const errorData = await videoResponse.json();
        throw new Error(errorData.error || "Failed to generate video");
      }

      const videoData = await videoResponse.json();
      setGeneratedVideoUrl(videoData.outputUrl);
      alert("Video generated successfully!");
      
    } catch (error) {
      console.error("Error generating video:", error);
      alert(`Failed to generate video: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setIsGeneratingVideo(false);
      setGenerationProgress("");
    }
  };

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 py-6 max-w-[1920px] mx-auto">
      <div className="grid grid-cols-1">
        {/* Left Column - Content Creation */}
        <div className="flex flex-col gap-6">
          <h2 className="text-4xl font-semibold mb-4 text-white">Create Video</h2>
          
          {/* URL Content Fetcher */}
          <div className="w-full bg-[rgba(255,255,255,0.04)] rounded-lg p-4">
            <div className="mb-6 w-full">
              <div className="mb-2 w-full bg-[rgba(255,255,255,0.04)] rounded-lg p-4">
                <div
                  className="flex justify-between items-center cursor-pointer"
                  onClick={toggleUrlContent}
                >
                  <h3 className="text-xl font-medium text-white flex items-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 mr-2"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    URL Content
                    {urlContent && (
                      <span className="ml-2 text-sm text-green-400">
                        (Content fetched)
                      </span>
                    )}
                  </h3>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className={`h-5 w-5 transition-transform duration-300 ${
                      isUrlContentExpanded ? "transform rotate-180" : ""
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </div>

                {/* Collapsible content */}
                <div
                  className={`transition-all duration-300 overflow-hidden ${
                    isUrlContentExpanded
                      ? "max-h-[1000px] opacity-100 mt-4"
                      : "max-h-0 opacity-0"
                  }`}
                >
                  <UrlContentFetcher onContentFetched={onUrlContentFetched} />

                  {urlContent && (
                    <div className="mt-4 p-4 bg-[rgba(0,0,0,0.2)] rounded-lg">
                      <h4 className="text-white font-medium mb-2">
                        {urlContent.title}
                      </h4>
                      <p className="text-gray-300 text-sm mb-2">
                        {urlContent.description || "No description available"}
                      </p>
                      <div className="text-gray-400 text-xs">
                        {urlContent.content.substring(0, 150)}...
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Video and Audio Upload Section */}
          <div className="w-full bg-[rgba(255,255,255,0.04)] rounded-lg p-4">
            <div className="flex flex-col gap-[16px] items-start self-stretch shrink-0 flex-nowrap relative z-10 w-full">
              <div className="flex justify-between items-center w-full">
                <span className="h-[24px] shrink-0 basis-auto font-['Manrope'] text-[16px] font-semibold leading-[24px] text-[#f8f8f8] relative text-left overflow-hidden whitespace-nowrap z-[11]">
                  Upload Videos
                </span>
                <span className="text-gray-400 text-xs">
                  {videoFiles.length}/3 videos
                </span>
              </div>

              <div className="flex gap-[16px] items-start self-stretch shrink-0 flex-nowrap relative z-[12] flex-wrap">
                {/* Uploaded videos */}
                {videoPreviewUrls.map((url, index) => (
                  <div
                    key={index}
                    className="relative w-[103.178px] h-[103.178px] shrink-0 rounded-lg overflow-hidden"
                  >
                    <video
                      src={url}
                      className="w-full h-full object-cover"
                      controls
                    />
                    <button
                      onClick={() => removeVideo(index)}
                      className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full z-20 w-6 h-6 flex items-center justify-center"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>
                ))}

                {/* Upload button (only show if fewer than 3 videos) */}
                {videoFiles.length < 3 && (
                  <label className="w-[103.178px] h-[103.178px] shrink-0 rounded-lg flex flex-col items-center justify-center bg-[rgba(255,255,255,0.04)] cursor-pointer hover:bg-[rgba(255,255,255,0.08)]">
                    <div className="w-[46.414px] h-[46.414px] flex items-center justify-center">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-10 w-10 text-gray-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                        />
                      </svg>
                    </div>
                    <span className="text-white text-xs mt-2">Upload Video</span>
                    <input
                      type="file"
                      className="hidden"
                      accept="video/*"
                      onChange={handleVideoUpload}
                    />
                  </label>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-[16px] items-start self-stretch shrink-0 flex-nowrap relative z-[18] w-full">
              <div className="flex justify-between items-center w-full">
                <span className="h-[24px] shrink-0 basis-auto font-['Manrope'] text-[16px] font-semibold leading-[24px] text-[#f8f8f8] relative text-left overflow-hidden whitespace-nowrap z-20">
                  Voice Training
                </span>
                <span className="text-gray-400 text-xs">
                  {audioFiles.length}/3 audio files
                </span>
              </div>

              <div className="flex gap-[16px] items-start self-stretch shrink-0 flex-nowrap relative z-[21] flex-wrap">
                {/* Uploaded audio files */}
                {audioPreviewUrls.map((url, index) => (
                  <div
                    key={index}
                    className="relative w-[103.178px] h-[103.178px] shrink-0 flex flex-col items-center justify-center bg-[rgba(255,255,255,0.04)] rounded-lg overflow-hidden p-2"
                  >
                    <div className="w-10 h-10 mb-2 text-blue-400">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-full w-full"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                        />
                      </svg>
                    </div>
                    <audio src={url} className="w-full" controls />
                    <button
                      onClick={() => removeAudio(index)}
                      className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full z-20 w-6 h-6 flex items-center justify-center"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>
                ))}

                {/* Upload button (only show if fewer than 3 audio files) */}
                {audioFiles.length < 3 && (
                  <label className="w-[103.178px] h-[103.178px] shrink-0 rounded-lg flex flex-col items-center justify-center bg-[rgba(255,255,255,0.04)] cursor-pointer hover:bg-[rgba(255,255,255,0.08)]">
                    <div className="w-[46.414px] h-[46.414px] flex items-center justify-center">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-10 w-10 text-gray-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                        />
                      </svg>
                    </div>
                    <span className="text-white text-xs mt-2">Upload Audio</span>
                    <input
                      type="file"
                      className="hidden"
                      accept="audio/*"
                      onChange={handleAudioUpload}
                    />
                  </label>
                )}
              </div>
            </div>
          </div>

          {/* Generate Button */}
          <div className="w-full">
            <button
              className="w-full sm:w-auto py-3 px-8 text-white font-medium text-lg rounded-lg bg-[#0077B5] hover:bg-[#006195] transition-colors flex items-center justify-center gap-2"
              disabled={!generatedScript || isGeneratingVideo}
              onClick={handleGenerateVideo}
            >
              <VideoIcon size={20} />
              {isGeneratingVideo ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Generating Video...
                </div>
              ) : (
                "Generate Video"
              )}
            </button>
          </div>

          {/* Progress Indicator */}
          {renderUploadProgress()}
        </div>

        {/* Right Column - Video Preview */}
       
      </div>
    </div>
  );
};

// Video preview component for right side
const VideoPreview = ({ projectId, generatedVideoUrl }: { projectId?: number; generatedVideoUrl?: string }) => {
  if (!projectId) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[400px] bg-[rgba(255,255,255,0.04)] rounded-lg p-6">
        <VideoIcon size={48} className="text-gray-500 mb-4" />
        <p className="text-gray-400 text-center">
          Generate a video to see the preview here
        </p>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-[rgba(255,255,255,0.04)] rounded-lg overflow-hidden">
      <PlayerDialog id={projectId} />
    </div>
  );
};

export default function MainPageSimplified() {
  // State for email selection
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(() =>
    getLocalStorageItem<Email | null>("selectedEmail", null)
  );

  // State for URL content
  const [urlContent, setUrlContent] = useState<UrlContent | null>(() =>
    getLocalStorageItem<UrlContent | null>("urlContent", null)
  );

  // State for content mode
  const [contentMode, setContentMode] = useState<"email" | "url">(() =>
    getLocalStorageItem<"email" | "url">("contentMode", "email")
  );

  // State for view mode (text or video)
  const [viewMode, setViewMode] = useState<"text" | "video">(() =>
    getLocalStorageItem<"text" | "video">("viewMode", "text")
  );

  // State for tones and platforms
  const [selectedTone, setSelectedTone] = useState<string>(() =>
    getLocalStorageItem<string>("selectedTone", "professional")
  );
  const [selectedPlatform, setSelectedPlatform] = useState<
    "linkedin" | "twitter"
  >(() =>
    getLocalStorageItem<"linkedin" | "twitter">("selectedPlatform", "linkedin")
  );

  // State for generated posts
  const [generatingPost, setGeneratingPost] = useState(false);
  const [generatedPosts, setGeneratedPosts] = useState<Post[]>(() =>
    getLocalStorageItem<Post[]>("generatedPosts", [])
  );

  // State for editing mode
  const [editingPost, setEditingPost] = useState<Post | null>(() =>
    getLocalStorageItem<Post | null>("editingPost", null)
  );

  // Mock account data
  const [twitterAccount] = useState<{ connected: boolean }>({
    connected: true,
  });
  const [linkedinAccount] = useState<{ connected: boolean }>({
    connected: true,
  });

  // State for current project ID and generated video URL
  const [currentProjectId, setCurrentProjectId] = useState<number | undefined>();
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string>("");

  // Persist state to localStorage when it changes
  useEffect(() => {
    setLocalStorageItem<Email | null>("selectedEmail", selectedEmail);
  }, [selectedEmail]);

  useEffect(() => {
    setLocalStorageItem<UrlContent | null>("urlContent", urlContent);
  }, [urlContent]);

  useEffect(() => {
    setLocalStorageItem<"email" | "url">("contentMode", contentMode);
  }, [contentMode]);

  useEffect(() => {
    setLocalStorageItem<string>("selectedTone", selectedTone);
  }, [selectedTone]);

  useEffect(() => {
    setLocalStorageItem<"linkedin" | "twitter">(
      "selectedPlatform",
      selectedPlatform
    );
  }, [selectedPlatform]);

  useEffect(() => {
    setLocalStorageItem<Post[]>("generatedPosts", generatedPosts);
  }, [generatedPosts]);

  useEffect(() => {
    setLocalStorageItem<Post | null>("editingPost", editingPost);
  }, [editingPost]);

  useEffect(() => {
    setLocalStorageItem<"text" | "video">("viewMode", viewMode);
  }, [viewMode]);

  // Handle selecting an email
  const handleSelectEmail = (email: Email) => {
    setSelectedEmail(email);
    setContentMode("email");
  };

  // Handle URL content fetched
  const handleUrlContentFetched = (content: UrlContent) => {
    setUrlContent(content);
    setContentMode("url");
    // Clear any previously selected email
    setSelectedEmail(null);
  };

  // Handle selecting tone
  const handleSelectTone = (tone: string) => {
    setSelectedTone(tone);
  };

  // Handle selecting platform
  const handleSelectPlatform = (platform: "linkedin" | "twitter") => {
    setSelectedPlatform(platform);
  };

  // Handle toggling view mode
  const handleViewModeChange = (mode: "text" | "video") => {
    setViewMode(mode);
  };

  // Handle generating post variants
  const handleGeneratePost = async () => {
    // Check if we have a content source
    if (contentMode === "email" && !selectedEmail) {
      alert("Please select an email first");
      return;
    }

    if (contentMode === "url" && !urlContent) {
      alert("Please enter a URL first");
      return;
    }

    setGeneratingPost(true);
    try {
      // Generate 3 different variants
      const variants = ["concise", "detailed", "engaging"];
      const variantNames = ["Concise", "Detailed", "Engaging"];
      const imageStyles = ["illustration", "meme", "infographic"];

      const newPosts: Post[] = [];

      for (let i = 0; i < variants.length; i++) {
        // Create request body based on content mode
        const requestBody: {
          tone: string;
          platform: "linkedin" | "twitter";
          maxLength: number;
          variant: string;
          emailContent?: {
            subject: string;
            body: string;
            from: string;
            date: string;
          };
          urlContent?: UrlContent;
        } = {
          tone: selectedTone,
          platform: selectedPlatform,
          maxLength: selectedPlatform === "twitter" ? 280 : 1000,
          variant: variants[i],
        };

        // Add the appropriate content source
        if (contentMode === "email" && selectedEmail) {
          requestBody.emailContent = {
            subject: selectedEmail.subject,
            body: selectedEmail.body || selectedEmail.snippet,
            from: selectedEmail.from,
            date: selectedEmail.date,
          };
        } else if (contentMode === "url" && urlContent) {
          requestBody.urlContent = urlContent;
        }

        const response = await fetch("/api/ai/generate-post", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) throw new Error("Failed to generate post");

        const data = await response.json();

        // Add generated post to the list
        const newPost: Post = {
          id: Math.random().toString(36).substr(2, 9),
          content: data.post,
          platform: selectedPlatform,
          date: new Date(),
          variant: variantNames[i],
          isEditing: false,
          editedContent: data.post,
          imageStyle: imageStyles[i] as "illustration" | "meme" | "infographic",
        };

        // Add source info
        if (contentMode === "email" && selectedEmail) {
          newPost.emailId = selectedEmail.id;
        } else if (contentMode === "url" && urlContent) {
          newPost.urlSource = urlContent;
        }

        newPosts.push(newPost);
      }

      // Set the posts first to show something to the user
      setGeneratedPosts(newPosts);

      // Generate images for each post sequentially instead of in parallel
      const postsWithImages = [...newPosts];

      for (let i = 0; i < postsWithImages.length; i++) {
        let retryCount = 0;
        let success = false;

        while (retryCount < 3 && !success) {
          try {
            setGeneratingPost(true); // Keep the generating state active

            // If retrying, add a small delay to avoid rate limiting
            if (retryCount > 0) {
              console.log(
                `Retrying image generation for post ${
                  postsWithImages[i].id
                } (attempt ${retryCount + 1}/3)`
              );
              await new Promise((resolve) => setTimeout(resolve, 1500));
            }

            // Generate image for this post
            const imageResponse = await fetch("/api/ai/generate-image", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                postContent: postsWithImages[i].content,
                platform: postsWithImages[i].platform,
                style: postsWithImages[i].imageStyle,
              }),
            });

            if (imageResponse.ok) {
              const imageData = await imageResponse.json();
              if (imageData.image) {
                postsWithImages[i] = {
                  ...postsWithImages[i],
                  generatedImage: imageData.image,
                };
                // Update the posts after each successful image generation to show progress
                setGeneratedPosts([...postsWithImages]);
                success = true;
              } else {
                // Log when image data is missing
                console.error(
                  `Image generation failed for post ${postsWithImages[i].id}: No image data returned`
                );
                retryCount++;
              }
            } else {
              // Log detailed error response
              const errorText = await imageResponse.text();
              console.error(
                `Image generation failed for post ${postsWithImages[i].id} with status ${imageResponse.status}: ${errorText}`
              );
              retryCount++;
            }
          } catch (error) {
            // Log detailed error information
            console.error(
              `Error generating image for post ${
                postsWithImages[i].id
              } (attempt ${retryCount + 1}/3):`,
              error
            );
            retryCount++;
          }
        }

        if (!success) {
          console.error(
            `Failed to generate image for post ${postsWithImages[i].id} after 3 attempts`
          );
        }
      }

      // Final update with all processed posts
      setGeneratedPosts(postsWithImages);
      setGeneratingPost(false);
    } catch (error) {
      console.error("Error generating post:", error);
      alert("Failed to generate post. Please try again.");
    }
  };

  // Handle selecting a post for editing
  const handleSelectPost = (post: Post) => {
    setEditingPost(post);
  };

  // Handle going back to the post grid
  const handleBackToGrid = () => {
    setEditingPost(null);
  };

  // Handle posting content to selected platform
  const handlePostContent = async (
    postId: string,
    content: string,
    mediaFile?: File
  ) => {
    const post = generatedPosts.find((p) => p.id === postId);

    if (!post) return;

    try {
      if (post.platform === "twitter" && twitterAccount.connected) {
        // For Twitter, use the media file if provided
        if (mediaFile) {
          const formData = new FormData();
          formData.append("text", content);
          formData.append("media", mediaFile);

          await fetch("/api/accounts/twitter/post", {
            method: "POST",
            body: formData,
          });
        } else {
          await fetch("/api/accounts/twitter/post", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ text: content }),
          });
        }
      }

      if (post.platform === "linkedin" && linkedinAccount.connected) {
        // For LinkedIn, use the media file if provided
        if (mediaFile) {
          const formData = new FormData();
          formData.append("text", content);
          formData.append("media", mediaFile);

          await fetch("/api/accounts/linkedin/post", {
            method: "POST",
            body: formData,
          });
        } else {
          await fetch("/api/accounts/linkedin/post", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ text: content }),
          });
        }
      }

      alert(
        `Successfully posted to ${
          post.platform.charAt(0).toUpperCase() + post.platform.slice(1)
        }!`
      );
      // Go back to grid after posting
      handleBackToGrid();
    } catch (error) {
      console.error(`Error posting to ${post.platform}:`, error);
      alert(`Failed to post to ${post.platform}. Please try again.`);
    }
  };

  return (
    <div className="min-h-screen">
      <Sidebar />
      {editingPost ? (
        <PostEditorView
          post={editingPost}
          onPost={handlePostContent}
          onBack={handleBackToGrid}
        />
      ) : (
        <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 py-6 max-w-[1920px] mx-auto">
          {/* View Mode Toggle */}
          <div className="flex justify-center mb-8 mt-16">
            <div className="bg-[#1b1d23] rounded-full p-1 flex shadow-lg">
              <button
                onClick={() => handleViewModeChange("text")}
                className={`flex items-center gap-2 px-4 py-2 rounded-full transition-colors ${
                  viewMode === "text"
                    ? "bg-[#0077B5] text-white"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                <FileTextIcon size={16} />
                <span>Text</span>
              </button>
              <button
                onClick={() => handleViewModeChange("video")}
                className={`flex items-center gap-2 px-4 py-2 rounded-full transition-colors ${
                  viewMode === "video"
                    ? "bg-[#0077B5] text-white"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                <VideoIcon size={16} />
                <span>Video</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 mt-4 gap-4 sm:gap-6 lg:gap-8">
            {/* Left Column - Content Creation */}
            {viewMode === "text" ? (
              <PostCreator
                selectedEmail={selectedEmail}
                selectedTone={selectedTone}
                selectedPlatform={selectedPlatform}
                generatingPost={generatingPost}
                onEmailSelect={handleSelectEmail}
                onSelectTone={handleSelectTone}
                onSelectPlatform={handleSelectPlatform}
                onGeneratePost={handleGeneratePost}
                urlContent={urlContent}
                onUrlContentFetched={handleUrlContentFetched}
              />
            ) : (
              <VideoContentView
                selectedTone={selectedTone}
                onSelectTone={handleSelectTone}
                urlContent={urlContent}
                onUrlContentFetched={handleUrlContentFetched}
                currentProjectId={currentProjectId}
                generatedVideoUrl={generatedVideoUrl}
                setCurrentProjectId={setCurrentProjectId}
                setGeneratedVideoUrl={setGeneratedVideoUrl}
              />
            )}

            {/* Right Column - Generated Content */}
            {viewMode === "text" ? (
              <GeneratePosts
                posts={generatedPosts}
                onSelectPost={handleSelectPost}
              />
            ) : (
              <VideoPreview 
                projectId={currentProjectId} 
                generatedVideoUrl={generatedVideoUrl} 
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
