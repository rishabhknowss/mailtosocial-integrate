"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

type SubscriptionStatus = 'active' | 'inactive' | 'cancelled' | 'loading';

interface SubscriptionDetails {
  planName: string;
  nextBillingDate?: string;
}

export default function ManageSubscription() {
  const [status, setStatus] = useState<SubscriptionStatus>('loading');
  const [subscriptionDetails, setSubscriptionDetails] = useState<SubscriptionDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Simulate fetching subscription status
  useEffect(() => {
    // This would be an API call to fetch the current user's subscription status
    const fetchSubscription = async () => {
      try {
        // Simulating API call
        // In reality, you would fetch from your backend
        setTimeout(() => {
          setStatus('inactive');
          setSubscriptionDetails(null);
        }, 1000);
      } catch (error) {
        console.error('Error fetching subscription:', error);
        setStatus('inactive');
      }
    };
    
    fetchSubscription();
  }, []);

  const handleSubscribe = () => {
    router.push('/pricing');
  };

  const handleCancelSubscription = async () => {
    if (!confirm('Are you sure you want to cancel your subscription?')) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/payments/cancel-subscription', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to cancel subscription');
      }

      setStatus('cancelled');
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      alert('Failed to cancel subscription. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (status === 'loading') {
    return (
      <div className="flex justify-center items-center h-40">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (status === 'inactive') {
    return (
      <div className="border border-gray-200 rounded-lg p-6 bg-white">
        <h2 className="text-xl font-semibold mb-4">Subscription</h2>
        <p className="mb-4">You don&apos;t have an active subscription.</p>
        <button
          onClick={handleSubscribe}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-300"
        >
          View Plans
        </button>
      </div>
    );
  }

  return (
    <div className="border border-gray-200 rounded-lg p-6 bg-white">
      <h2 className="text-xl font-semibold mb-4">Your Subscription</h2>
      
      {status === 'active' && (
        <>
          <div className="mb-4">
            <div className="flex items-center mb-2">
              <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
              <span className="font-medium">Active</span>
            </div>
            <p className="text-gray-600">
              {subscriptionDetails?.planName || 'Premium Plan'}
            </p>
          </div>
          
          <button
            onClick={handleCancelSubscription}
            disabled={loading}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors duration-300 disabled:bg-gray-400"
          >
            {loading ? 'Processing...' : 'Cancel Subscription'}
          </button>
        </>
      )}
      
      {status === 'cancelled' && (
        <>
          <div className="mb-4">
            <div className="flex items-center mb-2">
              <div className="w-3 h-3 bg-orange-500 rounded-full mr-2"></div>
              <span className="font-medium">Cancelled</span>
            </div>
            <p className="text-gray-600">
              Your subscription has been cancelled but will remain active until the end of the current billing period.
            </p>
          </div>
          
          <button
            onClick={handleSubscribe}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-300"
          >
            Resubscribe
          </button>
        </>
      )}
    </div>
  );
} 