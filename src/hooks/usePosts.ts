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
    name: string;
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
      
      const profileContract = new Contract(
        CONTRACT_ADDRESSES.profile,
        ABIs.profile,
        READ_PROVIDER
      );

      // Instead of querying events (which requires eth_getLogs and has RPC block limits),
      // we read posts directly from the public mapping by iterating IDs.
      // Posts start at ID=1. We stop when the author is the zero address.
      const posts: Post[] = [];
      const MAX_POSTS = 100; // Safety cap
      
      // Simple cache for profiles to avoid redundant IPFS/Contract calls
      const profileCache: Record<string, {name: string, avatar: string}> = {};
      
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
          let authorName = 'Web3 User';
          let authorAvatar = `https://api.dicebear.com/7.x/identicon/svg?seed=${author}`;

          // Check if it's the current user first (instant local load)
          if (address && author.toLowerCase() === address.toLowerCase()) {
            const localName = localStorage.getItem(`profileName_${address}`);
            const localAvatar = localStorage.getItem(`profileAvatar_${address}`);
            if (localName) authorName = localName;
            if (localAvatar) authorAvatar = localAvatar;
          } else {
            // Check cache
            if (profileCache[author]) {
              authorName = profileCache[author].name;
              authorAvatar = profileCache[author].avatar;
            } else {
              // Fetch from ProfileRegistry
              try {
                const hasProf = await profileContract.hasProfile(author);
                if (hasProf) {
                  const pHash = await profileContract.getProfile(author);
                  const pUrl = resolveIPFSUrl(pHash);
                  const pRes = await fetch(pUrl);
                  if (pRes.ok) {
                    const pMeta = await pRes.json();
                    if (pMeta.name) authorName = pMeta.name;
                    if (pMeta.avatar) authorAvatar = pMeta.avatar.startsWith('http') ? pMeta.avatar : resolveIPFSUrl(pMeta.avatar);
                    profileCache[author] = { name: authorName, avatar: authorAvatar };
                  }
                }
              } catch (e) {
                console.warn(`[BlocX] Failed to fetch profile for ${author}`);
              }
            }
          }

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
              avatar: authorAvatar,
              name: authorName,
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
