# Deployment Instructions for Scheduled Posts

This document explains how to deploy the necessary components for scheduled posts with media support.

## Environment Variables

### For Next.js App (.env.local)

Make sure your Next.js application has these environment variables set:

```
SCHEDULED_POSTS_API_SECRET=your-strong-random-secret-key
```

Generate a strong random secret using a tool like [random.org](https://www.random.org/passwords/) or by running:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### For Supabase Edge Functions

You need to set the following environment variables for your Edge Functions:

1. `SCHEDULED_POSTS_API_SECRET`: Must match exactly the value set in your Next.js app
2. `APP_URL`: Your production app URL (e.g., https://mailtosocial.com)
3. `ENVIRONMENT`: Set to "production"

## Deployment Steps

### 1. Deploy the Next.js API Route

The `app/api/scheduled-posts/twitter/route.ts` file should be deployed as part of your Next.js application.

### 2. Deploy the Supabase Edge Functions

Using the Supabase dashboard:

1. Go to your Supabase project
2. Navigate to Edge Functions
3. Deploy the `publish-scheduled-posts` function
4. Add the environment variables:

```
SCHEDULED_POSTS_API_SECRET=your-strong-random-secret-key
APP_URL=https://your-app-url.com
ENVIRONMENT=production
```

Or using the Supabase CLI:

```bash
# Set environment variables
supabase secrets set SCHEDULED_POSTS_API_SECRET=your-strong-random-secret-key
supabase secrets set APP_URL=https://your-app-url.com
supabase secrets set ENVIRONMENT=production

# Deploy the functions
supabase functions deploy publish-scheduled-posts
```

### 3. Set Up Scheduled Trigger

Make sure the function is triggered on a schedule:

1. Go to your Supabase project
2. Navigate to SQL Editor
3. Create a new query with:

```sql
select
  cron.schedule(
    'publish-scheduled-posts-job',
    '* * * * *',  -- Run every minute
    $$
    select
      net.http_post(
        url:='{{SUPABASE_URL}}/functions/v1/publish-scheduled-posts',
        headers:='{}'::jsonb,
        body:='{}'::jsonb
      ) as request_id
    $$
  );
```

4. Run the query to set up the scheduled job

## Troubleshooting

If you encounter the "Invalid URL" error, it means the environment variables are not set correctly. Check:

1. That `APP_URL` is set in your Supabase Edge Function environment
2. That the URL is correctly formatted (including `https://`)
3. That the `SCHEDULED_POSTS_API_SECRET` matches between your Next.js app and Supabase

View logs in the Supabase dashboard to see detailed error messages. 