import { Post } from '../types/types';

export interface ScheduledPost {
  id: string;
  content: string;
  platform: 'twitter' | 'linkedin';
  scheduledFor: Date;
  status: 'pending' | 'posted' | 'failed';
  mediaUrl?: string | null;
  postId?: string | null;
  error?: string | null;
  error_message?: string | null;
}

/**
 * Fetches all scheduled posts for the current user
 * @param platform Optional filter by platform
 * @param status Optional filter by status
 * @returns Array of scheduled posts
 */
export async function getScheduledPosts(
  platform?: 'twitter' | 'linkedin',
  status?: 'pending' | 'posted' | 'failed',
  startDate?: Date,
  endDate?: Date
): Promise<ScheduledPost[]> {
  try {
    let url = '/api/scheduled-posts';
    const params = new URLSearchParams();
    
    if (platform) {
      params.append('platform', platform);
    }
    
    if (status) {
      params.append('status', status);
    }
    
    if (startDate) {
      params.append('startDate', startDate.toISOString());
    }
    
    if (endDate) {
      params.append('endDate', endDate.toISOString());
    }
    
    const queryString = params.toString();
    if (queryString) {
      url += `?${queryString}`;
    }
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch scheduled posts: ${response.status}`);
    }
    
    const data = await response.json();
    return data.map((post: ScheduledPost) => ({
      ...post,
      scheduledFor: new Date(post.scheduledFor)
    }));
  } catch (error) {
    console.error('Error fetching scheduled posts:', error);
    return [];
  }
}

/**
 * Creates a new scheduled post
 * @param content The post content
 * @param platform The platform to post to
 * @param scheduledFor When to post the content
 * @param mediaFile Optional media file to attach
 * @returns The created scheduled post or null if an error occurs
 */
export async function createScheduledPost(
  content: string,
  platform: 'twitter' | 'linkedin',
  scheduledFor: Date,
  mediaFile?: File | null
): Promise<ScheduledPost | null> {
  try {
    // Ensure we're keeping the timezone information when sending to server
    const isoDate = scheduledFor.toISOString();
    console.log(`Sending scheduled date to server: ${isoDate}`);
    console.log(`Original local date: ${scheduledFor.toLocaleString()}`);
    
    if (mediaFile) {
      const formData = new FormData();
      formData.append('content', content);
      formData.append('platform', platform);
      formData.append('scheduledFor', isoDate);
      formData.append('media', mediaFile);
      
      const response = await fetch('/api/scheduled-posts', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error(`Failed to create scheduled post: ${response.status}`);
      }
      
      const data = await response.json();
      return {
        ...data,
        scheduledFor: new Date(data.scheduledFor)
      };
    } else {
      const response = await fetch('/api/scheduled-posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content,
          platform,
          scheduledFor: isoDate,
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to create scheduled post: ${response.status}`);
      }
      
      const data = await response.json();
      return {
        ...data,
        scheduledFor: new Date(data.scheduledFor)
      };
    }
  } catch (error) {
    console.error('Error creating scheduled post:', error);
    return null;
  }
}

/**
 * Updates an existing scheduled post
 * @param id The post ID
 * @param updates The fields to update
 * @returns The updated post or null if an error occurs
 */
export async function updateScheduledPost(
  id: string,
  updates: {
    content?: string;
    scheduledFor?: Date;
    status?: 'pending' | 'posted' | 'failed';
  }
): Promise<ScheduledPost | null> {
  try {
    const response = await fetch(`/api/scheduled-posts/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...updates,
        scheduledFor: updates.scheduledFor?.toISOString(),
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to update scheduled post: ${response.status}`);
    }
    
    const data = await response.json();
    return {
      ...data,
      scheduledFor: new Date(data.scheduledFor)
    };
  } catch (error) {
    console.error('Error updating scheduled post:', error);
    return null;
  }
}

/**
 * Deletes a scheduled post
 * @param id The post ID to delete
 * @returns True if deletion was successful, false otherwise
 */
export async function deleteScheduledPost(id: string): Promise<boolean> {
  try {
    const response = await fetch(`/api/scheduled-posts/${id}`, {
      method: 'DELETE',
    });
    
    return response.ok;
  } catch (error) {
    console.error('Error deleting scheduled post:', error);
    return false;
  }
}

/**
 * Convert a Post object to a ScheduledPost to be used in scheduling
 */
export function postToScheduledPost(
  post: Post, 
  content: string, 
  scheduledFor: Date,
  mediaUrl?: string
): Omit<ScheduledPost, 'id'> {
  return {
    content,
    platform: post.platform,
    scheduledFor,
    status: 'pending',
    mediaUrl: mediaUrl || null,
  };
} 