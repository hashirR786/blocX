import React from 'react';
import { MOCK_PROPOSALS } from '../services/mockData';
import { ThumbsUp, ThumbsDown, Clock, CheckCircle } from 'lucide-react';

const Governance: React.FC = () => {
  return (
    <div className="w-full pb-20 md:pb-0">
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border px-4 py-3 cursor-pointer flex justify-between items-center">
        <h2 className="text-xl font-bold text-textMain">Governance</h2>
        <button className="bg-textMain text-background px-4 py-1.5 rounded-full text-sm font-bold hover:opacity-90 transition-opacity">
          Create Proposal
        </button>
      </div>

      <div className="p-4 border-b border-border">
        <div className="bg-primary/10 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <h3 className="text-textMain font-bold">Voting Power</h3>
            <p className="text-textMuted text-sm mt-1">Based on your BLOCX balance</p>
          </div>
          <div className="text-2xl font-bold text-primary">1,250 votes</div>
        </div>
      </div>

      <div className="flex flex-col">
        {MOCK_PROPOSALS.map(proposal => (
          <div key={proposal.id} className="border-b border-border p-4 hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer">
            <div className="flex justify-between items-start mb-3">
              <h3 className="text-lg font-bold text-textMain">{proposal.title}</h3>
              <span className={`px-2 py-1 rounded text-xs font-bold ${
                proposal.status === 'Active' ? 'bg-green-500/10 text-green-500' : 'bg-surface text-textMuted border border-border'
              }`}>
                {proposal.status}
              </span>
            </div>
            
            <p className="text-textMain mb-4">{proposal.description}</p>
            
            <div className="mb-4">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-textMain font-bold">Yes: {proposal.votesFor}</span>
                <span className="text-textMuted">No: {proposal.votesAgainst}</span>
              </div>
              <div className="w-full bg-border rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-primary h-2 rounded-full" 
                  style={{ width: `${(proposal.votesFor / (proposal.votesFor + proposal.votesAgainst)) * 100}%` }}
                />
              </div>
            </div>
            
            <div className="flex items-center justify-between border-t border-border pt-4">
              <div className="flex items-center gap-2 text-sm text-textMuted">
                <Clock className="w-4 h-4" />
                <span>Ends {proposal.endTime}</span>
              </div>
              
              {proposal.status === 'Active' && (
                <div className="flex gap-2">
                  <button className="flex items-center gap-1 bg-black/5 dark:bg-white/5 hover:bg-green-500/10 hover:text-green-500 text-textMain px-3 py-1.5 rounded-full text-sm font-bold transition-colors">
                    <ThumbsUp className="w-4 h-4" /> Yes
                  </button>
                  <button className="flex items-center gap-1 bg-black/5 dark:bg-white/5 hover:bg-red-500/10 hover:text-red-500 text-textMain px-3 py-1.5 rounded-full text-sm font-bold transition-colors">
                    <ThumbsDown className="w-4 h-4" /> No
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Governance;
