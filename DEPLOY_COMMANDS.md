# Supabase Edge Function Deployment Commands

Follow these commands in sequence to deploy the updated Edge Function with LinkedIn scheduled posting support:

```bash
# 1. Change to the supabase directory
cd supabase

# 2. Deploy the Edge Function
npx supabase functions deploy publish-scheduled-posts

# 3. Set the required environment variables
npx supabase secrets set SCHEDULED_POSTS_API_SECRET=your-strong-random-secret-key
npx supabase secrets set APP_URL=https://your-production-url.com
npx supabase secrets set ENVIRONMENT=production

# 4. Verify that the environment variables were set correctly
npx supabase secrets list
```

Important notes:

1. Replace `your-strong-random-secret-key` with the same secret key you've set in your Next.js app's environment variables (in .env.local)
2. Replace `https://your-production-url.com` with your actual production URL
3. Make sure that your Next.js application's environment variables match those you're setting in Supabase, especially the `SCHEDULED_POSTS_API_SECRET`

After deployment, you should verify that scheduled posts with media for LinkedIn work correctly by:

1. Creating a scheduled LinkedIn post with media
2. Waiting for it to be published
3. Checking the Supabase Edge Function logs to confirm successful execution 