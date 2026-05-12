import { useState, useEffect, useCallback } from 'react';
import { Contract, JsonRpcProvider, formatUnits } from 'ethers';
import { CONTRACT_ADDRESSES, ABIs } from '../config/contracts';
import { useWallet } from '../contexts/WalletContext';

const AMOY_RPC = 'https://rpc-amoy.polygon.technology/';

// result codes returned by getResult()
export const RESULT_ACTIVE  = 0;
export const RESULT_PASSED  = 1;
export const RESULT_FAILED  = 2;
export const RESULT_TIED    = 3;

// vote choice codes
export const VOTE_NONE    = 0;
export const VOTE_YES     = 1;
export const VOTE_NO      = 2;
export const VOTE_ABSTAIN = 3;

export interface Proposal {
  id: number;
  title: string;
  description: string;
  startTime: number;
  endTime: number;
  yesVotes: number;
  noVotes: number;
  abstainVotes: number;
  result: number;   // 0=active 1=passed 2=failed 3=tied
  myVote: number;   // 0=none   1=yes    2=no     3=abstain
}

function readProvider() {
  return new JsonRpcProvider(AMOY_RPC);
}

function govReadContract() {
  return new Contract(CONTRACT_ADDRESSES.governance, ABIs.governance, readProvider());
}

export function useGovernance() {
  const { address, provider } = useWallet();

  const [proposals,    setProposals]    = useState<Proposal[]>([]);
  const [isAdmin,      setIsAdmin]      = useState(false);
  const [votingPower,  setVotingPower]  = useState('0');
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState<string | null>(null);
  const [voting,       setVoting]       = useState<number | null>(null);  // proposalId in-flight
  const [creating,     setCreating]     = useState(false);

  // ── Readers ─────────────────────────────────────────────────────────────────

  const loadAll = useCallback(async () => {
    if (!CONTRACT_ADDRESSES.governance) {
      setError('not_deployed');
      setLoading(false);
      return;
    }
    setError(null);
    try {
      const gov = govReadContract();
      const count = Number(await gov.getProposalCount());

      const loaded = await Promise.all(
        Array.from({ length: count }, (_, i) => i + 1).map(async (id) => {
          const [p, result, myVote] = await Promise.all([
            gov.getProposal(id),
            gov.getResult(id),
            address ? gov.getVote(id, address) : Promise.resolve(0),
          ]);
          return {
            id:           Number(p.id),
            title:        p.title,
            description:  p.description,
            startTime:    Number(p.startTime),
            endTime:      Number(p.endTime),
            yesVotes:     Number(p.yesVotes),
            noVotes:      Number(p.noVotes),
            abstainVotes: Number(p.abstainVotes),
            result:       Number(result),
            myVote:       Number(myVote),
          } as Proposal;
        })
      );

      setProposals(loaded.reverse()); // newest first
    } catch (e: any) {
      console.error('[Governance] loadAll:', e);
      setError(e?.message || 'Failed to load proposals');
    } finally {
      setLoading(false);
    }
  }, [address]);

  const checkAdmin = useCallback(async () => {
    if (!address || !CONTRACT_ADDRESSES.governance) { setIsAdmin(false); return; }
    try {
      const adminAddr: string = await govReadContract().admin();
      setIsAdmin(adminAddr.toLowerCase() === address.toLowerCase());
    } catch { setIsAdmin(false); }
  }, [address]);

  const loadVotingPower = useCallback(async () => {
    if (!address) { setVotingPower('0'); return; }
    try {
      const token = new Contract(CONTRACT_ADDRESSES.token, ABIs.token, readProvider());
      const bal = await token.balanceOf(address);
      const formatted = formatUnits(bal, 18);
      // Display as whole number
      setVotingPower(Math.floor(Number(formatted)).toLocaleString());
    } catch { setVotingPower('0'); }
  }, [address]);

  useEffect(() => {
    loadAll();
    checkAdmin();
    loadVotingPower();
  }, [loadAll, checkAdmin, loadVotingPower]);

  // ── Writers ──────────────────────────────────────────────────────────────────

  const castVote = useCallback(async (proposalId: number, choice: 1 | 2 | 3) => {
    if (!provider) throw new Error('Wallet not connected');
    setVoting(proposalId);
    try {
      const signer = await provider.getSigner();
      const gov = new Contract(CONTRACT_ADDRESSES.governance, ABIs.governance, signer);
      const tx = await gov.castVote(proposalId, choice, {
        maxPriorityFeePerGas: 30_000_000_000n,
        maxFeePerGas:         50_000_000_000n,
        gasLimit:             200_000n,
      });
      await tx.wait();
      await loadAll();
    } finally {
      setVoting(null);
    }
  }, [provider, loadAll]);

  const createProposal = useCallback(async (
    title: string,
    description: string,
    durationSeconds: number,
  ) => {
    if (!provider) throw new Error('Wallet not connected');
    setCreating(true);
    try {
      const signer = await provider.getSigner();
      const gov = new Contract(CONTRACT_ADDRESSES.governance, ABIs.governance, signer);
      const tx = await gov.createProposal(title, description, durationSeconds, {
        maxPriorityFeePerGas: 30_000_000_000n,
        maxFeePerGas:         50_000_000_000n,
        gasLimit:             400_000n,
      });
      await tx.wait();
      await loadAll();
    } finally {
      setCreating(false);
    }
  }, [provider, loadAll]);

  return {
    proposals,
    isAdmin,
    votingPower,
    loading,
    error,
    voting,
    creating,
    castVote,
    createProposal,
    reload: loadAll,
  };
}
