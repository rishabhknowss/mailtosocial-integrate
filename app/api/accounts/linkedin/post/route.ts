// app/api/accounts/linkedin/post/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/authOptions';
import db from '@/prisma/db';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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
    console.log(e,'No text response from upload endpoint (this might be normal)');
  }
  
  if (!uploadResponse.ok) {
    console.error('Failed to upload media:', uploadResponseText);
    throw new Error(`Failed to upload media: ${uploadResponse.status}`);
  }

  console.log('Media upload successful');
  return asset;
}

export async function POST(request: NextRequest) {
  console.log('LinkedIn post API called');
  
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'You must be signed in to post to LinkedIn' },
        { status: 401 }
      );
    }
    
    const contentType = request.headers.get('content-type') || '';
    console.log('Request content type:', contentType);
    
    let text: string;
    let mediaFile: File | null = null;
    
    if (contentType.includes('multipart/form-data')) {
      console.log('Parsing as multipart/form-data');
      const formData = await request.formData();
      
      console.log('Form data entries:');
      for (const [key, value] of formData.entries()) {
        if (value instanceof File) {
          console.log(`- ${key}: File (name=${value.name}, type=${value.type}, size=${value.size} bytes)`);
        } else {
          console.log(`- ${key}: ${value}`);
        }
      }
      
      text = formData.get('text') as string;
      mediaFile = formData.get('media') as File | null;
      
      console.log('Extracted text:', text?.substring(0, 50) + (text?.length > 50 ? '...' : ''));
      console.log('Media file present:', !!mediaFile);
      if (mediaFile) {
        console.log('Media file details:', {
          name: mediaFile.name,
          type: mediaFile.type,
          size: mediaFile.size,
        });
      }
    } else if (contentType.includes('application/json')) {
      console.log('Parsing as application/json');
      const jsonData = await request.json();
      text = jsonData.text;
      console.log('Extracted text from JSON:', text?.substring(0, 50) + (text?.length > 50 ? '...' : ''));
    } else {
      console.log('Unsupported content type:', contentType);
      return NextResponse.json(
        { error: 'Unsupported content type. Use multipart/form-data for media uploads or application/json for text-only posts.' },
        { status: 400 }
      );
    }
    
    if (!text || text.trim().length === 0) {
      console.log('Post text is missing or empty');
      return NextResponse.json(
        { error: 'Post text is required' },
        { status: 400 }
      );
    }
    
    const userId = session.user.id;
    console.log('Finding LinkedIn account for user:', userId);
    
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { linkedinProfileId: true }
    });
    
    if (!user || !user.linkedinProfileId) {
      console.log('LinkedIn profile ID not found for user');
      return NextResponse.json(
        { error: 'LinkedIn profile ID not found' },
        { status: 403 }
      );
    }
    
    console.log('Found LinkedIn profile ID:', user.linkedinProfileId);
    
    const linkedinAccount = await db.account.findFirst({
      where: {
        userId: userId,
        provider: 'linkedin',
      },
    });
    
    if (!linkedinAccount || !linkedinAccount.access_token) {
      console.log('LinkedIn account not properly connected');
      return NextResponse.json(
        { error: 'LinkedIn account is not properly connected' },
        { status: 403 }
      );
    }
    
    const accessToken = linkedinAccount.access_token;
    console.log('Found LinkedIn access token');
    
    try {
      if (linkedinAccount.expires_at) {
        const currentTimestamp = Math.floor(Date.now() / 1000);
        const tokenExpired = linkedinAccount.expires_at <= currentTimestamp;
        
        if (tokenExpired) {
          console.error('LinkedIn token has expired');
          return NextResponse.json(
            { error: 'LinkedIn access token has expired. Please reconnect your account.' },
            { status: 401 }
          );
        }
      }
      
      console.log('Attempting to post to LinkedIn with text length:', text.length);
      
      const isTemporaryId = user.linkedinProfileId.startsWith('temp_');
      if (isTemporaryId) {
        console.log('Warning: Using temporary LinkedIn ID for posting.');
      }
      
      const authorUrn = `urn:li:person:${user.linkedinProfileId}`;
      console.log('Using author URN:', authorUrn);
      
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
              text: text
            },
            shareMediaCategory: "NONE"
          }
        },
        visibility: {
          "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"
        }
      };
      
      let mediaWasUploaded = false;
      
      if (mediaFile) {
        console.log('Media file provided, preparing for upload');
        
        try {
          if (!mediaFile.type.startsWith('image/')) {
            console.log('File type is not an image:', mediaFile.type);
            return NextResponse.json(
              { error: 'Only image files are supported for LinkedIn posts' },
              { status: 400 }
            );
          }
          
          console.log('Reading file as ArrayBuffer');
          const arrayBuffer = await mediaFile.arrayBuffer();
          console.log('File successfully read, size:', arrayBuffer.byteLength, 'bytes');
          
          const mediaAsset = await uploadMediaToLinkedIn(
            accessToken, 
            user.linkedinProfileId,
            arrayBuffer,
            mediaFile.name || 'image.jpg'
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
              text: mediaFile.name || "Shared image"
            }
          }];
          
          console.log('Post body updated with media asset');
          
        } catch (mediaError) {
          console.error('Failed to upload media:', mediaError);
          return NextResponse.json(
            { error: 'Failed to upload media to LinkedIn: ' + (mediaError instanceof Error ? mediaError.message : String(mediaError)) },
            { status: 500 }
          );
        }
      }
      
      console.log('Sending post to LinkedIn API');
      console.log('Post body:', JSON.stringify(postBody));
      
      const postResponse = await fetch('https://api.linkedin.com/v2/ugcPosts', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'X-Restli-Protocol-Version': '2.0.0',
        },
        body: JSON.stringify(postBody),
      });
      
      console.log('LinkedIn post API response status:', postResponse.status);
      
      const responseText = await postResponse.text();
      let responseData;
      
      try {
        responseData = JSON.parse(responseText);
        console.log('LinkedIn post response:', JSON.stringify(responseData));
      } catch {
        console.log('LinkedIn post raw response:', responseText);
        responseData = { response: responseText, error: 'Failed to parse response' };
      }
      
      if (postResponse.ok) {
        console.log('LinkedIn post created successfully');
        console.log('Media was uploaded:', mediaWasUploaded);
        
        // Save the posted LinkedIn post to the database
        try {
          await prisma.postedLinkedInPost.create({
            data: {
              userId: userId,
              postId: responseData.id,
              content: text,
              postedAt: new Date(),
            },
          });
        } catch (dbError) {
          console.error('Error saving LinkedIn post to database:', dbError);
          // Don't fail the request if database save fails
        }
        
        return NextResponse.json({
          success: true,
          postId: responseData.id || 'unknown',
          hasMedia: mediaWasUploaded
        });
      } else {
        if (responseText.includes('Author') || responseText.includes('author')) {
          console.log('Trying fallback without explicit author field');
          
          const fallbackPostBody = { ...postBody };
          delete fallbackPostBody.author;
          
          console.log('Fallback post body:', JSON.stringify(fallbackPostBody));
          
          const fallbackResponse = await fetch('https://api.linkedin.com/v2/ugcPosts', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
              'X-Restli-Protocol-Version': '2.0.0',
            },
            body: JSON.stringify(fallbackPostBody),
          });
          
          console.log('LinkedIn fallback post response status:', fallbackResponse.status);
          
          const fallbackText = await fallbackResponse.text();
          let fallbackData;
          
          try {
            fallbackData = JSON.parse(fallbackText);
            console.log('LinkedIn fallback response:', JSON.stringify(fallbackData));
          } catch {
            console.log('LinkedIn fallback raw response:', fallbackText);
            fallbackData = { response: fallbackText };
          }
          
          if (fallbackResponse.ok) {
            console.log('LinkedIn post created successfully via fallback');
            console.log('Media was uploaded:', mediaWasUploaded);
            
            // Save the posted LinkedIn post to the database
            try {
              await prisma.postedLinkedInPost.create({
                data: {
                  userId: userId,
                  postId: fallbackData.id,
                  content: text,
                  postedAt: new Date(),
                },
              });
            } catch (dbError) {
              console.error('Error saving LinkedIn post to database:', dbError);
              // Don't fail the request if database save fails
            }
            
            return NextResponse.json({
              success: true,
              postId: fallbackData.id || 'unknown',
              method: 'fallback',
              hasMedia: mediaWasUploaded
            });
          }
          
          return NextResponse.json(
            { 
              error: 'Failed to post to LinkedIn after multiple attempts',
              details: {
                originalError: responseData,
                fallbackError: fallbackData
              }
            },
            { status: 500 }
          );
        }
        
        return NextResponse.json(
          { 
            error: 'LinkedIn API error: Failed to post to LinkedIn',
            details: responseData
          },
          { status: 500 }
        );
      }
    } catch (error: unknown) {
      console.error('Error posting to LinkedIn:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to post to LinkedIn';
      return NextResponse.json(
        { error: errorMessage },
        { status: 500 }
      );
    }
  } catch (error: unknown) {
    console.error('Unexpected error in LinkedIn post endpoint:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}