"use client";
import { useState, useEffect } from 'react';
import { FaGlobe, FaCheck, FaExternalLinkAlt } from 'react-icons/fa';
import { motion } from 'framer-motion';
import Image from 'next/image';

interface UrlContentDisplayProps {
  urlContent: {
    title: string;
    content: string;
    images: string[];
    url: string;
    description?: string;
    author?: string;
    date?: string;
    cleanHtml?: string; // HTML content with preserved structure
  } | null;
  onImageSelect: (imageUrl: string) => void;
  selectedImageUrl: string | null;
}

export default function UrlContentDisplay({ 
  urlContent, 
  onImageSelect,
  selectedImageUrl 
}: UrlContentDisplayProps) {
  const [expanded, setExpanded] = useState(false);
  const [sanitizedHtml, setSanitizedHtml] = useState<string>('');
  const [showTextOnly, setShowTextOnly] = useState(false);

  // Sanitize HTML to remove problematic elements
  useEffect(() => {
    if (urlContent?.cleanHtml) {
      try {
        // If text-only mode is enabled, just use the plain text content
        if (showTextOnly) {
          setSanitizedHtml(`<p>${urlContent.content}</p>`);
          return;
        }

        // Use regex to remove the problematic fixed elements
        let cleanedHtml = urlContent.cleanHtml || '';
        
        // Target fixed position elements that cause overlay issues
        cleanedHtml = cleanedHtml.replace(
          /<div[^>]*class="fixed[^"]*"[\s\S]*?<\/div><\/div><\/div><\/div><\/div>/gi, 
          ''
        );
        
        // Create a DOM parser
        const parser = new DOMParser();
        const doc = parser.parseFromString(cleanedHtml, 'text/html');
        
        // Remove potential navigation, headers, footers, etc.
        const elementsToRemove = [
          // Navigation, headers, footers
          'nav', 'header', 'footer', 
          
          // Class-based selectors with wildcards
          '[class*="nav"]', '[class*="menu"]', '[class*="header"]', '[class*="footer"]',
          '[class*="fixed"]', '[class*="sticky"]', '[class*="absolute"]',
          '[class*="z-"]', // Tailwind z-index classes
          '[class*="grid-cols"]', // Grid layouts
          
          // ID-based selectors
          '[id*="nav"]', '[id*="menu"]', '[id*="header"]', '[id*="footer"]',
          
          // Common UI element class names
          '.nav', '.menu', '.navbar', '.navigation', '.top-bar', '.sidebar',
          '.fixed', '.sticky', '.absolute',
          
          // Specific IDs
          '#nav', '#menu', '#navbar', '#navigation', '#top-bar', '#sidebar',
          
          // Interactive elements
          'button', '[role="button"]', '[type="button"]',
          
          // HeadlessUI or Tailwind elements
          '[data-headlessui-state]',
          '.transition-all', '.duration-300', '.ease-in-out',
          
          // Inline styles that could cause overlays
          '[style*="position:fixed"]', '[style*="position: fixed"]',
          '[style*="position:absolute"]', '[style*="position: absolute"]',
          '[style*="position:sticky"]', '[style*="position: sticky"]',
          '[style*="z-index"]'
        ];
        
        elementsToRemove.forEach(selector => {
          try {
            doc.querySelectorAll(selector).forEach(el => {
              el.remove();
            });
          } catch (e) {
            console.warn(`Error removing ${selector}:`, e);
          }
        });
        
        // Additional manual cleanup for specific elements
        try {
          // Remove elements with fixed/absolute positioning or z-index
          doc.querySelectorAll('*').forEach(el => {
            if (el instanceof HTMLElement) {
              const style = window.getComputedStyle(el);
              const position = style.getPropertyValue('position');
              const zIndex = style.getPropertyValue('z-index');
              
              // Check for problematic styles
              if (
                position === 'fixed' || 
                position === 'absolute' || 
                position === 'sticky' ||
                (zIndex !== 'auto' && parseInt(zIndex) > 10)
              ) {
                el.remove();
              }
              
              // Check for tailwind positioning classes in className
              const className = el.className?.toString() || '';
              if (
                className.includes('fixed') || 
                className.includes('absolute') || 
                className.includes('sticky') ||
                className.includes('z-') ||
                className.includes('grid-cols') ||
                className.includes('top-') ||
                className.includes('bottom-') ||
                className.includes('left-') ||
                className.includes('right-')
              ) {
                el.remove();
              }
            }
          });
        } catch (e) {
          console.warn('Error in additional cleanup:', e);
        }
        
        // Get the sanitized HTML content
        const sanitized = doc.body.innerHTML;
        
        // Check if we have content after sanitization
        if (sanitized.trim().length < 50) {
          // If sanitized content is too short, fall back to text only
          setSanitizedHtml(`<p>${urlContent.content}</p>`);
        } else {
          setSanitizedHtml(sanitized);
        }
      } catch (error) {
        console.error('Error sanitizing HTML:', error);
        // Fallback - if there's an error in parsing, use plain text
        setSanitizedHtml(`<p>${urlContent.content}</p>`);
      }
    } else {
      setSanitizedHtml('');
    }
  }, [urlContent?.cleanHtml, urlContent?.content, showTextOnly]);

  if (!urlContent) {
    return null;
  }

  // Truncate content for preview
  const truncatedContent = urlContent.content.length > 300
    ? urlContent.content.slice(0, 300) + '...'
    : urlContent.content;

  // Format the date if available
  const formattedDate = urlContent.date 
    ? new Date(urlContent.date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    : '';

  return (
    <div className="w-full mb-6">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xl font-medium text-white flex items-center">
          <FaGlobe className="mr-2" /> URL Content Preview
        </h3>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowTextOnly(!showTextOnly)}
            className={`px-3 py-1 text-white text-sm rounded transition-colors ${
              showTextOnly 
                ? 'bg-green-600 hover:bg-green-700' 
                : 'bg-slate-700 hover:bg-slate-600'
            }`}
          >
            {showTextOnly ? 'Text Only: ON' : 'Text Only: OFF'}
          </button>
          
          <a 
            href={urlContent.url}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors flex items-center"
          >
            View Original <FaExternalLinkAlt className="ml-2" size={12} />
          </a>
        </div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[#1b1d23] rounded-xl shadow-lg p-4 border border-[#2c2e36]"
      >
        {/* Source Information */}
        <div className="mb-4">
          <a 
            href={urlContent.url} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="text-lg font-medium text-blue-400 hover:text-blue-300 transition-colors flex items-center"
          >
            {urlContent.title}
            <FaExternalLinkAlt className="ml-2 text-sm" />
          </a>
          
          <div className="text-sm text-gray-400 mt-1">
            {urlContent.author && (
              <span className="mr-3">By: {urlContent.author}</span>
            )}
            {formattedDate && (
              <span>Published: {formattedDate}</span>
            )}
          </div>
          
          {urlContent.description && (
            <div className="text-gray-300 text-sm mt-2 italic">
              {urlContent.description}
            </div>
          )}
        </div>
        
        {/* Content Display */}
        <div className="mb-4">
          <div className="text-white">
            <h4 className="text-sm font-medium mb-2 text-gray-400">
              {showTextOnly ? 'Plain Text Content:' : 'Extracted Content:'}
            </h4>
            
            {/* Content container with isolation properties */}
            <div 
              className="bg-white text-black p-4 rounded-md overflow-hidden isolate" 
              style={{ 
                maxHeight: expanded ? "none" : "500px", 
                overflow: expanded ? "visible" : "auto",
                isolation: "isolate",
                position: "relative", 
                zIndex: 1
              }}
            >
              {/* This extra wrapper provides additional isolation */}
              <div className="relative" style={{ zIndex: 1 }}>
                {sanitizedHtml ? (
                  <div 
                    className="article-content prose max-w-none"
                    dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
                  />
                ) : (
                  <div className="prose max-w-none">
                    {/* Main content with images interspersed */}
                    {urlContent.images.length > 0 && (
                      <div className="mb-4 float-right ml-4" style={{ maxWidth: "40%" }}>
                        <Image 
                          unoptimized
                          src={urlContent.images[0]}
                          alt={urlContent.title}
                          width={500}
                          height={300}
                          className="rounded-md"
                          loading="lazy"
                          onClick={() => onImageSelect(urlContent.images[0])}
                          style={{ cursor: "pointer" }}
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      </div>
                    )}
                    
                    <div>
                      {expanded ? urlContent.content : truncatedContent}
                      {!expanded && urlContent.content.length > 300 && (
                        <button 
                          onClick={() => setExpanded(true)}
                          className="text-blue-600 hover:text-blue-800 font-medium ml-1"
                        >
                          Read more
                        </button>
                      )}
                    </div>
                    
                    {/* Additional images */}
                    {urlContent.images.length > 1 && (
                      <div className="mt-4 grid grid-cols-2 gap-3">
                        {urlContent.images.slice(1, 5).map((imageUrl, index) => (
                          <div
                            key={index}
                            className={`relative rounded overflow-hidden border-2 cursor-pointer ${
                              selectedImageUrl === imageUrl 
                                ? 'border-[#0077B5]' 
                                : 'border-gray-200 hover:border-gray-400'
                            }`}
                            onClick={() => onImageSelect(imageUrl)}
                          >
                            <Image 
                              unoptimized
                              src={imageUrl}
                              alt={`Image ${index + 2}`}
                              width={300}
                              height={200}
                              className="w-full h-full object-cover"
                              loading="lazy"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                            {selectedImageUrl === imageUrl && (
                              <div className="absolute top-2 right-2 bg-[#0077B5] rounded-full p-1">
                                <FaCheck className="text-white text-xs" />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              {/* Read more button */}
              {!expanded && (
                <div className="text-center mt-4">
                  <button 
                    onClick={() => setExpanded(true)}
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                  >
                    Show Full Content
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* View Original Link - Bottom */}
        <div className="text-center mt-2">
          <a 
            href={urlContent.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-300 transition-colors inline-flex items-center"
          >
            View original page <FaExternalLinkAlt className="ml-2" size={12} />
          </a>
        </div>
      </motion.div>
    </div>
  );
} 