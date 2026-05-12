import React, { useEffect } from 'react';
import { Heart, MessageSquare, Zap, Loader2, BellOff, CheckCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNotifications } from '../contexts/NotificationsContext';
import { useWallet } from '../contexts/WalletContext';

function timeAgo(ms: number): string {
  const diff = Date.now() - ms;
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (mins > 0) return `${mins}m ago`;
  return 'Just now';
}

const iconConfig = {
  like:    { Icon: Heart,          bg: 'bg-pink-500/15',   ring: 'ring-pink-500/30',   text: 'text-pink-400' },
  comment: { Icon: MessageSquare,  bg: 'bg-blue-500/15',   ring: 'ring-blue-500/30',   text: 'text-blue-400' },
  reward:  { Icon: Zap,            bg: 'bg-yellow-500/15', ring: 'ring-yellow-500/30', text: 'text-yellow-400' },
};

const Notifications: React.FC = () => {
  const { address } = useWallet();
  const { notifications, unreadCount, isLoading, markAllRead, markRead, refresh } = useNotifications();

  // Mark all as read when the page is opened
  useEffect(() => {
    if (unreadCount > 0) markAllRead();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!address) {
    return (
      <div className="w-full pb-20 md:pb-0">
        <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border px-4 py-3">
          <h2 className="text-xl font-bold text-textMain">Alerts</h2>
        </div>
        <div className="flex flex-col items-center justify-center p-16 gap-4 text-textMuted">
          <BellOff className="w-10 h-10 opacity-40" />
          <p className="font-semibold text-white/60">Connect your wallet to see alerts</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full pb-20 md:pb-0">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border px-4 py-3 flex items-center justify-between">
        <h2 className="text-xl font-bold text-textMain">Alerts</h2>
        <div className="flex items-center gap-3">
          {isLoading && <Loader2 className="w-4 h-4 animate-spin text-textMuted" />}
          {notifications.length > 0 && (
            <button
              onClick={markAllRead}
              className="flex items-center gap-1.5 text-xs text-textMuted hover:text-white transition-colors px-2 py-1 rounded-lg hover:bg-white/5"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              Mark all read
            </button>
          )}
          <button
            onClick={refresh}
            className="text-xs text-accent hover:text-accent/80 transition-colors px-2 py-1 rounded-lg hover:bg-white/5"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Content */}
      {isLoading && notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-16 gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-accent" />
          <p className="text-textMuted text-sm">Fetching on-chain activity…</p>
        </div>
      ) : notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-16 gap-4 text-textMuted">
          <BellOff className="w-10 h-10 opacity-40" />
          <p className="font-semibold text-white/60">No alerts yet</p>
          <p className="text-sm opacity-60">Likes and replies on your posts will appear here.</p>
        </div>
      ) : (
        <div className="flex flex-col">
          <AnimatePresence initial={false}>
            {notifications.map((notif, i) => {
              const { Icon, bg, ring, text } = iconConfig[notif.type];
              return (
                <motion.div
                  key={notif.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: Math.min(i * 0.04, 0.3) }}
                  onClick={() => markRead(notif.id)}
                  className={`
                    border-b border-border p-4 flex gap-4 cursor-pointer transition-colors
                    hover:bg-white/5
                    ${!notif.read ? 'bg-white/[0.03]' : ''}
                  `}
                >
                  {/* Icon badge */}
                  <div className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center ring-1 ${bg} ${ring}`}>
                    <Icon className={`w-5 h-5 ${text}`} />
                  </div>

                  {/* Text */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-sm leading-snug ${notif.read ? 'text-white/70' : 'text-white font-medium'}`}>
                        {notif.message}
                      </p>
                      {!notif.read && (
                        <span className="shrink-0 w-2 h-2 rounded-full bg-accent mt-1.5" />
                      )}
                    </div>
                    <p className="text-xs text-textMuted mt-0.5">{notif.subtext}</p>
                    <p className="text-xs text-textMuted/60 mt-1">{timeAgo(notif.timestamp)}</p>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};

export default Notifications;
