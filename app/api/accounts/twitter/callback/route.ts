import { NextRequest, NextResponse } from 'next/server';
import { TwitterApi } from 'twitter-api-v2';
import db from '@/prisma/db';

export async function GET(request: NextRequest) {
  try {
    console.log('Twitter callback route called');
    
    const url = new URL(request.url);
    const oauthToken = url.searchParams.get('oauth_token');
    const oauthVerifier = url.searchParams.get('oauth_verifier');
    const stateParam = url.searchParams.get('state');
    
    console.log('Callback params:', {
      oauthToken: oauthToken ? 'present' : 'missing',
      oauthVerifier: oauthVerifier ? 'present' : 'missing',
      state: stateParam ? 'present' : 'missing'
    });
    
    if (!oauthToken || !oauthVerifier) {
      console.error('Missing OAuth parameters');
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL}/?error=${encodeURIComponent('Missing OAuth parameters from Twitter')}`
      );
    }
    
    if (!stateParam) {
      console.error('Missing state parameter');
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL}/?error=${encodeURIComponent('Missing authentication state parameter')}`
      );
    }
    
    let userId: string;
    try {
      userId = Buffer.from(stateParam, 'base64').toString();
      console.log('Retrieved user ID from state parameter:', userId);
    } catch (e) {
      console.error('Error decoding state parameter:', e);
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL}/?error=${encodeURIComponent('Invalid authentication state')}`
      );
    }
    
    const user = await db.user.findUnique({
      where: { id: userId }
    });
    
    if (!user) {
      console.error('User not found in database');
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL}/?error=${encodeURIComponent('User account not found')}`
      );
    }
    
    try {
      console.log('Retrieving OAuth token secrets from database');
      const tempAuths = await db.account.findMany({
        where: {
          userId: userId,
          provider: 'twitter-temp',
        },
      });
      
      console.log(`Found ${tempAuths.length} temporary auth records`);
      
      const tempAuth = tempAuths.find(auth => auth.oauth_token === oauthToken);
      
      if (!tempAuth || !tempAuth.oauth_token_secret) {
        console.error('OAuth token secret not found in database');
        console.log('Available tokens:', tempAuths.map(a => a.oauth_token));
        return NextResponse.redirect(
          `${process.env.NEXTAUTH_URL}/?error=${encodeURIComponent('Authentication session expired. Please try again.')}`
        );
      }
      
      console.log('Found OAuth token secret in database');
      
      console.log('Initializing Twitter client with OAuth token and secret');
      const twitterClient = new TwitterApi({
        appKey: process.env.TWITTER_CLIENT_ID!,
        appSecret: process.env.TWITTER_CLIENT_SECRET!,
        accessToken: oauthToken,
        accessSecret: tempAuth.oauth_token_secret,
      });
      
      console.log('Exchanging OAuth verifier for access token');
      const { client: loggedClient, accessToken, accessSecret } = await twitterClient.login(oauthVerifier);
      
      console.log('Getting Twitter user information');
      const currentUser = await loggedClient.currentUser();
      const twitterId = currentUser.id_str;
      const username = currentUser.screen_name;
      
      console.log('Twitter user connected:', { twitterId, username });
      
      const existingAccount = await db.account.findFirst({
        where: {
          provider: 'twitter',
          providerAccountId: twitterId,
        },
      });
      
      if (existingAccount && existingAccount.userId !== userId) {
        console.error('Twitter account already linked to another user');
        return NextResponse.redirect(
          `${process.env.NEXTAUTH_URL}/?error=${encodeURIComponent('Twitter account already linked to another user')}`
        );
      }
      
      console.log('Storing Twitter tokens in database');
      await db.account.upsert({
        where: {
          provider_providerAccountId: {
            provider: 'twitter',
            providerAccountId: twitterId,
          },
        },
        update: {
          oauth_token: accessToken,
          oauth_token_secret: accessSecret,
          userId,
        },
        create: {
          provider: 'twitter',
          providerAccountId: twitterId,
          type: 'oauth',
          oauth_token: accessToken,
          oauth_token_secret: accessSecret,
          userId,
        },
      });
      
      console.log('Updating user profile with Twitter username');
      await db.user.update({
        where: { id: userId },
        data: { twitterUsername: username },
      });
   
      await db.account.deleteMany({
        where: {
          userId: userId,
          provider: 'twitter-temp',
        },
      });
      
      console.log('Twitter account connection successful');
   
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL}/?success=${encodeURIComponent('Twitter account connected successfully')}`
      );
    } catch (apiError) {
      // Using proper type for Error object
      const typedError = apiError as Error & { data?: unknown };
      console.error('Twitter API error:', typedError);
      if (typedError.data) {
        console.error('Twitter API error details:', typedError.data);
      }
      
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL}/?error=${encodeURIComponent('Error connecting to Twitter: ' + typedError.message)}`
      );
    }
  } catch (error) {
    // Using proper type for Error object
    const typedError = error as Error;
    console.error('Error connecting Twitter account:', typedError);
    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL}/?error=${encodeURIComponent(typedError.message || 'Error connecting Twitter account')}`
    );
  }
}