import React, { useState } from 'react';
import { X, Send, Loader2, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useComments } from '../../hooks/useComments';
import { useWallet } from '../../contexts/WalletContext';

interface CommentThreadProps {
  post: any;
  onClose: () => void;
}

function timeAgo(ms: number): string {
  const diff = Date.now() - ms;
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  if (hours > 24) return `${Math.floor(hours / 24)}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (mins > 0) return `${mins}m ago`;
  return 'Just now';
}

const CommentThread: React.FC<CommentThreadProps> = ({ post, onClose }) => {
  const { address } = useWallet();
  const { comments, addComment, isPosting } = useComments(post.id);
  const [text, setText] = useState('');
  const [modError, setModError] = useState<string | null>(null);

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
    <div className="fixed inset-0 z-[200] flex items-start justify-center pt-0 md:pt-8 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 40 }}
        className="bg-background w-full max-w-[600px] h-full md:max-h-[90vh] md:rounded-2xl border border-border flex flex-col overflow-hidden shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center gap-4 px-4 py-3 border-b border-border shrink-0">
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-textMain" />
          </button>
          <span className="text-lg font-bold text-textMain">Thread</span>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          {/* Original Post */}
          <div className="p-4 border-b border-border">
            <div className="flex gap-3">
              <img
                src={post.author.avatar}
                alt="Avatar"
                className="w-10 h-10 rounded-full bg-border shrink-0"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-bold text-textMain">
                    {post.author.address.slice(0, 6)}...{post.author.address.slice(-4)}
                  </span>
                  <span className="text-textMuted text-sm">· {post.timestamp}</span>
                </div>
                <p className="text-textMain whitespace-pre-wrap">{post.content}</p>
                {post.media && (
                  <img
                    src={post.media}
                    alt="Post media"
                    className="mt-3 rounded-2xl w-full object-cover max-h-[300px] border border-border"
                  />
                )}
                <p className="text-textMuted text-sm mt-3">
                  Replying to{' '}
                  <span className="text-primary">
                    @{post.author.address.slice(0, 6)}...
                  </span>
                </p>
              </div>
            </div>
          </div>

          {/* Comments List */}
          {comments.length === 0 ? (
            <div className="p-8 text-center text-textMuted">
              <p className="text-lg font-semibold">No replies yet</p>
              <p className="text-sm mt-1">Be the first to reply!</p>
            </div>
          ) : (
            <div>
              {comments.map((comment) => (
                <div
                  key={comment.id}
                  className="px-4 py-3 border-b border-border hover:bg-white/5 transition-colors"
                >
                  <div className="flex gap-3">
                    <img
                      src={`https://api.dicebear.com/7.x/identicon/svg?seed=${comment.author}`}
                      alt="Avatar"
                      className="w-9 h-9 rounded-full bg-border shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-textMain text-sm">
                          {comment.author.slice(0, 6)}...{comment.author.slice(-4)}
                        </span>
                        <span className="text-textMuted text-xs">
                          · {timeAgo(comment.timestamp)}
                        </span>
                      </div>
                      <p className="text-textMain text-sm whitespace-pre-wrap">
                        {comment.content}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Reply Composer */}
        <div className="border-t border-border p-4 shrink-0 bg-background">
          {address ? (
            <div className="flex gap-3 items-start">
              <img
                src={`https://api.dicebear.com/7.x/identicon/svg?seed=${address}`}
                alt="Your avatar"
                className="w-9 h-9 rounded-full bg-border shrink-0"
              />
              <div className="flex-1 min-w-0">
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Post your reply..."
                  rows={2}
                  disabled={isPosting}
                  className="w-full bg-transparent border-none focus:outline-none text-textMain text-base resize-none placeholder:text-textMuted"
                />

                <AnimatePresence>
                  {isPosting && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="flex items-center gap-2 text-yellow-500 text-xs bg-yellow-500/10 p-2 rounded-lg mt-2"
                    >
                      <ShieldAlert className="w-4 h-4 shrink-0" />
                      <span>AI Moderation: Checking content...</span>
                    </motion.div>
                  )}
                  {modError && !isPosting && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="flex items-center gap-2 text-red-500 text-xs bg-red-500/10 p-2 rounded-lg mt-2"
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
                    className="flex items-center gap-2 px-4 py-1.5 bg-primary hover:bg-primaryHover text-white rounded-full font-bold text-sm transition-colors disabled:opacity-50"
                  >
                    {isPosting ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Posting...</>
                    ) : (
                      <><Send className="w-4 h-4" /> Reply</>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-center text-textMuted text-sm">
              Connect your wallet to reply.
            </p>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default CommentThread;
