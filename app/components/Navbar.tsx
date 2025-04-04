import React, { useState, useEffect } from "react";
import { X, Linkedin, ChevronDown, Loader2 } from "lucide-react";
import { useSession } from "next-auth/react";
import { toast } from "react-hot-toast";
import { motion } from "framer-motion";
import Image from "next/image";
type SocialAccount = {
  username: string;
  connected: boolean;
};

type LinkedInAccount = {
  connected: boolean;
  profileName: string | null;
};

export function Navbar() {
  const { data: session } = useSession();
  const [twitterAccount, setTwitterAccount] = useState<SocialAccount | null>(null);
  const [linkedinAccount, setLinkedinAccount] = useState<LinkedInAccount | null>(null);
  const [isLoadingTwitter, setIsLoadingTwitter] = useState(false);
  const [isLoadingLinkedin, setIsLoadingLinkedin] = useState(false);
  const [showTwitterDropdown, setShowTwitterDropdown] = useState(false);
  const [showLinkedinDropdown, setShowLinkedinDropdown] = useState(false);

  // Animation variants for buttons
  const buttonVariants = {
    rest: {
      backgroundColor: "rgba(255,255,255,0.08)",
      transition: { duration: 0.2 }
    },
    hover: {
      backgroundColor: "rgba(255,255,255,0.12)",
      transition: { duration: 0.2 }
    }
  };

  useEffect(() => {
    if (session?.user) {
      fetchConnectedAccounts();
    }
  }, [session]);

  const fetchConnectedAccounts = async () => {
    try {
      const twitterResponse = await fetch('/api/accounts/twitter/status');
      if (twitterResponse.ok) {
        const twitterData = await twitterResponse.json();
        if (twitterData.connected) {
          setTwitterAccount({
            connected: true,
            username: twitterData.username || 'Twitter User'
          });
        } else {
          setTwitterAccount(null);
        }
      }

      const linkedinResponse = await fetch('/api/accounts/linkedin/status');
      if (linkedinResponse.ok) {
        const linkedinData = await linkedinResponse.json();
        if (linkedinData.connected) {
          setLinkedinAccount({
            connected: true,
            profileName: linkedinData.profileName || 'LinkedIn User'
          });
        } else {
          setLinkedinAccount(null);
        }
      }
    } catch (error) {
      console.error('Error fetching account status:', error);
    }
  };

  const connectTwitter = async () => {
    if (!session) {
      toast.error("You must be signed in to connect Twitter");
      return;
    }

    setIsLoadingTwitter(true);
    try {
      const response = await fetch('/api/accounts/twitter/connect');
      if (response.ok) {
        const data = await response.json();
        window.location.href = data.url;
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to connect Twitter");
      }
    } catch (error) {
      console.error('Error connecting Twitter:', error);
      toast.error("An error occurred while connecting to Twitter");
    } finally {
      setIsLoadingTwitter(false);
    }
  };

  const connectLinkedin = async () => {
    if (!session) {
      toast.error("You must be signed in to connect LinkedIn");
      return;
    }

    setIsLoadingLinkedin(true);
    try {
      const response = await fetch('/api/accounts/linkedin/connect');
      if (response.ok) {
        const data = await response.json();
        window.location.href = data.url;
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to connect LinkedIn");
      }
    } catch (error) {
      console.error('Error connecting LinkedIn:', error);
      toast.error("An error occurred while connecting to LinkedIn");
    } finally {
      setIsLoadingLinkedin(false);
    }
  };

  const disconnectAccount = async (provider: 'twitter' | 'linkedin') => {
    try {
      const response = await fetch(`/api/accounts/${provider}/disconnect`, {
        method: 'POST',
      });
      if (response.ok) {
        if (provider === 'twitter') {
          setTwitterAccount(null);
          setShowTwitterDropdown(false);
        } else {
          setLinkedinAccount(null);
          setShowLinkedinDropdown(false);
        }
        toast.success(`${provider.charAt(0).toUpperCase() + provider.slice(1)} account disconnected`);
      } else {
        const error = await response.json();
        toast.error(error.error || `Failed to disconnect ${provider}`);
      }
    } catch (error) {
      console.error(`Error disconnecting ${provider}:`, error);
      toast.error(`An error occurred while disconnecting ${provider}`);
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-20 py-6 transition-all duration-300 bg-[--background] backdrop-blur-md">
      <div className="container mx-auto px-8 flex justify-between items-center">
        <div className="flex gap-[5px] items-center">
          <Image
            src="/logo.png"
            alt="Logo"
            className="w-[29px] h-[20px] text-[#8f959e]"
            width={29}
            height={20}
          />
          <span className="font-semibold text-[#8f959e]">MailToSocial</span>
        </div>

        <div className="flex items-center gap-4">
          <a 
            href="/pricing" 
            className="text-[#b3b1b8] hover:text-white font-medium transition-colors duration-200"
          >
            Pricing
          </a>
          
          <div className="flex gap-3">
            {/* Twitter Connection Button */}
            <div className="relative">
              <motion.button
                variants={buttonVariants}
                initial="rest"
                whileHover="hover"
                className="cursor-pointer flex items-center gap-2 px-4 py-2 rounded-lg"
                onClick={() => twitterAccount?.connected
                  ? setShowTwitterDropdown(!showTwitterDropdown)
                  : connectTwitter()
                }
                disabled={isLoadingTwitter}
              >
                {isLoadingTwitter ? (
                  <>
                    <Loader2 className="w-4 h-4 text-[#b3b1b8] animate-spin" />
                    <span className="text-[#b3b1b8] font-extrabold">Connecting...</span>
                  </>
                ) : (
                  <>
                    <span className="text-[#b3b1b8] font-extrabold">
                      {twitterAccount?.connected
                        ? `@${twitterAccount.username}`
                        : "Connect Twitter"}
                    </span>
                    <X className="w-4 h-4 text-[#b3b1b8]" />
                    {twitterAccount?.connected && (
                      <ChevronDown className="w-4 h-4 text-[#b3b1b8]" />
                    )}
                  </>
                )}
              </motion.button>

              {showTwitterDropdown && twitterAccount?.connected && (
                <div className="absolute right-0 mt-2 w-48 bg-[#1a1b1e] rounded-md shadow-lg py-1 z-10">
                  <button
                    className="block w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-[rgba(255,255,255,0.08)]"
                    onClick={() => disconnectAccount('twitter')}
                  >
                    Disconnect Twitter
                  </button>
                </div>
              )}
            </div>

            {/* LinkedIn Connection Button */}
            <div className="relative">
              <motion.button
                variants={buttonVariants}
                initial="rest"
                whileHover="hover"
                className="cursor-pointer flex items-center gap-2 px-4 py-2 rounded-lg"
                onClick={() => linkedinAccount?.connected
                  ? setShowLinkedinDropdown(!showLinkedinDropdown)
                  : connectLinkedin()
                }
                disabled={isLoadingLinkedin}
              >
                {isLoadingLinkedin ? (
                  <>
                    <Loader2 className="w-4 h-4 text-[#b3b1b8] animate-spin" />
                    <span className="text-[#b3b1b8] font-extrabold">Connecting...</span>
                  </>
                ) : (
                  <>
                    <span className="text-[#b3b1b8] font-extrabold">
                      {linkedinAccount?.connected
                        ? linkedinAccount.profileName || 'LinkedIn User'
                        : "Connect LinkedIn"}
                    </span>
                    <Linkedin className="w-4 h-4 text-[#b3b1b8]" />
                    {linkedinAccount?.connected && (
                      <ChevronDown className="w-4 h-4 text-[#b3b1b8]" />
                    )}
                  </>
                )}
              </motion.button>

              {showLinkedinDropdown && linkedinAccount?.connected && (
                <div className="absolute right-0 mt-2 w-48 bg-[#1a1b1e] rounded-md shadow-lg py-1 z-10">
                  <button
                    className="block w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-[rgba(255,255,255,0.08)]"
                    onClick={() => disconnectAccount('linkedin')}
                  >
                    Disconnect LinkedIn
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}