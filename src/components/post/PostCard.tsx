import React, { useState } from 'react';
import { Heart, MessageSquare, Share2 } from 'lucide-react';
import { cn } from '../../utils/cn';
import { motion, AnimatePresence } from 'framer-motion';
import { useWallet } from '../../contexts/WalletContext';
import { CONTRACT_ADDRESSES, ABIs } from '../../config/contracts';
import { Contract, parseUnits } from 'ethers';
import CommentThread from './CommentThread';
import { getComments } from '../../hooks/useComments';

interface PostCardProps {
  post: any;
}

const PostCard: React.FC<PostCardProps> = ({ post }) => {
  const [isLiked, setIsLiked] = useState(post.isLiked);
  const [likes, setLikes] = useState(post.likes);
  const [isLiking, setIsLiking] = useState(false);
  const [showThread, setShowThread] = useState(false);
  const [commentCount, setCommentCount] = useState(() => getComments(post.id).length);
  const { provider } = useWallet();

  const handleLike = async () => {
    if (isLiked || isLiking) return;
    
    if (provider) {
      setIsLiking(true);
      try {
        const signer = await provider.getSigner();
        const socialContract = new Contract(
          CONTRACT_ADDRESSES.social,
          ABIs.social,
          signer
        );
        
        // Assuming post.id matches the on-chain numeric ID
        const tx = await socialContract.likePost(post.id, {
          maxPriorityFeePerGas: parseUnits('30', 'gwei'),
          maxFeePerGas: parseUnits('40', 'gwei')
        });
        await tx.wait(); // Wait for confirmation
        
        setIsLiked(true);
        setLikes((prev: number) => prev + 1);
      } catch (error: any) {
        console.error("Failed to like post:", error);
        alert(error.reason || "Failed to like post (Do you have a profile?)");
      } finally {
        setIsLiking(false);
      }
    } else {
      // Fallback for mock if not connected
      setIsLiked(true);
      setLikes((prev: number) => prev + 1);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="border-b border-border p-4 hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer flex gap-3"
    >
      <div className="shrink-0">
        <img src={post.author.avatar} alt="Avatar" className="w-10 h-10 rounded-full bg-border" />
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1 mb-1">
          <h4 className="font-bold text-textMain truncate">User {post.author.address.slice(0, 6)}</h4>
          <span className="text-sm text-textMuted truncate">@{post.author.address.slice(0, 8)}...</span>
          <span className="text-sm text-textMuted">·</span>
          <span className="text-sm text-textMuted">{post.timestamp}</span>
        </div>
        
        <p className="text-textMain mb-3 whitespace-pre-wrap">{post.content}</p>
        
        {post.media && (
          <div className="mb-3">
            <img src={post.media} alt="Post media" className="rounded-2xl w-full object-cover max-h-[500px] border border-border" />
          </div>
        )}

        <div className="flex items-center justify-between text-textMuted max-w-md">
          <button 
            onClick={(e) => { e.stopPropagation(); setShowThread(true); }}
            className="flex items-center gap-2 text-sm hover:text-primary transition-colors group"
          >
            <div className="p-2 rounded-full group-hover:bg-primary/10 -ml-2">
              <MessageSquare className="w-4 h-4" />
            </div>
            <span>{commentCount}</span>
          </button>
          
          <button 
            onClick={(e) => { e.stopPropagation(); handleLike(); }}
            className={cn("flex items-center gap-2 text-sm transition-colors group", isLiked ? "text-pink-500" : "hover:text-pink-500")}
          >
            <div className={cn("p-2 rounded-full -ml-2", isLiked ? "" : "group-hover:bg-pink-500/10")}>
              <Heart className={cn("w-4 h-4", isLiked && "fill-current")} />
            </div>
            <span>{likes}</span>
          </button>
          
          <button className="flex items-center gap-2 text-sm hover:text-green-500 transition-colors group">
            <div className="p-2 rounded-full group-hover:bg-green-500/10 -ml-2">
              <Share2 className="w-4 h-4" />
            </div>
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showThread && (
          <CommentThread 
            post={post} 
            onClose={() => {
              setShowThread(false);
              setCommentCount(getComments(post.id).length); // Refresh count when closing modal
            }} 
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default PostCard;
