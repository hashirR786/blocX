import React from 'react';
import CreatePost from '../components/post/CreatePost';
import PostCard from '../components/post/PostCard';
import { usePosts } from '../hooks/usePosts';
import { Loader2 } from 'lucide-react';
import { useWallet } from '../contexts/WalletContext';

const Home: React.FC = () => {
  const { address } = useWallet();
  const { data: posts, isLoading } = usePosts();

  return (
    <div className="w-full pb-20 md:pb-0">
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border px-4 py-3 cursor-pointer">
        <h2 className="text-xl font-bold text-textMain">For you</h2>
      </div>
      
      {address ? (
        <CreatePost />
      ) : (
        <div className="border-b border-border p-6 text-center">
          <p className="text-textMuted mb-2">Connect your wallet to create a post</p>
        </div>
      )}
      
      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-12 gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : posts && posts.length > 0 ? (
        <div className="flex flex-col">
          {posts.map(post => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      ) : (
        <div className="text-center p-12">
          <p className="text-textMuted text-lg font-bold">No posts yet</p>
          <p className="text-sm text-textMuted mt-2">Welcome to the decentralized web.</p>
        </div>
      )}
    </div>
  );
};

export default Home;
