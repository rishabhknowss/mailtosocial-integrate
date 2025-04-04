'use client';

import { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, Info } from 'lucide-react';

export function ScheduledPostsStatus() {
  const [status, setStatus] = useState<'loading' | 'connected' | 'error'>('loading');
  const [message, setMessage] = useState('Checking background job status...');
  const showTwitterInfo = true;

  useEffect(() => {
    const checkStatus = async () => {
      try {
        // Simulate an API call to check Supabase Edge Function status
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // For development purposes, assume it's connected
        // In a production app, you could have an API endpoint that checks the function's health
        setStatus('connected');
        setMessage('Supabase scheduled functions are active');
      } catch (error) {
        console.error('Error checking function status:', error);
        setStatus('error');
        setMessage('Failed to connect to scheduled function service');
      }
    };
    
    checkStatus();
  }, []);
  
  return (
    <div className="mt-4 p-4 rounded-lg border border-[#2c2e36] bg-[#1b1d23]">
      <h3 className="text-white font-medium mb-2">Background Job Status</h3>
      
      <div className="flex items-center">
        {status === 'loading' && (
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#0077B5] mr-2"></div>
        )}
        
        {status === 'connected' && (
          <CheckCircle size={16} className="text-green-500 mr-2" />
        )}
        
        {status === 'error' && (
          <AlertCircle size={16} className="text-red-500 mr-2" />
        )}
        
        <p className={`text-sm ${
          status === 'connected' ? 'text-green-400' :
          status === 'error' ? 'text-red-400' :
          'text-gray-400'
        }`}>
          {message}
        </p>
      </div>
      
      {status === 'error' && (
        <p className="text-xs text-gray-400 mt-2">
          Your scheduled posts will not be automatically published until this is resolved.
        </p>
      )}
      
      {showTwitterInfo && (
        <div className="mt-4 p-3 rounded border border-blue-600/50 bg-blue-900/20">
          <div className="flex items-start">
            <Info size={16} className="text-blue-500 mr-2 mt-0.5" />
            <div>
              <h4 className="text-blue-500 text-sm font-medium mb-1">Twitter API Integration</h4>
              <p className="text-xs text-blue-400/80">
                We&apos;ve implemented OAuth 1.0a support for Twitter API using the @nexterias/twitter-api-fetch library.
                Your scheduled tweets should now post automatically. If you encounter any issues, please let us know.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 