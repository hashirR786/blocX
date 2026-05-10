import { useQuery } from '@tanstack/react-query';
import { useWallet } from '../contexts/WalletContext';
import { Contract, JsonRpcProvider, ZeroAddress } from 'ethers';
import { CONTRACT_ADDRESSES, ABIs } from '../config/contracts';
import { resolveIPFSUrl } from '../services/ipfs';

// Dedicated read-only provider
const READ_PROVIDER = new JsonRpcProvider('https://rpc-amoy.polygon.technology');

export interface Post {
  id: string;
  author: {
    address: string;
    avatar: string;
  };
  content: string;
  timestamp: string;
  likes: number;
  comments: number;
  isLiked: boolean;
  media: string | null;
}

function formatTime(timestampSeconds: number): string {
  const timeDiff = Date.now() - timestampSeconds * 1000;
  const minsAgo = Math.floor(timeDiff / 60000);
  const hoursAgo = Math.floor(timeDiff / (1000 * 60 * 60));
  if (hoursAgo > 24) return `${Math.floor(hoursAgo / 24)}d ago`;
  if (hoursAgo > 0) return `${hoursAgo}h ago`;
  if (minsAgo > 0) return `${minsAgo}m ago`;
  return 'Just now';
}

export const usePosts = () => {
  const { address } = useWallet();

  return useQuery({
    queryKey: ['posts', address],
    queryFn: async (): Promise<Post[]> => {
      const socialContract = new Contract(
        CONTRACT_ADDRESSES.social,
        ABIs.social,
        READ_PROVIDER
      );

      // Instead of querying events (which requires eth_getLogs and has RPC block limits),
      // we read posts directly from the public mapping by iterating IDs.
      // Posts start at ID=1. We stop when the author is the zero address.
      const posts: Post[] = [];
      const MAX_POSTS = 100; // Safety cap
      
      console.log('[BlocX] Fetching posts by direct contract reads...');

      for (let postId = 1; postId <= MAX_POSTS; postId++) {
        try {
          const postData = await socialContract.posts(postId);
          
          // If author is zero address, this post doesn't exist — we've reached the end
          if (!postData || postData.author === ZeroAddress || postData.author === '0x0000000000000000000000000000000000000000') {
            console.log(`[BlocX] No post at ID ${postId}, stopping. Total: ${posts.length} post(s).`);
            break;
          }

          const author = postData.author;
          const contentHash = postData.contentHash;

          let isLiked = false;
          if (address) {
            isLiked = await socialContract.hasLiked(postId, address);
          }

          let content = 'Decentralized post';
          let media: string | null = null;

          if (contentHash) {
            try {
              const ipfsUrl = resolveIPFSUrl(contentHash);
              const response = await fetch(ipfsUrl);
              if (response.ok) {
                const metadata = await response.json();
                content = metadata.content || content;
                if (metadata.media) {
                  media = metadata.media.startsWith('http')
                    ? metadata.media
                    : resolveIPFSUrl(metadata.media);
                }
              }
            } catch (ipfsError) {
              console.warn(`[BlocX] IPFS fetch failed for post ${postId}:`, ipfsError);
            }
          }

          posts.push({
            id: postId.toString(),
            author: {
              address: author,
              avatar: `https://api.dicebear.com/7.x/identicon/svg?seed=${author}`,
            },
            content,
            timestamp: formatTime(Number(postData.timestamp)),
            likes: Number(postData.likeCount),
            comments: 0,
            isLiked,
            media,
          });
        } catch (error) {
          console.error(`[BlocX] Error at post ID ${postId}:`, error);
          break;
        }
      }

      // Return newest first
      return posts.reverse();
    },
    enabled: true,
    refetchInterval: 30000,
  });
};
