import "../deno.d.ts"
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { oauth1a } from "jsr:@nexterias/twitter-api-fetch@3.0.1";

// This is a proxy endpoint to handle Twitter API calls that require OAuth 1.0a authentication
// It's used by the publish-scheduled-posts function to post tweets with user context authentication

serve(async (req) => {
  try {
    // Only allow POST requests
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Parse request body
    const requestBody = await req.json();
    
    // Validate request parameters
    const {
      action,
      content,
      oauthToken,
      oauthTokenSecret,
      mediaId
    } = requestBody;
    
    if (!action) {
      return new Response(JSON.stringify({ error: 'Action is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    if (action === 'tweet' && !content) {
      return new Response(JSON.stringify({ error: 'Tweet content is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    if (!oauthToken || !oauthTokenSecret) {
      return new Response(JSON.stringify({ error: 'OAuth tokens are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get consumer key and secret
    const consumerKey = Deno.env.get('TWITTER_CLIENT_ID') || '';
    const consumerSecret = Deno.env.get('TWITTER_CLIENT_SECRET') || '';
    
    if (!consumerKey || !consumerSecret) {
      return new Response(JSON.stringify({ error: 'Missing Twitter API consumer credentials' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Handle tweet action - upload_media action is now handled by Next.js API
    if (action === 'tweet') {
      // Validate required parameters for tweet action
      if (!content) {
        return new Response(JSON.stringify({ error: 'Tweet content is required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      console.log('Posting tweet with content:', content);
      
      try {
        // For Twitter API v2 tweet endpoint
        const tweetUrl = 'https://api.twitter.com/2/tweets';
        
        // Define interfaces for Twitter API requests
        interface TwitterTweetBody {
          text: string;
          media?: {
            media_ids: string[];
          };
        }
        
        // Prepare the tweet request body
        const tweetBody: TwitterTweetBody = {
          text: content
        };
        
        // Add media if provided
        if (mediaId) {
          console.log(`Adding media (${mediaId}) to tweet`);
          tweetBody.media = {
            media_ids: [mediaId]
          };
        }
        
        // Create an OAuth 1.0a Twitter API client using the nexterias/twitter-api-fetch library
        const twitterFetch = await oauth1a({
          consumerKey: consumerKey,
          secretConsumerKey: consumerSecret,
          accessToken: oauthToken,
          secretAccessToken: oauthTokenSecret
        });
        
        console.log('Making Twitter API request with OAuth 1.0a');
        
        // Make the API request to post the tweet
        const response = await twitterFetch(tweetUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(tweetBody)
        });
        
        // Parse the response
        const data = await response.json();
        
        if (!response.ok) {
          console.error('Twitter API error:', data);
          throw new Error(`Twitter API error: ${JSON.stringify(data)}`);
        }
        
        return new Response(JSON.stringify({
          id: data.data.id,
          text: data.data.text
        }), {
          headers: { 'Content-Type': 'application/json' }
        });
      } catch (apiError) {
        console.error('Error during Twitter API call:', apiError);
        
        return new Response(JSON.stringify({
          error: 'Error posting to Twitter API',
          message: apiError instanceof Error ? apiError.message : 'Unknown error'
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    } else {
      return new Response(JSON.stringify({ 
        error: 'Unsupported action type', 
        message: `Action '${action}' is not supported. Use 'tweet' for posting tweets.` 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  } catch (error) {
    console.error('Unhandled error in twitter-proxy:', error);
    
    return new Response(JSON.stringify({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}); 