import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import db from '@/prisma/db';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Secret key - will be used to verify requests from Edge Functions
const API_SECRET = process.env.SCHEDULED_POSTS_API_SECRET || 'your-secret-key';

/**
 * Helper function to upload media to LinkedIn
 */
async function uploadMediaToLinkedIn(
  accessToken: string, 
  profileId: string,
  mediaBuffer: ArrayBuffer,
  filename: string
) {
  console.log('Starting LinkedIn media upload process');
  console.log('Media buffer size:', mediaBuffer.byteLength, 'bytes');
  console.log('Filename:', filename);
  
  const registerUploadRequest = {
    registerUploadRequest: {
      recipes: ["urn:li:digitalmediaRecipe:feedshare-image"],
      owner: "urn:li:person:" + profileId,
      serviceRelationships: [{
        relationshipType: "OWNER",
        identifier: "urn:li:userGeneratedContent"
      }]
    }
  };
  
  console.log('Register upload request:', JSON.stringify(registerUploadRequest));
  
  const registerUploadResponse = await fetch('https://api.linkedin.com/v2/assets?action=registerUpload', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'X-Restli-Protocol-Version': '2.0.0',
    },
    body: JSON.stringify(registerUploadRequest)
  });

  console.log('Register upload response status:', registerUploadResponse.status);
  
  if (!registerUploadResponse.ok) {
    const responseText = await registerUploadResponse.text();
    console.error('Failed to register media upload:', responseText);
    throw new Error(`Failed to register media upload: ${responseText}`);
  }

  const registerUploadData = await registerUploadResponse.json();
  console.log('Register upload response data:', JSON.stringify(registerUploadData));
  
  const uploadUrl = registerUploadData.value.uploadMechanism["com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"].uploadUrl;
  const asset = registerUploadData.value.asset;
  
  console.log('Step 2: Uploading media to provided URL');
  console.log('Upload URL:', uploadUrl);
  console.log('Asset URN:', asset);

  const uploadResponse = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/octet-stream',
    },
    body: mediaBuffer,
  });

  console.log('Upload response status:', uploadResponse.status);
  
  let uploadResponseText = '';
  try {
    uploadResponseText = await uploadResponse.text();
    console.log('Upload response body:', uploadResponseText.substring(0, 200));
  } catch (e) {
    console.log(e, 'No text response from upload endpoint (this might be normal)');
  }
  
  if (!uploadResponse.ok) {
    console.error('Failed to upload media:', uploadResponseText);
    throw new Error(`Failed to upload media: ${uploadResponse.status}`);
  }

  console.log('Media upload successful');
  return asset;
}

export async function POST(request: NextRequest) {
  try {
    // Verify the request is authorized
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized access' },
        { status: 401 }
      );
    }
    
    const token = authHeader.split(' ')[1];
    // Simple time-based hmac verification to prevent unauthorized access
    const currentHourTimestamp = Math.floor(Date.now() / (1000 * 60 * 60));
    const expectedToken = createHash('sha256')
      .update(`${API_SECRET}:${currentHourTimestamp}`)
      .digest('hex');
      
    if (token !== expectedToken) {
      console.error('Invalid API token for scheduled post');
      return NextResponse.json(
        { error: 'Invalid API token' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { content, accessToken, userId, mediaUrl } = body;
    
    if (!content || !accessToken || !userId) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    console.log('Processing scheduled LinkedIn post:', {
      contentLength: content.length,
      hasMedia: !!mediaUrl
    });
    
    // First, get the user's LinkedIn profile ID
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { linkedinProfileId: true }
    });
    
    if (!user || !user.linkedinProfileId) {
      return NextResponse.json(
        { error: 'LinkedIn profile ID not found' },
        { status: 404 }
      );
    }
    
    const linkedinProfileId = user.linkedinProfileId;
    console.log('LinkedIn profile ID:', linkedinProfileId);
    
    let mediaWasUploaded = false;
    let mediaAsset = null;
    
    // Prepare the post body
    const authorUrn = `urn:li:person:${linkedinProfileId}`;
    const postBody: {
      author?: string;
      lifecycleState: string;
      specificContent: {
        "com.linkedin.ugc.ShareContent": {
          shareCommentary: {
            text: string;
          };
          shareMediaCategory: string;
          media?: Array<{
            status: string;
            description: {
              text: string;
            };
            media: string;
            title: {
              text: string;
            };
          }>;
        };
      };
      visibility: {
        "com.linkedin.ugc.MemberNetworkVisibility": string;
      };
    } = {
      author: authorUrn,
      lifecycleState: "PUBLISHED",
      specificContent: {
        "com.linkedin.ugc.ShareContent": {
          shareCommentary: {
            text: content
          },
          shareMediaCategory: "NONE"
        }
      },
      visibility: {
        "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"
      }
    };
    
    if (mediaUrl) {
      try {
        console.log('Media URL provided, downloading for upload');
        
        // Download media from URL (likely from your Supabase storage)
        const mediaResponse = await fetch(mediaUrl, {
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        });
        
        if (!mediaResponse.ok) {
          throw new Error(`Failed to download media: ${mediaResponse.status}`);
        }
        
        // Get media as ArrayBuffer
        const mediaBuffer = await mediaResponse.arrayBuffer();
        
        // Get content type or default to jpeg
        const contentType = mediaResponse.headers.get('content-type') || 'image/jpeg';
        
        if (!contentType.startsWith('image/')) {
          console.log('File type is not an image:', contentType);
          throw new Error('Only image files are supported for LinkedIn posts');
        }
        
        console.log(`Downloaded media (${contentType}, ${mediaBuffer.byteLength} bytes)`);
        
        // Extract filename from URL or use default
        const urlParts = mediaUrl.split('/');
        const filename = urlParts[urlParts.length - 1] || 'image.jpg';
        
        // Upload media to LinkedIn
        mediaAsset = await uploadMediaToLinkedIn(
          accessToken,
          linkedinProfileId,
          mediaBuffer,
          filename
        );
        
        console.log('Media uploaded successfully, asset:', mediaAsset);
        mediaWasUploaded = true;
        
        postBody.specificContent["com.linkedin.ugc.ShareContent"].shareMediaCategory = "IMAGE";
        postBody.specificContent["com.linkedin.ugc.ShareContent"].media = [{
          status: "READY",
          description: {
            text: "Image shared with post"
          },
          media: mediaAsset,
          title: {
            text: filename
          }
        }];
        
        console.log('Post body updated with media asset');
      } catch (error) {
        console.error('Error uploading image:', error);
        // Fall back to text-only post
        console.log('Continuing with text-only post');
      }
    }
    
    console.log('Posting to LinkedIn API');
    console.log('Post body:', JSON.stringify(postBody));
    
    let postResponse = await fetch('https://api.linkedin.com/v2/ugcPosts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0',
      },
      body: JSON.stringify(postBody),
    });
    
    let responseText = await postResponse.text();
    let responseData;
    
    try {
      responseData = JSON.parse(responseText);
      console.log('LinkedIn post response:', JSON.stringify(responseData));
    } catch {
      console.log('LinkedIn post raw response:', responseText);
      responseData = { response: responseText };
    }
    
    // If post fails with author, try without author field (fallback)
    if (!postResponse.ok && (responseText.includes('Author') || responseText.includes('author'))) {
      console.log('Trying fallback without explicit author field');
      
      const fallbackPostBody = { ...postBody };
      delete fallbackPostBody.author;
      
      console.log('Fallback post body:', JSON.stringify(fallbackPostBody));
      
      postResponse = await fetch('https://api.linkedin.com/v2/ugcPosts', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'X-Restli-Protocol-Version': '2.0.0',
        },
        body: JSON.stringify(fallbackPostBody),
      });
      
      responseText = await postResponse.text();
      
      try {
        responseData = JSON.parse(responseText);
        console.log('LinkedIn fallback post response:', JSON.stringify(responseData));
      } catch {
        console.log('LinkedIn fallback raw response:', responseText);
        responseData = { response: responseText };
      }
    }
    
    if (!postResponse.ok) {
      return NextResponse.json(
        { 
          error: 'LinkedIn API error: Failed to post to LinkedIn',
          details: responseData
        },
        { status: 500 }
      );
    }
    
    // Save the posted LinkedIn post to the database
    try {
      await prisma.postedLinkedInPost.create({
        data: {
          userId: userId,
          postId: responseData.id,
          content: content,
          postedAt: new Date(),
        },
      });
    } catch (dbError) {
      console.error('Error saving LinkedIn post to database:', dbError);
      // Don't fail the request if database save fails
    }
    
    return NextResponse.json({
      success: true,
      postId: responseData.id,
      hasMedia: mediaWasUploaded
    });
  } catch (error: unknown) {
    console.error('Error posting scheduled LinkedIn post:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to post to LinkedIn' },
      { status: 500 }
    );
  }
} 