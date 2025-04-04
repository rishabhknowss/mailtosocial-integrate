import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/lib/authOptions";
import db from "../../prisma/db";

export async function hasActiveSubscription(userId?: string) {
  if (!userId) {
    const session = await getServerSession(authOptions);
    userId = session?.user?.id;
    
    if (!userId) return false;
  }
  
  try {
    const subscription = await db.subscription.findUnique({
      where: { userId },
    });
    
    return Boolean(subscription && subscription.status === 'active');
  } catch (error) {
    console.error('Error checking subscription status:', error);
    return false;
  }
}

export function canAccessRoute(path: string, isSubscribed: boolean) {
  // Routes that don't require auth
  const publicRoutes = [
    '/login', 
    '/signup', 
    '/api/auth'
  ];
  
  // Routes that require auth but not subscription
  const authRoutes = [
    '/pricing',
    '/payments',
    '/checkout-success',
    '/api/payments'
  ];
  
  // Check public routes first
  if (publicRoutes.some(route => path.startsWith(route))) {
    return true;
  }
  
  // Check auth-only routes
  if (authRoutes.some(route => path.startsWith(route))) {
    return true;
  }
  
  // All other routes require subscription
  return isSubscribed;
}
