import { useState, useCallback, useEffect } from 'react';
import { Contract, JsonRpcProvider, parseUnits } from 'ethers';
import { useWallet } from '../contexts/WalletContext';
import { CONTRACT_ADDRESSES, ABIs } from '../config/contracts';
import { uploadJSONToIPFS, resolveIPFSUrl } from '../services/ipfs';
import { moderateContent } from '../services/moderation';

const READ_PROVIDER = new JsonRpcProvider('https://rpc-amoy.polygon.technology');

export interface Comment {
  id: string;
  postId: string;
  author: string;
  content: string;
  timestamp: number; // Unix ms
  ipfsCid?: string;
}

export function useComments(postId: string) {
  const { provider } = useWallet();
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchComments = useCallback(async () => {
    setIsLoading(true);
    try {
      const contract = new Contract(CONTRACT_ADDRESSES.social, ABIs.social, READ_PROVIDER);
      const raw: any[] = await contract.getAllComments(BigInt(postId));

      const resolved: Comment[] = await Promise.all(
        raw.map(async (c) => {
          let content = '';
          try {
            const url = resolveIPFSUrl(c.contentHash);
            const res = await fetch(url);
            if (res.ok) {
              const json = await res.json();
              content = json.content || '';
            }
          } catch {
            content = '[Content unavailable]';
          }
          return {
            id: c.id.toString(),
            postId: c.postId.toString(),
            author: c.author,
            content,
            timestamp: Number(c.timestamp) * 1000,
            ipfsCid: c.contentHash,
          };
        })
      );

      setComments(resolved);
    } catch (err) {
      console.error('[BlocX] Failed to fetch comments:', err);
    } finally {
      setIsLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const addComment = useCallback(
    async (author: string, content: string): Promise<{ success: boolean; reason?: string }> => {
      if (!content.trim() || !author || !provider) return { success: false, reason: 'Not connected' };

      setIsPosting(true);
      try {
        const modResult = await moderateContent(content);
        if (modResult.isFlagged) return { success: false, reason: modResult.reason };

        let ipfsCid: string;
        try {
          ipfsCid = await uploadJSONToIPFS({ postId, author, content, timestamp: Date.now() });
        } catch {
          return { success: false, reason: 'IPFS upload failed. Please check your Pinata key.' };
        }

        const signer = await provider.getSigner();
        const contract = new Contract(CONTRACT_ADDRESSES.social, ABIs.social, signer);

        const tx = await contract.createComment(BigInt(postId), ipfsCid, {
          maxPriorityFeePerGas: parseUnits('30', 'gwei'),
          maxFeePerGas: parseUnits('40', 'gwei'),
        });
        await tx.wait();

        await fetchComments();
        return { success: true };
      } catch (err: any) {
        console.error('[BlocX] Failed to post comment:', err);
        return { success: false, reason: err.reason || 'Transaction failed' };
      } finally {
        setIsPosting(false);
      }
    },
    [postId, provider, fetchComments]
  );

  const deleteComment = useCallback(
    async (commentId: string): Promise<{ success: boolean; reason?: string }> => {
      if (!provider) return { success: false, reason: 'Not connected' };

      setDeletingId(commentId);
      try {
        const signer = await provider.getSigner();
        const contract = new Contract(CONTRACT_ADDRESSES.social, ABIs.social, signer);

        const tx = await contract.deleteComment(BigInt(commentId), {
          maxPriorityFeePerGas: parseUnits('30', 'gwei'),
          maxFeePerGas: parseUnits('40', 'gwei'),
        });
        await tx.wait();

        setComments((prev) => prev.filter((c) => c.id !== commentId));
        return { success: true };
      } catch (err: any) {
        console.error('[BlocX] Failed to delete comment:', err);
        return { success: false, reason: err.reason || 'Transaction failed' };
      } finally {
        setDeletingId(null);
      }
    },
    [provider]
  );

  return { comments, isLoading, isPosting, deletingId, addComment, deleteComment, refetch: fetchComments };
}
