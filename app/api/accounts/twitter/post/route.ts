import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/authOptions';
import { TwitterApi } from 'twitter-api-v2';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'You must be signed in to post a tweet' },
        { status: 401 }
      );
    }
    
    const contentType = request.headers.get('content-type') || '';
    
    let text = '';
    let mediaFile = null;
    
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      text = formData.get('text') as string;
      mediaFile = formData.get('media') as File;
    } 
    else if (contentType.includes('application/json')) {
      const body = await request.json();
      text = body.text;
    } 
    else if (contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await request.formData();
      text = formData.get('text') as string;
    }
    else {
      const body = await request.text();
      try {
        const jsonBody = JSON.parse(body);
        text = jsonBody.text;
      } catch (e) {
        console.error('Failed to parse request body:', e);
        return NextResponse.json(
          { error: 'Unable to parse request body' },
          { status: 400 }
        );
      }
    }
    
    if (!text || text.trim().length === 0) {
      return NextResponse.json(
        { error: 'Tweet text is required' },
        { status: 400 }
      );
    }
    
    const twitterAccount = await prisma.account.findFirst({
      where: {
        userId: session.user.id,
        provider: 'twitter',
      },
    });
    
    if (!twitterAccount || !twitterAccount.oauth_token || !twitterAccount.oauth_token_secret) {
      return NextResponse.json(
        { error: 'Twitter account is not properly connected' },
        { status: 403 }
      );
    }
    
    const twitterClient = new TwitterApi({
      appKey: process.env.TWITTER_CLIENT_ID!,
      appSecret: process.env.TWITTER_CLIENT_SECRET!,
      accessToken: twitterAccount.oauth_token,
      accessSecret: twitterAccount.oauth_token_secret,
    });
    
    let result;
    
    if (mediaFile) {
      try {
        const arrayBuffer = await mediaFile.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        
        const mediaId = await twitterClient.v1.uploadMedia(buffer, { 
          mimeType: mediaFile.type 
        });
        
        result = await twitterClient.v2.tweet(text, {
          media: { media_ids: [mediaId] }
        });
      } catch (error: Error | unknown) {
        console.error('Error uploading image:', error);
        result = await twitterClient.v2.tweet(text);
      }
    } else {
      result = await twitterClient.v2.tweet(text);
    }
    
    // Save the posted tweet to the database
    try {
      await prisma.postedTweet.create({
        data: {
          userId: session.user.id,
          tweetId: result.data.id,
          content: text,
          postedAt: new Date(),
        },
      });
    } catch (dbError) {
      console.error('Error saving tweet to database:', dbError);
      // Don't fail the request if database save fails
    }
    
    return NextResponse.json({
      success: true,
      tweetId: result.data.id,
    });
  } catch (error: Error | unknown) {
    console.error('Error posting tweet:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to post tweet' },
      { status: 500 }
    );
  }
}