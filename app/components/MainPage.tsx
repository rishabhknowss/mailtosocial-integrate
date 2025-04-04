// app/components/MainPageSimplified.tsx
"use client";

import { useState, useEffect } from "react";
import { PostCreator } from "./PostCreator";
import { GeneratePosts } from "./GeneratedPosts";
import { PostEditorView } from "./PostEditorView";
import { Email, Post, UrlContent } from "../types/types";
import { Sidebar } from "./Sidebar";
import { VideoIcon, FileTextIcon } from "lucide-react";
import { ToneSelector } from "./ToneSelector";
import UrlContentFetcher from "./UrlContentFetcher";

// Helper function to safely interact with localStorage
const getLocalStorageItem = <T,>(key: string, defaultValue: T): T => {
  if (typeof window === 'undefined') return defaultValue;
  
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.error(`Error reading ${key} from localStorage:`, error);
    return defaultValue;
  }
};

const setLocalStorageItem = <T,>(key: string, value: T): void => {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Error saving ${key} to localStorage:`, error);
  }
};

// Helper to clear all app state (for debugging)
const clearAllStoredState = (): void => {
  if (typeof window === 'undefined') return;
  
  const keys = [
    'selectedEmail',
    'urlContent',
    'contentMode',
    'selectedTone',
    'selectedPlatform',
    'generatedPosts',
    'editingPost',
    'viewMode'
  ];
  
  keys.forEach(key => {
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
if (typeof window !== 'undefined') {
  window.clearMailToSocialState = clearAllStoredState;
}

// Video content UI component
const VideoContentView = ({ 
  selectedTone, 
  onSelectTone,
  urlContent,
  onUrlContentFetched
}: { 
  selectedTone: string; 
  onSelectTone: (tone: string) => void;
  urlContent: UrlContent | null;
  onUrlContentFetched: (content: UrlContent) => void;
}) => {
  const [videoFiles, setVideoFiles] = useState<File[]>([]);
  const [audioFiles, setAudioFiles] = useState<File[]>([]);
  const [videoPreviewUrls, setVideoPreviewUrls] = useState<string[]>([]);
  const [audioPreviewUrls, setAudioPreviewUrls] = useState<string[]>([]);
  const [generatedScript, setGeneratedScript] = useState<string>("");
  const [isGeneratingScript, setIsGeneratingScript] = useState<boolean>(false);
  const [isUrlContentExpanded, setIsUrlContentExpanded] = useState<boolean>(false);
  const [isScriptModalOpen, setIsScriptModalOpen] = useState<boolean>(false);
  const [editedScript, setEditedScript] = useState<string>("");

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const newFiles = [...videoFiles, file];
      setVideoFiles(newFiles);
      
      const newPreviewUrl = URL.createObjectURL(file);
      setVideoPreviewUrls([...videoPreviewUrls, newPreviewUrl]);
    }
  };

  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const newFiles = [...audioFiles, file];
      setAudioFiles(newFiles);
      
      const newPreviewUrl = URL.createObjectURL(file);
      setAudioPreviewUrls([...audioPreviewUrls, newPreviewUrl]);
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
      const response = await fetch('/api/ai/generate-video-script', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: urlContent.title,
          content: urlContent.content,
          description: urlContent.description,
          tone: selectedTone,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate video script');
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
      videoPreviewUrls.forEach(url => URL.revokeObjectURL(url));
      audioPreviewUrls.forEach(url => URL.revokeObjectURL(url));
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

  return (
    <div className="main-container flex w-full md:w-[527px] flex-col gap-[24px] items-start flex-nowrap relative mx-auto my-0 p-6">
      <h2 className="text-4xl font-semibold mb-4 text-white">Create Video</h2>
      
      {/* URL Content Fetcher - Collapsible */}
      <div className="mb-6 w-full">
        <div className="mb-2 w-full bg-[rgba(255,255,255,0.04)] rounded-lg p-4">
          <div 
            className="flex justify-between items-center cursor-pointer"
            onClick={toggleUrlContent}
          >
            <h3 className="text-xl font-medium text-white flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              URL Content
              {urlContent && <span className="ml-2 text-sm text-green-400">(Content fetched)</span>}
            </h3>
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className={`h-5 w-5 transition-transform duration-300 ${isUrlContentExpanded ? 'transform rotate-180' : ''}`} 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
          
          {/* Collapsible content */}
          <div 
            className={`transition-all duration-300 overflow-hidden ${
              isUrlContentExpanded ? 'max-h-[1000px] opacity-100 mt-4' : 'max-h-0 opacity-0'
            }`}
          >
            <UrlContentFetcher onContentFetched={onUrlContentFetched} />
            
            {urlContent && (
              <div className="mt-4 p-4 bg-[rgba(0,0,0,0.2)] rounded-lg">
                <h4 className="text-white font-medium mb-2">{urlContent.title}</h4>
                <p className="text-gray-300 text-sm mb-2">{urlContent.description || 'No description available'}</p>
                <div className="text-gray-400 text-xs">
                  {urlContent.content.substring(0, 150)}...
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Video Script Section - Collapsible */}
      <div className="h-auto self-stretch shrink-0 relative overflow-hidden w-full">
        <div className="flex w-full pt-[12px] pr-[12px] pb-[12px] pl-[12px] flex-col gap-[8px] bg-[rgba(255,255,255,0.04)] rounded-[8px] relative overflow-hidden mt-0 mr-0 mb-0 ml-0">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <span className="font-['Manrope'] text-[16px] font-bold leading-[24px] text-[#ececed]">
                Video Script
              </span>
              {generatedScript && <span className="ml-2 text-xs text-green-400">(Script generated)</span>}
            </div>
            <div className="flex items-center gap-2">
              {isGeneratingScript && (
                <div className="text-white text-xs animate-pulse">Generating script...</div>
              )}
              <button 
                onClick={generateVideoScript}
                disabled={!urlContent || isGeneratingScript}
                className="flex py-[8px] px-[8px] gap-[8px] justify-center items-center shrink-0 flex-nowrap bg-[rgba(255,255,255,0.1)] rounded-[8px] relative overflow-hidden cursor-pointer hover:bg-[rgba(255,255,255,0.15)] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="h-[16px] shrink-0 basis-auto font-['Manrope'] text-[12px] font-semibold leading-[16px] text-[#fff] relative text-left overflow-hidden whitespace-nowrap">
                  Regenerate
                </span>
              </button>
              {generatedScript && (
                <button 
                  onClick={openScriptModal}
                  className="flex py-[8px] px-[8px] gap-[8px] justify-center items-center shrink-0 flex-nowrap bg-[rgba(255,255,255,0.1)] rounded-[8px] relative overflow-hidden cursor-pointer hover:bg-[rgba(255,255,255,0.15)]"
                >
                  <span className="h-[16px] shrink-0 basis-auto font-['Manrope'] text-[12px] font-semibold leading-[16px] text-[#fff] relative text-left overflow-hidden whitespace-nowrap">
                    View/Edit
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Script Edit Modal */}
      {isScriptModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70">
          <div className="bg-[#1b1d23] rounded-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex justify-between items-center p-4 border-b border-[#2c2e36]">
              <h3 className="text-white text-lg font-semibold">Edit Video Script</h3>
              <button 
                onClick={() => setIsScriptModalOpen(false)} 
                className="text-gray-400 hover:text-white"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4 overflow-y-auto flex-grow">
              <textarea 
                value={editedScript} 
                onChange={(e) => setEditedScript(e.target.value)}
                className="w-full h-[60vh] bg-[#2c2e36] text-white p-4 rounded-lg font-mono text-sm resize-none outline-none focus:ring-2 focus:ring-[#0077B5]"
              />
            </div>
            <div className="flex justify-end gap-2 p-4 border-t border-[#2c2e36]">
              <button 
                onClick={() => setIsScriptModalOpen(false)} 
                className="px-4 py-2 bg-[#3c3e46] text-white rounded-lg hover:bg-[#4c4e56]"
              >
                Cancel
              </button>
              <button 
                onClick={saveScript} 
                className="px-4 py-2 bg-[#0077B5] text-white rounded-lg hover:bg-[#006195]"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Tone Selection - Reused from PostCreator */}
      <div className="w-full mt-6">
        <ToneSelector 
          selectedTone={selectedTone} 
          onSelectTone={(tone) => {
            onSelectTone(tone);
            // Regenerate script when tone changes if we have URL content
            if (urlContent) {
              setTimeout(() => generateVideoScript(), 100);
            }
          }} 
        />
      </div>
      
      {/* Video Upload Section */}
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
            <div key={index} className="relative w-[103.178px] h-[103.178px] shrink-0 rounded-lg overflow-hidden">
              <video 
                src={url} 
                className="w-full h-full object-cover"
                controls
              />
              <button 
                onClick={() => removeVideo(index)}
                className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full z-20 w-6 h-6 flex items-center justify-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
          
          {/* Upload button (only show if fewer than 3 videos) */}
          {videoFiles.length < 3 && (
            <label className="w-[103.178px] h-[103.178px] shrink-0 rounded-lg flex flex-col items-center justify-center bg-[rgba(255,255,255,0.04)] cursor-pointer hover:bg-[rgba(255,255,255,0.08)]">
              <div className="w-[46.414px] h-[46.414px] flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
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
      
      {/* Audio Upload / Voice Training Section */}
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
            <div key={index} className="relative w-[103.178px] h-[103.178px] shrink-0 flex flex-col items-center justify-center bg-[rgba(255,255,255,0.04)] rounded-lg overflow-hidden p-2">
              <div className="w-10 h-10 mb-2 text-blue-400">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-full w-full" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              </div>
              <audio 
                src={url} 
                className="w-full" 
                controls
              />
              <button 
                onClick={() => removeAudio(index)}
                className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full z-20 w-6 h-6 flex items-center justify-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
          
          {/* Upload button (only show if fewer than 3 audio files) */}
          {audioFiles.length < 3 && (
            <label className="w-[103.178px] h-[103.178px] shrink-0 rounded-lg flex flex-col items-center justify-center bg-[rgba(255,255,255,0.04)] cursor-pointer hover:bg-[rgba(255,255,255,0.08)]">
              <div className="w-[46.414px] h-[46.414px] flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
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
      
      {/* Generate Button - Similar to the one in PostCreator */}
      <div className="mt-8 w-full">
        <button
          className="w-full sm:w-auto py-3 px-8 text-white font-medium text-lg rounded-lg bg-[#0077B5] hover:bg-[#006195] transition-colors flex items-center justify-center gap-2"
          disabled={!generatedScript || isGeneratingScript}
        >
          <VideoIcon size={20} />
          Generate Video
        </button>
      </div>
    </div>
  );
};

// Video preview component for right side
const VideoPreview = () => {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center">
      <div className="w-full max-w-3xl aspect-video bg-gray-800 rounded-lg overflow-hidden mb-6 relative">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-gray-400 text-center">
            <VideoIcon size={48} className="mx-auto mb-4 opacity-40" />
            <p className="text-lg">Video preview will appear here</p>
            <p className="text-sm opacity-60 mt-2">Video generation is in progress</p>
          </div>
        </div>
      </div>
      
      <div className="w-full max-w-3xl bg-[#1b1d23] rounded-xl shadow-lg p-4 border border-[#2c2e36]">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-white text-lg font-medium">Generated Video</h3>
          <div className="flex gap-2">
            <button className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors flex items-center">
              Download
            </button>
            <button className="px-3 py-1 bg-[#2c2e36] hover:bg-[#3c3e46] text-white text-sm rounded transition-colors flex items-center">
              Share
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-3 gap-3 mt-4">
          <div className="aspect-video bg-gray-700 rounded-md"></div>
          <div className="aspect-video bg-gray-700 rounded-md"></div>
          <div className="aspect-video bg-gray-700 rounded-md"></div>
        </div>
      </div>
    </div>
  );
};

export default function MainPageSimplified() {
 
  // State for email selection
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(() => 
    getLocalStorageItem<Email | null>('selectedEmail', null)
  );
  
  // State for URL content
  const [urlContent, setUrlContent] = useState<UrlContent | null>(() => 
    getLocalStorageItem<UrlContent | null>('urlContent', null)
  );
  
  // State for content mode
  const [contentMode, setContentMode] = useState<'email' | 'url'>(() => 
    getLocalStorageItem<'email' | 'url'>('contentMode', 'email')
  );
  
  // State for view mode (text or video)
  const [viewMode, setViewMode] = useState<'text' | 'video'>(() => 
    getLocalStorageItem<'text' | 'video'>('viewMode', 'text')
  );
  
  // State for tones and platforms
  const [selectedTone, setSelectedTone] = useState<string>(() => 
    getLocalStorageItem<string>('selectedTone', "professional")
  );
  const [selectedPlatform, setSelectedPlatform] = useState<'linkedin' | 'twitter'>(() => 
    getLocalStorageItem<'linkedin' | 'twitter'>('selectedPlatform', 'linkedin')
  );
  
  // State for generated posts
  const [generatingPost, setGeneratingPost] = useState(false);
  const [generatedPosts, setGeneratedPosts] = useState<Post[]>(() => 
    getLocalStorageItem<Post[]>('generatedPosts', [])
  );
  
  // State for editing mode
  const [editingPost, setEditingPost] = useState<Post | null>(() => 
    getLocalStorageItem<Post | null>('editingPost', null)
  );
  
  // Mock account data
  const [twitterAccount] = useState<{ connected: boolean }>({ connected: true });
  const [linkedinAccount] = useState<{ connected: boolean }>({ connected: true });

  // Persist state to localStorage when it changes
  useEffect(() => {
    setLocalStorageItem<Email | null>('selectedEmail', selectedEmail);
  }, [selectedEmail]);

  useEffect(() => {
    setLocalStorageItem<UrlContent | null>('urlContent', urlContent);
  }, [urlContent]);

  useEffect(() => {
    setLocalStorageItem<'email' | 'url'>('contentMode', contentMode);
  }, [contentMode]);

  useEffect(() => {
    setLocalStorageItem<string>('selectedTone', selectedTone);
  }, [selectedTone]);

  useEffect(() => {
    setLocalStorageItem<'linkedin' | 'twitter'>('selectedPlatform', selectedPlatform);
  }, [selectedPlatform]);

  useEffect(() => {
    setLocalStorageItem<Post[]>('generatedPosts', generatedPosts);
  }, [generatedPosts]);

  useEffect(() => {
    setLocalStorageItem<Post | null>('editingPost', editingPost);
  }, [editingPost]);
  
  useEffect(() => {
    setLocalStorageItem<'text' | 'video'>('viewMode', viewMode);
  }, [viewMode]);

  // Handle selecting an email
  const handleSelectEmail = (email: Email) => {
    setSelectedEmail(email);
    setContentMode('email');
  };

  // Handle URL content fetched
  const handleUrlContentFetched = (content: UrlContent) => {
    setUrlContent(content);
    setContentMode('url');
    // Clear any previously selected email
    setSelectedEmail(null);
  };

  // Handle selecting tone
  const handleSelectTone = (tone: string) => {
    setSelectedTone(tone);
  };

  // Handle selecting platform
  const handleSelectPlatform = (platform: 'linkedin' | 'twitter') => {
    setSelectedPlatform(platform);
  };
  
  // Handle toggling view mode
  const handleViewModeChange = (mode: 'text' | 'video') => {
    setViewMode(mode);
  };

  // Handle generating post variants
  const handleGeneratePost = async () => {
    // Check if we have a content source
    if (contentMode === 'email' && !selectedEmail) {
      alert("Please select an email first");
      return;
    }
    
    if (contentMode === 'url' && !urlContent) {
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
          platform: 'linkedin' | 'twitter';
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
          maxLength: selectedPlatform === 'twitter' ? 280 : 1000,
          variant: variants[i],
        };
        
        // Add the appropriate content source
        if (contentMode === 'email' && selectedEmail) {
          requestBody.emailContent = {
            subject: selectedEmail.subject,
            body: selectedEmail.body || selectedEmail.snippet,
            from: selectedEmail.from,
            date: selectedEmail.date,
          };
        } else if (contentMode === 'url' && urlContent) {
          requestBody.urlContent = urlContent;
        }
        
        const response = await fetch('/api/ai/generate-post', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
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
          imageStyle: imageStyles[i] as 'illustration' | 'meme' | 'infographic'
        };
        
        // Add source info
        if (contentMode === 'email' && selectedEmail) {
          newPost.emailId = selectedEmail.id;
        } else if (contentMode === 'url' && urlContent) {
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
              console.log(`Retrying image generation for post ${postsWithImages[i].id} (attempt ${retryCount + 1}/3)`);
              await new Promise(resolve => setTimeout(resolve, 1500));
            }
            
            // Generate image for this post
            const imageResponse = await fetch('/api/ai/generate-image', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                postContent: postsWithImages[i].content,
                platform: postsWithImages[i].platform,
                style: postsWithImages[i].imageStyle
              }),
            });
            
            if (imageResponse.ok) {
              const imageData = await imageResponse.json();
              if (imageData.image) {
                postsWithImages[i] = { ...postsWithImages[i], generatedImage: imageData.image };
                // Update the posts after each successful image generation to show progress
                setGeneratedPosts([...postsWithImages]);
                success = true;
              } else {
                // Log when image data is missing
                console.error(`Image generation failed for post ${postsWithImages[i].id}: No image data returned`);
                retryCount++;
              }
            } else {
              // Log detailed error response
              const errorText = await imageResponse.text();
              console.error(`Image generation failed for post ${postsWithImages[i].id} with status ${imageResponse.status}: ${errorText}`);
              retryCount++;
            }
          } catch (error) {
            // Log detailed error information
            console.error(`Error generating image for post ${postsWithImages[i].id} (attempt ${retryCount + 1}/3):`, error);
            retryCount++;
          }
        }
        
        if (!success) {
          console.error(`Failed to generate image for post ${postsWithImages[i].id} after 3 attempts`);
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
  const handlePostContent = async (postId: string, content: string, mediaFile?: File) => {
    const post = generatedPosts.find(p => p.id === postId);
    
    if (!post) return;
    
    try {
      if (post.platform === 'twitter' && twitterAccount.connected) {
        // For Twitter, use the media file if provided
        if (mediaFile) {
          const formData = new FormData();
          formData.append('text', content);
          formData.append('media', mediaFile);
          
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
      
      if (post.platform === 'linkedin' && linkedinAccount.connected) {
        // For LinkedIn, use the media file if provided
        if (mediaFile) {
          const formData = new FormData();
          formData.append('text', content);
          formData.append('media', mediaFile);
          
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
      
      alert(`Successfully posted to ${post.platform.charAt(0).toUpperCase() + post.platform.slice(1)}!`);
      // Go back to grid after posting
      handleBackToGrid();
    } catch (error) {
      console.error(`Error posting to ${post.platform}:`, error);
      alert(`Failed to post to ${post.platform}. Please try again.`);
    }
  };

  return (
    <div className="min-h-screen">
      <Sidebar/>
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
                onClick={() => handleViewModeChange('text')}
                className={`flex items-center gap-2 px-4 py-2 rounded-full transition-colors ${
                  viewMode === 'text' 
                    ? 'bg-[#0077B5] text-white' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <FileTextIcon size={16} />
                <span>Text</span>
              </button>
              <button
                onClick={() => handleViewModeChange('video')}
                className={`flex items-center gap-2 px-4 py-2 rounded-full transition-colors ${
                  viewMode === 'video' 
                    ? 'bg-[#0077B5] text-white' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <VideoIcon size={16} />
                <span>Video</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 mt-4 gap-4 sm:gap-6 lg:gap-8">
            {/* Left Column - Content Creation */}
            {viewMode === 'text' ? (
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
              />
            )}
            
            {/* Right Column - Generated Content */}
            {viewMode === 'text' ? (
              <GeneratePosts
                posts={generatedPosts}
                onSelectPost={handleSelectPost}
              />
            ) : (
              <VideoPreview />
            )}
          </div>
        </div>
      )}
    </div>
  );
}