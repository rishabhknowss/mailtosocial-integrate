// components/GeneratePosts.tsx
import { FC } from 'react';
import { Post } from '../types/types';
import { PostCardGrid } from './PostCardGrid';

interface GeneratePostsProps {
  posts: Post[];
  onSelectPost: (post: Post) => void;
}

export const GeneratePosts: FC<GeneratePostsProps> = ({
  posts,
  onSelectPost
}) => {
  return (
    <div className="bg-[#1b1d23] rounded-lg shadow-sm p-4 sm:p-6 overflow-y-auto h-full max-h-[800px]">
      {posts.length === 0 ? (
      <div className="flex flex-col justify-center h-[400px] sm:h-[500px] lg:h-[600px] text-center text-gray-500">
        <p className="text-sm sm:text-base">Your generated posts will appear here</p>
        <p className="text-xs sm:text-sm mt-2">Select an email and generate a post to get started</p>
      </div>
      ) : (
      <PostCardGrid posts={posts} onSelectPost={onSelectPost} />
      )}
    </div>
  );
};