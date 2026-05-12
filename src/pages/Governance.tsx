import React, { useState, useEffect } from 'react';
import {
  ThumbsUp, ThumbsDown, Minus, Clock, Plus, X,
  CheckCircle2, XCircle, AlertCircle, ShieldCheck, Loader2,
  ChevronDown,
} from 'lucide-react';
import { useGovernance, VOTE_YES, VOTE_NO, VOTE_ABSTAIN, RESULT_ACTIVE, RESULT_PASSED, RESULT_FAILED } from '../hooks/useGovernance';
import type { Proposal } from '../hooks/useGovernance';
import { useWallet } from '../contexts/WalletContext';

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatCountdown(endTime: number, now: number): string {
  const diff = endTime - now;
  if (diff <= 0) return 'Ended';
  const d = Math.floor(diff / 86400);
  const h = Math.floor((diff % 86400) / 3600);
  const m = Math.floor((diff % 3600) / 60);
  const s = diff % 60;
  if (d > 0) return `${d}d ${h}h left`;
  if (h > 0) return `${h}h ${m}m left`;
  if (m > 0) return `${m}m ${s}s left`;
  return `${s}s left`;
}

const RESULT_META: Record<number, { label: string; color: string; icon: React.ReactNode }> = {
  0: { label: 'Active',  color: 'bg-green-500/15 text-green-400 border border-green-500/30',  icon: <Clock className="w-3 h-3" /> },
  1: { label: 'Passed',  color: 'bg-blue-500/15  text-blue-400  border border-blue-500/30',   icon: <CheckCircle2 className="w-3 h-3" /> },
  2: { label: 'Failed',  color: 'bg-red-500/15   text-red-400   border border-red-500/30',    icon: <XCircle className="w-3 h-3" /> },
  3: { label: 'Tied',    color: 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/30', icon: <AlertCircle className="w-3 h-3" /> },
};

const VOTE_LABEL: Record<number, string> = {
  1: 'Yes', 2: 'No', 3: 'Abstain',
};

const DURATION_OPTIONS = [
  { label: '1 hour',   seconds: 3_600 },
  { label: '6 hours',  seconds: 21_600 },
  { label: '12 hours', seconds: 43_200 },
  { label: '1 day',    seconds: 86_400 },
  { label: '3 days',   seconds: 259_200 },
  { label: '7 days',   seconds: 604_800 },
];

// ── ProposalCard ─────────────────────────────────────────────────────────────

interface CardProps {
  proposal: Proposal;
  now: number;
  voting: number | null;
  onVote: (id: number, choice: 1 | 2 | 3) => void;
  walletConnected: boolean;
}

const ProposalCard: React.FC<CardProps> = ({ proposal, now, voting, onVote, walletConnected }) => {
  const { id, title, description, endTime, yesVotes, noVotes, abstainVotes, result, myVote } = proposal;
  const total    = yesVotes + noVotes + abstainVotes;
  const yesPct   = total > 0 ? Math.round((yesVotes / total) * 100) : 0;
  const noPct    = total > 0 ? Math.round((noVotes  / total) * 100) : 0;
  const meta     = RESULT_META[result];
  const isActive = result === RESULT_ACTIVE;
  const isVoting = voting === id;

  // final verdict banner
  const verdictBanner =
    !isActive && result === RESULT_PASSED ? 'Proposal passed — change will be implemented.' :
    !isActive && result === RESULT_FAILED ? 'Proposal failed — no changes will be made.' :
    !isActive ? 'Vote ended in a tie — no changes.' : null;

  return (
    <div className="border-b border-[var(--border)] p-5 hover:bg-white/[0.02] transition-colors">
      {/* Header */}
      <div className="flex justify-between items-start gap-3 mb-3">
        <h3 className="text-base font-semibold text-textMain leading-snug flex-1">{title}</h3>
        <span className={`shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${meta.color}`}>
          {meta.icon} {meta.label}
        </span>
      </div>

      <p className="text-textMuted text-sm leading-relaxed mb-4">{description}</p>

      {/* Vote bar */}
      <div className="mb-3">
        <div className="flex text-xs mb-1.5 gap-4">
          <span className="text-green-400 font-medium">Yes {yesPct}%</span>
          <span className="text-red-400   font-medium">No {noPct}%</span>
          <span className="text-textMuted ml-auto">{total} vote{total !== 1 ? 's' : ''}</span>
        </div>
        <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden flex">
          <div className="h-full bg-green-500/70 transition-all duration-500" style={{ width: `${yesPct}%` }} />
          <div className="h-full bg-red-500/70   transition-all duration-500" style={{ width: `${noPct}%`  }} />
        </div>
        <div className="flex gap-4 text-xs text-textMuted mt-1.5">
          <span>Yes: {yesVotes}</span>
          <span>No: {noVotes}</span>
          <span>Abstain: {abstainVotes}</span>
        </div>
      </div>

      {/* Verdict banner (closed proposals) */}
      {verdictBanner && (
        <div className={`text-xs font-medium px-3 py-2 rounded-lg mb-3 ${
          result === RESULT_PASSED ? 'bg-blue-500/10 text-blue-400' :
          result === RESULT_FAILED ? 'bg-red-500/10  text-red-400'  :
          'bg-yellow-500/10 text-yellow-400'
        }`}>
          {verdictBanner}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-[var(--border)]">
        <div className="flex items-center gap-1.5 text-xs text-textMuted">
          <Clock className="w-3.5 h-3.5" />
          <span>{formatCountdown(endTime, now)}</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Already voted indicator */}
          {myVote !== 0 && (
            <span className="text-xs text-textMuted italic">
              You voted: <span className="text-textMain font-medium">{VOTE_LABEL[myVote]}</span>
            </span>
          )}

          {/* Vote buttons — only for active proposals the user hasn't voted on */}
          {isActive && myVote === 0 && (
            walletConnected ? (
              <div className="flex gap-1.5">
                <button
                  disabled={isVoting}
                  onClick={() => onVote(id, VOTE_YES as 1)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20 disabled:opacity-50 transition-colors"
                >
                  {isVoting ? <Loader2 className="w-3 h-3 animate-spin" /> : <ThumbsUp className="w-3 h-3" />}
                  Yes
                </button>
                <button
                  disabled={isVoting}
                  onClick={() => onVote(id, VOTE_NO as 2)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 disabled:opacity-50 transition-colors"
                >
                  {isVoting ? <Loader2 className="w-3 h-3 animate-spin" /> : <ThumbsDown className="w-3 h-3" />}
                  No
                </button>
                <button
                  disabled={isVoting}
                  onClick={() => onVote(id, VOTE_ABSTAIN as 3)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold bg-white/5 text-textMuted border border-[var(--border)] hover:bg-white/10 disabled:opacity-50 transition-colors"
                >
                  {isVoting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Minus className="w-3 h-3" />}
                  Abstain
                </button>
              </div>
            ) : (
              <span className="text-xs text-textMuted italic">Connect wallet to vote</span>
            )
          )}
        </div>
      </div>
    </div>
  );
};

// ── Create Proposal Modal ────────────────────────────────────────────────────

interface CreateModalProps {
  onClose: () => void;
  onCreate: (title: string, description: string, durationSeconds: number) => Promise<void>;
  creating: boolean;
}

const CreateModal: React.FC<CreateModalProps> = ({ onClose, onCreate, creating }) => {
  const [title,       setTitle]       = useState('');
  const [description, setDescription] = useState('');
  const [durationIdx, setDurationIdx] = useState(3); // default: 1 day
  const [txError,     setTxError]     = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTxError('');
    try {
      await onCreate(title.trim(), description.trim(), DURATION_OPTIONS[durationIdx].seconds);
      onClose();
    } catch (err: any) {
      setTxError(err?.reason || err?.message || 'Transaction failed');
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="glass-panel w-full max-w-lg relative animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="flex justify-between items-center px-5 py-4 border-b border-[var(--border)]">
          <h2 className="font-semibold text-textMain">New Proposal</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors">
            <X className="w-4 h-4 text-textMuted" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">
          <div>
            <label className="label-caps mb-1.5 block">Title</label>
            <input
              required
              maxLength={120}
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="What should the community decide?"
              className="w-full bg-white/5 border border-[var(--border)] rounded-xl px-4 py-2.5 text-sm text-textMain placeholder:text-textMuted focus:outline-none focus:border-[var(--border-light)] transition-colors"
            />
          </div>

          <div>
            <label className="label-caps mb-1.5 block">Description</label>
            <textarea
              required
              rows={4}
              maxLength={1000}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Explain the proposal in detail — what changes, why, and expected impact."
              className="w-full bg-white/5 border border-[var(--border)] rounded-xl px-4 py-2.5 text-sm text-textMain placeholder:text-textMuted focus:outline-none focus:border-[var(--border-light)] transition-colors resize-none"
            />
          </div>

          <div>
            <label className="label-caps mb-1.5 block">Voting Duration</label>
            <div className="relative">
              <select
                value={durationIdx}
                onChange={e => setDurationIdx(Number(e.target.value))}
                className="w-full appearance-none bg-white/5 border border-[var(--border)] rounded-xl px-4 py-2.5 text-sm text-textMain focus:outline-none focus:border-[var(--border-light)] transition-colors pr-10"
              >
                {DURATION_OPTIONS.map((opt, i) => (
                  <option key={i} value={i} className="bg-[#0D0D0F]">{opt.label}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-textMuted pointer-events-none" />
            </div>
          </div>

          {txError && (
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {txError}
            </p>
          )}

          <button
            type="submit"
            disabled={creating || !title.trim() || !description.trim()}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary/80 hover:bg-primary text-white text-sm font-semibold disabled:opacity-50 transition-colors"
          >
            {creating ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Submitting to chain…</>
            ) : (
              <><Plus className="w-4 h-4" /> Create Proposal</>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

// ── Governance Page ───────────────────────────────────────────────────────────

const Governance: React.FC = () => {
  const { address } = useWallet();
  const {
    proposals, isAdmin, votingPower,
    loading, error,
    voting, creating,
    castVote, createProposal,
  } = useGovernance();

  const [showCreate, setShowCreate] = useState(false);
  const [voteError,  setVoteError]  = useState('');
  const [now,        setNow]        = useState(Math.floor(Date.now() / 1000));

  // Live countdown ticker
  useEffect(() => {
    const id = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(id);
  }, []);

  const handleVote = async (proposalId: number, choice: 1 | 2 | 3) => {
    setVoteError('');
    try {
      await castVote(proposalId, choice);
    } catch (e: any) {
      setVoteError(e?.reason || e?.message || 'Vote transaction failed');
      setTimeout(() => setVoteError(''), 6000);
    }
  };

  const activeCount  = proposals.filter(p => p.result === RESULT_ACTIVE).length;
  const closedCount  = proposals.length - activeCount;

  return (
    <div className="w-full pb-20 md:pb-0">
      {/* ─ Header ─ */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-[var(--border)] px-5 py-3 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-textMain">Governance</h2>
          <p className="text-xs text-textMuted mt-0.5">{activeCount} active · {closedCount} closed</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 px-3 py-1.5 rounded-full text-sm font-semibold transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> New Proposal
          </button>
        )}
      </div>

      {/* ─ Voting Power ─ */}
      <div className="px-5 py-4 border-b border-[var(--border)]">
        <div className="bg-primary/8 border border-primary/15 rounded-2xl p-4 flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <h3 className="font-semibold text-textMain text-sm">Your Voting Power</h3>
              {isAdmin && (
                <span className="flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30">
                  <ShieldCheck className="w-2.5 h-2.5" /> ADMIN
                </span>
              )}
            </div>
            <p className="text-textMuted text-xs">Based on your BLOCX token balance</p>
            {!address && <p className="text-xs text-yellow-400/80 mt-1">Connect wallet to vote</p>}
          </div>
          <div className="text-right shrink-0">
            <div className="text-2xl font-bold text-primary">{votingPower}</div>
            <div className="text-xs text-textMuted">BLOCX</div>
          </div>
        </div>
      </div>

      {/* ─ Error toast ─ */}
      {voteError && (
        <div className="mx-5 mt-3 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
          {voteError}
        </div>
      )}

      {/* ─ Proposal List ─ */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-textMuted">
          <Loader2 className="w-7 h-7 animate-spin" />
          <span className="text-sm">Loading proposals from chain…</span>
        </div>
      ) : error === 'not_deployed' ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-center px-8">
          <AlertCircle className="w-10 h-10 text-yellow-400/60" />
          <p className="text-textMain font-semibold">Governance contract not deployed yet</p>
          <p className="text-textMuted text-sm">
            Run{' '}
            <code className="bg-white/5 px-1.5 py-0.5 rounded text-xs">
              npx hardhat run scripts/deployGovernance.ts --network amoy
            </code>{' '}
            and paste the address into <code className="bg-white/5 px-1.5 py-0.5 rounded text-xs">src/config/contracts.ts</code>.
          </p>
        </div>
      ) : proposals.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-center px-8">
          <Vote />
          <p className="text-textMain font-semibold">No proposals yet</p>
          {isAdmin
            ? <p className="text-textMuted text-sm">Create the first proposal to start community governance.</p>
            : <p className="text-textMuted text-sm">The admin hasn't created any proposals yet. Check back later.</p>
          }
        </div>
      ) : (
        <div className="flex flex-col">
          {proposals.map(p => (
            <ProposalCard
              key={p.id}
              proposal={p}
              now={now}
              voting={voting}
              onVote={handleVote}
              walletConnected={!!address}
            />
          ))}
        </div>
      )}

      {/* ─ Create Modal ─ */}
      {showCreate && (
        <CreateModal
          onClose={() => setShowCreate(false)}
          onCreate={createProposal}
          creating={creating}
        />
      )}
    </div>
  );
};

// Inline fallback icon for empty state
const Vote: React.FC = () => (
  <svg className="w-10 h-10 text-textMuted/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
  </svg>
);

export default Governance;
