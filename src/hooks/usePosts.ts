import { useQuery } from '@tanstack/react-query';
import { useWallet } from '../contexts/WalletContext';
import { Contract, JsonRpcProvider } from 'ethers';
import { CONTRACT_ADDRESSES, ABIs } from '../config/contracts';
import { resolveIPFSUrl } from '../services/ipfs';

// Dedicated read-only provider — bypasses MetaMask's eth_getLogs limitations
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

      // Get current block and query last 50,000 blocks (~1-2 days on Amoy)
      const currentBlock = await READ_PROVIDER.getBlockNumber();
      const fromBlock = Math.max(0, currentBlock - 50000);

      console.log(`[BlocX] Fetching posts from block ${fromBlock} to ${currentBlock}...`);

      const filter = socialContract.filters.PostCreated();
      const logs = await socialContract.queryFilter(filter, fromBlock, 'latest');

      console.log(`[BlocX] Found ${logs.length} post event(s) on-chain.`);

      const posts: Post[] = [];

      for (let i = logs.length - 1; i >= 0; i--) {
        const log = logs[i] as any;
        const postId = log.args.postId;
        const author = log.args.author;
        const contentHash = log.args.contentHash;

        const timestampMs = Number(log.args.timestamp) * 1000;
        const timeDiff = Date.now() - timestampMs;
        const minsAgo = Math.floor(timeDiff / 60000);
        const hoursAgo = Math.floor(timeDiff / (1000 * 60 * 60));
        let timeString = 'Just now';
        if (hoursAgo > 24) timeString = `${Math.floor(hoursAgo / 24)}d ago`;
        else if (hoursAgo > 0) timeString = `${hoursAgo}h ago`;
        else if (minsAgo > 0) timeString = `${minsAgo}m ago`;

        try {
          const postState = await socialContract.posts(postId);

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
              console.warn(`[BlocX] Could not fetch IPFS metadata for post ${postId}:`, ipfsError);
            }
          }

          posts.push({
            id: postId.toString(),
            author: {
              address: author,
              avatar: `https://api.dicebear.com/7.x/identicon/svg?seed=${author}`,
            },
            content,
            timestamp: timeString,
            likes: Number(postState.likeCount),
            comments: 0,
            isLiked,
            media,
          });
        } catch (error) {
          console.error(`[BlocX] Failed to load post ${postId}:`, error);
        }
      }

      return posts;
    },
    enabled: true, // Works even without MetaMask connected
    refetchInterval: 20000,
  });
};
