import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/authOptions';
import { GoogleGenAI } from "@google/genai";

interface GenerateImageRequest {
  postContent: string;
  platform: 'twitter' | 'linkedin';
  style: 'illustration' | 'meme' | 'infographic';
}

export async function POST(request: NextRequest) {
  try {
    // Verify user is authenticated
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get the request body
    const body: GenerateImageRequest = await request.json();
    const { postContent, style, platform } = body;
    
    // Validate the request
    if (!postContent) {
      return NextResponse.json({ error: 'No post content provided' }, { status: 400 });
    }

    if (!style || !['illustration', 'meme', 'infographic'].includes(style)) {
      return NextResponse.json({ error: 'Invalid image style' }, { status: 400 });
    }
    
    // Initialize the Gemini API client
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('GEMINI_API_KEY not set in environment variables');
      return NextResponse.json({ error: 'API configuration error' }, { status: 500 });
    }

    const ai = new GoogleGenAI({ apiKey });
    
    // Create a prompt based on the post content and desired style
    let prompt = "";
    
    switch (style) {
      case 'illustration':
        prompt = `Create a professional, high-quality illustration that visualizes the following ${platform} post:
        
"${postContent}"

The illustration should:
- Have a clean, modern aesthetic with vibrant colors
- Be visually appealing and professional looking
- Incorporate visual metaphors related to the post content
- Be suitable for social media
- Include minimal text, focusing on visual storytelling
- Maintain a consistent visual style throughout
- Be optimized for ${platform === 'twitter' ? 'Twitter/X' : 'LinkedIn'} engagement
`;
        break;
        
      case 'meme':
        prompt = `Create a clever, engaging meme based on this ${platform} post:
        
"${postContent}"

The meme should:
- Be humorous and witty, but professional enough for ${platform === 'linkedin' ? 'a business context' : 'social media'}
- Use a relevant, recognizable meme format if applicable
- Include minimal text overlay (no more than 2 short lines) that captures the essence of the post
- Be visually clean with high contrast between text and background
- Appeal to ${platform === 'linkedin' ? 'professionals' : 'a general audience'}
- Be optimized for sharing and engagement
`;
        break;
        
      case 'infographic':
        prompt = `Create a clean, informative infographic based on this ${platform} post:
        
"${postContent}"

The infographic should:
- Present key information in a visually organized way
- Use a clean, professional design with a coherent color scheme
- Include relevant icons, charts, or data visualizations if applicable
- Have a clear visual hierarchy and reading flow
- Limit text to essential points only
- Be easily readable at a glance
- Be optimized for ${platform === 'twitter' ? 'Twitter/X' : 'LinkedIn'} sharing
`;
        break;
    }

    // Generate the image
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash-exp-image-generation",
      contents: prompt,
      config: {
        responseModalities: ["Text", "Image"],
      },
    });

    let imageBase64 = null;
    
    if (response.candidates && response.candidates.length > 0) {
      for (const part of response.candidates[0]?.content?.parts || []) {
        if (part.inlineData) {
          imageBase64 = part.inlineData.data;
          break;
        }
      }
    }

    if (!imageBase64) {
      return NextResponse.json(
        { error: 'Failed to generate image' },
        { status: 500 }
      );
    }

    return NextResponse.json({ image: imageBase64 });
  } catch (error: unknown) {
    console.error('Error generating image:', error);
    
    let errorMessage = 'Failed to generate image';
    
    // Type check for Error instances
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
} 