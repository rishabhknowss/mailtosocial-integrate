import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/authOptions';

export async function GET(request: NextRequest) {
  try {
    // Verify user is authenticated
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get the image URL from the query parameters
    const url = new URL(request.url);
    const imageUrl = url.searchParams.get('url');
    
    if (!imageUrl) {
      return NextResponse.json({ error: 'No image URL provided' }, { status: 400 });
    }
    
    // Validate the URL format
    let validatedUrl: URL;
    try {
      validatedUrl = new URL(imageUrl);
      
      // Only allow http and https protocols for security
      if (validatedUrl.protocol !== 'http:' && validatedUrl.protocol !== 'https:') {
        throw new Error('Invalid URL protocol');
      }
    } catch {
      return NextResponse.json({ error: 'Invalid image URL' }, { status: 400 });
    }
    
    // Fetch the image
    const response = await fetch(imageUrl, {
      headers: {
        // Set a user-agent to avoid rejections from some servers
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch image: ${response.statusText}` },
        { status: response.status }
      );
    }
    
    // Get the content type from the response
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    
    // Check if the content is actually an image
    if (!contentType.startsWith('image/')) {
      return NextResponse.json(
        { error: 'The URL does not point to a valid image' },
        { status: 400 }
      );
    }
    
    // Get the image data
    const imageBuffer = await response.arrayBuffer();
    
    // Create a new response with the image data
    const imageResponse = new Response(imageBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
        'Content-Length': imageBuffer.byteLength.toString()
      }
    });
    
    return imageResponse;
  } catch (err) {
    console.error('Error proxying image:', err);
    return NextResponse.json(
      { error: 'Failed to proxy image' },
      { status: 500 }
    );
  }
}