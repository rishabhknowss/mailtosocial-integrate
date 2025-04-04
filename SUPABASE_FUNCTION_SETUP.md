# Setting Up Supabase Edge Functions for Scheduled Posts

This guide will walk you through the process of setting up a Supabase Edge Function to automatically publish your scheduled social media posts.

## Requirements

1. Supabase CLI installed on your machine
2. Access to your Supabase project

## Step 1: Install Supabase CLI

If you haven't already, install the Supabase CLI:

```bash
# Using npm
npm install -g supabase

# OR using Homebrew on macOS
brew install supabase/tap/supabase
```

## Step 2: Login to Supabase

```bash
supabase login
```

## Step 3: Initialize Supabase Functions

Navigate to your project directory and initialize Supabase:

```bash
cd your-project-directory
supabase init
```

## Step 4: Create a Scheduled Post Function

Create a new function for handling scheduled posts:

```bash
supabase functions new publish-scheduled-posts
```

## Step 5: Implement the Function

Edit the created function file at `supabase/functions/publish-scheduled-posts/index.ts`:

```typescript
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// This function will be invoked on a schedule (e.g., every minute)
// It will check for posts that need to be published and post them to the appropriate platforms

serve(async (req) => {
  try {
    // Create a Supabase client with the project URL and service role key
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get current time
    const now = new Date();
    
    // Find posts scheduled for now or in the past that are still pending
    const { data: postsToPublish, error: fetchError } = await supabase
      .from("ScheduledPost")
      .select("*")
      .eq("status", "pending")
      .lte("scheduledFor", now.toISOString());

    if (fetchError) {
      throw new Error(`Error fetching scheduled posts: ${fetchError.message}`);
    }

    console.log(`Found ${postsToPublish?.length || 0} posts to publish`);
    
    if (!postsToPublish || postsToPublish.length === 0) {
      return new Response(JSON.stringify({ 
        message: "No scheduled posts to publish" 
      }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // Process each post
    for (const post of postsToPublish) {
      try {
        console.log(`Processing post ${post.id} for ${post.platform}`);

        // Call the appropriate API based on the platform
        // This is where you'd call your Twitter or LinkedIn API
        
        let response;
        
        if (post.platform === "twitter") {
          // Call Twitter API
          const userData = await getUserTwitterCredentials(supabase, post.userId);
          
          if (!userData) {
            throw new Error("User Twitter credentials not found");
          }
          
          response = await postToTwitter(post.content, userData.accessToken, post.mediaUrl);
        } else if (post.platform === "linkedin") {
          // Call LinkedIn API
          const userData = await getUserLinkedInCredentials(supabase, post.userId);
          
          if (!userData) {
            throw new Error("User LinkedIn credentials not found");
          }
          
          response = await postToLinkedIn(post.content, userData.accessToken, post.mediaUrl);
        } else {
          throw new Error(`Unknown platform: ${post.platform}`);
        }
        
        // Update the post status to "posted"
        const { error: updateError } = await supabase
          .from("ScheduledPost")
          .update({
            status: "posted",
            postId: response?.id || null, // Save the post ID from the platform
          })
          .eq("id", post.id);

        if (updateError) {
          throw new Error(`Error updating post status: ${updateError.message}`);
        }
        
        console.log(`Successfully published post ${post.id}`);
      } catch (error) {
        console.error(`Error publishing post ${post.id}:`, error);
        
        // Update the post status to "failed"
        await supabase
          .from("ScheduledPost")
          .update({
            status: "failed",
            error: error instanceof Error ? error.message : "Unknown error",
          })
          .eq("id", post.id);
      }
    }

    return new Response(JSON.stringify({ 
      message: `Processed ${postsToPublish.length} scheduled posts` 
    }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in publish-scheduled-posts function:", error);
    
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error" 
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});

// Helper function to get Twitter credentials
async function getUserTwitterCredentials(supabase, userId) {
  const { data, error } = await supabase
    .from("accounts")
    .select("access_token")
    .eq("userId", userId)
    .eq("provider", "twitter")
    .single();

  if (error) {
    console.error("Error fetching Twitter credentials:", error);
    return null;
  }

  return {
    accessToken: data.access_token,
  };
}

// Helper function to get LinkedIn credentials
async function getUserLinkedInCredentials(supabase, userId) {
  const { data, error } = await supabase
    .from("accounts")
    .select("access_token")
    .eq("userId", userId)
    .eq("provider", "linkedin")
    .single();

  if (error) {
    console.error("Error fetching LinkedIn credentials:", error);
    return null;
  }

  return {
    accessToken: data.access_token,
  };
}

// Function to post content to Twitter
async function postToTwitter(content, accessToken, mediaUrl = null) {
  try {
    // This is where you'd implement the actual Twitter API call
    // For example, using the Twitter API v2
    const requestData = {
      text: content,
    };
    
    if (mediaUrl) {
      // Handle media if needed
      // This would require additional implementation
    }
    
    // In a real implementation, you'd make an actual API call to Twitter
    // For now, just simulate a successful response
    return { id: `twitter-${Date.now()}` };
  } catch (error) {
    console.error("Error posting to Twitter:", error);
    throw error;
  }
}

// Function to post content to LinkedIn
async function postToLinkedIn(content, accessToken, mediaUrl = null) {
  try {
    // This is where you'd implement the actual LinkedIn API call
    const requestData = {
      text: content,
    };
    
    if (mediaUrl) {
      // Handle media if needed
    }
    
    // In a real implementation, you'd make an actual API call to LinkedIn
    // For now, just simulate a successful response
    return { id: `linkedin-${Date.now()}` };
  } catch (error) {
    console.error("Error posting to LinkedIn:", error);
    throw error;
  }
}
```

## Step 6: Deploy the Function

```bash
supabase functions deploy publish-scheduled-posts
```

## Step 7: Set Up a Cron Job for the Function

Supabase doesn't have built-in scheduling, so you'll need to set up a cron job or use a service like cron-job.org to call your function regularly.

1. Create a cron job that calls your function URL every minute:
   ```
   * * * * * curl -X POST https://YOUR_PROJECT_ID.supabase.co/functions/v1/publish-scheduled-posts
   ```

2. Alternative: Use a service like cron-job.org to call your function URL:
   - Sign up for cron-job.org (or similar service)
   - Create a new cron job with the URL: `https://YOUR_PROJECT_ID.supabase.co/functions/v1/publish-scheduled-posts`
   - Set it to run every minute
   - Use HTTP method: POST

## Step 8: Test the Function

You can manually trigger the function to test it:

```bash
curl -X POST https://YOUR_PROJECT_ID.supabase.co/functions/v1/publish-scheduled-posts
```

## Customization Notes

1. You'll need to replace the Twitter and LinkedIn API implementation with actual API calls using your app's credentials.

2. The function assumes your database has a structure matching the one in your application. Adjust the table names and fields as needed.

3. For production use, consider adding error handling, retries, and monitoring.

4. The function uses the Supabase service role key, which has full access to your database. Make sure to keep this key secure.

## Troubleshooting

If you encounter issues with the function:

1. Check the Supabase Function logs in the Supabase dashboard
2. Verify the database schema matches what the function expects
3. Ensure your Twitter and LinkedIn API credentials are valid
4. Check that the cron job is running properly 