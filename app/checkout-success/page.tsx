"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

export default function CheckoutSuccess() {
  const router = useRouter();
  const { data: session } = useSession();
  const [countdown, setCountdown] = useState(5);
  
  useEffect(() => {
    // If no session, redirect to login
    if (!session) {
      router.push('/login');
      return;
    }
    
    // Set up countdown for redirect
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          router.push('/?from=checkout-success');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [router, session]);
  
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
      <div className="p-8 bg-white rounded-lg shadow-lg max-w-md w-full text-center">
        <div className="mb-4 flex justify-center">
          <div className="rounded-full bg-green-100 p-3">
            <svg
              className="h-12 w-12 text-green-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
        </div>
        
        <h1 className="text-2xl font-bold text-gray-800 mb-3">
          Payment Successful!
        </h1>
        
        <p className="text-gray-600 mb-6">
          Thank you for your payment. Your subscription has been activated.
        </p>
        
        <p className="text-gray-500 text-sm mb-4">
          You will be redirected to the dashboard in {countdown} seconds...
        </p>
        
        <button
          onClick={() => router.push('/?from=checkout-success')}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded transition duration-200"
        >
          Go to Dashboard Now
        </button>
      </div>
    </div>
  );
} 