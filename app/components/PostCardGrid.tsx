import { FC, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Post } from '../types/types';
import { Linkedin, X, ImageIcon } from 'lucide-react';
import Image from 'next/image';

interface PostCardGridProps {
  posts: Post[];
  onSelectPost: (post: Post) => void;
}

export const PostCardGrid: FC<PostCardGridProps> = ({ posts, onSelectPost }) => {
  const [twitterUsername, setTwitterUsername] = useState<string>('');
  const [linkedinProfileName, setLinkedinProfileName] = useState<string>('');

  // Animation variants for the card
  const cardVariants = {
    rest: {
      scale: 1,
      transition: {
        duration: 0.2,
        ease: "easeOut"
      }
    },
    hover: {
      scale: 1.05,
      transition: {
        duration: 0.2,
        ease: "easeOut"
      }
    }
  };

  useEffect(() => {
    const fetchAccountDetails = async () => {
      try {
        const twitterResponse = await fetch('/api/accounts/twitter/status');
        if (twitterResponse.ok) {
          const twitterData = await twitterResponse.json();
          if (twitterData.connected && twitterData.username) {
            setTwitterUsername(twitterData.username);
          }
        }

        const linkedinResponse = await fetch('/api/accounts/linkedin/status');
        if (linkedinResponse.ok) {
          const linkedinData = await linkedinResponse.json();
          if (linkedinData.connected && linkedinData.profileName) {
            setLinkedinProfileName(linkedinData.profileName);
          }
        }
      } catch (error) {
        console.error('Error fetching account details:', error);
      }
    };

    fetchAccountDetails();
  }, []);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {posts.map((post) => (
        <motion.div
          key={post.id}
          variants={cardVariants}
          initial="rest"
          whileHover="hover"
          className="border bg-[rgba(255,255,255,0.06)] rounded-lg p-4 cursor-pointer shadow-sm flex flex-col"
          onClick={() => onSelectPost(post)}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center">
              {post.platform === "linkedin" ? (
                <Linkedin className="text-slate-500 mr-2" size={16} />
              ) : (
                <X className="text-slate-500 mr-2" size={16} />
              )}
              <span className="font-medium text-white">
                {post.platform === "linkedin" 
                  ? (linkedinProfileName || 'LinkedIn User')
                  : (twitterUsername ? `@${twitterUsername}` : 'Twitter User')}
              </span>
            </div>
            <div className="bg-slate-700 text-xs text-white py-1 px-2 rounded">
              {post.imageStyle || 'Default'}
            </div>
          </div>
          
          {/* Generated image */}
          {post.generatedImage ? (
            <div className="mb-3 relative rounded-md overflow-hidden bg-slate-700 shadow-inner flex justify-center items-center" style={{ height: '200px' }}>
              <Image 
                unoptimized
                src={`data:image/png;base64,${post.generatedImage}`}
                alt={`Generated ${post.imageStyle} for post`}
                width={400}
                height={200}
                className="object-contain w-full h-full rounded-md"
              />
            </div>
          ) : post.imageStyle ? (
            <div className="mb-3 relative rounded-md overflow-hidden bg-slate-700 shadow-inner flex justify-center items-center h-[200px]">
              <div className="flex flex-col items-center text-gray-400">
                <ImageIcon size={36} className="mb-2 opacity-50" />
                <span className="text-xs text-center px-2">
                  Generating {post.imageStyle}...
                </span>
              </div>
            </div>
          ) : null}
          
          {/* Post content */}
          <p className="text-sm text-white leading-relaxed">{post.content}</p>
        </motion.div>
      ))}
    </div>
  );
};