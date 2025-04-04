import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/authOptions';
import { TwitterApi } from 'twitter-api-v2';
import db from '@/prisma/db';

export async function GET() {
  try {
    console.log('Twitter connect route called');
    
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'You must be signed in to connect a Twitter account' },
        { status: 401 }
      );
    }
    
    const userId = session.user.id;
    console.log('User ID:', userId);
    
    const user = await db.user.findUnique({
      where: { id: userId }
    });
    
    if (!user) {
      console.error('User not found in database');
      return NextResponse.json(
        { error: 'User account not found' },
        { status: 404 }
      );
    }
    
    const twitterClient = new TwitterApi({
      appKey: process.env.TWITTER_CLIENT_ID!,
      appSecret: process.env.TWITTER_CLIENT_SECRET!,
    });
    
    const baseCallbackUrl = `${process.env.NEXTAUTH_URL}/api/accounts/twitter/callback`;
    
    const encodedUserId = Buffer.from(userId).toString('base64');
    const callbackUrl = `${baseCallbackUrl}?state=${encodedUserId}`;
    
    console.log('Using callback URL:', callbackUrl);
    
    const authLink = await twitterClient.generateAuthLink(callbackUrl);
    console.log('Generated Twitter auth link:', authLink.url);
    
    try {
      await db.account.deleteMany({
        where: {
          userId: userId,
          provider: 'twitter-temp',
        }
      });
      
      const tempAccount = await db.account.create({
        data: {
          userId: userId,
          provider: 'twitter-temp',
          providerAccountId: `${authLink.oauth_token}-${Date.now()}`,
          type: 'oauth',
          oauth_token: authLink.oauth_token,
          oauth_token_secret: authLink.oauth_token_secret,
        }
      });
      
      console.log('Stored temporary Twitter OAuth tokens in database with ID:', tempAccount.id);
    } catch (dbError) {
      console.error('Error storing OAuth tokens:', dbError);
      return NextResponse.json(
        { error: 'Failed to prepare authentication. Please try again.' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ url: authLink.url });
  } catch (error) {
    // Using proper type for Error object
    const typedError = error as Error;
    console.error('Error generating Twitter auth URL:', typedError);
    return NextResponse.json(
      { error: typedError.message || 'Failed to generate Twitter auth URL' },
      { status: 500 }
    );
  }
}