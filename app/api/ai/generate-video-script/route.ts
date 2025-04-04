import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/authOptions';
import prisma from '@/prisma/db';

interface Scene {
  content: string;
  imagePrompts: string[];
}

interface ScriptResponse {
  scenes: Scene[];
  fullScript: string;
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { title, content, description, tone } = await req.json();

    if (!content || !title) {
      return NextResponse.json({ error: 'Content and title are required' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('Gemini API key is missing');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    // Create a prompt that uses the URL content and tone
    const scriptPrompt = `
    Create a captivating 30-40 second video script based on this article:
    
    Title: ${title}
    Description: ${description || ''}
    Content: ${content}
    
    Use a ${tone} tone and structure the video as 4-6 distinct scenes.
    
    For each scene, provide:
    1. Content: A short paragraph of spoken text (30-60 words) that:
       - Uses a ${tone} tone
       - Maintains first-person perspective
       - Follows a clear story arc
       - Captures the key points from the article
    
    2. Visual Direction: For each scene, generate 2-3 distinct image prompts that:
       - Match the ${tone} tone
       - Illustrate the content effectively
       - Create visual variety while maintaining consistency
       - Include specific details about composition, lighting, and style
    
    Format the response as valid JSON with this structure:
    {
      "scenes": [
        {
          "content": "The spoken text for scene 1",
          "imagePrompts": [
            "Detailed image generation prompt 1 for scene 1",
            "Detailed image generation prompt 2 for scene 1",
            "Optional third prompt for scene 1"
          ]
        }
      ]
    }
    
    Guidelines:
    - Adapt the article's content into a compelling narrative
    - Maintain the ${tone} tone throughout
    - Ensure smooth transitions between scenes
    - End with a clear call-to-action
    - Keep the total spoken content around 30-40 seconds when read naturally
    `;

    console.log('Generating video script from URL content');

    const result = await model.generateContent(scriptPrompt);
    const responseText = result.response.text();

    if (!responseText) {
      return NextResponse.json({ error: 'AI generated empty content' }, { status: 500 });
    }

    try {
      // Extract and parse JSON from response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Could not extract JSON from response');
      }

      const parsedResponse: ScriptResponse = JSON.parse(jsonMatch[0]);

      // Validate response structure
      if (!parsedResponse.scenes || !Array.isArray(parsedResponse.scenes)) {
        throw new Error('Invalid response format: missing scenes array');
      }

      // Validate each scene
      parsedResponse.scenes.forEach((scene, index) => {
        if (!scene.content || !scene.imagePrompts || !Array.isArray(scene.imagePrompts)) {
          throw new Error(`Invalid scene format in scene ${index + 1}`);
        }
      });

      // Create full script from scenes
      const fullScript = parsedResponse.scenes.map(scene => scene.content).join('\n\n');

      // Save project to database
      const project = await prisma.project.create({
        data: {
          userId: session.user.id,
          title: title,
          description: description || '',
          prompt: scriptPrompt,
          scenes: JSON.stringify(parsedResponse.scenes),
          imagePrompts: parsedResponse.scenes.flatMap(scene => scene.imagePrompts),
          status: 'DRAFT'
        }
      });

      return NextResponse.json({
        success: true,
        projectId: project.id,
        scenes: parsedResponse.scenes,
        script: fullScript
      });

    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
      return NextResponse.json({
        error: parseError instanceof Error ? parseError.message : 'Unknown error'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Script generation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 