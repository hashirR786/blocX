import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Contract, JsonRpcProvider, formatUnits } from 'ethers';
import { CONTRACT_ADDRESSES, ABIs } from '../config/contracts';
import { useWallet } from './WalletContext';
import { getFollowedAddresses } from '../hooks/useFollows';

const READ_PROVIDER = new JsonRpcProvider('https://rpc-amoy.polygon.technology');
const CHUNK_SIZE = 4999;
const INITIAL_LOOKBACK = 500000; // ~6 days on Amoy (~2s blocks)
const MAX_STORED = 100;

export interface AppNotification {
  id: string;         // txHash-logIndex — globally unique
  type: 'like' | 'comment' | 'reward' | 'follow_post' | 'follow';
  message: string;
  subtext: string;
  timestamp: number;  // Unix ms
  read: boolean;
  postId: string;
  txHash: string;
  blockNumber: number;
  actor?: string;     // wallet address of the person who triggered the notification
}

interface NotificationsContextValue {
  notifications: AppNotification[];
  unreadCount: number;
  isLoading: boolean;
  markAllRead: () => void;
  markRead: (id: string) => void;
  refresh: () => void;
}

const NotificationsContext = createContext<NotificationsContextValue>({
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  markAllRead: () => {},
  markRead: () => {},
  refresh: () => {},
});

const storageKey = (addr: string) => `blocx_notif_${addr.toLowerCase()}`;
const lastBlockKey = (addr: string) => `blocx_notif_lb_${addr.toLowerCase()}`;

function loadCached(addr: string): AppNotification[] {
  try {
    const raw = localStorage.getItem(storageKey(addr));
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveCached(addr: string, notifs: AppNotification[]) {
  localStorage.setItem(storageKey(addr), JSON.stringify(notifs));
}

function shortAddr(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const { address } = useWallet();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const isFetching = useRef(false);

  const fetchNotifications = useCallback(async () => {
    if (!address || isFetching.current) return;
    isFetching.current = true;
    setIsLoading(true);

    try {
      const contract = new Contract(CONTRACT_ADDRESSES.social, ABIs.social, READ_PROVIDER);
      const currentBlock = await READ_PROVIDER.getBlockNumber();

      const cachedLastBlock = parseInt(localStorage.getItem(lastBlockKey(address)) || '0');
      const fromBlock = cachedLastBlock > 0
        ? cachedLastBlock + 1
        : Math.max(0, currentBlock - INITIAL_LOOKBACK);

      if (fromBlock > currentBlock) {
        isFetching.current = false;
        setIsLoading(false);
        return;
      }

      // Build block range chunks
      const chunks: [number, number][] = [];
      for (let b = fromBlock; b <= currentBlock; b += CHUNK_SIZE) {
        chunks.push([b, Math.min(b + CHUNK_SIZE - 1, currentBlock)]);
      }

      // Approximate block timestamp (Amoy ~2s per block)
      const approxMs = (blockNumber: number) =>
        Date.now() - (currentBlock - blockNumber) * 2000;

      // ── 1. Discover user's post IDs ────────────────────────────────────────
      const postCreatedResults = await Promise.allSettled(
        chunks.map(([from, to]) =>
          contract.queryFilter(contract.filters.PostCreated(null, address), from, to)
        )
      );

      const userPostIds = new Set<bigint>();
      for (const r of postCreatedResults) {
        if (r.status === 'fulfilled') {
          for (const e of r.value) {
            if ('args' in e) userPostIds.add(e.args.postId as bigint);
          }
        }
      }

      const newNotifs: AppNotification[] = [];

      // ── 2. PostLiked for user's posts ──────────────────────────────────────
      if (userPostIds.size > 0) {
        const likeResults = await Promise.allSettled(
          chunks.map(([from, to]) =>
            contract.queryFilter(contract.filters.PostLiked(), from, to)
          )
        );

        for (const r of likeResults) {
          if (r.status !== 'fulfilled') continue;
          for (const e of r.value) {
            if (!('args' in e)) continue;
            const { postId, liker } = e.args;
            if (!userPostIds.has(postId as bigint)) continue;
            if ((liker as string).toLowerCase() === address.toLowerCase()) continue;

            newNotifs.push({
              id: `${e.transactionHash}-${e.index}`,
              type: 'like',
              message: `${shortAddr(liker as string)} liked your post`,
              subtext: `Post #${(postId as bigint).toString()}`,
              timestamp: approxMs(e.blockNumber),
              read: false,
              postId: (postId as bigint).toString(),
              txHash: e.transactionHash,
              blockNumber: e.blockNumber,
              actor: liker as string,
            });
          }
        }

        // ── 3. CommentCreated for user's posts ─────────────────────────────
        const commentResults = await Promise.allSettled(
          chunks.map(([from, to]) =>
            contract.queryFilter(contract.filters.CommentCreated(), from, to)
          )
        );

        for (const r of commentResults) {
          if (r.status !== 'fulfilled') continue;
          for (const e of r.value) {
            if (!('args' in e)) continue;
            const { postId, author, timestamp: onChainTs } = e.args;
            if (!userPostIds.has(postId as bigint)) continue;
            if ((author as string).toLowerCase() === address.toLowerCase()) continue;

            newNotifs.push({
              id: `${e.transactionHash}-${e.index}`,
              type: 'comment',
              message: `${shortAddr(author as string)} replied to your post`,
              subtext: `Post #${(postId as bigint).toString()}`,
              timestamp: Number(onChainTs as bigint) * 1000,
              read: false,
              postId: (postId as bigint).toString(),
              txHash: e.transactionHash,
              blockNumber: e.blockNumber,
              actor: author as string,
            });
          }
        }
      }

      // ── 4. RewardIssued for current user ───────────────────────────────────
      const rewardResults = await Promise.allSettled(
        chunks.map(([from, to]) =>
          contract.queryFilter(contract.filters.RewardIssued(null, address), from, to)
        )
      );

      for (const r of rewardResults) {
        if (r.status !== 'fulfilled') continue;
        for (const e of r.value) {
          if (!('args' in e)) continue;
          const { postId, amount } = e.args;
          const blocxAmount = formatUnits(amount as bigint, 18);

          newNotifs.push({
            id: `${e.transactionHash}-${e.index}`,
            type: 'reward',
            message: `You earned ${blocxAmount} BLOCX tokens! 🎉`,
            subtext: `Post #${(postId as bigint).toString()} hit a like milestone`,
            timestamp: approxMs(e.blockNumber),
            read: false,
            postId: (postId as bigint).toString(),
            txHash: e.transactionHash,
            blockNumber: e.blockNumber,
          });
        }
      }

      // ── 5. Followed — someone followed you ────────────────────────────────
      if (CONTRACT_ADDRESSES.follow) {
        const followContract = new Contract(CONTRACT_ADDRESSES.follow, ABIs.follow, READ_PROVIDER);
        const followResults = await Promise.allSettled(
          chunks.map(([from, to]) =>
            followContract.queryFilter(followContract.filters.Followed(null, address), from, to)
          )
        );
        for (const r of followResults) {
          if (r.status !== 'fulfilled') continue;
          for (const e of r.value) {
            if (!('args' in e)) continue;
            const { follower } = e.args;
            if ((follower as string).toLowerCase() === address.toLowerCase()) continue;
            newNotifs.push({
              id: `${e.transactionHash}-${e.index}`,
              type: 'follow',
              message: `${shortAddr(follower as string)} started following you`,
              subtext: 'New follower',
              timestamp: approxMs(e.blockNumber),
              read: false,
              postId: '',
              txHash: e.transactionHash,
              blockNumber: e.blockNumber,
              actor: follower as string,
            });
          }
        }
      }

      // ── 6. PostCreated by followed users ──────────────────────────────────
      const followedAddrs = getFollowedAddresses(address).map(a => a.toLowerCase());
      if (followedAddrs.length > 0) {
        const followPostResults = await Promise.allSettled(
          chunks.map(([from, to]) =>
            contract.queryFilter(contract.filters.PostCreated(), from, to)
          )
        );
        for (const r of followPostResults) {
          if (r.status !== 'fulfilled') continue;
          for (const e of r.value) {
            if (!('args' in e)) continue;
            const { postId, author } = e.args;
            const authorLower = (author as string).toLowerCase();
            if (!followedAddrs.includes(authorLower)) continue;
            newNotifs.push({
              id: `${e.transactionHash}-${e.index}`,
              type: 'follow_post',
              message: `${shortAddr(author as string)} posted something new`,
              subtext: `Post #${(postId as bigint).toString()}`,
              timestamp: approxMs(e.blockNumber),
              read: false,
              postId: (postId as bigint).toString(),
              txHash: e.transactionHash,
              blockNumber: e.blockNumber,
              actor: author as string,
            });
          }
        }
      }

      // ── Merge with cache (preserve read status for existing) ───────────────
      const cached = loadCached(address);
      const readMap = new Map(cached.map((n) => [n.id, n.read]));

      // Apply cached read status to new notifs
      const withReadStatus = newNotifs.map((n) => ({
        ...n,
        read: readMap.get(n.id) ?? false,
      }));

      const existingIds = new Set(cached.map((n) => n.id));
      const brandNew = withReadStatus.filter((n) => !existingIds.has(n.id));

      const merged = [...brandNew, ...cached]
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, MAX_STORED);

      saveCached(address, merged);
      localStorage.setItem(lastBlockKey(address), currentBlock.toString());
      setNotifications(merged);
    } catch (err) {
      console.error('[BlocX] Notification fetch error:', err);
    } finally {
      isFetching.current = false;
      setIsLoading(false);
    }
  }, [address]);

  // On address change: load cache immediately, then fetch new
  useEffect(() => {
    if (!address) { setNotifications([]); return; }
    setNotifications(loadCached(address));
    fetchNotifications();
  }, [address, fetchNotifications]);

  // Poll every 60 seconds
  useEffect(() => {
    if (!address) return;
    const id = setInterval(fetchNotifications, 60_000);
    return () => clearInterval(id);
  }, [address, fetchNotifications]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllRead = useCallback(() => {
    setNotifications((prev) => {
      const updated = prev.map((n) => ({ ...n, read: true }));
      if (address) saveCached(address, updated);
      return updated;
    });
  }, [address]);

  const markRead = useCallback((id: string) => {
    setNotifications((prev) => {
      const updated = prev.map((n) => (n.id === id ? { ...n, read: true } : n));
      if (address) saveCached(address, updated);
      return updated;
    });
  }, [address]);

  return (
    <NotificationsContext.Provider
      value={{ notifications, unreadCount, isLoading, markAllRead, markRead, refresh: fetchNotifications }}
    >
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationsContext);
}
