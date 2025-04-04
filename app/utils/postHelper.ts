// utils/postHelpers.ts
import { Post } from '../types/types';

/**
 * Handles posting content to social media platforms with media support
 * @param post The post object with platform and id
 * @param content The text content to post
 * @param mediaFile Optional media file to upload with the post
 * @returns The response from the API
 */
export async function handleSocialMediaPost(
  post: Post, 
  content: string, 
  mediaFile?: File
): Promise<{ success: boolean; id: string; hasMedia: boolean }> {
  try {
    // Determine the API endpoint based on the platform
    const endpoint = post.platform === 'twitter'
      ? '/api/accounts/twitter/post'
      : '/api/accounts/linkedin/post';
    
    console.log(`Posting to ${post.platform} with ${mediaFile ? 'media' : 'no media'}`);
    
    // Check if we have a media file
    if (mediaFile) {
      console.log('Media file details:', {
        name: mediaFile.name,
        type: mediaFile.type,
        size: mediaFile.size,
      });
      
      // Validate file type before uploading
      if (!mediaFile.type.startsWith('image/')) {
        throw new Error('Only image files are supported for social media posts');
      }
      
      // Create a cloned file to ensure it's properly serialized
      // This can help with issues where the File object may not be properly passed to FormData
      const fileBlob = await mediaFile.arrayBuffer();
      const newFile = new File([fileBlob], mediaFile.name, { type: mediaFile.type });
      
      // Use FormData for multipart/form-data requests (with files)
      const formData = new FormData();
      formData.append('text', content);
      formData.append('media', newFile);
      
      // Log FormData contents (for debugging)
      console.log('FormData entries:');
      for (const [key, value] of formData.entries()) {
        if (value instanceof File) {
          console.log(`- ${key}: File (name=${value.name}, type=${value.type}, size=${value.size} bytes)`);
        } else {
          console.log(`- ${key}: ${value}`);
        }
      }
      
      console.log('Sending request with FormData...');
      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData,
        // Important: Do NOT set Content-Type manually, browser will set it with correct boundary
      });
      
      console.log('Response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: `HTTP error: ${response.status}` }));
        throw new Error(errorData.error || 'Failed to post content');
      }
      
      const data = await response.json();
      console.log('Response data:', data);
      
      return {
        success: true,
        id: data.postId || data.tweetId || 'unknown',
        hasMedia: data.hasMedia || false
      };
    } else {
      // If no media, use JSON request for simplicity
      console.log('Sending request with JSON...');
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: content }),
      });
      
      console.log('Response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: `HTTP error: ${response.status}` }));
        throw new Error(errorData.error || 'Failed to post content');
      }
      
      const data = await response.json();
      console.log('Response data:', data);
      
      return {
        success: true,
        id: data.postId || data.tweetId || 'unknown',
        hasMedia: false
      };
    }
  } catch (error) {
    console.error('Error in handleSocialMediaPost:', error);
    throw error;
  }
}