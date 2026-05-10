import React, { useState, useEffect } from 'react';
import { useWallet } from '../contexts/WalletContext';
import { usePosts } from '../hooks/usePosts';
import PostCard from '../components/post/PostCard';
import { CheckCircle, Loader2, ArrowLeft } from 'lucide-react';
import { uploadJSONToIPFS } from '../services/ipfs';
import { Contract, parseUnits } from 'ethers';
import { CONTRACT_ADDRESSES, ABIs } from '../config/contracts';
import { useNavigate } from 'react-router-dom';

const Profile: React.FC = () => {
  const { address, provider } = useWallet();
  const { data: posts, isLoading } = usePosts();
  const navigate = useNavigate();
  
  const userPosts = posts?.filter(p => p.author.address.toLowerCase() === address?.toLowerCase()) || [];

  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState('');
  const [bio, setBio] = useState('Web3 Enthusiast & Developer');
  
  const [hasOnChainProfile, setHasOnChainProfile] = useState(false);
  const [isMinting, setIsMinting] = useState(false);

  // Load profile data from localStorage on mount or address change
  useEffect(() => {
    if (address) {
      const storedName = localStorage.getItem(`profileName_${address}`);
      const storedBio = localStorage.getItem(`profileBio_${address}`);
      if (storedName) setName(storedName);
      if (storedBio) setBio(storedBio);
      
      checkOnChainProfile();
    }
  }, [address, provider]);

  const checkOnChainProfile = async () => {
    if (!address || !provider) return;
    try {
      const signer = await provider.getSigner();
      const profileContract = new Contract(CONTRACT_ADDRESSES.profile, ABIs.profile, signer);
      const hasProf = await profileContract.hasProfile(address);
      setHasOnChainProfile(hasProf);
    } catch (error) {
      console.error("Failed to check on-chain profile:", error);
    }
  };

  const handleMintProfile = async () => {
    if (!address || !provider) return;
    setIsMinting(true);
    try {
      // 1. Upload to IPFS
      const profileData = { name: name || 'Anonymous', bio, avatar: `https://api.dicebear.com/7.x/identicon/svg?seed=${address}` };
      const ipfsHash = await uploadJSONToIPFS(profileData);
      
      // 2. Mint on Blockchain
      const signer = await provider.getSigner();
      const profileContract = new Contract(CONTRACT_ADDRESSES.profile, ABIs.profile, signer);
      
      const tx = await profileContract.createProfile(ipfsHash, {
        maxPriorityFeePerGas: parseUnits('30', 'gwei'),
        maxFeePerGas: parseUnits('40', 'gwei')
      });
      await tx.wait(); // Wait for confirmation
      
      setHasOnChainProfile(true);
    } catch (error: any) {
      console.error(error);
      alert(error.message || "Failed to mint profile");
    } finally {
      setIsMinting(false);
    }
  };

  const handleSave = () => {
    if (address) {
      localStorage.setItem(`profileName_${address}`, name);
      localStorage.setItem(`profileBio_${address}`, bio);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    if (address) {
      const storedName = localStorage.getItem(`profileName_${address}`);
      const storedBio = localStorage.getItem(`profileBio_${address}`);
      setName(storedName || '');
      setBio(storedBio || 'Web3 Enthusiast & Developer');
    }
    setIsEditing(false);
  };

  if (!address) {
    return (
      <div className="flex items-center justify-center h-[50vh] text-textMuted border-b border-border p-8">
        <p>Please connect your wallet to view your profile.</p>
      </div>
    );
  }

  return (
    <div className="w-full pb-20 md:pb-0">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border px-4 py-1 flex items-center gap-6 cursor-pointer">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-black/10 dark:hover:bg-white/10 rounded-full transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-xl font-bold text-textMain">{name || 'User'}</h2>
          <p className="text-xs text-textMuted">{userPosts.length} posts</p>
        </div>
      </div>

      <div className="border-b border-border pb-4 relative">
        {/* Header Image */}
        <div className="w-full h-48 bg-[#333639]" />
        
        <div className="px-4">
          <div className="flex justify-between items-start">
            <img 
              src={`https://api.dicebear.com/7.x/identicon/svg?seed=${address}`} 
              alt="Avatar" 
              className="w-32 h-32 rounded-full bg-border border-4 border-background relative -mt-16 mb-4" 
            />
            <div className="mt-4">
              {!isEditing ? (
                <button 
                  onClick={() => setIsEditing(true)}
                  className="bg-transparent border border-border hover:bg-black/5 dark:hover:bg-white/5 text-textMain px-4 py-1.5 rounded-full font-bold transition-colors"
                >
                  Edit profile
                </button>
              ) : (
                <div className="flex gap-2">
                  <button 
                    onClick={handleCancel}
                    className="bg-transparent text-textMain px-4 py-1.5 rounded-full font-bold transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleSave}
                    className="bg-textMain text-background px-4 py-1.5 rounded-full font-bold transition-colors"
                  >
                    Save
                  </button>
                </div>
              )}
            </div>
          </div>
          
          {isEditing ? (
            <div className="space-y-4 mb-4">
              <input 
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Name"
                className="w-full bg-transparent border border-border rounded p-3 text-textMain focus:outline-none focus:border-primary"
              />
              <textarea 
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Bio"
                rows={3}
                className="w-full bg-transparent border border-border rounded p-3 text-textMain focus:outline-none focus:border-primary resize-none"
              />
            </div>
          ) : (
            <div>
              <h2 className="text-xl font-bold text-textMain flex items-center gap-1">
                {name || 'Anonymous User'}
                {hasOnChainProfile && <CheckCircle className="w-4 h-4 text-[#1d9bf0]" />}
              </h2>
              <p className="text-textMuted">@{address.slice(0, 10)}...</p>
              
              <p className="text-textMain mt-3 mb-3">{bio}</p>
              
              <div className="flex gap-4 text-textMuted text-sm">
                <div><span className="font-bold text-textMain">1,250</span> BLOCX Tokens</div>
              </div>

              {!hasOnChainProfile && (
                <button 
                  onClick={handleMintProfile}
                  disabled={isMinting}
                  className="mt-4 w-full bg-primary hover:bg-primaryHover text-white px-4 py-2 rounded-full font-bold transition-colors flex justify-center"
                >
                  {isMinting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Mint Web3 Profile (Verify)"}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border">
        <div className="flex-1 text-center py-4 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer font-bold text-textMain relative">
          Posts
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-1 bg-primary rounded-full" />
        </div>
        <div className="flex-1 text-center py-4 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer font-medium text-textMuted">
          Replies
        </div>
      </div>
      
      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-8 gap-4">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : userPosts.length > 0 ? (
        <div className="flex flex-col">
          {userPosts.map(post => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      ) : (
        <div className="p-8">
          <h1 className="text-3xl font-bold text-textMain mb-2">@{name || 'User'} hasn't posted</h1>
          <p className="text-textMuted">When they do, their posts will show up here.</p>
        </div>
      )}
    </div>
  );
};

export default Profile;
