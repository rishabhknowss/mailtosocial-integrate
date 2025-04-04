import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/authOptions';

// Define the request body type
interface GenerateVideoScriptRequest {
  title: string;
  content: string;
  description?: string;
  tone: string;
}

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body: GenerateVideoScriptRequest = await request.json();
    const { title, content, description, tone } = body;

    // Check for required fields
    if (!title || !content || !tone) {
      return NextResponse.json(
        { error: 'Missing required fields: title, content, or tone' },
        { status: 400 }
      );
    }

    // Get Gemini API key from environment variables
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('GEMINI_API_KEY is not defined in environment variables');
      return NextResponse.json(
        { error: 'API configuration error' },
        { status: 500 }
      );
    }

    // Create the prompt for the video script based on the content and tone
    const prompt = `Create a professional, engaging video script based on the following content. The script should be in a ${tone} tone.

The script should include:
- A compelling opening scene that hooks the viewer
- Scene transitions with bracketed directions ([Scene Change], [Cut to], etc.)
- A clear narrative flow from introduction to key points to conclusion
- Strategic pauses and emphasis on important points
- A strong call to action at the end

Format the script with:
- Clear scene descriptions in brackets
- Narration/dialogue clearly separated from scene directions
- Line breaks between different sections
- A natural, conversational flow for the narration

Content Details:
Title: ${title}
${description ? `Description: ${description}` : ''}

Main Content:
${content}

Please create a video script that would be approximately 60-90 seconds when read aloud. Focus on the most compelling aspects of the content. Return only the formatted script with no additional commentary.`;

    // Make request to Gemini API
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }]
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Gemini API error:', errorData);
      return NextResponse.json(
        { error: 'Failed to generate video script with AI' },
        { status: response.status }
      );
    }

    const responseData = await response.json();
    
    // Extract the generated script from the Gemini response
    let generatedScript = '';
    
    if (responseData.candidates && responseData.candidates.length > 0) {
      const content = responseData.candidates[0].content;
      if (content && content.parts && content.parts.length > 0) {
        generatedScript = content.parts[0].text || '';
        
        // Clean up response - remove any markdown formatting or explanation text
        generatedScript = generatedScript.replace(/^```.*$/mg, '').trim();
      }
    }

    if (!generatedScript) {
      return NextResponse.json(
        { error: 'Failed to generate script content' },
        { status: 500 }
      );
    }

    return NextResponse.json({ script: generatedScript });
  } catch (error: unknown) {
    console.error('Error generating video script:', error);
    
    let errorMessage = 'Failed to generate video script';
    
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