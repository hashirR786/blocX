import { useEffect, useState, useCallback } from 'react';
import { JsonRpcProvider, Contract, formatUnits, ZeroAddress } from 'ethers';
import { CONTRACT_ADDRESSES, ABIs } from '../config/contracts';

// ── Web3 News (CryptoCompare — no API key required) ──────────────────────────
export interface NewsItem {
  id: string;
  title: string;
  url: string;
  source: string;
  publishedOn: number; // unix timestamp
}

export function useWeb3News(): { news: NewsItem[]; loading: boolean } {
  const [news,    setNews]    = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    // Hacker News Algolia API — free, no key, CORS-open
    fetch(
      'https://hn.algolia.com/api/v1/search_by_date?query=blockchain+OR+web3+OR+ethereum+OR+polygon&tags=story&hitsPerPage=8',
      { signal: AbortSignal.timeout(8000) }
    )
      .then(r => r.json())
      .then((json: any) => {
        if (cancelled) return;
        const items: NewsItem[] = (json.hits ?? [])
          .filter((h: any) => h.url && h.title)   // skip Ask/Show HN without URLs
          .slice(0, 6)
          .map((h: any) => ({
            id:          h.objectID,
            title:       h.title,
            url:         h.url,
            source:      h.url ? new URL(h.url).hostname.replace('www.', '') : 'HN',
            publishedOn: h.created_at_i,
          }));
        setNews(items);
      })
      .catch(() => { /* silently skip on network error */ })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  return { news, loading };
}

const AMOY_RPC = 'https://rpc-amoy.polygon.technology/';

export interface NetworkStats {
  gasPrice: string;       // e.g. "30.4 gwei"
  blockNumber: number;
  loading: boolean;
}

export interface PlatformStats {
  totalPosts: number;
  totalProfiles: number;
  blocxSupply: string;    // formatted whole number
  loading: boolean;
}

export interface ActiveProposal {
  id: number;
  title: string;
  yesVotes: number;
  noVotes: number;
  abstainVotes: number;
  endTime: number;
}

function rpc() {
  return new JsonRpcProvider(AMOY_RPC);
}

// ── Network stats (gas + block) — refreshes every 12 s ──────────────────────
export function useNetworkStats(): NetworkStats {
  const [state, setState] = useState<NetworkStats>({ gasPrice: '—', blockNumber: 0, loading: true });

  const fetch = useCallback(async () => {
    try {
      const provider = rpc();
      const [feeData, blockNum] = await Promise.all([
        provider.getFeeData(),
        provider.getBlockNumber(),
      ]);
      const gwei = feeData.gasPrice
        ? Number(formatUnits(feeData.gasPrice, 'gwei')).toFixed(1)
        : '—';
      setState({ gasPrice: `${gwei} gwei`, blockNumber: blockNum, loading: false });
    } catch {
      setState(s => ({ ...s, loading: false }));
    }
  }, []);

  useEffect(() => {
    fetch();
    const id = setInterval(fetch, 12_000);
    return () => clearInterval(id);
  }, [fetch]);

  return state;
}

// ── Platform stats (posts / profiles / BLOCX) — fetches once ────────────────
export function usePlatformStats(): PlatformStats {
  const [state, setState] = useState<PlatformStats>({
    totalPosts: 0, totalProfiles: 0, blocxSupply: '0', loading: true,
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const provider = rpc();

      // Fetch current block so we can use an absolute range (avoids negative-offset quirks)
      let fromBlock = 0;
      try {
        const latest = await provider.getBlockNumber();
        fromBlock = Math.max(0, latest - 100_000);
      } catch { /* use 0 as fallback */ }

      // Each stat is independent — a failure in one does not zero out the others
      let totalPosts    = 0;
      let totalProfiles = 0;
      let blocxSupply   = '0';

      try {
        const social = new Contract(CONTRACT_ADDRESSES.social, ABIs.social, provider);
        const events = await social.queryFilter(social.filters.PostCreated(), fromBlock, 'latest');
        totalPosts = events.length;
      } catch (e) { console.warn('[Stats] postCount failed:', e); }

      try {
        const profile = new Contract(CONTRACT_ADDRESSES.profile, ABIs.profile, provider);
        const events  = await profile.queryFilter(
          profile.filters.Transfer(ZeroAddress, null, null), fromBlock, 'latest'
        );
        totalProfiles = events.length;
      } catch (e) { console.warn('[Stats] profileCount failed:', e); }

      try {
        const token   = new Contract(CONTRACT_ADDRESSES.token, ABIs.token, provider);
        const supply  = await token.totalSupply();
        blocxSupply   = Math.floor(Number(formatUnits(supply as bigint, 18))).toLocaleString();
      } catch (e) { console.warn('[Stats] blocxSupply failed:', e); }

      if (!cancelled) setState({ totalPosts, totalProfiles, blocxSupply, loading: false });
    })();
    return () => { cancelled = true; };
  }, []);

  return state;
}

// ── Latest active governance proposal — refreshes every 30 s ────────────────
export function useLatestProposal(): { proposal: ActiveProposal | null; loading: boolean } {
  const [proposal, setProposal] = useState<ActiveProposal | null>(null);
  const [loading,  setLoading]  = useState(true);

  const fetch = useCallback(async () => {
    if (!CONTRACT_ADDRESSES.governance) { setLoading(false); return; }
    try {
      const gov   = new Contract(CONTRACT_ADDRESSES.governance, ABIs.governance, rpc());
      const count = Number(await gov.getProposalCount());
      if (count === 0) { setLoading(false); return; }

      const now = Math.floor(Date.now() / 1000);

      // Walk backwards to find the latest active proposal; fall back to the latest overall
      let found: ActiveProposal | null = null;
      for (let i = count; i >= 1; i--) {
        const p = await gov.getProposal(i);
        const endTime = Number(p.endTime);
        if (endTime > now) {
          found = {
            id:           Number(p.id),
            title:        p.title,
            yesVotes:     Number(p.yesVotes),
            noVotes:      Number(p.noVotes),
            abstainVotes: Number(p.abstainVotes),
            endTime,
          };
          break;
        }
      }

      // No active one — just show the most recent proposal regardless
      if (!found) {
        const p = await gov.getProposal(count);
        found = {
          id:           Number(p.id),
          title:        p.title,
          yesVotes:     Number(p.yesVotes),
          noVotes:      Number(p.noVotes),
          abstainVotes: Number(p.abstainVotes),
          endTime:      Number(p.endTime),
        };
      }

      setProposal(found);
    } catch {
      // governance not deployed yet — silently skip
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
    const id = setInterval(fetch, 30_000);
    return () => clearInterval(id);
  }, [fetch]);

  return { proposal, loading };
}
