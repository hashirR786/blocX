import { useQuery } from '@tanstack/react-query';
import { useWallet } from '../contexts/WalletContext';
import { Contract, JsonRpcProvider, ZeroAddress } from 'ethers';
import { CONTRACT_ADDRESSES, ABIs } from '../config/contracts';
import { fetchIPFS, resolveIPFSUrl } from '../services/ipfs';

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
  const diff = Date.now() - timestampSeconds * 1000;
  const hoursAgo = Math.floor(diff / 3600000);
  if (hoursAgo > 24) return `${Math.floor(hoursAgo / 24)}d ago`;
  if (hoursAgo > 0) return `${hoursAgo}h ago`;
  const minsAgo = Math.floor(diff / 60000);
  if (minsAgo > 0) return `${minsAgo}m ago`;
  return 'Just now';
}

export const usePosts = () => {
  const { address } = useWallet();

  return useQuery({
    queryKey: ['posts', address],
    queryFn: async (): Promise<Post[]> => {
      const socialContract = new Contract(CONTRACT_ADDRESSES.social, ABIs.social, READ_PROVIDER);

      const posts: Post[] = [];
      const MAX_POSTS = 100;

      console.log('[BlocX] Fetching posts by direct contract reads...');

      for (let postId = 1; postId <= MAX_POSTS; postId++) {
        try {
          const postData = await socialContract.posts(postId);

          if (!postData || postData.author === ZeroAddress) {
            console.log(`[BlocX] No post at ID ${postId}, stopping. Total: ${posts.length} post(s).`);
            break;
          }

          if (postData.isDeleted) continue;

          const author: string = postData.author;
          const contentHash: string = postData.contentHash;

          let isLiked = false;
          if (address) {
            isLiked = await socialContract.hasLiked(postId, address);
          }

          let content = '';
          let media: string | null = null;

          if (contentHash) {
            try {
              const cid = contentHash.startsWith('ipfs://')
                ? contentHash.slice(7)
                : contentHash;
              const res = await fetchIPFS(cid);
              const metadata = await res.json();
              content = metadata.content || '';
              if (metadata.media) {
                media = metadata.media.startsWith('http')
                  ? metadata.media
                  : resolveIPFSUrl(metadata.media);
              }
            } catch (err) {
              console.warn(`[BlocX] IPFS fetch failed for post ${postId}:`, err);
            }
          }

          // PostCard resolves name/avatar via useProfileData (on-chain IPFS lookup).
          // We only store the address here so PostCard can show real data for all users.
          posts.push({
            id: postId.toString(),
            author: {
              address: author,
              avatar: `https://api.dicebear.com/7.x/identicon/svg?seed=${author}`,
              name: '',
            },
            content,
            timestamp: formatTime(Number(postData.timestamp)),
            likes: Number(postData.likeCount),
            comments: Number(postData.commentCount),
            isLiked,
            media,
          });
        } catch (error) {
          console.error(`[BlocX] Error at post ID ${postId}:`, error);
          break;
        }
      }

      return posts.reverse();
    },
    enabled: true,
    refetchInterval: 30000,
  });
};
