import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/authOptions';
import db from '@/prisma/db';

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'You must be signed in to disconnect your Twitter account' },
        { status: 401 }
      );
    }
    
    const userId = session.user.id;
    
    await db.account.deleteMany({
      where: {
        userId: userId,
        provider: 'twitter',
      },
    });
    
    await db.account.deleteMany({
      where: {
        userId: userId,
        provider: 'twitter-temp',
      },
    });
    
    await db.user.update({
      where: { id: userId },
      data: { twitterUsername: null },
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    // Using proper type for Error object
    const typedError = error as Error;
    console.error('Error disconnecting Twitter account:', typedError);
    return NextResponse.json(
      { error: typedError.message || 'Failed to disconnect Twitter account' },
      { status: 500 }
    );
  }
}