import { useState, useCallback, useEffect } from 'react';
import { JsonRpcProvider, Contract } from 'ethers';
import { CONTRACT_ADDRESSES, ABIs } from '../config/contracts';
import { useWallet } from '../contexts/WalletContext';

const AMOY_RPC = 'https://rpc-amoy.polygon.technology/';

// ── LocalStorage cache (mirrors on-chain state for instant reads) ─────────────
const cacheKey  = (addr: string) => `blocx_following_${addr.toLowerCase()}`;

function loadCache(addr: string): string[] {
  try { return JSON.parse(localStorage.getItem(cacheKey(addr)) || '[]'); }
  catch { return []; }
}
function saveCache(addr: string, list: string[]) {
  localStorage.setItem(cacheKey(addr), JSON.stringify(list));
}

/** Read-only helper for NotificationsContext (not a hook) */
export function getFollowedAddresses(viewerAddress: string): string[] {
  return loadCache(viewerAddress);
}

// ── Sync following list from on-chain events ──────────────────────────────────
async function syncFollowing(myAddress: string): Promise<string[]> {
  try {
    const provider = new JsonRpcProvider(AMOY_RPC);
    const contract = new Contract(CONTRACT_ADDRESSES.follow, ABIs.follow, provider);
    const latest   = await provider.getBlockNumber();
    const from     = Math.max(0, latest - 100_000);

    const [followedEvts, unfollowedEvts] = await Promise.all([
      contract.queryFilter(contract.filters.Followed(myAddress, null), from, 'latest'),
      contract.queryFilter(contract.filters.Unfollowed(myAddress, null), from, 'latest'),
    ]);

    const unfollowed = new Set(
      unfollowedEvts.map((e: any) => (e.args.unfollowed as string).toLowerCase())
    );

    const list = [
      ...new Set(
        followedEvts
          .map((e: any) => (e.args.followed as string).toLowerCase())
          .filter(a => !unfollowed.has(a))
      ),
    ];

    saveCache(myAddress, list);
    return list;
  } catch {
    return loadCache(myAddress);  // fall back to cache on RPC error
  }
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useFollows() {
  const { address, provider } = useWallet();

  // Serve from cache immediately; sync from chain in background
  const [following,     setFollowing]     = useState<string[]>(() =>
    address ? loadCache(address) : []
  );
  const [followLoading, setFollowLoading] = useState<string | null>(null); // address in-flight

  useEffect(() => {
    if (!address) { setFollowing([]); return; }
    setFollowing(loadCache(address));          // instant
    syncFollowing(address).then(setFollowing); // background sync
  }, [address]);

  // ── follow ──────────────────────────────────────────────────────────────────
  const follow = useCallback(async (target: string) => {
    if (!provider || !address) return;
    const t = target.toLowerCase();
    setFollowLoading(t);
    try {
      const signer   = await provider.getSigner();
      const contract = new Contract(CONTRACT_ADDRESSES.follow, ABIs.follow, signer);
      const tx = await contract.follow(target, {
        maxPriorityFeePerGas: 30_000_000_000n,
        maxFeePerGas:         50_000_000_000n,
        gasLimit:             150_000n,
      });
      await tx.wait();
      setFollowing(prev => {
        const next = prev.includes(t) ? prev : [...prev, t];
        saveCache(address, next);
        return next;
      });
    } catch (e: any) {
      console.error('[Follow] follow failed:', e?.reason || e?.message);
    } finally {
      setFollowLoading(null);
    }
  }, [provider, address]);

  // ── unfollow ────────────────────────────────────────────────────────────────
  const unfollow = useCallback(async (target: string) => {
    if (!provider || !address) return;
    const t = target.toLowerCase();
    setFollowLoading(t);
    try {
      const signer   = await provider.getSigner();
      const contract = new Contract(CONTRACT_ADDRESSES.follow, ABIs.follow, signer);
      const tx = await contract.unfollow(target, {
        maxPriorityFeePerGas: 30_000_000_000n,
        maxFeePerGas:         50_000_000_000n,
        gasLimit:             150_000n,
      });
      await tx.wait();
      setFollowing(prev => {
        const next = prev.filter(a => a !== t);
        saveCache(address, next);
        return next;
      });
    } catch (e: any) {
      console.error('[Follow] unfollow failed:', e?.reason || e?.message);
    } finally {
      setFollowLoading(null);
    }
  }, [provider, address]);

  const isFollowing = useCallback(
    (target: string) => following.includes(target.toLowerCase()),
    [following]
  );

  return { following, follow, unfollow, isFollowing, followLoading };
}
