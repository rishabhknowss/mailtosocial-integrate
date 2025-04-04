"use client";
import { useState, FormEvent } from "react";
import { FaGlobe, FaSpinner, FaTimes, FaCheck } from "react-icons/fa";
import { motion } from "framer-motion";

interface UrlContentFetcherProps {
  onContentFetched: (content: {
    title: string;
    content: string;
    images: string[];
    url: string;
    description?: string;
    author?: string;
    date?: string;
  }) => void;
}

export default function UrlContentFetcher({ onContentFetched }: UrlContentFetcherProps) {
  const [url, setUrl] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  const [showInput, setShowInput] = useState<boolean>(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!url) {
      setError("Please enter a URL");
      return;
    }
    
    try {
      setIsLoading(true);
      setError(null);
      setSuccess(false);
      
      const response = await fetch("/api/fetch-url-content", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch content");
      }
      
      const data = await response.json();
      
      if (!data.content) {
        throw new Error("Could not extract content from the provided URL");
      }
      
      // Show success message briefly
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        // Hide the input after successful fetch
        setShowInput(false);
      }, 1500);
      
      // Call the callback with the fetched data
      onContentFetched(data);
    } catch (error) {
      setError(error instanceof Error ? error.message : "An unknown error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mb-6 w-full">
      <div className="flex items-center mb-2">
        <h3 className="text-xl font-medium text-white flex items-center">
          <FaGlobe className="mr-2" /> URL Content
        </h3>
        {!showInput && (
          <motion.button
            className="ml-4 px-4 py-1 text-sm bg-[rgba(255,255,255,0.1)] text-white rounded-lg hover:bg-[rgba(255,255,255,0.15)]"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowInput(true)}
          >
            Enter URL
          </motion.button>
        )}
      </div>
      
      {showInput && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="bg-[#1b1d23] rounded-xl shadow-lg p-4 border border-[#2c2e36]"
        >
          <form onSubmit={handleSubmit}>
            <div className="flex items-stretch w-full">
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Paste blog URL or newsletter link here"
                className="flex-grow p-3 rounded-l-lg text-white bg-[#2c2e36] border-0 focus:outline-none focus:ring-2 focus:ring-[#0077B5]"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={isLoading}
                className="px-4 rounded-r-lg bg-[#0077B5] text-white hover:bg-[#00669e] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[100px]"
              >
                {isLoading ? (
                  <FaSpinner className="animate-spin" />
                ) : success ? (
                  <FaCheck />
                ) : (
                  "Fetch"
                )}
              </button>
              
              {showInput && (
                <button
                  type="button"
                  className="ml-2 p-3 rounded-lg bg-[#2c2e36] text-white hover:bg-[#3c3e46]"
                  onClick={() => {
                    setShowInput(false);
                    setUrl("");
                    setError(null);
                  }}
                >
                  <FaTimes />
                </button>
              )}
            </div>
          </form>
          
          {error && (
            <div className="mt-2 p-2 bg-[rgba(255,0,0,0.1)] text-red-400 rounded text-sm">
              {error}
            </div>
          )}
          
          {success && (
            <div className="mt-2 p-2 bg-[rgba(0,255,0,0.1)] text-green-400 rounded text-sm flex items-center">
              <FaCheck className="mr-2" /> Content successfully fetched!
            </div>
          )}
          
          <div className="mt-3 text-sm text-gray-400">
            Enter the URL of any public blog post or newsletter to generate social media posts from it.
          </div>
        </motion.div>
      )}
    </div>
  );
} 