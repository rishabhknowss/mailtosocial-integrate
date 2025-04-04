'use client';

import { useState, useEffect } from 'react';
import { X, Calendar, Loader2, Check } from 'lucide-react';
import { DateTimePicker } from './DateTimePicker';
import { createScheduledPost } from '../utils/scheduleHelper';
import { Post } from '../types/types';

interface SchedulePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  post: Post;
  content: string;
  mediaFile?: File | null;
}

export const SchedulePostModal = ({
  isOpen,
  onClose,
  post,
  content,
  mediaFile,
}: SchedulePostModalProps) => {
  const [scheduledDate, setScheduledDate] = useState<Date>(new Date());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Calculate minimum date (current time + 5 minutes)
  const minDate = new Date();
  minDate.setMinutes(minDate.getMinutes() + 5);
  
  useEffect(() => {
    if (isOpen) {
      // Reset state when modal opens
      setIsSubmitting(false);
      setIsSuccess(false);
      setError(null);
      
      // Set default scheduled time to 30 minutes from now
      const defaultDate = new Date();
      defaultDate.setMinutes(defaultDate.getMinutes() + 30);
      setScheduledDate(defaultDate);
    }
  }, [isOpen]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    
    try {
      // Make sure the scheduled date is in the future
      if (scheduledDate <= new Date()) {
        throw new Error('Scheduled time must be in the future');
      }
      
      const result = await createScheduledPost(
        content,
        post.platform,
        scheduledDate,
        mediaFile
      );
      
      if (!result) {
        throw new Error('Failed to schedule post');
      }
      
      setIsSuccess(true);
      
      // Close modal after a short delay
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75">
      <div className="w-full max-w-md p-6 bg-[#1b1d23] rounded-xl shadow-2xl border border-[#2c2e36]">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-white">Schedule Post</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
            disabled={isSubmitting}
          >
            <X size={24} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label className="block text-gray-300 mb-2 text-sm">
              When would you like to post this?
            </label>
            <DateTimePicker
              initialDate={scheduledDate}
              onDateChange={setScheduledDate}
              minDate={minDate}
              className="w-full"
            />
          </div>
          
          <div className="mb-6">
            <div className="p-4 bg-[#23262d] rounded-lg border border-[#2c2e36]">
              <h3 className="text-sm font-medium text-gray-300 mb-2">Post Preview</h3>
              <p className="text-white text-sm">{content}</p>
              {mediaFile && (
                <div className="mt-2 p-2 bg-[#1b1d23] rounded border border-[#2c2e36] text-xs text-gray-400">
                  Media: {mediaFile.name}
                </div>
              )}
            </div>
          </div>
          
          {error && (
            <div className="mb-4 p-3 bg-red-900/20 border border-red-500/50 rounded-lg">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}
          
          <div className="flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="mr-2 px-4 py-2 bg-transparent text-gray-300 hover:text-white transition-colors"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            
            <button
              type="submit"
              disabled={isSubmitting || isSuccess}
              className={`px-4 py-2 rounded-md flex items-center justify-center min-w-[100px] ${
                isSuccess
                  ? 'bg-green-600 hover:bg-green-700'
                  : 'bg-[#0077B5] hover:bg-[#006699]'
              } text-white transition-colors`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="mr-2 animate-spin" />
                  Scheduling...
                </>
              ) : isSuccess ? (
                <>
                  <Check size={16} className="mr-2" />
                  Scheduled!
                </>
              ) : (
                <>
                  <Calendar size={16} className="mr-2" />
                  Schedule
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}; 