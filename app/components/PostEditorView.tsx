// components/PostEditorView.tsx
"use client";
import { FC, useState, useEffect } from "react";
import { FaArrowLeft, FaPaperPlane, FaSpinner, FaCheck, FaImage, FaTimes, FaCalendarAlt, FaGlobe, FaLink, FaImages } from "react-icons/fa";
import { Post } from "../types/types";
import { Linkedin, X, ImageIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { SchedulePostModal } from "./SchedulePostModal";
import Image from 'next/image';

interface PostEditorViewProps {
  post: Post;
  onPost: (postId: string, content: string, mediaFile?: File) => void;
  onBack: () => void;
}

// Image Selection Modal Component
const ImageSelectionModal: FC<{
  isOpen: boolean;
  onClose: () => void;
  sourceImages: string[];
  generatedImages: {url: string, label: string}[];
  onSelectImage: (imageUrl: string, isGenerated?: boolean) => void;
  selectedImageUrl: string | null;
  isLoading: boolean;
}> = ({ isOpen, onClose, sourceImages, generatedImages, onSelectImage, selectedImageUrl, isLoading }) => {
  const [activeTab, setActiveTab] = useState<'source' | 'generated'>(
    generatedImages.length > 0 ? 'generated' : 'source'
  );

  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75">
      <div className="bg-[#1b1d23] rounded-xl shadow-xl w-full max-w-4xl max-h-[80vh] overflow-hidden">
        <div className="p-4 flex justify-between items-center border-b border-gray-700">
          <h2 className="text-xl font-bold text-white">Select Image</h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            <FaTimes size={20} />
          </button>
        </div>
        
        {/* Tabs */}
        <div className="flex border-b border-gray-700">
          {sourceImages.length > 0 && (
            <button 
              className={`flex items-center px-4 py-2 ${activeTab === 'source' 
                ? 'text-white border-b-2 border-[#0077B5]' 
                : 'text-gray-400 hover:text-white'}`}
              onClick={() => setActiveTab('source')}
            >
              <FaGlobe className="mr-2" />
              Source Images ({sourceImages.length})
            </button>
          )}
          {generatedImages.length > 0 && (
            <button 
              className={`flex items-center px-4 py-2 ${activeTab === 'generated' 
                ? 'text-white border-b-2 border-[#0077B5]' 
                : 'text-gray-400 hover:text-white'}`}
              onClick={() => setActiveTab('generated')}
            >
              <ImageIcon className="mr-2" size={16} />
              AI Generated Images ({generatedImages.length})
            </button>
          )}
        </div>
        
        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(80vh-120px)]">
          {activeTab === 'source' && sourceImages.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-3">
              {sourceImages.map((imageUrl, index) => (
                <motion.div
                  key={index}
                  className={`relative rounded overflow-hidden border-2 cursor-pointer 
                    aspect-square ${selectedImageUrl === imageUrl 
                      ? 'border-[#0077B5]' 
                      : 'border-transparent hover:border-gray-500'}`}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => onSelectImage(imageUrl)}
                >
                  <div className="w-full h-full flex items-center justify-center bg-gray-800">
                    <Image
                      unoptimized
                      src={imageUrl}
                      alt={`Image ${index + 1}`}
                      width={200}
                      height={200}
                      className="max-w-full max-h-full object-contain"
                      loading="lazy"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                  {selectedImageUrl === imageUrl && (
                    <div className="absolute top-2 right-2 bg-[#0077B5] rounded-full p-1">
                      <FaCheck className="text-white text-xs" />
                    </div>
                  )}
                  {isLoading && selectedImageUrl === imageUrl && (
                    <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                      <FaSpinner className="animate-spin text-white text-xl" />
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          )}
          
          {activeTab === 'generated' && generatedImages.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {generatedImages.map((image, index) => (
                <motion.div
                  key={`gen-${index}`}
                  className={`relative rounded overflow-hidden border-2 cursor-pointer 
                    aspect-square ${selectedImageUrl === image.url 
                      ? 'border-[#0077B5]' 
                      : 'border-transparent hover:border-gray-500'}`}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => onSelectImage(image.url, true)}
                >
                  <div className="w-full h-full flex items-center justify-center bg-gray-800">
                    <Image
                      unoptimized
                      src={image.url}
                      alt={`Generated ${image.label}`}
                      width={250}
                      height={250}
                      className="max-w-full max-h-full object-contain"
                      loading="lazy"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-70 text-white text-xs p-2 text-center">
                    {image.label}
                  </div>
                  {selectedImageUrl === image.url && (
                    <div className="absolute top-2 right-2 bg-[#0077B5] rounded-full p-1">
                      <FaCheck className="text-white text-xs" />
                    </div>
                  )}
                  {isLoading && selectedImageUrl === image.url && (
                    <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                      <FaSpinner className="animate-spin text-white text-xl" />
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          )}
          
          {activeTab === 'source' && sourceImages.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              No source images available
            </div>
          )}
          
          {activeTab === 'generated' && generatedImages.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              No AI generated images available
            </div>
          )}
        </div>
        
        <div className="p-4 border-t border-gray-700 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-[#0077B5] text-white rounded hover:bg-[#005a87] transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export const PostEditorView: FC<PostEditorViewProps> = ({
  post,
  onPost,
  onBack,
}) => {
  const [content, setContent] = useState(post.editedContent || post.content);
  const [username, setUsername] = useState<string>("@username");
  const [isLoading, setIsLoading] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [isPosted, setIsPosted] = useState(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sourceEmailLoading, setSourceEmailLoading] = useState(false);
  const [availableImages, setAvailableImages] = useState<string[]>([]);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<{url: string, label: string}[]>([]);
  const [showImageModal, setShowImageModal] = useState(false);

  // If post has a generated image, use it initially
  useEffect(() => {
    if (post.generatedImage) {
      // Convert base64 to a URL for preview
      const imageUrl = `data:image/png;base64,${post.generatedImage}`;
      setSelectedImageUrl(imageUrl);
      
      // Also convert to a file for posting
      fetch(imageUrl)
        .then(res => res.blob())
        .then(blob => {
          const file = new File([blob], `${post.imageStyle || 'generated'}-image.png`, { type: 'image/png' });
          setSelectedImageFile(file);
        })
        .catch(err => console.error('Error converting generated image to file:', err));
      
      // Add this image to the generated images list
      setGeneratedImages(prev => [
        ...prev, 
        {
          url: imageUrl,
          label: `${post.imageStyle || 'AI'} (Current Post)`
        }
      ]);
    }
  }, [post.generatedImage, post.imageStyle]);

  // Load all related AI-generated images from other variants
  useEffect(() => {
    const loadAllGeneratedImages = async () => {
      try {
        // Get all generated posts from localStorage
        const storedPosts = localStorage.getItem('generatedPosts');
        if (!storedPosts) return;
        
        const posts = JSON.parse(storedPosts) as Post[];
        const variants = posts.filter(p => 
          // Find posts that have the same source but are different variants
          ((post.emailId && p.emailId === post.emailId) || 
           (post.urlSource && p.urlSource?.url === post.urlSource?.url)) &&
          p.id !== post.id && // Not the current post
          p.generatedImage // Has an image
        );
        
        // Add each variant's generated image to our list
        const newImages = variants.map(p => ({
          url: `data:image/png;base64,${p.generatedImage}`,
          label: `${p.imageStyle || 'AI'} (${p.variant})`
        }));
        
        setGeneratedImages(prev => [...prev, ...newImages]);
      } catch (error) {
        console.error("Error loading related generated images:", error);
      }
    };
    
    loadAllGeneratedImages();
  }, [post.emailId, post.urlSource, post.id]);

  // Fetch email content if we have an email ID
  useEffect(() => {
    if (!post.emailId) return;
    
    const fetchSourceEmail = async () => {
      setSourceEmailLoading(true);
      try {
        // Fetch the email that was used to create this post
        const response = await fetch(`/api/accounts/google/email/${post.emailId}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch source email');
        }
        
        const emailData = await response.json();
        
        // Extract images from the email html
        if (emailData.body) {
          extractImagesFromHTML(emailData.body);
        }
      } catch (error) {
        console.error("Error fetching source email:", error);
      } finally {
        setSourceEmailLoading(false);
      }
    };
    
    const extractImagesFromHTML = (html: string) => {
      try {
        // Create a temporary DOM element to parse the HTML
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        // Find all image elements
        const imageElements = doc.querySelectorAll('img');
        const imageUrls: string[] = [];
        
        imageElements.forEach(img => {
          const src = img.getAttribute('src');
          if (src && !src.startsWith('cid:') && !src.startsWith('data:image/png;base64,iVBORw0KAg')) { 
            // Filter out embedded images with cid: and simple transparent/tracking pixels
            if (
              !src.includes('transparent.gif') && 
              !src.includes('tracking.gif') && 
              !src.includes('spacer.gif') &&
              !src.includes('pixel.gif')
            ) {
              // Check if it's a valid URL
              try {
                new URL(src);
                imageUrls.push(src);
              } catch (e) {
                console.warn('Invalid image URL:', src, e);
              }
            }
          }
        });
        
        console.log(`Found ${imageUrls.length} valid images in email`);
        setAvailableImages(imageUrls);
      } catch (err) {
        console.error('Error extracting images:', err);
      }
    };
    
    fetchSourceEmail();
  }, [post.emailId]);

  // UseEffect to load URL content images if available
  useEffect(() => {
    if (post.urlSource) {
      // If the post has URL source, set the available images
      const urlImages = post.urlSource.images || [];
      setAvailableImages(urlImages);
    }
  }, [post.urlSource]);

  useEffect(() => {
    const fetchUsername = async () => {
      setIsLoading(true);
      try {
        const endpoint = post.platform === "twitter" 
          ? "/api/accounts/twitter/status" 
          : "/api/accounts/linkedin/status";
        
        const response = await fetch(endpoint);
        if (response.ok) {
          const data = await response.json();
          if (post.platform === "twitter" && data.connected && data.username) {
            setUsername(`@${data.username}`);
          } else if (post.platform === "linkedin" && data.connected && data.profileName) {
            setUsername(data.profileName);
          }
        }
      } catch (error) {
        console.error("Error fetching username:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUsername();
  }, [post.platform]);

  const handlePost = async () => {
    setIsPosting(true);
    setIsPosted(false);
    setError(null);
    
    try {
      // Directly submit to API using FormData when we have an image
      if (selectedImageFile) {
        console.log('Submitting with image, creating FormData');
        
        const endpoint = post.platform === "twitter" 
          ? "/api/accounts/twitter/post" 
          : "/api/accounts/linkedin/post";
        
        const formData = new FormData();
        formData.append('text', content);
        formData.append('media', selectedImageFile);
        
        console.log('FormData entries:');
        for (const [key, value] of formData.entries()) {
          if (value instanceof File) {
            console.log(`- ${key}: File (name=${value.name}, type=${value.type}, size=${value.size} bytes)`);
          } else {
            console.log(`- ${key}: ${value.substring(0, 30)}`);
          }
        }
        
        console.log('Sending FormData POST request to', endpoint);
        const response = await fetch(endpoint, {
          method: 'POST',
          body: formData,
          // Important: Don't set Content-Type - browser will set it with boundary
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Failed to post content' }));
          throw new Error(errorData.error || 'Server error');
        }
        
        const data = await response.json();
        console.log('Post success response:', data);
        
      } else {
        // Use the callback for text-only posts
        await onPost(post.id, content);
      }
      
      setIsPosted(true);
      
      // Reset the posted state after 3 seconds
      setTimeout(() => {
        setIsPosted(false);
      }, 3000);
    } catch (error) {
      console.error("Error posting:", error);
      setError(error instanceof Error ? error.message : 'Failed to post');
    } finally {
      setIsPosting(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError('Only image files are supported');
        return;
      }
      
      // Create an object URL for preview
      const imageUrl = URL.createObjectURL(file);
      setSelectedImageUrl(imageUrl);
      setSelectedImageFile(file);
      setError(null);
    }
  };

  const handleImageSelection = async (imageUrl: string, isGenerated = false) => {
    setError(null);
    try {
      setIsLoading(true);
      
      if (isGenerated) {
        // Handle generated image (already a data URL)
        const response = await fetch(imageUrl);
        if (!response.ok) throw new Error('Failed to load image');
        
        const blob = await response.blob();
        const imageStyle = imageUrl.includes('illustration') ? 'illustration' : 
                          imageUrl.includes('meme') ? 'meme' : 
                          imageUrl.includes('infographic') ? 'infographic' : 'generated';
        
        const file = new File([blob], `${imageStyle}-image.png`, { type: 'image/png' });
        
        setSelectedImageUrl(imageUrl);
        setSelectedImageFile(file);
      } else {
        // Handle source image (URL)
        const response = await fetch(`/api/proxy-image?url=${encodeURIComponent(imageUrl)}`);
        if (!response.ok) throw new Error('Failed to fetch image');
        
        const blob = await response.blob();
        const filename = imageUrl.split('/').pop() || 'image.jpg';
        const file = new File([blob], filename, { type: blob.type });
        
        setSelectedImageUrl(imageUrl);
        setSelectedImageFile(file);
      }
    } catch (error) {
      console.error('Error selecting image:', error);
      setError('Failed to prepare image');
    } finally {
      setIsLoading(false);
      // Close the modal after successful selection
      setShowImageModal(false);
    }
  };

  const clearSelectedImage = () => {
    setSelectedImageUrl(null);
    setSelectedImageFile(null);
  };

  // Count available images
  const totalImagesCount = availableImages.length + generatedImages.length;

  // Determine button text and icon based on state
  const getButtonContent = () => {
    if (isPosting) {
      return (
        <>
          <FaSpinner className="mr-2 animate-spin" size={14} />
          Posting...
        </>
      );
    } else if (isPosted) {
      return (
        <>
          <FaCheck className="mr-2" size={14} />
          Posted!
        </>
      );
    } else {
      return (
        <>
          <FaPaperPlane className="mr-2" size={14} />
          Post
        </>
      );
    }
  };

  return (
    <div className="min-h-screen mt-20 py-12 px-4 sm:px-6 lg:px-40 ">
      <div className="max-w-4xl mx-auto">
        <button
          onClick={onBack}
          className="cursor-pointer flex items-center text-white hover:text-gray-300 transition-colors mb-6 focus:outline-none"
        >
          <FaArrowLeft className="mr-2" size={16} />
          <span className="text-sm font-medium">Go Back</span>
        </button>

        <div className="bg-[#1b1d23] rounded-xl shadow-lg overflow-hidden">
          <div className="p-6">
            <div className="flex items-center mb-4">
              {post.platform === "twitter" ? (
                <X className="text-white mr-2" size={20} />
              ) : (
                <Linkedin className="text-[#0077B5] mr-2" size={20} />
              )}
              <h2 className="text-2xl font-bold text-white">
                {post.platform === "twitter" ? "X Post" : "LinkedIn Post"}
              </h2>
              
              {post.imageStyle && (
                <div className="ml-auto bg-slate-700 text-xs text-white py-1 px-2 rounded">
                  {post.imageStyle} image
                </div>
              )}
            </div>
            
            {/* Content source info */}
            <div className="mb-4">
              {post.emailId && (
                <div className="flex items-center text-gray-400 text-sm mb-2">
                  <FaImage className="mr-2" size={14} />
                  <span>Created from email content</span>
                </div>
              )}
              {post.urlSource && (
                <div className="flex items-center text-gray-400 text-sm mb-2">
                  <FaGlobe className="mr-2" size={14} />
                  <a 
                    href={post.urlSource.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="hover:text-blue-400 transition-colors flex items-center"
                  >
                    <span>Source: {post.urlSource.title}</span>
                    <FaLink className="ml-1" size={10} />
                  </a>
                </div>
              )}
            </div>

            <div className="mt-4 mb-2">
              <div className="flex items-center">
                <div className="w-12 h-12 rounded-full bg-[#2c2e36] flex items-center justify-center overflow-hidden mr-3">
                  {post.platform === "twitter" ? (
                    <X className="text-white" size={20} />
                  ) : (
                    <Linkedin className="text-[#0077B5]" size={20} />
                  )}
                </div>
                <div>
                  <div className="font-bold text-white">
                    {post.platform === "twitter" ? "X Account" : "LinkedIn"}
                  </div>
                  <div className="text-gray-400 text-sm">{username}</div>
                </div>
              </div>
            </div>

            <div className="mt-4">
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={`What do you want to share on ${
                  post.platform === "twitter" ? "X" : "LinkedIn"
                }?`}
                className="w-full p-4 bg-[#2c2e36] text-white rounded-lg border-0 focus:ring-2 focus:ring-[#0077B5] focus:outline-none resize-none"
                rows={6}
                maxLength={post.platform === "twitter" ? 280 : 3000}
              />
              <div className="text-right text-gray-400 text-sm mt-1">
                {post.platform === "twitter" && (
                  <span>{content.length} / 280 characters</span>
                )}
              </div>
            </div>

            {/* Media Selection */}
            <div className="mt-6">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-white font-medium">Post Image</h3>
                
                {totalImagesCount > 0 && (
                  <button
                    onClick={() => setShowImageModal(true)}
                    className="flex items-center text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    <FaImages className="mr-1" size={14} />
                    <span className="text-sm">Browse Images ({totalImagesCount})</span>
                  </button>
                )}
              </div>
              
              {!selectedImageUrl ? (
                <div className="grid grid-cols-1 gap-4">
                  <div className="cursor-pointer flex flex-col items-center justify-center border-2 border-dashed border-gray-600 rounded-lg p-6 transition-colors hover:border-[#0077B5]">
                    <label className="cursor-pointer flex flex-col items-center justify-center w-full">
                      <FaImage className="text-gray-400 mb-2" size={24} />
                      <span className="text-gray-400 text-sm text-center mb-3">
                        Upload from device
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                      <button
                        onClick={() => setShowImageModal(true)}
                        className={`px-4 py-2 text-sm text-white rounded-lg transition-colors ${
                          totalImagesCount > 0 
                            ? 'bg-[#0077B5] hover:bg-[#005a87]' 
                            : 'bg-gray-600 cursor-not-allowed'
                        }`}
                        disabled={totalImagesCount === 0}
                      >
                        {sourceEmailLoading ? (
                          <>
                            <FaSpinner className="animate-spin inline mr-2" size={12} />
                            Loading Images...
                          </>
                        ) : (
                          <>Browse Available Images</>
                        )}
                      </button>
                    </label>
                  </div>
                </div>
              ) : (
                <div className="relative w-full rounded-lg overflow-hidden bg-[#2c2e36] p-2">
                  <div className="relative aspect-video sm:aspect-auto sm:h-64 overflow-hidden rounded">
                    <Image
                      unoptimized
                      src={selectedImageUrl}
                      alt="Selected media"
                      width={500}
                      height={500}
                      className="w-full h-full object-contain"
                    />
                    <button
                      onClick={clearSelectedImage}
                      className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600 focus:outline-none"
                    >
                      <FaTimes size={14} />
                    </button>
                    
                    <button
                      onClick={() => setShowImageModal(true)}
                      className="absolute bottom-2 right-2 bg-[#0077B5] text-white px-2 py-1 rounded text-xs hover:bg-[#005a87] focus:outline-none flex items-center"
                      disabled={totalImagesCount === 0}
                    >
                      <FaImages className="mr-1" size={10} />
                      Change
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Error message */}
            {error && (
              <div className="mt-4 p-3 bg-red-900/30 border border-red-900 rounded-md text-red-200 text-sm">
                {error}
              </div>
            )}

            {/* Action Buttons */}
            <div className="mt-6 flex justify-between">
              <button
                onClick={() => setShowScheduleModal(true)}
                disabled={isPosting || isPosted}
                className="px-6 py-2 text-white bg-[#2c2e36] hover:bg-[#3c3e46] rounded-lg transition-colors flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FaCalendarAlt className="mr-2" size={14} />
                Schedule
              </button>

              <button
                onClick={handlePost}
                disabled={isPosting || isPosted || !content.trim()}
                className={`px-6 py-2 text-white rounded-lg transition-colors flex items-center disabled:opacity-50 disabled:cursor-not-allowed ${
                  isPosted
                    ? "bg-green-600"
                    : "bg-[#0077B5] hover:bg-[#005a87]"
                }`}
              >
                {getButtonContent()}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Image Selection Modal */}
      <AnimatePresence>
        {showImageModal && (
          <ImageSelectionModal
            isOpen={showImageModal}
            onClose={() => setShowImageModal(false)}
            sourceImages={availableImages}
            generatedImages={generatedImages}
            onSelectImage={handleImageSelection}
            selectedImageUrl={selectedImageUrl}
            isLoading={isLoading}
          />
        )}
      </AnimatePresence>

      {showScheduleModal && (
        <SchedulePostModal
          post={post}
          content={content}
          mediaFile={selectedImageFile}
          isOpen={showScheduleModal}
          onClose={() => setShowScheduleModal(false)}
        />
      )}
    </div>
  );
};