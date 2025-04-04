// app/api/ai/generate-post/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/authOptions';

// Define the request body type
interface GeneratePostRequest {
  emailContent?: {
    subject: string;
    body: string;
    from: string;
    date: string;
  };
  urlContent?: {
    title: string;
    content: string;
    url: string;
    description?: string;
    author?: string;
    date?: string;
  };
  tone: 'professional' | 'casual' | 'funny' | 'storytelling' | 'promotional';
  platform: 'twitter' | 'linkedin';
  maxLength?: number;
  variant?: string; // Add variant type for different post styles
}

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body: GeneratePostRequest = await request.json();
    const { emailContent, urlContent, tone, platform, maxLength = 280, variant = 'concise' } = body;

    // Check for required fields
    if ((!emailContent && !urlContent) || !tone || !platform) {
      return NextResponse.json(
        { error: 'Missing required fields: content source (email or URL), tone, or platform' },
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

    // Base prompt with platform-specific instructions
    let prompt = `Create a ${tone} ${platform} post based on the following content. do not use hashtags or emojis. `;
    
    if (platform === 'twitter') {
      prompt += `The post should be concise and engaging, no more than ${maxLength} characters. `;
    } else if (platform === 'linkedin') {
      prompt += `The post should be professional and insightful, optimized for LinkedIn's audience. `;
    }
    
    // Add rulebook for the specific tone
    switch (tone) {
      case 'professional':
        prompt += `
Follow this Professional Post Rulebook:
• Hook: Start with a bold, intriguing, or thought-provoking statement that grabs attention immediately. The hook should be no longer than 5-6 words—the shorter, the better.
• Clarity & Brevity: Ensure every word serves a purpose. Avoid excessive jargon and unnecessary complexity. Get straight to the point without wasting time.
• Proper Line Spacing: Use line breaks to organize thoughts and make the post visually appealing and easier to read.
• Impactful Sentences: Focus on delivering value with each sentence. Be precise and direct, avoiding fluff.
• Calls to Action: Use clear, actionable language to prompt engagement (asking for replies, clicks, or shares).
• Personality: Maintain a professional yet approachable tone. Let your personality shine through while keeping the language respectful and authoritative.
• Audience Engagement: Ask thought-provoking questions or provide insights that stir conversation by addressing needs, challenges, or curiosity.
• Emojis: Use professional emojis sparingly, only if they enhance the message.
• Tone & Language: Formal yet conversational. Avoid overly technical language unless suitable for the audience.
• Directness: Share insights clearly without ambiguity or over-explanation.`;
        break;
      case 'funny':
        prompt += `
Follow this Funny Post Rulebook:
• Hook: Start with a humorous or witty statement that instantly catches attention. Keep the hook no longer than 5-6 words.
• Clarity & Brevity: Humor works best when simple and direct. Keep your post short, with the punchline coming quickly.
• Proper Line Spacing: Break up the post into readable chunks for better humor flow.
• Impactful Sentences: Every sentence should build towards the punchline or enhance the humor.
• Calls to Action: Include fun, engaging prompts like "What do you think?" to encourage interaction.
• Personality: Let your wit, sarcasm, or playful nature come through. Your personality should shine the most.
• Audience Engagement: Encourage replies with humor that resonates with followers through relatable moments.
• Emojis: Use fun emojis strategically, to add to the humor, but don't rely on them to carry the joke.
• Tone & Language: Light-hearted, fun, and relaxed. Deliver humor with a casual, conversational tone.
• Directness: Be straightforward with your joke. Don't overcomplicate the punchline—keep it simple and effective.`;
        break;
      case 'casual':
        prompt += `
Follow this Casual Post Rulebook:
• Hook: Open with something relatable, casual, and engaging. Keep the hook no longer than 5-6 words.
• Clarity & Brevity: Keep the post straightforward and easy to understand. Just share the point in a relaxed way.
• Proper Line Spacing: Break the post into clear, digestible parts.
• Impactful Sentences: Keep sentences short and conversational. Get right to the point without over-explaining.
• Calls to Action: Invite followers to share thoughts or experiences with casual, open-ended prompts.
• Personality: Let your personality come through in a relaxed way. Speak like you're talking to a friend.
• Audience Engagement: Ask relatable questions or share personal experiences that invite responses.
• Emojis: Use friendly emojis sparingly, to create an informal tone.
• Tone & Language: Light and conversational, as if chatting with someone you know well.
• Directness: Share thoughts directly without overthinking. Casual posts should feel genuine, not forced.`;
        break;
      case 'storytelling':
        prompt += `
Follow this Storytelling Post Rulebook:
• Hook: Start with an engaging sentence that immediately draws people in. The hook should be no longer than 5-6 words.
• Clarity & Brevity: Even in a story, keep the post concise. Every part should serve a purpose and add value.
• Proper Line Spacing: Use line breaks to split the story into digestible pieces for smooth flow.
• Impactful Sentences: Each sentence should advance the story or build up to a key moment.
• Calls to Action: After telling the story, prompt your audience to share thoughts or experiences.
• Personality: Make the story personal and authentic, reflecting your unique voice.
• Audience Engagement: Make your story relatable with questions that invite responses.
• Emojis: Use narrative emojis sparingly, to enhance emotional tone.
• Tone & Language: Match the tone to the content—light-hearted, serious, or inspiring as needed.
• Directness: Keep storytelling authentic and true to your experience with a simple, engaging narrative.`;
        break;
      case 'promotional':
        prompt += `
Follow this Promotional Post Rulebook:
• Hook: Start with an enticing offer or statement that makes the value clear. The hook should be no longer than 5-6 words.
• Clarity & Brevity: Be concise about what the promotion is, why it's valuable, and how to access it.
• Proper Line Spacing: Break the post into chunks separating the offer, benefits, and CTA clearly.
• Impactful Sentences: Make the promotion sound irresistible with short, value-focused sentences.
• Calls to Action: Make the CTA clear and direct: "Shop now," "Claim your offer," etc.
• Personality: Keep the tone friendly and persuasive without sounding overly salesy.
• Audience Engagement: Encourage interaction with questions about features or use cases.
• Emojis: Use promotional emojis sparingly, to highlight urgency or excitement.
• Tone & Language: Enthusiastic yet professional, showcasing benefits with an approachable tone.
• Directness: Be transparent about the promotion, letting followers know exactly what's offered.`;
        break;
    }

    // Add variant-specific instructions
    switch (variant) {
      case 'concise':
        prompt += `
Make this post brief and to-the-point by:
• Removing any words that don't contribute to the core message
• Getting straight to the point as early as possible
• Eliminating unnecessary details or secondary information
• Delivering the main idea in the shortest, most impactful manner`;
        break;
      case 'detailed':
        prompt += `
Make this post more detailed by:
• Adding context or background to make the message clearer
• Including additional value to further engage the audience
• Breaking down the message into more digestible parts for better clarity
• Elaborating on specific points to enhance understanding`;
        break;
      case 'engaging':
        prompt += `
Make this post more engaging by:
• Crafting content that sparks curiosity or provokes a reaction
• Including a clear call to action that encourages replies or engagement
• Using a relatable and conversational tone that makes it easy for followers to connect
• Inviting followers to share their thoughts, experiences, or opinions`;
        break;
    }
    
    // Format the content based on the source (email or URL)
    if (emailContent) {
      prompt += `
Email Subject: ${emailContent.subject}
From: ${emailContent.from}
Date: ${emailContent.date}

Email Body:
${emailContent.body}

Please create a ${platform} post based on this email content. Return only the post text with no additional commentary, explanation, or quotes.
      `.trim();
    } else if (urlContent) {
      prompt += `
Article Title: ${urlContent.title}
URL: ${urlContent.url}
${urlContent.author ? `Author: ${urlContent.author}` : ''}
${urlContent.date ? `Date: ${urlContent.date}` : ''}
${urlContent.description ? `Description: ${urlContent.description}` : ''}

Article Content:
${urlContent.content}

Please create a ${platform} post based on this article content. Return only the post text with no additional commentary, explanation, or quotes.
      `.trim();
    }

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
        { error: 'Failed to generate post with AI' },
        { status: response.status }
      );
    }

    const responseData = await response.json();
    
    // Extract the generated post from the Gemini response
    let generatedPost = '';
    
    if (responseData.candidates && responseData.candidates.length > 0) {
      const content = responseData.candidates[0].content;
      if (content && content.parts && content.parts.length > 0) {
        generatedPost = content.parts[0].text || '';
        
        // Clean up response - remove any markdown formatting, quotes or explanation text
        generatedPost = generatedPost.replace(/^```.*$/mg, '').trim();
        generatedPost = generatedPost.replace(/^.*: /g, '').trim();
        generatedPost = generatedPost.replace(/^["']|["']$/g, '').trim();
        
        // Ensure the post respects the maximum length
        if (generatedPost.length > maxLength) {
          generatedPost = generatedPost.substring(0, maxLength - 3) + '...';
        }
      }
    }

    return NextResponse.json({ post: generatedPost });
  } catch (error: unknown) {
    console.error('Error generating post:', error);
    
    let errorMessage = 'Failed to generate post';
    
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