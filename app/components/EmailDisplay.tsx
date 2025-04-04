// app/components/EmailDisplay.tsx
'use client';

import { useSession } from 'next-auth/react';

export interface Email {
  id: string;
  threadId: string;
  subject: string;
  from: string;
  to: string;
  date: string;
  snippet: string;
  body: string;
  labelIds: string[];
  internalDate: string;
}

export default function EmailDisplay() {
  const { status } = useSession();

  if (status === 'loading') {
    return <div className="text-center py-10">Loading session...</div>;
  }

  if (status === 'unauthenticated') {
    return (
      <div className="text-center py-10">
        <p className="mb-4">You need to be signed in with Google to view your emails.</p>
        <a href="/login" className="text-blue-600 hover:underline">Sign in</a>
      </div>
    );
  }

  return (
    <div className="w-full bg-[#1c1d1f] rounded-lg p-6 text-center">
      <h3 className="text-xl font-bold text-white mb-3">Email Access Disabled</h3>
      <p className="text-[#8c8a94] mb-4">
        Direct access to your emails has been disabled for enhanced security and privacy.
      </p>
      <p className="text-[#8c8a94]">
        We use Google authentication for secure sign-in only, without accessing your email content.
      </p>
    </div>
  );
}