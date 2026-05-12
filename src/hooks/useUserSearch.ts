import { useState, useCallback } from 'react';
import { Contract, JsonRpcProvider, ZeroAddress, isAddress, getAddress } from 'ethers';
import { CONTRACT_ADDRESSES, ABIs } from '../config/contracts';
import { resolveIPFSUrl } from '../services/ipfs';
import { useWallet } from '../contexts/WalletContext';

export interface UserProfile {
  address: string;
  name: string;
  bio: string;
  avatar: string;
  tokenId: string;
}

// Module-level cache shared across hook instances
const profileCache = new Map<string, UserProfile | null>();

const AMOY_RPC = 'https://rpc-amoy.polygon.technology/';

function getReadContract(provider: any) {
  const p = provider ?? new JsonRpcProvider(AMOY_RPC);
  return new Contract(CONTRACT_ADDRESSES.profile, ABIs.profile, p);
}

async function resolveProfile(address: string, contract: Contract): Promise<UserProfile | null> {
  let normalized: string;
  try { normalized = getAddress(address); } catch { return null; }

  if (profileCache.has(normalized)) return profileCache.get(normalized)!;

  try {
    const hasProf: boolean = await contract.hasProfile(normalized);
    if (!hasProf) { profileCache.set(normalized, null); return null; }

    const tokenId: bigint = await contract.addressToProfileId(normalized);
    const uri: string = await contract.tokenURI(tokenId);
    const resolved = resolveIPFSUrl(uri);

    const res = await fetch(resolved);
    const data = await res.json();

    const profile: UserProfile = {
      address: normalized,
      name: data.name || 'Anonymous',
      bio: data.bio || '',
      avatar: data.avatar
        ? resolveIPFSUrl(data.avatar)
        : `https://api.dicebear.com/7.x/identicon/svg?seed=${normalized}`,
      tokenId: tokenId.toString(),
    };

    profileCache.set(normalized, profile);
    return profile;
  } catch {
    profileCache.set(normalized, null);
    return null;
  }
}

export function useUserSearch() {
  const { provider } = useWallet();
  const [results, setResults] = useState<UserProfile[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const search = useCallback(async (query: string) => {
    const q = query.trim();
    if (q.length < 2) { setResults([]); return; }

    setIsSearching(true);
    try {
      const contract = getReadContract(provider);

      // Store as plain boolean — calling isAddress(q) directly in an if-condition
      // acts as a type predicate and narrows q to never in the else branch.
      const isAddr: boolean = isAddress(q);
      if (isAddr) {
        const profile = await resolveProfile(q, contract);
        setResults(profile ? [profile] : []);
      } else {
        // Name search — enumerate all minted profiles via Transfer(from=0x0) events
        const filter = contract.filters.Transfer(ZeroAddress, null, null);
        const events = await contract.queryFilter(filter, -100000);

        const addresses = [...new Set(events.map((e: any) => e.args[1] as string))];

        const resolved: Array<UserProfile | null> = await Promise.all(
          addresses.map(addr => resolveProfile(addr, contract))
        );

        const ql = q.toLowerCase();
        const filtered: UserProfile[] = [];
        for (const p of resolved) {
          if (p && (p.name.toLowerCase().includes(ql) || p.address.toLowerCase().includes(ql))) {
            filtered.push(p);
          }
        }

        setResults(filtered.slice(0, 20));
      }
    } catch (err) {
      console.error('Search error:', err);
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [provider]);

  // Expose cache-buster for a single address (used by UserProfile page)
  const resolveOne = useCallback(async (address: string): Promise<UserProfile | null> => {
    const contract = getReadContract(provider);
    return resolveProfile(address, contract);
  }, [provider]);

  return { results, isSearching, search, resolveOne };
}
