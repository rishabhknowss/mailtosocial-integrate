// components/PostVariantCard.tsx
import { FC } from 'react';
import { FaLinkedin, FaTwitter } from "react-icons/fa";
import { Post } from '../types/types';

interface PostVariantCardProps {
  post: Post;
  isSelected: boolean;
  onSelect: (postId: string) => void;
}

export const PostVariantCard: FC<PostVariantCardProps> = ({ post, isSelected, onSelect }) => {
  return (
    <div 
      className={`flex-shrink-0 w-32 h-32 border rounded-lg p-3 cursor-pointer hover:shadow-md transition-shadow ${
        isSelected ? 'border-blue-500 ring-2 ring-blue-300' : 'border-gray-200'
      }`}
      onClick={() => onSelect(post.id)}
    >
      <div className="flex items-center mb-2">
        {post.platform === "linkedin" ? (
          <FaLinkedin className="text-blue-600 mr-1" size={14} />
        ) : (
          <FaTwitter className="text-blue-400 mr-1" size={14} />
        )}
        <span className="text-xs font-medium truncate">
          {post.variant}
        </span>
      </div>
      <p className="text-xs line-clamp-5 text-gray-700">{post.content}</p>
    </div>
  );
};