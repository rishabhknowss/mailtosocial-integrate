'use client';

import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Calendar, Grid, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, isSameDay, startOfWeek, endOfWeek, addDays } from 'date-fns';
import { ScheduledPost } from '../utils/scheduleHelper';

type ViewMode = 'week' | 'month';

// interface SocialPost {
//   id: string;
//   content: string;
//   postedAt: string;
//   type: 'twitter' | 'linkedin';
// }

interface PostedTweet {
  id: string;
  content: string;
  postedAt: string;
  tweetId: string;
}

interface PostedLinkedInPost {
  id: string;
  content: string;
  postedAt: string;
  postId: string;
}

export default function CalendarPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [tweets, setTweets] = useState<PostedTweet[]>([]);
  const [linkedInPosts, setLinkedInPosts] = useState<PostedLinkedInPost[]>([]);
  const [scheduledPosts, setScheduledPosts] = useState<ScheduledPost[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTweets = useCallback(async () => {
    try {
      let start, end;
      
      if (viewMode === 'week') {
        start = startOfWeek(currentDate);
        end = endOfWeek(currentDate);
      } else {
        // For month view, get the whole month plus some days on either side
        start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
        
        // Add buffer to start/end to account for calendar view overlap
        start = addDays(start, -7);
        end = addDays(end, 7);
      }
      
      const response = await fetch(
        `/api/accounts/twitter/posts?startDate=${start.toISOString()}&endDate=${end.toISOString()}`,
        {
          credentials: 'include'
        }
      );
      
      if (!response.ok) throw new Error("Failed to fetch tweets");
      
      const data = await response.json();
      setTweets(data);
    } catch (error) {
      console.error("Error fetching tweets:", error);
    }
  }, [currentDate, viewMode]);

  const fetchLinkedInPosts = useCallback(async () => {
    try {
      let start, end;
      
      if (viewMode === 'week') {
        start = startOfWeek(currentDate);
        end = endOfWeek(currentDate);
      } else {
        start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
        
        start = addDays(start, -7);
        end = addDays(end, 7);
      }
      
      const response = await fetch(
        `/api/accounts/linkedin/posts?startDate=${start.toISOString()}&endDate=${end.toISOString()}`,
        {
          credentials: 'include'
        }
      );
      
      if (!response.ok) throw new Error("Failed to fetch LinkedIn posts");
      
      const data = await response.json();
      setLinkedInPosts(data);
    } catch (error) {
      console.error("Error fetching LinkedIn posts:", error);
    } finally {
      setLoading(false); // Set loading to false after both fetches complete
    }
  }, [currentDate, viewMode]);

  const fetchScheduledPosts = useCallback(async () => {
    setLoading(true); // Set loading true at the start of fetching cycle
    try {
      let start, end;
      
      if (viewMode === 'week') {
        start = startOfWeek(currentDate);
        end = endOfWeek(currentDate);
      } else {
        start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
        
        start = addDays(start, -7);
        end = addDays(end, 7);
      }
      
      const response = await fetch(
        `/api/scheduled-posts?startDate=${start.toISOString()}&endDate=${end.toISOString()}`,
        {
          credentials: 'include'
        }
      );
      
      if (!response.ok) throw new Error("Failed to fetch scheduled posts");
      
      const data = await response.json();
      
      // Convert dates from strings to Date objects
      const formattedPosts = data.map((post: ScheduledPost) => ({
        ...post,
        scheduledFor: new Date(post.scheduledFor)
      }));
      
      setScheduledPosts(formattedPosts);
    } catch (error) {
      console.error("Error fetching scheduled posts:", error);
    } finally {
       setLoading(false); // Set loading false after all fetches attempt
    }
  }, [currentDate, viewMode]);

  useEffect(() => {
    setLoading(true); // Indicate loading starts
    Promise.all([
      fetchTweets(),
      fetchLinkedInPosts(),
      fetchScheduledPosts()
    ]).finally(() => {
       // setLoading(false); // Loading is set to false within fetchScheduledPosts now
    });
  }, [fetchTweets, fetchLinkedInPosts, fetchScheduledPosts]);

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const getWeekDays = () => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return days;
  };

  const getMonthDays = () => {
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);
    const days = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }

    // Add days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }

    return days;
  };

  const getWeekDaysArray = () => {
    // Get the start of the week for the current date
    const start = startOfWeek(currentDate);
    const weekDays = [];

    for (let i = 0; i < 7; i++) {
      const date = addDays(start, i);
      weekDays.push(date);
    }

    return weekDays;
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (viewMode === 'month') {
      newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
    } else {
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
    }
    setCurrentDate(newDate);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      month: 'long', 
      year: 'numeric' 
    });
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  };

  const renderTweet = (tweet: PostedTweet) => {
    const tweetDate = new Date(tweet.postedAt);
    const timeStr = format(tweetDate, 'h:mm a');
    
    return (
      <div
        key={tweet.id}
        className="bg-[#1f1f1f] hover:bg-[#2a2a2a] text-white p-2 rounded-md text-sm mb-1 cursor-pointer transition-colors border border-[#2c2e36] relative"
        title={`${timeStr} - ${tweet.content}`}
      >
        <span className="absolute top-1 right-2 text-xs font-bold text-[#71767b]">𝕏</span>
        <div className="pr-4">
          <div className="font-medium text-[#71767b]">{timeStr}</div>
          <div className="truncate text-[#e7e9ea]">{tweet.content}</div>
        </div>
      </div>
    );
  };

  const renderLinkedInPost = (post: PostedLinkedInPost) => {
    const postDate = new Date(post.postedAt);
    const timeStr = format(postDate, 'h:mm a');
    
    return (
      <div
        key={post.id}
        className="bg-[#0A66C2] hover:bg-[#004182] text-white p-2 rounded-md text-sm mb-1 cursor-pointer transition-colors relative"
        title={`${timeStr} - ${post.content}`}
      >
        <span className="absolute top-1 right-2 text-xs font-bold opacity-90">in</span>
        <div className="pr-4">
          <div className="font-medium opacity-90">{timeStr}</div>
          <div className="truncate">{post.content}</div>
        </div>
      </div>
    );
  };

  const renderScheduledPost = (post: ScheduledPost) => {
    const timeStr = format(post.scheduledFor, 'h:mm a');
    
    let bgColor = '';
    let statusIndicator = '';
    
    switch (post.platform) {
      case 'twitter':
        bgColor = post.status === 'pending' ? 'bg-[#1a2933] hover:bg-[#1f3641]' : 'bg-[#1f1f1f] hover:bg-[#2a2a2a]';
        break;
      case 'linkedin':
        bgColor = post.status === 'pending' ? 'bg-[#0a3566] hover:bg-[#0a4080]' : 'bg-[#0A66C2] hover:bg-[#004182]';
        break;
      default:
        bgColor = post.status === 'pending' ? 'bg-[#2c2c2c] hover:bg-[#3a3a3a]' : 'bg-[#2c2c2c] hover:bg-[#3a3a3a]';
    }
    
    switch (post.status) {
      case 'pending':
        statusIndicator = 'Pending';
        break;
      case 'posted':
        statusIndicator = 'Posted';
        break;
      case 'failed':
        statusIndicator = 'Failed';
        bgColor = 'bg-[#501a1a] hover:bg-[#672424]';
        break;
    }
    
    const platformIcon = post.platform === 'twitter' ? '𝕏' : 'in';
    
    return (
      <div
        key={post.id}
        className={`${bgColor} text-white p-2 rounded-md text-sm mb-1 cursor-pointer transition-colors relative border border-[#2c2e36]`}
        title={`${timeStr} - ${post.content}${post.status === 'failed' ? ` - Error: ${post.error || 'Unknown error'}` : ''}`}
      >
        <span className="absolute top-1 right-2 text-xs font-bold text-[#71767b]">{platformIcon}</span>
        <div className="pr-4">
          <div className="flex items-center">
            {post.status === 'pending' && (
              <Clock size={12} className="mr-1 text-[#71767b]" />
            )}
            <span className="font-medium text-[#71767b]">{timeStr}</span>
            
            {post.status === 'pending' && (
              <span className="ml-2 text-xs px-1.5 py-0.5 bg-yellow-500/20 text-yellow-300 rounded">
                {statusIndicator}
              </span>
            )}
            {post.status === 'failed' && (
              <span className="ml-2 text-xs px-1.5 py-0.5 bg-red-500/20 text-red-300 rounded">
                {statusIndicator}
              </span>
            )}
          </div>
          <div className="truncate text-[#e7e9ea]">{post.content}</div>
          {post.mediaUrl && (
            <div className="mt-1 text-xs text-[#71767b] flex items-center">
              <span className="inline-block w-2 h-2 bg-green-400 rounded-full mr-1"></span>
              With media
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen p-6 pt-24">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-semibold text-[#f8f8f8]">Calendar</h1>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => navigateDate('prev')}
                className="p-2 hover:bg-[rgba(255,255,255,0.08)] rounded-full transition-colors"
              >
                <ChevronLeft size={20} className="text-[#b3b1b8]" />
              </button>
              <span className="text-lg font-medium text-[#f8f8f8]">
                {formatDate(currentDate)}
              </span>
              <button
                onClick={() => navigateDate('next')}
                className="p-2 hover:bg-[rgba(255,255,255,0.08)] rounded-full transition-colors"
              >
                <ChevronRight size={20} className="text-[#b3b1b8]" />
              </button>
            </div>
          </div>
          
          {/* View Toggle */}
          <div className="flex items-center space-x-2 bg-[rgba(255,255,255,0.08)] rounded-lg p-1">
            <button
              onClick={() => setViewMode('week')}
              className={`flex items-center px-3 py-1.5 rounded-md transition-colors ${
                viewMode === 'week' 
                  ? 'bg-[#0077B5] text-white' 
                  : 'text-[#b3b1b8] hover:bg-[rgba(255,255,255,0.12)]'
              }`}
            >
              <Grid size={16} className="mr-2" />
              Week
            </button>
            <button
              onClick={() => setViewMode('month')}
              className={`flex items-center px-3 py-1.5 rounded-md transition-colors ${
                viewMode === 'month' 
                  ? 'bg-[#0077B5] text-white' 
                  : 'text-[#b3b1b8] hover:bg-[rgba(255,255,255,0.12)]'
              }`}
            >
              <Calendar size={16} className="mr-2" />
              Month
            </button>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="bg-[#1b1d23] rounded-xl shadow-lg overflow-hidden border border-[#2c2e36]">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0077B5]"></div>
            </div>
          ) : (
            <>
              {/* Week Days Header */}
              <div className="grid grid-cols-7 border-b border-[#2c2e36]">
                {getWeekDays().map((day) => (
                  <div
                    key={day}
                    className="py-3 px-4 text-center text-sm font-medium text-[#8f959e]"
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar Body */}
              <AnimatePresence mode="wait">
                {viewMode === 'week' ? (
                  <motion.div
                    key="week"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="grid grid-cols-7"
                  >
                    {getWeekDaysArray().map((date, index) => (
                      <div
                        key={index}
                        className="min-h-[600px] border-r border-[#2c2e36] last:border-r-0"
                      >
                        <div className="p-2 text-center border-b border-[#2c2e36]">
                          <div className={`inline-flex items-center justify-center w-6 h-6 rounded-full ${
                            isToday(date) ? 'border-2 border-[#0077B5]' : ''
                          }`}>
                            <span className="text-sm font-medium text-[#f8f8f8]">
                              {date.getDate()}
                            </span>
                          </div>
                          <div className="text-xs text-[#8f959e] mt-1">
                            {date.toLocaleDateString('en-US', { month: 'short' })}
                          </div>
                        </div>
                        <div className="p-2">
                          {/* Scheduled Posts */}
                          {scheduledPosts
                            .filter(post => isSameDay(post.scheduledFor, date))
                            .map(renderScheduledPost)}
                          
                          {/* Posted Tweets */}
                          {tweets
                            .filter(tweet => isSameDay(new Date(tweet.postedAt), date))
                            .map(renderTweet)}
                            
                          {/* Posted LinkedIn Posts */}
                          {linkedInPosts
                            .filter(post => isSameDay(new Date(post.postedAt), date))
                            .map(renderLinkedInPost)}
                        </div>
                      </div>
                    ))}
                  </motion.div>
                ) : (
                  <motion.div
                    key="month"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="grid grid-cols-7"
                  >
                    {getMonthDays().map((day, index) => {
                      const date = day ? new Date(currentDate.getFullYear(), currentDate.getMonth(), day) : null;
                      return (
                        <div
                          key={index}
                          className={`h-[120px] border-r border-b border-[#2c2e36] last:border-r-0 ${
                            !day ? 'bg-[#1b1d23]' : ''
                          }`}
                        >
                          {day && (
                            <div className="h-full flex flex-col">
                              <div className="p-2">
                                <div className={`inline-flex items-center justify-center w-6 h-6 rounded-full ${
                                  date && isToday(date) ? 'border-2 border-[#0077B5]' : ''
                                }`}>
                                  <span className="text-sm font-medium text-[#f8f8f8]">
                                    {day}
                                  </span>
                                </div>
                              </div>
                              <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-[#2c2e36] scrollbar-track-transparent px-2">
                                {/* Scheduled Posts */}
                                {date && scheduledPosts
                                  .filter(post => isSameDay(post.scheduledFor, date))
                                  .map(renderScheduledPost)}
                                
                                {/* Posted Tweets */}
                                {date && tweets
                                  .filter(tweet => isSameDay(new Date(tweet.postedAt), date))
                                  .map(renderTweet)}
                                  
                                {/* Posted LinkedIn Posts */}
                                {date && linkedInPosts
                                  .filter(post => isSameDay(new Date(post.postedAt), date))
                                  .map(renderLinkedInPost)}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}
        </div>
      </div>
    </div>
  );
} 