'use client';

import { useState, useEffect, useCallback } from 'react';
import { CalendarDaysIcon } from '../components/ui/Calender';
import { getScheduledPosts, deleteScheduledPost, ScheduledPost } from '../utils/scheduleHelper';
import { format } from 'date-fns';
import { Calendar, Clock, Trash2, RefreshCw, MessageSquare, AlertCircle, CheckCircle, X, Linkedin } from 'lucide-react';
import Link from 'next/link';

export default function SchedulePage() {
  const [scheduledPosts, setScheduledPosts] = useState<ScheduledPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'pending' | 'posted' | 'failed'>('all');

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const status = selectedFilter !== 'all' ? selectedFilter : undefined;
      const posts = await getScheduledPosts(undefined, status);
      setScheduledPosts(posts);
    } catch (err) {
      setError('Failed to load scheduled posts');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [selectedFilter]);
  
  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);
  
  const handleDeletePost = async (id: string) => {
    if (!confirm('Are you sure you want to delete this scheduled post?')) {
      return;
    }
    
    try {
      const success = await deleteScheduledPost(id);
      if (success) {
        // Remove the post from the list
        setScheduledPosts((prev) => prev.filter((post) => post.id !== id));
      } else {
        throw new Error('Failed to delete post');
      }
    } catch (err) {
      setError('Failed to delete post');
      console.error(err);
    }
  };
  
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <span className="flex items-center text-yellow-400 text-xs">
            <Clock size={12} className="mr-1" />
            Pending
          </span>
        );
      case 'posted':
        return (
          <span className="flex items-center text-green-400 text-xs">
            <CheckCircle size={12} className="mr-1" />
            Posted
          </span>
        );
      case 'failed':
        return (
          <span className="flex items-center text-red-400 text-xs">
            <AlertCircle size={12} className="mr-1" />
            Failed
          </span>
        );
      default:
        return null;
    }
  };
  
  const renderPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'twitter':
        return (
          <div className="w-8 h-8 bg-black rounded-full flex items-center justify-center">
            <X size={16} color="white" />
          </div>
        );
      case 'linkedin':
        return (
          <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
            <Linkedin size={18} color="#0077B5" />
          </div>
        );
      default:
        return null;
    }
  };
  
  return (
    <div className="min-h-screen p-6 pt-24">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-semibold text-white flex items-center">
            <CalendarDaysIcon className="mr-2" />
            Scheduled Posts
          </h1>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={fetchPosts}
              className="flex items-center px-3 py-1.5 rounded-md text-white hover:bg-[rgba(255,255,255,0.08)] transition-colors"
            >
              <RefreshCw size={16} className="mr-2" />
              Refresh
            </button>
            
            <Link
              href="/"
              className="flex items-center px-3 py-1.5 bg-[#0077B5] text-white rounded-md hover:bg-[#006699] transition-colors"
            >
              <MessageSquare size={16} className="mr-2" />
              Create New Post
            </Link>
          </div>
        </div>
        
        {/* Filters */}
        <div className="my-6 flex space-x-2">
          <button
            onClick={() => setSelectedFilter('all')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              selectedFilter === 'all' 
                ? 'bg-[#0077B5] text-white' 
                : 'text-gray-300 hover:bg-[rgba(255,255,255,0.08)]'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setSelectedFilter('pending')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              selectedFilter === 'pending' 
                ? 'bg-[#0077B5] text-white' 
                : 'text-gray-300 hover:bg-[rgba(255,255,255,0.08)]'
            }`}
          >
            Pending
          </button>
          <button
            onClick={() => setSelectedFilter('posted')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              selectedFilter === 'posted' 
                ? 'bg-[#0077B5] text-white' 
                : 'text-gray-300 hover:bg-[rgba(255,255,255,0.08)]'
            }`}
          >
            Posted
          </button>
          <button
            onClick={() => setSelectedFilter('failed')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              selectedFilter === 'failed' 
                ? 'bg-[#0077B5] text-white' 
                : 'text-gray-300 hover:bg-[rgba(255,255,255,0.08)]'
            }`}
          >
            Failed
          </button>
        </div>
        
        {/* Error State */}
        {error && (
          <div className="p-4 mb-6 bg-red-900/20 border border-red-500/50 rounded-lg">
            <p className="text-red-400">{error}</p>
          </div>
        )}
        
        {/* Loading State */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0077B5]"></div>
          </div>
        ) : (
          <>
            {/* Empty State */}
            {scheduledPosts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 bg-[#1b1d23] border border-[#2c2e36] rounded-lg">
                <Calendar size={48} className="text-gray-500 mb-4" />
                <h2 className="text-xl font-medium text-white mb-2">No scheduled posts</h2>
                <p className="text-gray-400 mb-4">You don&apos;t have any scheduled posts yet</p>
                <Link
                  href="/"
                  className="px-4 py-2 bg-[#0077B5] text-white rounded-md hover:bg-[#006699] transition-colors"
                >
                  Create a New Post
                </Link>
              </div>
            ) : (
              /* Post List */
              <div className="space-y-4">
                {scheduledPosts.map((post) => (
                  <div
                    key={post.id}
                    className="p-4 bg-[#1b1d23] border border-[#2c2e36] rounded-lg hover:border-[#495057] transition-colors"
                  >
                    <div className="flex items-start">
                      <div className="flex-shrink-0 mr-4">
                        {renderPlatformIcon(post.platform)}
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            {renderStatusBadge(post.status)}
                            <span className="text-gray-400 text-xs">
                              {post.platform === 'twitter' ? 'Twitter' : 'LinkedIn'}
                            </span>
                          </div>
                          
                          <button
                            onClick={() => handleDeletePost(post.id)}
                            className="p-1 text-gray-400 hover:text-red-400 transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                        
                        <p className="text-white mb-2">{post.content}</p>
                        
                        {post.status === 'failed' && post.error_message && (
                          <div className="mb-2 p-2 rounded bg-red-900/20 border border-red-500/50">
                            <p className="text-xs text-red-400">
                              <AlertCircle size={12} className="inline-block mr-1" />
                              {post.error_message}
                            </p>
                          </div>
                        )}
                        
                        <div className="flex items-center text-gray-400 text-xs">
                          <Calendar size={12} className="mr-1" />
                          {(() => {
                            // Ensure we're showing the date in the user's timezone
                            const localDate = new Date(post.scheduledFor);
                            return format(localDate, 'MMM d, yyyy');
                          })()}
                          <span className="mx-2">•</span>
                          <Clock size={12} className="mr-1" />
                          {(() => {
                            const localDate = new Date(post.scheduledFor);
                            return format(localDate, 'h:mm a');
                          })()}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
} 