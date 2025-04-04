import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/authOptions';
import db from '@/prisma/db';

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'You must be signed in to disconnect your LinkedIn account' },
        { status: 401 }
      );
    }
    
    const userId = session.user.id;
    
   
    await db.account.deleteMany({
      where: {
        userId: userId,
        provider: 'linkedin',
      },
    });
    
   
    await db.user.update({
      where: { id: userId },
      data: { linkedinProfileId: null },
    });
    
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Error disconnecting LinkedIn account:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to disconnect LinkedIn account';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}