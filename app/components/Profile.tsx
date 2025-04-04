import React, { useState, useEffect } from 'react';
import { X, Plus, ChevronDown, Trash2, Loader2, Linkedin } from 'lucide-react';
import { signOut, useSession } from 'next-auth/react';
import { toast } from 'react-hot-toast';
import { useRouter } from 'next/navigation';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface TwitterAccount {
  id: string;
  account_name: string;
}

interface LinkedInAccount {
  id: string;
  name: string;
}

interface SubscriptionInfo {
  hasAccess: boolean;
  subscriptionStatus: string;
}

export function Profile({ isOpen, onClose }: ProfileModalProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const user = session?.user;

  const [twitterAccounts, setTwitterAccounts] = useState<TwitterAccount[]>([]);
  const [linkedInAccounts, setLinkedInAccounts] = useState<LinkedInAccount[]>([]);
  const [isLoadingTwitter, setIsLoadingTwitter] = useState(false);
  const [isLoadingLinkedIn, setIsLoadingLinkedIn] = useState(false);
  const [showTwitterDropdown, setShowTwitterDropdown] = useState<string | null>(null);
  const [showLinkedInDropdown, setShowLinkedInDropdown] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [isLoadingSubscription, setIsLoadingSubscription] = useState(false);

  useEffect(() => {
    if (isOpen && user) {
      fetchAccounts();
      fetchSubscriptionStatus();
    }
  }, [isOpen, user]);

  const fetchSubscriptionStatus = async () => {
    setIsLoadingSubscription(true);
    try {
      const response = await fetch('/api/payments/check-subscription');
      if (response.ok) {
        const data = await response.json();
        setSubscription(data);
      } else {
        console.error('Failed to fetch subscription status');
        toast.error('Failed to load subscription information');
      }
    } catch (error) {
      console.error('Error fetching subscription status:', error);
      toast.error('Failed to load subscription information');
    } finally {
      setIsLoadingSubscription(false);
    }
  };

  const fetchAccounts = async () => {
    try {
      const twitterResponse = await fetch('/api/accounts/twitter/status');
      if (twitterResponse.ok) {
        const twitterData = await twitterResponse.json();
        if (twitterData.connected && twitterData.username) {
          setTwitterAccounts([{
            id: 'twitter-account',
            account_name: twitterData.username
          }]);
        } else {
          setTwitterAccounts([]);
        }
      }

      const linkedInResponse = await fetch('/api/accounts/linkedin/status');
      if (linkedInResponse.ok) {
        const linkedInData = await linkedInResponse.json();
        if (linkedInData.connected) {
          setLinkedInAccounts([{
            id: 'linkedin-account',
            name: linkedInData.profileName || 'LinkedIn User'
          }]);
        } else {
          setLinkedInAccounts([]);
        }
      }
    } catch (error) {
      console.error('Error fetching accounts:', error);
      toast.error('Failed to load connected accounts');
    }
  };

  const connectTwitter = async () => {
    setIsLoadingTwitter(true);
    try {
      const response = await fetch('/api/accounts/twitter/connect');
      if (response.ok) {
        const data = await response.json();
        window.location.href = data.url;
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to connect Twitter');
      }
    } catch (error) {
      console.error('Error connecting Twitter:', error);
      toast.error('An error occurred while connecting to Twitter');
    } finally {
      setIsLoadingTwitter(false);
    }
  };

  const connectLinkedIn = async () => {
    setIsLoadingLinkedIn(true);
    try {
      const response = await fetch('/api/accounts/linkedin/connect');
      if (response.ok) {
        const data = await response.json();
        window.location.href = data.url;
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to connect LinkedIn');
      }
    } catch (error) {
      console.error('Error connecting LinkedIn:', error);
      toast.error('An error occurred while connecting to LinkedIn');
    } finally {
      setIsLoadingLinkedIn(false);
    }
  };

  const disconnectAccount = async (provider: 'twitter' | 'linkedin') => {
    try {
      const response = await fetch(`/api/accounts/${provider}/disconnect`, {
        method: 'POST',
      });
      
      if (response.ok) {
        if (provider === 'twitter') {
          setTwitterAccounts([]);
          setShowTwitterDropdown(null);
          toast.success('Twitter account disconnected');
        } else {
          setLinkedInAccounts([]);
          setShowLinkedInDropdown(null);
          toast.success('LinkedIn account disconnected');
        }
      } else {
        const error = await response.json();
        toast.error(error.error || `Failed to disconnect ${provider}`);
      }
    } catch (error) {
      console.error(`Error disconnecting ${provider}:`, error);
      toast.error(`An error occurred while disconnecting ${provider}`);
    }
  };

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/' });
    onClose();
  };

  const handleViewPlans = () => {
    router.push('/pricing');
    onClose();
  };

  const handleManageSubscription = () => {
    // This would typically open a customer portal or management page
    toast.success('Subscription management coming soon!');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="w-[636px] bg-[#1b1d23] rounded-[16px] relative overflow-hidden">
        <button 
          onClick={onClose}
          className="cursor-pointer absolute top-[12px] right-[12px] w-[18px] h-[18px] text-gray-400 hover:text-white"
        >
          <X size={18} />
        </button>
        
        <div className="flex flex-col gap-[16px] p-[16px] w-full max-h-[80vh] overflow-y-auto">
          <div className="flex flex-col gap-[16px]">
            <span className=" text-[18px] font-bold text-[#f8f8f8]">
              Your Profile
            </span>
          </div>
          
          <div className="flex justify-between items-center">
            <div className="flex gap-[12px] items-center">
              <div className="w-[48px] h-[48px] bg-gray-600 rounded-full flex items-center justify-center text-white font-bold">
                {user?.email?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="flex flex-col">
                <span className=" text-[16px] font-bold text-[#f8f8f8]">
                  {user?.name || 'User'}
                </span>
                <span className=" text-[14px] font-medium text-[#b3b1b8]">
                  {user?.email || 'user@example.com'}
                </span>
              </div>
            </div>
            
            <button 
              onClick={handleLogout}
              className="cursor-pointer flex gap-[8px] items-center px-[8px] py-[8px] bg-[rgba(255,255,255,0.08)] rounded-[8px] hover:bg-[rgba(255,255,255,0.12)]"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M6 14H3.33333C2.97971 14 2.64057 13.8595 2.39052 13.6095C2.14048 13.3594 2 13.0203 2 12.6667V3.33333C2 2.97971 2.14048 2.64057 2.39052 2.39052C2.64057 2.14048 2.97971 2 3.33333 2H6" stroke="#C6C5C9" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M10.6667 11.3333L14.0001 8L10.6667 4.66667" stroke="#C6C5C9" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M14 8H6" stroke="#C6C5C9" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span className=" text-[12px] font-semibold text-[#c6c5c9]">
                Logout
              </span>
            </button>
          </div>
          
          <span className=" text-[16px] font-bold text-[#f8f8f8]">
            Accounts Connected
          </span>
          
          <div className="flex gap-[54px] p-[16px] bg-[#121318] rounded-[8px]">
            {/* LinkedIn Accounts */}
            <div className="flex flex-col gap-[8px] w-[227px]">
              <span className=" text-[16px] font-medium text-[#f8f8f8]">
                LinkedIn
              </span>
              
              {linkedInAccounts.map((account) => (
                <div key={account.id} className="flex gap-[8px] items-center">
                  <div 
                    className="flex grow gap-[8px] items-center p-[8px] bg-[rgba(255,255,255,0.08)] rounded-[8px] cursor-pointer hover:bg-[rgba(255,255,255,0.12)]"
                    onClick={() => setShowLinkedInDropdown(showLinkedInDropdown === account.id ? null : account.id)}
                  >
                    <div className="w-[22px] h-[22px] bg-[#0077B5] rounded-full flex items-center justify-center">
                      <Linkedin size={14} color="white" />
                    </div>
                    <span className=" text-[16px] font-extrabold text-[#b3b1b8] truncate">
                      {linkedInAccounts[0].name}           
                    </span>
                    <ChevronDown className="w-[16px] h-[16px] text-[#b3b1b8]" />
                  </div>
                  
                  {showLinkedInDropdown === account.id && (
                    <div className="absolute mt-[80px] z-10 bg-[#1b1d23] border border-[#2c2e36] rounded-[8px] shadow-lg p-1 w-[180px]">
                      <button 
                        className="flex w-full items-center gap-2 px-3 py-2 text-red-500 hover:bg-[rgba(255,255,255,0.08)] rounded-[4px]"
                        onClick={() => disconnectAccount('linkedin')}
                      >
                        <Trash2 size={14} />
                        <span>Disconnect</span>
                      </button>
                    </div>
                  )}
                </div>
              ))}
              
              {linkedInAccounts.length === 0 && (
                <button 
                  onClick={connectLinkedIn}
                  className="flex gap-[8px] items-center p-[8px] hover:bg-[rgba(255,255,255,0.08)] rounded-[8px]"
                  disabled={isLoadingLinkedIn}
                >  
                  {isLoadingLinkedIn ? (
                    <>
                      <Loader2 className="w-[20px] h-[20px] text-[#d9d8dc] animate-spin" />
                      <span className="font-['Nunito'] text-[14px] font-bold text-[#d9d8dc]">
                        Connecting...
                      </span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-[20px] h-[20px] text-[#d9d8dc]" />
                      <span className="font-['Nunito'] text-[14px] font-bold text-[#d9d8dc]">
                        Connect LinkedIn
                      </span>
                    </>
                  )}
                </button>
              )}
            </div>
            
            {/* Twitter Accounts */}
            <div className="flex flex-col gap-[8px] w-[227px]">
              <span className=" text-[16px] font-medium text-[#f8f8f8]">
                X/Twitter
              </span>
              
              {twitterAccounts.map((account) => (
                <div key={account.id} className="flex gap-[8px] items-center relative">
                  <div 
                    className="flex grow gap-[8px] items-center p-[8px] bg-[rgba(255,255,255,0.08)] rounded-[8px] cursor-pointer hover:bg-[rgba(255,255,255,0.12)]"
                    onClick={() => setShowTwitterDropdown(showTwitterDropdown === account.id ? null : account.id)}
                  >
                    <div className="w-[22px] h-[22px] bg-black rounded-full flex items-center justify-center">
                      <X size={14} color="white" />
                    </div>
                    <span className=" text-[16px] font-extrabold text-[#b3b1b8] truncate">
                      @{account.account_name}
                    </span>
                    <ChevronDown className="w-[16px] h-[16px] text-[#b3b1b8]" />
                  </div>
                  
                  {showTwitterDropdown === account.id && (
                    <div className="absolute mt-[80px] z-10 bg-[#1b1d23] border border-[#2c2e36] rounded-[8px] shadow-lg p-1 w-[180px]">
                      <button 
                        className="flex w-full items-center gap-2 px-3 py-2 text-red-500 hover:bg-[rgba(255,255,255,0.08)] rounded-[4px]"
                        onClick={() => disconnectAccount('twitter')}
                      >
                        <Trash2 size={14} />
                        <span>Disconnect</span>
                      </button>
                    </div>
                  )}
                </div>
              ))}
              
              {twitterAccounts.length === 0 && (
                <button 
                  onClick={connectTwitter}
                  className="flex gap-[8px] items-center p-[8px] hover:bg-[rgba(255,255,255,0.08)] rounded-[8px]"
                  disabled={isLoadingTwitter}
                >
                  {isLoadingTwitter ? (
                    <>
                      <Loader2 className="w-[20px] h-[20px] text-[#d9d8dc] animate-spin" />
                      <span className="font-['Nunito'] text-[14px] font-bold text-[#d9d8dc]">
                        Connecting...
                      </span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-[20px] h-[20px] text-[#d9d8dc]" />
                      <span className="font-['Nunito'] text-[14px] font-bold text-[#d9d8dc]">
                        Connect Twitter
                      </span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
          
          <div className="flex flex-col gap-[8px]">
            <span className=" text-[16px] font-bold text-[#f8f8f8]">
              Subscription Status
            </span>
            <div className="p-[16px] bg-[#121318] rounded-[8px]">
              {isLoadingSubscription ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-[20px] h-[20px] text-[#d9d8dc] animate-spin" />
                  <span className="text-[14px] text-[#d9d8dc]">Loading subscription info...</span>
                </div>
              ) : subscription ? (
                <div className="flex flex-col gap-[10px]">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${
                      subscription.hasAccess ? 'bg-green-500' : 'bg-yellow-500'
                    }`} />
                    <span className="text-[14px] font-medium text-[#f8f8f8]">
                      {subscription.hasAccess ? 'Active Subscription' : 'No Active Subscription'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[14px] text-[#b3b1b8]">
                      {subscription.hasAccess 
                        ? 'Your subscription is active and you have full access to all features.'
                        : 'Subscribe to unlock all features and increase your limits.'}
                    </span>
                    <button
                      onClick={subscription.hasAccess ? handleManageSubscription : handleViewPlans}
                      className="px-[12px] py-[6px] bg-blue-600 text-white rounded-[6px] text-[12px] font-semibold hover:bg-blue-700 transition-colors"
                    >
                      {subscription.hasAccess ? 'Manage Subscription' : 'View Plans'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-[14px] text-[#b3b1b8]">
                  Unable to load subscription information.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}