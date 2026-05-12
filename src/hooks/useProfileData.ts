import { useEffect, useState } from 'react';
import { Contract, JsonRpcProvider, getAddress } from 'ethers';
import { CONTRACT_ADDRESSES, ABIs } from '../config/contracts';
import { fetchIPFS, resolveIPFSUrl } from '../services/ipfs';

export interface OnChainProfile {
  name: string;
  bio: string;
  avatar: string;
}

// Shared module-level cache so every PostCard reuses the same resolved data
const cache = new Map<string, OnChainProfile | null>();
const inFlight = new Map<string, Promise<OnChainProfile | null>>();

const AMOY_RPC = 'https://rpc-amoy.polygon.technology/';

async function fetchProfile(address: string): Promise<OnChainProfile | null> {
  let normalized: string;
  try { normalized = getAddress(address); } catch { return null; }

  if (cache.has(normalized)) return cache.get(normalized)!;
  if (inFlight.has(normalized)) return inFlight.get(normalized)!;

  const promise = (async () => {
    try {
      const provider = new JsonRpcProvider(AMOY_RPC);
      const contract = new Contract(CONTRACT_ADDRESSES.profile, ABIs.profile, provider);

      const hasProf: boolean = await contract.hasProfile(normalized);
      if (!hasProf) { cache.set(normalized, null); return null; }

      const tokenId: bigint = await contract.addressToProfileId(normalized);
      const uri: string = await contract.tokenURI(tokenId);
      const cid = uri.startsWith('ipfs://') ? uri.slice(7) : uri;
      const res = await fetchIPFS(cid);
      const data = await res.json();

      const profile: OnChainProfile = {
        name: data.name || 'Anonymous',
        bio: data.bio || '',
        avatar: data.avatar
          ? resolveIPFSUrl(data.avatar)
          : `https://api.dicebear.com/7.x/identicon/svg?seed=${normalized}`,
      };

      cache.set(normalized, profile);
      return profile;
    } catch {
      cache.set(normalized, null);
      return null;
    } finally {
      inFlight.delete(normalized);
    }
  })();

  inFlight.set(normalized, promise);
  return promise;
}

// Call this after updating a profile on-chain so cache is refreshed
export function invalidateProfileCache(address: string) {
  try { cache.delete(getAddress(address)); } catch { /* ignore */ }
}

export function useProfileData(address: string | undefined) {
  const [profile, setProfile] = useState<OnChainProfile | null>(null);

  useEffect(() => {
    if (!address) return;
    let cancelled = false;

    // Serve from cache immediately if available, then fetch if needed
    const cached = cache.get(address);
    if (cached !== undefined) {
      setProfile(cached);
      return;
    }

    fetchProfile(address).then(p => {
      if (!cancelled) setProfile(p);
    });

    return () => { cancelled = true; };
  }, [address]);

  return profile;
}
