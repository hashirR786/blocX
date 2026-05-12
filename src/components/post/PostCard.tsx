import React, { useState, useRef, useEffect } from 'react';
import { Heart, MessageSquare, Share2, MoreHorizontal, Trash2, Loader2 } from 'lucide-react';
import { cn } from '../../utils/cn';
import { motion, AnimatePresence } from 'framer-motion';
import { useWallet } from '../../contexts/WalletContext';
import { useTransaction } from '../../contexts/TransactionContext';
import { CONTRACT_ADDRESSES, ABIs } from '../../config/contracts';
import { Contract, parseUnits } from 'ethers';
import { useQueryClient } from '@tanstack/react-query';
import CommentThread from './CommentThread';
import type { Post } from '../../hooks/usePosts';

interface PostCardProps {
  post: Post;
}

const PostCard: React.FC<PostCardProps> = ({ post }) => {
  const [isLiked, setIsLiked] = useState(post.isLiked);
  const [likes, setLikes] = useState(post.likes);
  const [showThread, setShowThread] = useState(false);
  const [commentCount, setCommentCount] = useState(post.comments);
  const [showMenu, setShowMenu] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const { provider, address } = useWallet();
  const { setTxState, setTxMessage } = useTransaction();
  const queryClient = useQueryClient();

  const isOwner = address && post.author.address.toLowerCase() === address.toLowerCase();

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLike = async () => {
    if (isLiked) return;

    if (provider) {
      setTxState('awaiting_signature');
      try {
        const signer = await provider.getSigner();
        const socialContract = new Contract(CONTRACT_ADDRESSES.social, ABIs.social, signer);

        const tx = await socialContract.likePost(post.id, {
          maxPriorityFeePerGas: parseUnits('30', 'gwei'),
          maxFeePerGas: parseUnits('40', 'gwei'),
        });

        setTxState('mining');
        await tx.wait();

        setIsLiked(true);
        setLikes((prev: number) => prev + 1);
        setTxMessage('Post liked successfully!');
        setTxState('success');
      } catch (error: any) {
        console.error('Failed to like post:', error);
        setTxMessage(error.reason || 'Failed to like post.');
        setTxState('error');
      } finally {
        setTimeout(() => setTxState('idle'), 3000);
      }
    } else {
      setIsLiked(true);
      setLikes((prev: number) => prev + 1);
    }
  };

  const handleDeletePost = async () => {
    if (!provider) return;
    setShowMenu(false);
    setIsDeleting(true);
    setTxState('awaiting_signature');
    try {
      const signer = await provider.getSigner();
      const socialContract = new Contract(CONTRACT_ADDRESSES.social, ABIs.social, signer);

      const tx = await socialContract.deletePost(BigInt(post.id), {
        maxPriorityFeePerGas: parseUnits('30', 'gwei'),
        maxFeePerGas: parseUnits('40', 'gwei'),
      });

      setTxState('mining');
      await tx.wait();

      setTxMessage('Post deleted.');
      setTxState('success');

      // Optimistically remove post from cache
      queryClient.setQueryData(['posts', address], (old: Post[] | undefined) =>
        old ? old.filter((p) => p.id !== post.id) : []
      );
    } catch (error: any) {
      console.error('Failed to delete post:', error);
      setTxMessage(error.reason || 'Failed to delete post.');
      setTxState('error');
    } finally {
      setIsDeleting(false);
      setTimeout(() => setTxState('idle'), 3000);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-panel p-5 mb-6 cursor-pointer group hover:border-primary/50 transition-all duration-300 relative overflow-hidden"
    >
      {/* Subtle hover gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

      <div className="flex gap-4 relative z-10">
        <div className="shrink-0">
          <img
            src={post.author.avatar}
            alt="Avatar"
            crossOrigin="anonymous"
            className="w-12 h-12 rounded-xl bg-[var(--border)] border border-white/10 shadow-lg"
          />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <h4 className="font-bold text-white text-lg truncate tracking-tight">{post.author.name || 'Web3 User'}</h4>
              <span className="text-sm text-textMuted font-mono">@{post.author.address.slice(0, 6)}</span>
              <span className="w-1 h-1 rounded-full bg-textMuted mx-1" />
              <span className="text-sm text-textMuted">{post.timestamp}</span>
            </div>

            {/* Options menu — only meaningful for post owner */}
            {isOwner && (
              <div className="relative" ref={menuRef}>
                <button
                  onClick={(e) => { e.stopPropagation(); setShowMenu((v) => !v); }}
                  className="text-textMuted hover:text-white transition-colors p-1"
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <MoreHorizontal className="w-5 h-5" />
                  )}
                </button>

                <AnimatePresence>
                  {showMenu && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: -4 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -4 }}
                      transition={{ duration: 0.1 }}
                      className="absolute right-0 top-8 z-50 w-40 bg-[#13151A] border border-white/10 rounded-xl shadow-xl overflow-hidden"
                    >
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeletePost(); }}
                        className="flex items-center gap-2 w-full px-4 py-3 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete post
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>

          <p className="text-gray-200 mb-4 whitespace-pre-wrap leading-relaxed">{post.content}</p>

          {post.media && (
            <div className="mb-4">
              <img
                src={post.media}
                alt="Post media"
                crossOrigin="anonymous"
                className="rounded-xl w-full object-cover max-h-[400px] border border-white/10 shadow-lg"
              />
            </div>
          )}

          <div className="flex items-center gap-8 mt-2">
            <button
              onClick={(e) => { e.stopPropagation(); setShowThread(true); }}
              className="flex items-center gap-2 text-textMuted hover:text-accent transition-colors"
            >
              <div className="p-2 rounded-lg bg-white/5 hover:bg-accent/10 transition-colors">
                <MessageSquare className="w-5 h-5" />
              </div>
              <span className="font-medium">{commentCount}</span>
            </button>

            <button
              onClick={(e) => { e.stopPropagation(); handleLike(); }}
              className={cn('flex items-center gap-2 transition-colors', isLiked ? 'text-pink-500' : 'text-textMuted hover:text-pink-500')}
            >
              <div className={cn('p-2 rounded-lg transition-colors', isLiked ? 'bg-pink-500/20' : 'bg-white/5 hover:bg-pink-500/10')}>
                <Heart className={cn('w-5 h-5 transition-transform', isLiked && 'fill-current scale-110')} />
              </div>
              <span className="font-medium">{likes}</span>
            </button>

            <button className="flex items-center gap-2 text-textMuted hover:text-green-400 transition-colors">
              <div className="p-2 rounded-lg bg-white/5 hover:bg-green-400/10 transition-colors">
                <Share2 className="w-5 h-5" />
              </div>
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showThread && (
          <CommentThread
            post={post}
            onClose={(count?: number) => {
              setShowThread(false);
              if (count !== undefined) setCommentCount(count);
            }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default PostCard;
