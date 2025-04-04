import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/authOptions';
import db from '@/prisma/db';

export async function GET() {
  try {
    console.log('LinkedIn connect route called');
    
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'You must be signed in to connect a LinkedIn account' },
        { status: 401 }
      );
    }
    const userId = session.user.id;
    console.log('User ID from session:', userId);
    
  
    const user = await db.user.findUnique({
      where: { id: userId }
    });
    
    if (!user) {
      console.error('User not found in database:', userId);
      return NextResponse.json(
        { error: 'User account not found' },
        { status: 404 }
      );
    }
    
   
    const clientId = process.env.LINKEDIN_CLIENT_ID;
    if (!clientId) {
      console.error('LINKEDIN_CLIENT_ID environment variable is missing');
      return NextResponse.json(
        { error: 'LinkedIn configuration error' },
        { status: 500 }
      );
    }
    
    const redirectUri = `${process.env.NEXTAUTH_URL}/api/accounts/linkedin/callback`;
    console.log('Using redirect URI:', redirectUri);
    
   
    const scope = 'openid profile email w_member_social';
    console.log('Requesting LinkedIn scopes:', scope);
    
    const state = Buffer.from(JSON.stringify({ 
      userId: userId,
      timestamp: Date.now() 
    })).toString('base64');
    
   
    const authUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&scope=${encodeURIComponent(scope)}`;
    
    console.log('Generated LinkedIn auth URL:', authUrl.substring(0, 100) + '...');
    
    return NextResponse.json({ url: authUrl });
  } catch (error: unknown) {
    console.error('Error generating LinkedIn auth URL:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to generate LinkedIn auth URL';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}