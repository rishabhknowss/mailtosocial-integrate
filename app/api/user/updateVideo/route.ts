// app/api/user/updateVideo/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/authOptions";
import prisma from "@/prisma/db";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { v4 as uuidv4 } from 'uuid';

const s3Client = new S3Client({
  region: process.env.AWS_REGION || "us-west-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: "No video file provided" }, { status: 400 });
    }

    // Generate unique filename
    const fileName = `${session.user.id}/${uuidv4()}${file.name.substring(file.name.lastIndexOf('.'))}`;
    const bucketName = process.env.AWS_S3_BUCKET_NAME;

    if (!bucketName) {
      throw new Error("AWS_S3_BUCKET_NAME is not configured");
    }

    // Upload to S3
    const uploadParams = {
      Bucket: bucketName,
      Key: fileName,
      Body: Buffer.from(await file.arrayBuffer()),
      ContentType: file.type,
    };

    await s3Client.send(new PutObjectCommand(uploadParams));

    // Construct S3 URL
    const videoUrl = `https://${bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`;

    // Update user's video URL in database
    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: { videoUrl },
    });

    return NextResponse.json({ 
      success: true,
      videoUrl: user.videoUrl 
    });
    
  } catch (error) {
    console.error("Error updating video URL:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}