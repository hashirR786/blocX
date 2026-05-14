import React, { useState } from 'react';
import { X, Send, Loader2, ShieldAlert, Trash2, UserPlus, UserCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useComments } from '../../hooks/useComments';
import type { Comment } from '../../hooks/useComments';
import { useWallet } from '../../contexts/WalletContext';
import { useProfileData } from '../../hooks/useProfileData';
import { useFollows } from '../../hooks/useFollows';

interface CommentThreadProps {
  post: any;
  onClose: (count?: number) => void;
}

function timeAgo(ms: number): string {
  const diff = Date.now() - ms;
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  if (hours > 24) return `${Math.floor(hours / 24)}d ago`;
  if (hours > 0)  return `${hours}h ago`;
  if (mins > 0)   return `${mins}m ago`;
  return 'Just now';
}

// ── Per-comment row — calls useProfileData for the comment author ─────────────
interface CommentItemProps {
  comment: Comment;
  canDelete: boolean;
  isBeingDeleted: boolean;
  onDelete: (id: string) => void;
  deletingAny: boolean;
  myAddress: string | null;
}

const CommentItem: React.FC<CommentItemProps> = ({
  comment, canDelete, isBeingDeleted, onDelete, deletingAny, myAddress,
}) => {
  const onChainProfile = useProfileData(comment.author);
  const displayName    = onChainProfile?.name   || `${comment.author.slice(0, 6)}…${comment.author.slice(-4)}`;
  const displayAvatar  = onChainProfile?.avatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${comment.author}`;
  const navigate       = useNavigate();
  const isOwn          = myAddress?.toLowerCase() === comment.author.toLowerCase();

  const goToProfile = () => navigate(isOwn ? '/profile' : `/user/${comment.author}`);

  return (
    <div className={`px-4 py-4 sm:px-5 border-b border-[var(--border)] hover:bg-white/5 transition-colors ${isBeingDeleted ? 'opacity-50' : ''}`}>
      <div className="flex gap-3 sm:gap-4">
        <img
          src={displayAvatar}
          alt="Avatar"
          crossOrigin="anonymous"
          onClick={goToProfile}
          className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[var(--border)] shrink-0 border border-white/10 object-cover cursor-pointer hover:opacity-80 transition-opacity"
          onError={(e) => {
            (e.target as HTMLImageElement).src =
              `https://api.dicebear.com/7.x/identicon/svg?seed=${comment.author}`;
          }}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <span onClick={goToProfile} className="font-bold text-white text-sm cursor-pointer hover:underline">{displayName}</span>
              <span className="text-textMuted text-xs font-mono">@{comment.author.slice(0, 6)}</span>
              <span className="text-textMuted text-xs">· {timeAgo(comment.timestamp)}</span>
            </div>
            {canDelete && (
              <button
                onClick={() => onDelete(comment.id)}
                disabled={deletingAny}
                className="p-1.5 text-textMuted hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-40"
                title="Delete comment"
              >
                {isBeingDeleted
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : <Trash2 className="w-3.5 h-3.5" />}
              </button>
            )}
          </div>
          <p className="text-gray-200 text-sm whitespace-pre-wrap leading-relaxed">{comment.content}</p>
        </div>
      </div>
    </div>
  );
};

// ── CommentThread ─────────────────────────────────────────────────────────────
const CommentThread: React.FC<CommentThreadProps> = ({ post, onClose }) => {
  const { address }                                                       = useWallet();
  const { comments, isLoading, isPosting, deletingId, addComment, deleteComment } = useComments(post.id);
  const [text, setText]       = useState('');
  const [modError, setModError] = useState<string | null>(null);
  const navigate = useNavigate();

  // On-chain profiles for the post author and the current user (reply composer)
  const postAuthorProfile = useProfileData(post.author.address);
  const myProfile         = useProfileData(address ?? undefined);

  const postDisplayName   = postAuthorProfile?.name   || post.author.name   || 'Web3 User';
  const postDisplayAvatar = postAuthorProfile?.avatar || post.author.avatar;
  const myDisplayAvatar   = myProfile?.avatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${address}`;

  const postAuthorAddress = post.author.address.toLowerCase();

  // Follow state for the post author
  const { isFollowing, follow, unfollow, followLoading } = useFollows();
  const isOwnPost = address && address.toLowerCase() === postAuthorAddress;
  const following = isFollowing(post.author.address);
  const followPending = followLoading === post.author.address.toLowerCase();

  const goToPostAuthor = () => navigate(isOwnPost ? '/profile' : `/user/${post.author.address}`);

  const handleSubmit = async () => {
    if (!text.trim() || !address) return;
    setModError(null);
    const result = await addComment(address, text);
    if (!result?.success) {
      setModError(result?.reason || 'Failed to post comment');
      return;
    }
    setText('');
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center pt-8 sm:pt-16 p-2 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="glass-panel w-full max-w-[600px] max-h-[85vh] flex flex-col overflow-hidden shadow-2xl relative bg-[#0B0C10]"
      >
        {/* Header */}
        <div className="flex items-center gap-4 px-4 py-3 border-b border-[var(--border)] shrink-0 bg-[#13151A]">
          <button
            onClick={() => onClose(comments.length)}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
          <span className="text-lg font-bold text-white">Thread</span>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto min-h-0 bg-[#0B0C10]">
          {/* Original Post — with on-chain profile */}
          <div className="p-4 sm:p-5 border-b border-[var(--border)]">
            <div className="flex gap-3 sm:gap-4">
              <img
                src={postDisplayAvatar}
                alt="Avatar"
                crossOrigin="anonymous"
                onClick={goToPostAuthor}
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-[var(--border)] border border-white/10 shrink-0 object-cover cursor-pointer hover:opacity-80 transition-opacity"
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    `https://api.dicebear.com/7.x/identicon/svg?seed=${post.author.address}`;
                }}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 sm:mb-2 flex-wrap">
                  <span onClick={goToPostAuthor} className="font-bold text-white tracking-tight cursor-pointer hover:underline">{postDisplayName}</span>
                  <span className="text-textMuted text-sm">· {post.timestamp}</span>
                  {/* Follow / Unfollow button for post author */}
                  {!isOwnPost && address && (
                    <button
                      disabled={followPending}
                      onClick={() => following ? unfollow(post.author.address) : follow(post.author.address)}
                      className={`ml-auto flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border font-semibold transition-colors disabled:opacity-60 ${
                        following
                          ? 'bg-white/5 border-white/20 text-textMuted hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30'
                          : 'bg-primary/10 border-primary/30 text-primary hover:bg-primary/20'
                      }`}
                    >
                      {followPending
                        ? <Loader2 className="w-3 h-3 animate-spin" />
                        : following
                          ? <><UserCheck className="w-3 h-3" /> Following</>
                          : <><UserPlus className="w-3 h-3" /> Follow</>}
                    </button>
                  )}
                </div>
                <p className="text-gray-200 whitespace-pre-wrap leading-relaxed">{post.content}</p>
                {post.media && (
                  <img
                    src={post.media}
                    alt="Post media"
                    className="mt-3 rounded-xl w-full object-cover max-h-[400px] border border-[var(--border)]"
                  />
                )}
                <p className="text-textMuted text-sm mt-3">
                  Replying to{' '}
                  <span className="text-accent">@{post.author.address.slice(0, 6)}…</span>
                </p>
              </div>
            </div>
          </div>

          {/* Comments List */}
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="w-6 h-6 animate-spin text-accent" />
            </div>
          ) : comments.length === 0 ? (
            <div className="p-8 text-center text-textMuted flex flex-col items-center justify-center">
              <p className="text-lg font-semibold text-white/80">No replies yet</p>
              <p className="text-sm mt-1">Be the first to reply!</p>
            </div>
          ) : (
            <div>
              {comments.map((comment) => {
                const commentAuthor = comment.author.toLowerCase();
                const isCommentOwner = address && commentAuthor === address.toLowerCase();
                const isPostOwner    = address && address.toLowerCase() === postAuthorAddress;
                const canDelete      = !!(isCommentOwner || isPostOwner);
                return (
                  <CommentItem
                    key={comment.id}
                    comment={comment}
                    canDelete={canDelete}
                    isBeingDeleted={deletingId === comment.id}
                    deletingAny={!!deletingId}
                    onDelete={deleteComment}
                    myAddress={address}
                  />
                );
              })}
            </div>
          )}
        </div>

        {/* Reply Composer */}
        <div className="border-t border-[var(--border)] p-3 sm:p-4 shrink-0 bg-[#13151A]">
          {address ? (
            <div className="flex gap-3 sm:gap-4 items-start">
              <img
                src={myDisplayAvatar}
                alt="Your avatar"
                crossOrigin="anonymous"
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[var(--border)] shrink-0 border border-white/10 object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    `https://api.dicebear.com/7.x/identicon/svg?seed=${address}`;
                }}
              />
              <div className="flex-1 min-w-0 flex flex-col">
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Post your reply..."
                  rows={2}
                  disabled={isPosting}
                  className="w-full bg-[#0B0C10] border border-[var(--border)] focus:border-primary rounded-xl p-3 text-white text-base resize-none placeholder:text-textMuted focus:outline-none transition-colors"
                />
                <AnimatePresence>
                  {isPosting && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="flex items-center gap-2 text-accent text-xs bg-accent/10 border border-accent/20 p-2 rounded-xl mt-2"
                    >
                      <ShieldAlert className="w-4 h-4 shrink-0" />
                      <span>AI Sentinel: Validating content...</span>
                    </motion.div>
                  )}
                  {modError && !isPosting && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="flex items-center gap-2 text-red-400 text-xs bg-red-500/10 border border-red-500/20 p-2 rounded-xl mt-2"
                    >
                      <ShieldAlert className="w-4 h-4 shrink-0" />
                      <span>{modError}</span>
                    </motion.div>
                  )}
                </AnimatePresence>
                <div className="flex justify-end mt-2">
                  <button
                    onClick={handleSubmit}
                    disabled={!text.trim() || isPosting}
                    className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-primary to-accent hover:opacity-90 text-white rounded-full font-bold text-sm transition-all disabled:opacity-50 shadow-lg"
                  >
                    {isPosting
                      ? <><Loader2 className="w-4 h-4 animate-spin" /> Posting...</>
                      : <><Send className="w-4 h-4" /> Post</>}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-center text-textMuted text-sm py-2">
              Connect your wallet to reply.
            </p>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default CommentThread;
