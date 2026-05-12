import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MessageSquare, CheckCircle, Loader2, UserX } from 'lucide-react';
import { useUserSearch, UserProfile as IUserProfile } from '../hooks/useUserSearch';
import { usePosts } from '../hooks/usePosts';
import PostCard from '../components/post/PostCard';
import { useWallet } from '../contexts/WalletContext';

const UserProfile: React.FC = () => {
  const { address: paramAddress } = useParams<{ address: string }>();
  const { address: selfAddress } = useWallet();
  const { resolveOne } = useUserSearch();
  const { data: allPosts, isLoading: postsLoading } = usePosts();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<IUserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Redirect to own profile page if viewing self
  useEffect(() => {
    if (paramAddress && selfAddress &&
        paramAddress.toLowerCase() === selfAddress.toLowerCase()) {
      navigate('/profile', { replace: true });
    }
  }, [paramAddress, selfAddress, navigate]);

  useEffect(() => {
    if (!paramAddress) return;
    setIsLoading(true);
    setNotFound(false);
    resolveOne(paramAddress).then(p => {
      if (p) setProfile(p);
      else setNotFound(true);
      setIsLoading(false);
    });
  }, [paramAddress, resolveOne]);

  const userPosts = allPosts?.filter(
    p => p.author.address.toLowerCase() === paramAddress?.toLowerCase()
  ) || [];

  const handleMessage = () => {
    if (paramAddress) navigate(`/messages?with=${paramAddress}`);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
        <p className="text-textMuted text-sm">Resolving on-chain profile…</p>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="w-full pb-20 md:pb-0">
        <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-1.5 hover:bg-white/10 rounded-full transition-colors">
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <h2 className="text-xl font-bold text-textMain">Profile</h2>
        </div>
        <div className="flex flex-col items-center justify-center p-16 gap-4 text-textMuted">
          <UserX className="w-12 h-12 opacity-40" />
          <p className="font-semibold text-white/60">No on-chain profile found</p>
          <p className="text-sm opacity-60 font-mono">{paramAddress?.slice(0, 10)}...{paramAddress?.slice(-6)}</p>
          <p className="text-sm opacity-50 text-center max-w-xs">
            This address hasn't minted a BlocX profile yet.
          </p>
        </div>
      </div>
    );
  }

  const displayName = profile?.name || 'Anonymous';
  const avatarSrc = profile?.avatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${paramAddress}`;

  return (
    <div className="w-full pb-20 md:pb-0">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-1.5 hover:bg-white/10 rounded-full transition-colors">
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <div>
          <h2 className="text-xl font-bold text-white leading-tight">{displayName}</h2>
          <p className="text-xs text-textMuted">{userPosts.length} posts</p>
        </div>
      </div>

      {/* Banner */}
      <div className="h-32 bg-gradient-to-br from-primary/40 to-accent/30 relative" />

      {/* Profile card */}
      <div className="px-4 pb-4 border-b border-border">
        {/* Avatar + action row */}
        <div className="flex items-end justify-between -mt-12 mb-4">
          <div className="w-20 h-20 rounded-2xl ring-4 ring-background overflow-hidden bg-surface flex items-center justify-center shrink-0">
            {avatarSrc.startsWith('data:') || avatarSrc.startsWith('http') || avatarSrc.startsWith('https') ? (
              <img src={avatarSrc} alt={displayName} className="w-full h-full object-cover" />
            ) : (
              <div
                className="w-full h-full flex items-center justify-center text-3xl font-bold text-white"
                style={{ background: 'linear-gradient(135deg, #7c3aed, #06b6d4)' }}
              >
                {displayName[0]?.toUpperCase()}
              </div>
            )}
          </div>

          <button
            onClick={handleMessage}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border bg-white/5 hover:bg-white/10 text-white font-semibold text-sm transition-colors"
          >
            <MessageSquare className="w-4 h-4" />
            Message
          </button>
        </div>

        {/* Name / address */}
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          {displayName}
          <CheckCircle className="w-5 h-5 text-accent" title="On-chain profile verified" />
        </h2>
        <p className="text-textMuted font-mono text-xs mt-0.5">
          {paramAddress?.slice(0, 10)}...{paramAddress?.slice(-6)}
        </p>

        {profile?.bio && (
          <p className="text-gray-200 mt-3 leading-relaxed text-sm">{profile.bio}</p>
        )}
      </div>

      {/* Posts */}
      <div className="px-0 pt-0">
        <div className="px-4 py-3 border-b border-border">
          <span className="font-bold text-white text-sm">Network Broadcasts</span>
        </div>

        {postsLoading ? (
          <div className="flex justify-center p-10">
            <Loader2 className="w-6 h-6 animate-spin text-accent" />
          </div>
        ) : userPosts.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-16 text-textMuted gap-3">
            <p className="font-semibold text-white/60">No posts yet</p>
            <p className="text-sm opacity-50">This node hasn't broadcast anything yet.</p>
          </div>
        ) : (
          <div className="flex flex-col">
            {userPosts.map(post => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default UserProfile;
