// app/api/scheduled-posts/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/authOptions";
import { PrismaClient } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";

const prisma = new PrismaClient();

// Initialize Supabase client for storage is no longer needed here
// We'll create it in the uploadFileToStorage function directly

// Helper function to upload a file to Supabase Storage
async function uploadFileToStorage(file: File, userId: string): Promise<string> {
  try {
    console.log(`Uploading file: ${file.name} (${file.size} bytes, ${file.type})`);
    console.log(`Supabase URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL ? 'set' : 'not set'}`);
    console.log(`Service Role Key: ${process.env.SUPABASE_SERVICE_ROLE_KEY ? 'set (length: ' + process.env.SUPABASE_SERVICE_ROLE_KEY.length + ')' : 'not set'}`);
    
    // Create a safe filename: userId_timestamp_originalFilename
    const timestamp = Date.now();
    const safeFileName = `${userId}_${timestamp}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    
    // Path: scheduled-posts/userId/filename
    const filePath = `${userId}/${safeFileName}`;
    console.log(`File path in storage: ${filePath}`);
    
    // Convert File to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    
    // Initialize Supabase client with service role key to bypass RLS
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    );
    
    // First check if the bucket exists
    const { data: buckets, error: bucketsError } = await supabaseAdmin
      .storage
      .listBuckets();
      
    if (bucketsError) {
      console.error('Error listing buckets:', bucketsError);
      throw new Error(`Cannot access storage buckets: ${bucketsError.message}`);
    }
    
    console.log('Available buckets:', buckets.map(b => b.name));
    
    const mediaBucketExists = buckets.some(b => b.name === 'media');
    if (!mediaBucketExists) {
      console.log('Media bucket does not exist, creating it...');
      const { error: createBucketError } = await supabaseAdmin
        .storage
        .createBucket('media', { public: true });
        
      if (createBucketError) {
        console.error('Error creating media bucket:', createBucketError);
        throw new Error(`Failed to create media bucket: ${createBucketError.message}`);
      }
      console.log('Media bucket created successfully');
    }
    
    // Upload to Supabase Storage with admin privileges
    console.log('Attempting to upload file to storage...');
    const { error } = await supabaseAdmin.storage
      .from('media')
      .upload(filePath, arrayBuffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: true // Set to true to overwrite existing files
      });
    
    if (error) {
      console.error('Supabase storage upload error:', error);
      
      // Try a different approach - upload with a simpler path
      console.log('Trying alternate upload approach...');
      const simplePath = `simple/${userId}_${timestamp}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      
      const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
        .from('media')
        .upload(simplePath, arrayBuffer, {
          contentType: file.type,
          cacheControl: '3600',
          upsert: true
        });
        
      if (uploadError) {
        console.error('Alternative upload approach also failed:', uploadError);
        throw error;
      }
      
      console.log('Alternative upload successful:', uploadData);
      
      // Get the public URL for the simple path
      const { data: publicUrlData } = supabaseAdmin.storage
        .from('media')
        .getPublicUrl(simplePath);
      
      console.log(`File uploaded successfully with alternate path. URL: ${publicUrlData.publicUrl}`);
      return publicUrlData.publicUrl;
    }
    
    // Get the public URL
    const { data: publicUrlData } = supabaseAdmin.storage
      .from('media')
      .getPublicUrl(filePath);
    
    console.log(`File uploaded successfully. URL: ${publicUrlData.publicUrl}`);
    return publicUrlData.publicUrl;
  } catch (error) {
    console.error('Error uploading file to storage:', error);
    console.error('Error details:', JSON.stringify(error, null, 2));
    throw new Error(`Failed to upload media file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// GET all scheduled posts for the authenticated user
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Get optional query parameters for filtering
    const { searchParams } = new URL(req.url);
    const platform = searchParams.get("platform");
    const status = searchParams.get("status");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    // Build the query filter
    const filter: {
      userId: string;
      platform?: string;
      status?: string;
      scheduledFor?: {
        gte: Date;
        lte: Date;
      };
    } = {
      userId: session.user.id,
    };

    // Add optional filters
    if (platform) {
      filter.platform = platform;
    }

    if (status) {
      filter.status = status;
    }

    if (startDate && endDate) {
      filter.scheduledFor = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    // Fetch scheduled posts
    const posts = await prisma.scheduledPost.findMany({
      where: filter,
      orderBy: {
        scheduledFor: "asc",
      },
    });

    return NextResponse.json(posts);
  } catch (error) {
    console.error("[SCHEDULED_POSTS_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

// Create a new scheduled post
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const contentType = req.headers.get("content-type") || "";
    
    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const content = formData.get("content") as string;
      const platform = formData.get("platform") as string;
      const scheduledFor = formData.get("scheduledFor") as string;
      const mediaFile = formData.get("media") as File | null;
      
      console.log(`Received scheduled date from client: ${scheduledFor}`);
      
      let mediaUrl = null;
      
      if (mediaFile) {
        // Upload the media file to Supabase Storage
        console.log(`Processing media file for upload: ${mediaFile.name}`);
        mediaUrl = await uploadFileToStorage(mediaFile, session.user.id);
        console.log(`Media uploaded, URL: ${mediaUrl}`);
      }
      
      // Parse the ISO string directly to preserve timezone
      const scheduledDate = new Date(scheduledFor);
      console.log(`Parsed date for database: ${scheduledDate.toISOString()}`);
      
      const post = await prisma.scheduledPost.create({
        data: {
          userId: session.user.id,
          content,
          platform,
          scheduledFor: scheduledDate,
          mediaUrl,
          status: "pending",
        },
      });
      
      return NextResponse.json(post);
    } else {
      const body = await req.json();
      const { content, platform, scheduledFor, mediaUrl } = body;
      
      if (!content || !platform || !scheduledFor) {
        return new NextResponse("Missing required fields", { status: 400 });
      }
      
      console.log(`Received scheduled date from client (JSON): ${scheduledFor}`);
      const scheduledDate = new Date(scheduledFor);
      console.log(`Parsed date for database: ${scheduledDate.toISOString()}`);
      
      const post = await prisma.scheduledPost.create({
        data: {
          userId: session.user.id,
          content,
          platform,
          scheduledFor: scheduledDate,
          mediaUrl,
          status: "pending",
        },
      });
      
      return NextResponse.json(post);
    }
  } catch (error) {
    console.error("[SCHEDULED_POSTS_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
} 