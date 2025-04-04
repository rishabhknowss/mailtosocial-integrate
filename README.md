# MailToSocial.com

 **MailToSocial.com** seamless email-to-social media integration. 


## Getting Started

1. Clone the repository:
    ```bash
    git clone https://github.com/iag-dot/mailtosocial.git
    ```
2. Install dependencies:
    ```bash
    npm install
    ```
3. Generate Prisma client
    ```bash
    npx prisma generate
    ```
3. Start the application:
    ```bash
    npm run dev
    ```
### database - neondb

### subscription - dodo payments , paid users access only

## Twitter API Integration

We use a hybrid architecture to post scheduled tweets:

1. The `publish-scheduled-posts` Supabase Edge Function runs on a schedule to find pending posts
2. It calls a secure Next.js API endpoint that handles media uploads and posting
3. The Next.js API uses the `twitter-api-v2` library to handle Twitter API authentication and media uploads
4. For direct tweeting, we use the Twitter API directly via the app's API routes

### OAuth 1.0a Authentication

We leverage different libraries depending on the environment:
- `twitter-api-v2` in our Next.js environment for manual and scheduled posts
- `@nexterias/twitter-api-fetch` in Supabase Edge Functions for basic Twitter API interactions

### Media Support

We fully support media uploads for both immediate and scheduled posts. The system can:
- Handle image uploads with tweets
- Process and store media in Supabase Storage
- Download and attach media to scheduled tweets at the scheduled time
- Gracefully fall back to text-only tweets if media upload fails
