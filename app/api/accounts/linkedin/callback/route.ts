import { NextRequest, NextResponse } from 'next/server';
import db from '@/prisma/db';

export async function GET(request: NextRequest) {
  try {
    console.log('LinkedIn callback route called');
    
    // Extract query parameters
    const url = new URL(request.url);
    const code = url.searchParams.get('code');
    const stateParam = url.searchParams.get('state');
    const error = url.searchParams.get('error');
    const errorDescription = url.searchParams.get('error_description');
    
    console.log('LinkedIn callback params:', {
      code: code ? 'present' : 'missing',
      state: stateParam ? 'present' : 'missing',
      error: error || 'none',
      errorDescription: errorDescription || 'none'
    });
 
    if (error) {
      console.error(`LinkedIn error: ${error} - ${errorDescription}`);
      return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/?error=${encodeURIComponent(errorDescription || 'LinkedIn authentication failed')}`);
    }
    
    if (!code || !stateParam) {
      return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/?error=${encodeURIComponent('Missing parameters from LinkedIn')}`);
    }
    
    // Extract user ID from state
    let userId: string;
    try {
      const decoded = Buffer.from(stateParam, 'base64').toString();
      const { userId: decodedUserId } = JSON.parse(decoded);
      userId = decodedUserId;
      console.log('Retrieved user ID from state parameter:', userId);
    } catch (error) {
      console.error('Error parsing state parameter:', error);
      return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/?error=${encodeURIComponent('Invalid authentication state')}`);
    }
    
    // Check if user exists
    const user = await db.user.findUnique({
      where: { id: userId }
    });
    
    if (!user) {
      console.error('User not found in database:', userId);
      return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/?error=${encodeURIComponent('User account not found')}`);
    }
    
    // Handle OAuth exchange
    try {
      // Exchange code for token
      console.log('Token exchange parameters:', {
        grant_type: 'authorization_code',
        code: code?.substring(0, 10) + '...',
        redirect_uri: `${process.env.NEXTAUTH_URL}/api/accounts/linkedin/callback`,
        client_id: process.env.LINKEDIN_CLIENT_ID?.substring(0, 5) + '...',
        client_secret: process.env.LINKEDIN_CLIENT_SECRET ? 'present' : 'missing'
      });
      
      const tokenResponse = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: `${process.env.NEXTAUTH_URL}/api/accounts/linkedin/callback`,
          client_id: process.env.LINKEDIN_CLIENT_ID!,
          client_secret: process.env.LINKEDIN_CLIENT_SECRET!,
        }),
      });
      
      console.log('LinkedIn token exchange status:', tokenResponse.status);
      
      const responseText = await tokenResponse.text();
      console.log('Raw token response (first 100 chars):', responseText.substring(0, 100));
      
      if (!tokenResponse.ok) {
        console.error('LinkedIn token exchange error:', responseText);
        return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/?error=${encodeURIComponent('Failed to get LinkedIn access token')}`);
      }
      
      const tokenData = JSON.parse(responseText);
      console.log('LinkedIn token data received:', Object.keys(tokenData).join(', '));
      
      const { access_token, expires_in, scope } = tokenData;
      
      if (!access_token) {
        throw new Error('No access token in response');
      }
      
      // Get LinkedIn profile information
      let linkedinId = null;
      let linkedinName = null;
      
      try {
        // Try first with the userinfo endpoint (OpenID)
        console.log('Fetching LinkedIn profile from userinfo endpoint');
        const userinfoResponse = await fetch('https://api.linkedin.com/v2/userinfo', {
          headers: {
            'Authorization': `Bearer ${access_token}`,
          },
        });
        
        if (userinfoResponse.ok) {
          const userinfoData = await userinfoResponse.json();
          console.log('LinkedIn userinfo data:', JSON.stringify(userinfoData).substring(0, 200));
          
          if (userinfoData.sub) {
            linkedinId = userinfoData.sub;
            linkedinName = [userinfoData.given_name, userinfoData.family_name]
              .filter(Boolean).join(' ');
            console.log('Successfully got LinkedIn ID from userinfo:', linkedinId, 'Name:', linkedinName);
          }
        } else {
          console.log('LinkedIn userinfo request failed:', await userinfoResponse.text());
        }
      } catch (profileError) {
        console.error('Error getting LinkedIn profile from userinfo:', profileError);
      }
      
      // If user info endpoint didn't work, try getting the profile data another way
      if (!linkedinId) {
        try {
          // Try another approach - getting profile data from the API
          console.log('Fetching LinkedIn profile data from v2/me endpoint');
          const profileResponse = await fetch('https://api.linkedin.com/v2/me', {
            headers: {
              'Authorization': `Bearer ${access_token}`,
            },
          });
          
          if (profileResponse.ok) {
            const profileData = await profileResponse.json();
            console.log('LinkedIn profile data:', JSON.stringify(profileData).substring(0, 200));
            
            if (profileData.id) {
              linkedinId = profileData.id;
              linkedinName = `${profileData.localizedFirstName || ''} ${profileData.localizedLastName || ''}`.trim();
              console.log('Successfully got LinkedIn ID from profile API:', linkedinId, 'Name:', linkedinName);
            }
          } else {
            console.log('LinkedIn profile request failed:', await profileResponse.text());
          }
        } catch (profileApiError) {
          console.error('Error getting LinkedIn profile from API:', profileApiError);
        }
      }
      
      // If the above methods fail, try to extract it from an error response
      if (!linkedinId) {
        try {
          console.log('Trying to extract LinkedIn ID from test API call');
          
          // Make a test API call that will likely fail but might contain the user ID in the error
          const dummyResponse = await fetch('https://api.linkedin.com/v2/ugcPosts', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${access_token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              lifecycleState: 'PUBLISHED',
              specificContent: {
                'com.linkedin.ugc.ShareContent': {
                  shareCommentary: {
                    text: ''
                  },
                  shareMediaCategory: 'NONE'
                }
              },
              visibility: {
                'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC'
              }
            }),
          });
          
          const errorBody = await dummyResponse.text();
          console.log('LinkedIn test API call result:', errorBody.substring(0, 200));
        
          const match = errorBody.match(/urn:li:person:([a-zA-Z0-9_-]+)/);
          if (match && match[1]) {
            linkedinId = match[1];
            console.log('Extracted LinkedIn ID from error response:', linkedinId);
            
            // Try to get profile data now that we have an ID
            try {
              const profileByIdResponse = await fetch(`https://api.linkedin.com/v2/people/(id:${linkedinId})`, {
                headers: {
                  'Authorization': `Bearer ${access_token}`,
                },
              });
              
              if (profileByIdResponse.ok) {
                const profileData = await profileByIdResponse.json();
                linkedinName = `${profileData.localizedFirstName || ''} ${profileData.localizedLastName || ''}`.trim();
                console.log('Retrieved LinkedIn name from profile endpoint:', linkedinName);
              }
            } catch (nameError) {
              console.error('Error getting LinkedIn name with ID:', nameError);
            }
          }
        } catch (apiError) {
          console.error('Error extracting LinkedIn ID from API call:', apiError);
        }
      }
      
      // If we still can't get a LinkedIn ID, generate a temporary one
      if (!linkedinId) {
        linkedinId = `temp_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
        linkedinName = "LinkedIn User"; // Default name if we can't get the actual name
        console.log('No LinkedIn ID available, generated temporary ID:', linkedinId);
      }
      
      // Store LinkedIn tokens in database
      console.log('Storing LinkedIn tokens in database');
      await db.account.upsert({
        where: {
          provider_providerAccountId: {
            provider: 'linkedin',
            providerAccountId: linkedinId,
          },
        },
        update: {
          access_token,
          expires_at: Math.floor(Date.now() / 1000) + expires_in,
          scope,
          token_type: 'bearer',
          userId,
        },
        create: {
          provider: 'linkedin',
          providerAccountId: linkedinId,
          type: 'oauth',
          access_token,
          expires_at: Math.floor(Date.now() / 1000) + expires_in,
          scope,
          token_type: 'bearer',
          userId,
        },
      });
      
      // Update user profile with LinkedIn data
      await db.user.update({
        where: { id: userId },
        data: { 
          linkedinProfileId: linkedinId,
          linkedinName: linkedinName  // Store the LinkedIn name
        },
      });
      
      console.log('LinkedIn account connected successfully');
      
      // Redirect back to the app
      return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/?success=${encodeURIComponent('LinkedIn account connected successfully!')}`);
    } catch (error: unknown) {
      console.error('Error connecting LinkedIn account:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/?error=${encodeURIComponent(errorMessage)}`);
    }
  } catch (error: unknown) {
    console.error('Unexpected error in LinkedIn callback:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/?error=${encodeURIComponent(errorMessage)}`);
  }
}