"use client";
import { FC, useState, useEffect } from 'react';
import { Email, UrlContent } from '../types/types';
import { ToneSelector } from './ToneSelector';
import { PlatformSelector } from './PlatformSelector';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import EmailDisplay from './EmailDisplay';
import PricingModal from '../pricing/page';
import UrlContentFetcher from './UrlContentFetcher';
import UrlContentDisplay from './UrlContentDisplay';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { FaToggleOn, FaToggleOff, FaGlobe } from 'react-icons/fa';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { motion } from 'framer-motion';

interface PostCreatorProps {
  selectedEmail: Email | null;
  selectedTone: string;
  selectedPlatform: 'linkedin' | 'twitter';
  generatingPost: boolean;
  onEmailSelect: (email: Email) => void;
  onSelectTone: (tone: string) => void;
  onSelectPlatform: (platform: 'linkedin' | 'twitter') => void;
  onGeneratePost: () => void;
  urlContent?: UrlContent | null;
  onUrlContentFetched?: (content: UrlContent) => void;
}

export const PostCreator: FC<PostCreatorProps> = ({
  selectedEmail,
  selectedTone,
  selectedPlatform,
  generatingPost,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onEmailSelect,
  onSelectTone,
  onSelectPlatform,
  onGeneratePost,
  urlContent,
  onUrlContentFetched
}) => {
  const [hasSubscription, setHasSubscription] = useState(false);
  const [checkingSubscription, setCheckingSubscription] = useState(false);
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [selectedUrlImage, setSelectedUrlImage] = useState<string | null>(null);
  const [contentMode, setContentMode] = useState<'url' | 'email'>('url');
  const [urlPreviewExpanded, setUrlPreviewExpanded] = useState(false);

  useEffect(() => {
    const checkSubscription = async () => {
      try {
        const response = await fetch('/api/payments/check-subscription');
        const data = await response.json();
        setHasSubscription(data.hasAccess);
      } catch (error) {
        console.error('Error checking subscription:', error);
      } finally {
        setCheckingSubscription(false);
      }
    };

    checkSubscription();
  }, []);

  const handleGenerateClick = () => {
    if (!hasSubscription) {
      setShowPricingModal(true);
    } else {
      if (contentMode === 'email' && !selectedEmail) {
        alert('Please select an email first');
        return;
      }
      
      if (contentMode === 'url' && !urlContent) {
        alert('Please enter a URL first');
        return;
      }
      
      onGeneratePost();
    }
  };

  const handleUrlContentFetched = (content: UrlContent) => {
    if (onUrlContentFetched) {
      onUrlContentFetched(content);
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleModeToggle = () => {
    setContentMode(contentMode === 'email' ? 'url' : 'email');
  };

  const handleUrlImageSelect = (imageUrl: string) => {
    setSelectedUrlImage(imageUrl);
  };

  return (
    <div className="p-6 w-full ml-5">
      <h2 className="text-4xl font-semibold mb-4 text-white">Create Post</h2>
      
      {/* Content Source Toggle */}
      <div className="mb-6">
        <div className="main-container flex w-[167px] pt-[4px] pr-[4px] pb-[4px] pl-[4px] gap-[4px] items-center flex-nowrap bg-[rgba(255,255,255,0.14)] rounded-[8px] relative my-0">
          <div className="flex w-[82px] pt-[8px] pr-[8px] pb-[8px] pl-[8px] gap-[8px] justify-center items-center shrink-0 flex-nowrap bg-[rgba(255,255,255,0.02)] rounded-[8px] relative overflow-hidden">
            {/* <div className="w-[16px] h-[16px] shrink-0 relative z-[1]">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M8 0C3.6 0 0 3.6 0 8C0 12.4 3.6 16 8 16C12.4 16 16 12.4 16 8C16 3.6 12.4 0 8 0ZM11.4 12L8 9.8L4.6 12L5.6 8.2L2.6 5.8H6.6L8 2L9.4 5.8H13.4L10.4 8.2L11.4 12Z" fill="#8c8a94"/>
              </svg>
            </div> */}
            <span className="h-[16px] shrink-0 basis-auto text-[12px] font-semibold leading-[16px] text-[#8c8a94] relative text-left overflow-hidden whitespace-nowrap z-[2]">
              Emails
            </span>
          </div>
          <div className="flex w-[73px] pt-[8px] pr-[8px] pb-[8px] pl-[8px] gap-[8px] justify-center items-center shrink-0 flex-nowrap bg-[rgba(255,255,255,0.7)] rounded-[8px] relative overflow-hidden z-[3]">
            {/* <div className="w-[16px] h-[16px] shrink-0 relative z-[4]">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M14 3.5V12.5C14 13.3284 13.3284 14 12.5 14H3.5C2.67157 14 2 13.3284 2 12.5V3.5C2 2.67157 2.67157 2 3.5 2H12.5C13.3284 2 14 2.67157 14 3.5Z" stroke="black" strokeWidth="1.5"/>
                <path d="M6.5 5.5V10.5L10.5 8L6.5 5.5Z" fill="black"/>
              </svg>
            </div> */}
            <span className="h-[16px] shrink-0 basis-auto text-[12px] font-semibold leading-[16px] text-[#000] relative text-left overflow-hidden whitespace-nowrap z-[5]">
              URL
            </span>
          </div>
        </div>
      </div>
      
      {/* Content Source (Always URL now) */}
      <div className="mb-6 w-full">
        <UrlContentFetcher onContentFetched={handleUrlContentFetched} />
        {urlContent && (
          <div className="mt-4">
            <div 
              className="bg-[rgba(255,255,255,0.04)] rounded-lg p-4 cursor-pointer"
              onClick={() => setUrlPreviewExpanded(!urlPreviewExpanded)}
            >
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <FaGlobe className="text-gray-400 mr-2" />
                  <h3 className="text-white font-medium">
                    {urlContent.title || 'URL Content'}
                    {urlContent.images && urlContent.images.length > 0 && 
                      <span className="ml-2 text-xs text-gray-400">({urlContent.images.length} images)</span>
                    }
                  </h3>
                </div>
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  className={`h-5 w-5 text-gray-400 transform transition-transform duration-200 ${urlPreviewExpanded ? 'rotate-180' : ''}`} 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
              {!urlPreviewExpanded && (
                <div className="mt-2 text-gray-400 text-sm truncate">
                  {urlContent.description || urlContent.content.substring(0, 100) + '...'}
                </div>
              )}
            </div>
            
            {urlPreviewExpanded && (
              <div className="mt-2 transition-all duration-300">
                <UrlContentDisplay 
                  urlContent={urlContent} 
                  onImageSelect={handleUrlImageSelect}
                  selectedImageUrl={selectedUrlImage}
                />
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Tone Selection */}
      <div className="w-full">
        <ToneSelector 
          selectedTone={selectedTone} 
          onSelectTone={onSelectTone} 
        />
      </div>
      
      {/* Platform Selection */}
      <div className="w-full">
        <PlatformSelector 
          selectedPlatform={selectedPlatform} 
          onSelectPlatform={onSelectPlatform} 
        />
      </div>
      
      {/* Generate Button */}
      <button
        onClick={handleGenerateClick}
        disabled={
          !urlContent || 
          generatingPost || 
          checkingSubscription
        }
        className="w-full cursor-pointer py-3 bg-[rgba(255,255,255,0.08)] text-[#d9d8dc] rounded-lg font-semibold hover:bg-[rgba(255,255,255,0.12)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {checkingSubscription 
          ? "Checking subscription..." 
          : generatingPost 
            ? "Generating Variants..." 
            : !hasSubscription 
              ? "Subscribe to Generate Posts" 
              : "Generate Post Variants"}
      </button>

      {!hasSubscription && !checkingSubscription && (
        <p className="mt-2 text-sm text-center text-gray-400">
          You need an active subscription to generate posts.
          <button 
            onClick={() => setShowPricingModal(true)}
            className="text-blue-400 hover:text-blue-300 ml-1"
          >
            View pricing plans
          </button>
        </p>
      )}

      {showPricingModal && (
        <PricingModal />
      )}
    </div>
  );
};