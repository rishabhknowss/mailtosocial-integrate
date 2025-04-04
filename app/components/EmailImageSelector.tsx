// components/EmailImageSelector.tsx
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Email } from './EmailDisplay';
import { FaImage, FaSpinner, FaExclamationTriangle } from 'react-icons/fa';
import Image from 'next/image';

interface EmailImageSelectorProps {
  selectedEmail: Email | null;
  onImageSelect: (imageUrl: string, imageFile: File) => void;
  selectedImage: string | null;
}

export default function EmailImageSelector({ 
  selectedEmail, 
  onImageSelect, 
  selectedImage 
}: EmailImageSelectorProps) {
  const [extractedImages, setExtractedImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageErrors, setImageErrors] = useState<Record<string, string>>({});
  
  useEffect(() => {
    if (!selectedEmail) {
      setExtractedImages([]);
      return;
    }
    
    const extractImagesFromHTML = (html: string) => {
      setLoading(true);
      setError(null);
      setImageErrors({});
      
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
                console.warn('Invalid image URL:', src , e);
              }
            }
          }
        });
        
        console.log(`Found ${imageUrls.length} valid images in email`);
        setExtractedImages(imageUrls);
      } catch (err) {
        console.error('Error extracting images:', err);
        setError('Failed to extract images from email');
      } finally {
        setLoading(false);
      }
    };
    
    if (selectedEmail.body) {
      extractImagesFromHTML(selectedEmail.body);
    } else {
      setExtractedImages([]);
    }
  }, [selectedEmail]);
  
  const fetchImageAsFile = async (imageUrl: string) => {
    try {
      console.log('Fetching image:', imageUrl);
      setLoading(true);
      
      // For images from the email, we need to proxy them through our backend
      // to avoid CORS issues and to get the file object
      const proxyUrl = '/api/proxy-image?url=' + encodeURIComponent(imageUrl);
      const response = await fetch(proxyUrl);
      
      if (!response.ok) {
        console.error('Failed to fetch image:', response.status, response.statusText);
        throw new Error('Failed to fetch image');
      }
      
      // Get the content type
      const contentType = response.headers.get('content-type');
      console.log('Image content type:', contentType);
      
      if (!contentType || !contentType.startsWith('image/')) {
        throw new Error('Invalid image format');
      }
      
      const blob = await response.blob();
      console.log('Image blob size:', blob.size);
      
      if (blob.size === 0) {
        throw new Error('Empty image file');
      }
      
      // Generate a filename from the URL
      const filename = imageUrl.split('/').pop() || 'image.jpg';
      const fileExtension = filename.split('.').pop()?.toLowerCase() || 'jpg';
      
      // Validate file extension
      const validExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
      if (!validExtensions.includes(fileExtension)) {
        throw new Error('Unsupported image format');
      }
      
      // Create a File object
      const file = new File([blob], filename, { 
        type: contentType 
      });
      
      console.log('Created file:', file.name, file.type, file.size);
      
      return file;
    } catch (error) {
      console.error('Error fetching image as file:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };
  
  const handleImageClick = async (imageUrl: string) => {
    // Clear previous error for this image
    setImageErrors(prev => {
      const newErrors = {...prev};
      delete newErrors[imageUrl];
      return newErrors;
    });
    
    try {
      setLoading(true);
      const imageFile = await fetchImageAsFile(imageUrl);
      onImageSelect(imageUrl, imageFile);
    } catch (error) {
      console.error('Failed to process image:', error);
      
      // Set error for this specific image
      setImageErrors(prev => ({
        ...prev,
        [imageUrl]: error instanceof Error ? error.message : 'Failed to process image'
      }));
      
    } finally {
      setLoading(false);
    }
  };
  
  if (!selectedEmail) {
    return null;
  }
  
  return (
    <div className="mb-4 border border-[#2c2e36] rounded-lg overflow-hidden">
      <div className="bg-[#23262d] p-3 border-b border-[#2c2e36]">
        <h3 className="text-white text-sm font-medium flex items-center">
          <FaImage className="mr-2" />
          Email Images
        </h3>
      </div>
      
      <div className="p-3">
        {loading ? (
          <div className="flex justify-center items-center py-8">
            <FaSpinner className="animate-spin text-[#0077B5] text-2xl" />
          </div>
        ) : error ? (
          <div className="text-red-500 text-center py-4 text-sm">{error}</div>
        ) : extractedImages.length === 0 ? (
          <div className="text-gray-400 text-center py-4 text-sm">No images found in this email</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {extractedImages.map((imgSrc, index) => (
              <motion.div
                key={index}
                className={`relative rounded overflow-hidden border-2 cursor-pointer aspect-square
                  ${selectedImage === imgSrc 
                    ? 'border-[#0077B5]' 
                    : imageErrors[imgSrc]
                      ? 'border-red-500'
                      : 'border-transparent hover:border-gray-500'}`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleImageClick(imgSrc)}
              >
                {imageErrors[imgSrc] ? (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-[#1b1d23] p-2">
                    <FaExclamationTriangle className="text-red-500 text-xl mb-2" />
                    <p className="text-xs text-red-400 text-center">
                      {imageErrors[imgSrc]}
                    </p>
                  </div>
                ) : (
                  <Image 
                    src={imgSrc}
                    alt={`Image ${index + 1}`}
                    width={500}
                    height={500}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                )}
                
                {selectedImage === imgSrc && !imageErrors[imgSrc] && (
                  <div className="absolute top-1 right-1 bg-[#0077B5] rounded-full p-1">
                    <svg 
                      xmlns="http://www.w3.org/2000/svg" 
                      viewBox="0 0 24 24" 
                      fill="white" 
                      className="w-3 h-3"
                    >
                      <path 
                        fillRule="evenodd" 
                        d="M19.916 4.626a.75.75 0 01.208 1.04l-9 13.5a.75.75 0 01-1.154.114l-6-6a.75.75 0 011.06-1.06l5.353 5.353 8.493-12.739a.75.75 0 011.04-.208z" 
                        clipRule="evenodd" 
                      />
                    </svg>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}