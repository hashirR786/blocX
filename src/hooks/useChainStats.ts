import { useEffect, useState, useCallback } from 'react';
import { JsonRpcProvider, Contract, formatUnits, ZeroAddress } from 'ethers';
import { CONTRACT_ADDRESSES, ABIs } from '../config/contracts';

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
      try {
        const provider = rpc();
        const social  = new Contract(CONTRACT_ADDRESSES.social,  ABIs.social,  provider);
        const profile = new Contract(CONTRACT_ADDRESSES.profile, ABIs.profile, provider);
        const token   = new Contract(CONTRACT_ADDRESSES.token,   ABIs.token,   provider);

        const [postEvents, profileEvents, supply] = await Promise.all([
          social.queryFilter(social.filters.PostCreated(), -200_000),
          profile.queryFilter(profile.filters.Transfer(ZeroAddress, null, null), -200_000),
          token.totalSupply(),
        ]);

        if (cancelled) return;
        setState({
          totalPosts:    postEvents.length,
          totalProfiles: profileEvents.length,
          blocxSupply:   Math.floor(Number(formatUnits(supply as bigint, 18))).toLocaleString(),
          loading:       false,
        });
      } catch {
        if (!cancelled) setState(s => ({ ...s, loading: false }));
      }
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
