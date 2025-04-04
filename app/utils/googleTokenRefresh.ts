import { Account } from '@prisma/client';
import db from '@/prisma/db';

interface RefreshTokenResponse {
  access_token: string;
  expires_in: number;
  scope: string;
  token_type: string;
}

/**
 * Refreshes a Google OAuth token
 * @param account The account with expired token
 * @returns The updated account with fresh token
 */
export async function refreshGoogleToken(account: Account): Promise<Account | null> {
  try {
    if (!account.refresh_token) {
      console.error("No refresh token available for account:", account.id);
      return null;
    }

    const url = 'https://oauth2.googleapis.com/token';
    const params = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      grant_type: 'refresh_token',
      refresh_token: account.refresh_token
    });

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params
    });

    const data = await response.json() as RefreshTokenResponse;

    if (!response.ok) {
      console.error("Token refresh failed:", data);
      return null;
    }

    // Calculate new expiration date
    const currentTime = Math.floor(Date.now() / 1000);
    const expiresAt = currentTime + data.expires_in;

    // Update the token in the database
    const updatedAccount = await db.account.update({
      where: { id: account.id },
      data: {
        access_token: data.access_token,
        expires_at: expiresAt,
        scope: data.scope || account.scope,
        token_type: data.token_type || account.token_type
      }
    });

    console.log(`Successfully refreshed token for account ${account.id}`);
    return updatedAccount;
  } catch (error) {
    console.error("Error refreshing token:", error);
    return null;
  }
}