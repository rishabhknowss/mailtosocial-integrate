import { NextRequest, NextResponse } from 'next/server';
import { TwitterApi } from 'twitter-api-v2';
import { createHash } from 'crypto';

// Secret key - will be used to verify requests from Edge Functions
const API_SECRET = process.env.SCHEDULED_POSTS_API_SECRET || 'your-secret-key';

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
    const { content, oauthToken, oauthTokenSecret, mediaUrl } = body;
    
    if (!content || !oauthToken || !oauthTokenSecret) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    console.log('Processing scheduled tweet:', {
      contentLength: content.length,
      hasMedia: !!mediaUrl
    });
    
    // Create Twitter client using the provided tokens
    const twitterClient = new TwitterApi({
      appKey: process.env.TWITTER_CLIENT_ID!,
      appSecret: process.env.TWITTER_CLIENT_SECRET!,
      accessToken: oauthToken,
      accessSecret: oauthTokenSecret,
    });
    
    let result;
    let hasMedia = false;
    
    if (mediaUrl) {
      try {
        console.log('Downloading media from URL:', mediaUrl);
        
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
        
        // Get media as ArrayBuffer and convert to Buffer for twitter-api-v2
        const mediaBuffer = await mediaResponse.arrayBuffer();
        const buffer = Buffer.from(mediaBuffer);
        
        // Get content type or default to jpeg
        const contentType = mediaResponse.headers.get('content-type') || 'image/jpeg';
        
        console.log(`Downloaded media (${contentType}, ${buffer.length} bytes)`);
        
        // Upload media to Twitter
        const mediaId = await twitterClient.v1.uploadMedia(buffer, { 
          mimeType: contentType 
        });
        
        console.log('Media uploaded successfully, media_id:', mediaId);
        
        // Post tweet with media
        result = await twitterClient.v2.tweet(content, {
          media: { media_ids: [mediaId] }
        });
        
        hasMedia = true;
      } catch (error) {
        console.error('Error uploading image:', error);
        // Fall back to text-only tweet
        result = await twitterClient.v2.tweet(content);
      }
    } else {
      // Post text-only tweet
      result = await twitterClient.v2.tweet(content);
    }
    
    return NextResponse.json({
      success: true,
      tweetId: result.data.id,
      hasMedia
    });
  } catch (error: unknown) {
    console.error('Error posting scheduled tweet:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to post tweet' },
      { status: 500 }
    );
  }
}
