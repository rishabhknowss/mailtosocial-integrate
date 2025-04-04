import "../deno.d.ts"
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// This function will be invoked on a schedule (e.g., every minute)
// It will check for posts that need to be published and post them to the appropriate platforms

// Main function that will be invoked on a schedule
serve(async () => {
  try {
    const currentTime = new Date();
    console.log(`Function triggered at: ${currentTime.toISOString()}`);
    
    // Create a Supabase client with the service role key
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") || "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
    );
    
    // Process pending posts
    const result = await processPendingPosts(supabaseAdmin, currentTime);
    
    return new Response(
      JSON.stringify(result),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Unhandled error:", error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
});

// Function to update post status with error information
async function updatePostWithError(supabase, post, errorMessage) {
  console.error(`Failed to publish post ${post.id}: ${errorMessage}`);
  
  try {
    // Try lowercase table name first
    const { error } = await supabase
      .from('scheduled_post')
      .update({
        status: 'failed',
        error: errorMessage,
        updatedAt: new Date().toISOString()
      })
      .eq('id', post.id);
      
    if (error) {
      console.log("Error updating with lowercase table name, trying PascalCase...");
      // Try PascalCase table name next
      const { error: altError } = await supabase
        .from('ScheduledPost')
        .update({
          status: 'failed',
          error: errorMessage,
          updatedAt: new Date().toISOString()
        })
        .eq('id', post.id);
        
      if (altError) {
        console.error('Error updating post status with both table names:', altError);
      }
    }
  } catch (updateError) {
    console.error('Exception updating post status:', updateError);
  }
}

// Function to process posts
async function processPendingPosts(supabase, currentTime) {
  try {
    console.log("Fetching pending posts...");
    
    // Remove the problematic table checking code and directly query the tables
    // we know exist based on the Prisma schema
    
    // Query for pending posts whose scheduled time has passed
    const { data: posts, error } = await supabase
      .from("scheduled_post")
      .select("*")
      .eq("status", "pending")
      .lte("scheduledFor", currentTime.toISOString());
      
    if (error) {
      console.error("Error fetching scheduled posts:", error);
      
      // Try alternative table name case
      console.log("Trying alternative table name 'ScheduledPost'...");
      const { data: altPosts, error: altError } = await supabase
        .from("ScheduledPost")
        .select("*")
        .eq("status", "pending")
        .lte("scheduledFor", currentTime.toISOString());
        
      if (altError) {
        console.error("Error with alternative table name:", altError);
        throw error; // Throw original error if both attempts fail
      }
      
      console.log(`Found ${altPosts.length} pending posts to process using 'ScheduledPost' table`);
      
      if (altPosts.length === 0) {
        return { success: true, message: "No pending posts to process" };
      }
      
      // Continue with these posts
      return await processPostBatch(supabase, altPosts);
    }
    
    console.log(`Found ${posts.length} pending posts to process`);
    
    if (posts.length === 0) {
      return { success: true, message: "No pending posts to process" };
    }
    
    // Process the posts
    return await processPostBatch(supabase, posts);
  } catch (error) {
    console.error("Error processing pending posts:", error);
    return { success: false, error: error.message };
  }
}

// New function to process a batch of posts
async function processPostBatch(supabase, posts) {
  // Process each post
  for (const post of posts) {
    try {
      console.log(`Processing post ${post.id} scheduled for ${post.scheduledFor}`);
      
      // Map platform names to provider names used in the Account table
      let provider = post.platform;
      if (post.platform === "twitter") {
        provider = "twitter";  // Could also be "Twitter" depending on your OAuth setup
      } else if (post.platform === "linkedin") {
        provider = "linkedin"; // Could also be "LinkedIn" depending on your OAuth setup
      }
      
      console.log(`Looking for ${provider} auth tokens for user ${post.userId}`);
      
      // Use the helper function to get credentials with appropriate field names
      const tokens = await getAccountCredentials(supabase, post.userId, provider);
      
      // Handle media if present
      let mediaUrl = null;
      if (post.mediaUrl) {
        mediaUrl = post.mediaUrl;
      }
      
      // Post to the appropriate platform
      let result;
      switch (post.platform) {
        case "twitter":
          try {
            console.log("Posting to Twitter...");
            result = await postToTwitter(post.content, tokens, mediaUrl);
            console.log("Successfully posted to Twitter:", result);
          } catch (twitterError) {
            console.error("Error posting to Twitter:", twitterError);
            
            // Check for OAuth/crypto errors
            let errorMessage = twitterError.message || "Unknown Twitter API error";
            
            if (errorMessage.includes("createHmac is not implemented") || 
                errorMessage.includes("OAuth") || 
                errorMessage.includes("authentication") ||
                errorMessage.includes("authorization")) {
              errorMessage = "Twitter API requires OAuth 1.0a which is not fully supported in Deno. " +
                             "Please use the Twitter web interface to post manually.";
            }
            
            await updatePostWithError(supabase, post, errorMessage);
            continue; // Skip to next post
          }
          break;
          
        case "linkedin":
          try {
            console.log("Posting to LinkedIn...");
            result = await postToLinkedIn(post.content, tokens, post.userId, mediaUrl);
            console.log("Successfully posted to LinkedIn:", result);
          } catch (linkedinError) {
            console.error("Error posting to LinkedIn:", linkedinError);
            await updatePostWithError(supabase, post, linkedinError.message || "Unknown LinkedIn API error");
            continue; // Skip to next post
          }
          break;
          
        default:
          console.log(`Unsupported platform: ${post.platform}`);
          await updatePostWithError(supabase, post, `Unsupported platform: ${post.platform}`);
          continue; // Skip to next post
      }
      
      // Try updating with both table name conventions
      try {
        // Update post status to "posted"
        const { error: updateError } = await supabase
          .from("scheduled_post")
          .update({
            status: "posted",
            postId: result?.id || null,
            updatedAt: new Date().toISOString()
          })
          .eq("id", post.id);
          
        if (updateError) {
          console.log("Error updating with lowercase table name, trying alternative...");
          const { error: altUpdateError } = await supabase
            .from("ScheduledPost")
            .update({
              status: "posted",
              postId: result?.id || null,
              updatedAt: new Date().toISOString()
            })
            .eq("id", post.id);
            
          if (altUpdateError) {
            console.error(`Error updating post status with both table names: ${altUpdateError.message}`);
          }
        }
      } catch (updateError) {
        console.error(`Error updating post status: ${updateError}`);
      }
    } catch (postError) {
      console.error(`Error processing post ${post.id}:`, postError);
      await updatePostWithError(supabase, post, postError.message || "Unknown error processing post");
    }
  }
  
  return { success: true, message: `Processed ${posts.length} posts` };
}

// Function to post content to Twitter
async function postToTwitter(content, accessToken, mediaUrl = null) {
  try {
    // Check if we have both tokens
    if (!accessToken.oauth_token || !accessToken.oauth_token_secret) {
      throw new Error("Missing Twitter credentials. Both OAuth token and secret are required.");
    }
    
    console.log("Posting to Twitter via Next.js API");
    
    // Generate API token for authentication with Next.js API
    const currentHourTimestamp = Math.floor(Date.now() / (1000 * 60 * 60));
    const apiSecret = Deno.env.get("SCHEDULED_POSTS_API_SECRET") || 'your-secret-key';
    
    // We can't use Node.js crypto in Deno, so use the SubtleCrypto API
    const encoder = new TextEncoder();
    const data = encoder.encode(`${apiSecret}:${currentHourTimestamp}`);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const apiToken = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    // Determine the appropriate base URL based on environment
    let baseUrl = Deno.env.get("NEXTAUTH_URL") || Deno.env.get("APP_URL");
    
    // If environment variables are not set, try to infer the URL
    if (!baseUrl) {
      // Check if we're in development or production
      const isProduction = Deno.env.get("ENVIRONMENT") === "production";
      
      if (isProduction) {
        baseUrl = "https://mailtosocial.com";
      } else {
        // Development fallback
        baseUrl = "http://localhost:3000";
      }
    }
    
    console.log(`Using base URL: ${baseUrl}`);
    
    // Call the Next.js API route 
    const apiUrl = `${baseUrl}/api/scheduled-posts/twitter`;
    console.log(`Calling Next.js API at ${apiUrl}`);
    
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiToken}`
      },
      body: JSON.stringify({
        content,
        oauthToken: accessToken.oauth_token,
        oauthTokenSecret: accessToken.oauth_token_secret,
        mediaUrl
      })
    }).catch(err => {
      console.error("Fetch error when posting tweet:", err);
      throw new Error(`Network error posting tweet: ${err.message}`);
    });
    
    // Parse the response
    let responseData;
    try {
      const responseText = await response.text();
      console.log("Response from Next.js API:", responseText);
      responseData = JSON.parse(responseText);
    } catch (textError) {
      console.error("Error reading tweet response:", textError);
      throw new Error(`Failed to read tweet response: ${textError.message}`);
    }
    
    if (!response.ok) {
      throw new Error(`API error: ${JSON.stringify(responseData)}`);
    }
    
    return { id: responseData.tweetId, hasMedia: responseData.hasMedia };
  } catch (error) {
    console.error("Error posting to Twitter:", error);
    throw error;
  }
}

// Helper function to check account structure and adapt to the actual field names
async function getAccountCredentials(supabase, userId, provider) {
  console.log(`Fetching ${provider} credentials for user ${userId}`);
  
  let account;
  
  // First try with PascalCase table name
  const { data: accountPascal, error: errorPascal } = await supabase
    .from("Account")
    .select("*")  // Get all fields to inspect structure
    .eq("userId", userId)
    .eq("provider", provider)
    .single();
    
  if (errorPascal) {
    console.log(`Error fetching from 'Account' table: ${errorPascal.message}`);
    console.log("Trying lowercase 'account' table...");
    
    // Try with lowercase table name
    const { data: accountLower, error: errorLower } = await supabase
      .from("account")
      .select("*")
      .eq("userId", userId)
      .eq("provider", provider)
      .single();
      
    if (errorLower) {
      console.error(`Error fetching from 'account' table: ${errorLower.message}`);
      
      // One more attempt with 'accounts' (plural)
      console.log("Trying plural 'accounts' table...");
      const { data: accountsPlural, error: errorPlural } = await supabase
        .from("accounts")
        .select("*")
        .eq("userId", userId)
        .eq("provider", provider)
        .single();
        
      if (errorPlural) {
        console.error(`Error fetching from 'accounts' table: ${errorPlural.message}`);
        throw new Error(`Could not find ${provider} credentials for user ${userId}. Tried multiple table names.`);
      }
      
      account = accountsPlural;
    } else {
      account = accountLower;
    }
  } else {
    account = accountPascal;
  }
  
  if (!account) {
    throw new Error(`No ${provider} account found for user ${userId}`);
  }
  
  console.log(`Found account with ID ${account.id}, checking token fields...`);
  
  // Log available fields for debugging
  console.log(`Account fields: ${Object.keys(account).join(", ")}`);
  
  // Based on the provider, use the appropriate token field
  if (provider === 'linkedin') {
    // For LinkedIn, directly check for access_token
    if (account.access_token) {
      console.log('Found LinkedIn access_token');
      return {
        access_token: account.access_token
      };
    } else {
      console.error('LinkedIn account does not have access_token field:', account);
      throw new Error('LinkedIn account does not have a valid access token');
    }
  } else {
    // For Twitter, try to find the appropriate token fields
    const possibleTokenFields = ['oauth_token', 'access_token', 'token'];
    const possibleSecretFields = ['oauth_token_secret', 'access_secret', 'token_secret'];
    
    let tokenField = null;
    let secretField = null;
    
    // Find which fields actually contain the tokens
    for (const field of possibleTokenFields) {
      if (account[field]) {
        tokenField = field;
        break;
      }
    }
    
    for (const field of possibleSecretFields) {
      if (account[field]) {
        secretField = field;
        break;
      }
    }
    
    if (!tokenField || !secretField) {
      console.error(`Could not identify token fields. Available fields: ${JSON.stringify(account)}`);
      throw new Error(`Missing token fields in account. Need both token and secret.`);
    }
    
    console.log(`Using token field: ${tokenField}, secret field: ${secretField}`);
    
    return {
      oauth_token: account[tokenField],
      oauth_token_secret: account[secretField]
    };
  }
}

// Function to post content to LinkedIn
async function postToLinkedIn(content, accessToken, userId, mediaUrl = null) {
  try {
    // LinkedIn uses a simple access token (not OAuth 1.0a like Twitter)
    if (!accessToken.access_token) {
      throw new Error("Missing LinkedIn credentials. Access token is required.");
    }
    
    console.log("Posting to LinkedIn via Next.js API");
    
    // Generate API token for authentication with Next.js API
    const currentHourTimestamp = Math.floor(Date.now() / (1000 * 60 * 60));
    const apiSecret = Deno.env.get("SCHEDULED_POSTS_API_SECRET") || 'your-secret-key';
    
    // We can't use Node.js crypto in Deno, so use the SubtleCrypto API
    const encoder = new TextEncoder();
    const data = encoder.encode(`${apiSecret}:${currentHourTimestamp}`);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const apiToken = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    // Determine the appropriate base URL based on environment
    let baseUrl = Deno.env.get("NEXTAUTH_URL") || Deno.env.get("APP_URL");
    
    // If environment variables are not set, try to infer the URL
    if (!baseUrl) {
      // Check if we're in development or production
      const isProduction = Deno.env.get("ENVIRONMENT") === "production";
      
      if (isProduction) {
        baseUrl = "https://mailtosocial.com";
      } else {
        // Development fallback
        baseUrl = "http://localhost:3000";
      }
    }
    
    console.log(`Using base URL: ${baseUrl}`);
    
    // Call the Next.js API route 
    const apiUrl = `${baseUrl}/api/scheduled-posts/linkedin`;
    console.log(`Calling Next.js API at ${apiUrl}`);
    
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiToken}`
      },
      body: JSON.stringify({
        content,
        accessToken: accessToken.access_token,
        userId,
        mediaUrl
      })
    }).catch(err => {
      console.error("Fetch error when posting LinkedIn post:", err);
      throw new Error(`Network error posting LinkedIn post: ${err.message}`);
    });
    
    // Parse the response
    let responseData;
    try {
      const responseText = await response.text();
      console.log("Response from Next.js API:", responseText);
      responseData = JSON.parse(responseText);
    } catch (textError) {
      console.error("Error reading LinkedIn post response:", textError);
      throw new Error(`Failed to read LinkedIn post response: ${textError.message}`);
    }
    
    if (!response.ok) {
      throw new Error(`API error: ${JSON.stringify(responseData)}`);
    }
    
    return { id: responseData.postId, hasMedia: responseData.hasMedia };
  } catch (error) {
    console.error("Error posting to LinkedIn:", error);
    throw error;
  }
}