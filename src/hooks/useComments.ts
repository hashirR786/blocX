import { useState, useCallback } from 'react';
import { uploadJSONToIPFS } from '../services/ipfs';
import { moderateContent } from '../services/moderation';

export interface Comment {
  id: string;
  postId: string;
  author: string;
  content: string;
  timestamp: number; // Unix ms
  ipfsCid?: string;
}

const STORAGE_KEY = (postId: string) => `blocx_comments_${postId}`;

export function getComments(postId: string): Comment[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY(postId));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveComments(postId: string, comments: Comment[]) {
  localStorage.setItem(STORAGE_KEY(postId), JSON.stringify(comments));
}

export function useComments(postId: string) {
  const [comments, setComments] = useState<Comment[]>(() => getComments(postId));
  const [isPosting, setIsPosting] = useState(false);

  const addComment = useCallback(async (author: string, content: string): Promise<{ success: boolean; reason?: string }> => {
    if (!content.trim() || !author) return { success: false, reason: 'Empty content' };
    
    setIsPosting(true);
    try {
      const modResult = await moderateContent(content);
      if (modResult.isFlagged) {
        return { success: false, reason: modResult.reason };
      }
      // Upload to IPFS so content is permanent
      let ipfsCid: string | undefined;
      try {
        ipfsCid = await uploadJSONToIPFS({ postId, author, content, timestamp: Date.now() });
      } catch {
        // IPFS upload optional — comment still saves locally
        console.warn('[BlocX] IPFS upload failed, saving comment locally only.');
      }

      const newComment: Comment = {
        id: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
        postId,
        author,
        content: content.trim(),
        timestamp: Date.now(),
        ipfsCid,
      };

      const updated = [...getComments(postId), newComment];
      saveComments(postId, updated);
      setComments(updated);
      
      return { success: true };
    } finally {
      setIsPosting(false);
    }
  }, [postId]);

  return { comments, addComment, isPosting };
}
