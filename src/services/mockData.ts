export const MOCK_POSTS = [
  {
    id: '1',
    author: {
      address: '0x123...456',
      avatar: 'https://api.dicebear.com/7.x/identicon/svg?seed=0x123',
    },
    content: 'Just deployed my first smart contract on Polygon! 🚀 #Web3 #BuildInPublic',
    timestamp: '2 hours ago',
    likes: 42,
    comments: 5,
    isLiked: false,
    media: null,
  },
  {
    id: '2',
    author: {
      address: '0xabc...def',
      avatar: 'https://api.dicebear.com/7.x/identicon/svg?seed=0xabc',
    },
    content: 'GM ☀️ What is everyone building today? 💻',
    timestamp: '5 hours ago',
    likes: 128,
    comments: 24,
    isLiked: true,
    media: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&q=80&w=800',
  }
];

export const MOCK_PROPOSALS = [
  {
    id: '1',
    title: 'Increase Block Reward for Active Posters',
    description: 'Proposal to increase the daily token reward for top 100 active posters by 15%.',
    status: 'Active',
    votesFor: 12500,
    votesAgainst: 4200,
    endTime: '2 days left',
  },
  {
    id: '2',
    title: 'Integrate LayerZero for Omnichain Identity',
    description: 'Implement cross-chain identity using LayerZero to allow users from Solana and Avalanche to verify profiles.',
    status: 'Passed',
    votesFor: 45000,
    votesAgainst: 1200,
    endTime: 'Ended',
  }
];

export const MOCK_NOTIFICATIONS = [
  {
    id: '1',
    type: 'success',
    title: 'Transaction Confirmed',
    message: 'Your post was successfully mined on Polygon.',
    time: '5m ago'
  },
  {
    id: '2',
    type: 'info',
    title: 'Governance',
    message: 'New proposal "Increase Block Reward" is live for voting.',
    time: '2h ago'
  },
  {
    id: '3',
    type: 'warning',
    title: 'AI Moderation',
    message: 'Your recent comment was flagged for potentially violating community guidelines.',
    time: '1d ago'
  }
];
