import React, { useState, useEffect, useRef } from 'react';
import { useWallet } from '../contexts/WalletContext';
import { usePosts } from '../hooks/usePosts';
import PostCard from '../components/post/PostCard';
import { CheckCircle, Loader2, ArrowLeft, Camera } from 'lucide-react';
import { uploadJSONToIPFS, uploadFileToIPFS } from '../services/ipfs';
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
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [hasOnChainProfile, setHasOnChainProfile] = useState(false);
  const [isMinting, setIsMinting] = useState(false);

  // Load profile data from localStorage on mount or address change
  useEffect(() => {
    if (address) {
      const storedName = localStorage.getItem(`profileName_${address}`);
      const storedBio = localStorage.getItem(`profileBio_${address}`);
      const storedAvatar = localStorage.getItem(`profileAvatar_${address}`);
      
      if (storedName) setName(storedName);
      if (storedBio) setBio(storedBio);
      if (storedAvatar) setAvatarPreview(storedAvatar);
      
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

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setAvatarPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleMintProfile = async () => {
    if (!address || !provider) return;
    setIsMinting(true);
    try {
      let avatarUri = `https://api.dicebear.com/7.x/identicon/svg?seed=${address}`;
      
      // Upload custom avatar to IPFS if selected
      if (avatarFile) {
        avatarUri = await uploadFileToIPFS(avatarFile);
      } else if (avatarPreview && !avatarPreview.startsWith('data:')) {
        avatarUri = avatarPreview;
      }

      // 1. Upload to IPFS
      const profileData = { name: name || 'Anonymous', bio, avatar: avatarUri };
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
      alert("Web3 Profile Minted Successfully!");
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
      if (avatarPreview) localStorage.setItem(`profileAvatar_${address}`, avatarPreview);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    if (address) {
      setName(localStorage.getItem(`profileName_${address}`) || '');
      setBio(localStorage.getItem(`profileBio_${address}`) || 'Web3 Enthusiast & Developer');
      setAvatarPreview(localStorage.getItem(`profileAvatar_${address}`) || null);
      setAvatarFile(null);
    }
    setIsEditing(false);
  };

  if (!address) {
    return (
      <div className="glass-panel flex items-center justify-center h-[50vh] text-textMuted p-8">
        <p>Please connect your wallet to view your profile.</p>
      </div>
    );
  }

  const currentAvatar = avatarPreview || `https://api.dicebear.com/7.x/identicon/svg?seed=${address}`;

  return (
    <div className="w-full pb-20 md:pb-0 space-y-6">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-black/40 backdrop-blur-md border-b border-[var(--border)] px-4 py-2 flex items-center gap-6 rounded-b-2xl mb-4">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <div>
          <h2 className="text-xl font-bold text-white">{name || 'User'}</h2>
          <p className="text-xs text-textMuted">{userPosts.length} broadcasts</p>
        </div>
      </div>

      <div className="glass-panel overflow-hidden relative mb-6">
        {/* Header Image */}
        <div className="w-full h-48 bg-gradient-to-r from-primary/30 to-accent/30" />
        
        <div className="px-6 pb-6">
          <div className="flex justify-between items-start">
            <div className="relative -mt-16 mb-4 group">
              <img 
                src={currentAvatar} 
                alt="Avatar" 
                className="w-32 h-32 rounded-2xl bg-[var(--surface)] border-4 border-[#0B0C10] shadow-xl object-cover" 
              />
              {isEditing && (
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 bg-black/50 rounded-2xl flex items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Camera className="w-8 h-8 text-white" />
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleAvatarSelect} 
                    accept="image/*" 
                    className="hidden" 
                  />
                </div>
              )}
            </div>
            
            <div className="mt-4">
              {!isEditing ? (
                <button 
                  onClick={() => setIsEditing(true)}
                  className="glass-button text-white px-5 py-2 font-bold"
                >
                  Edit profile
                </button>
              ) : (
                <div className="flex gap-2">
                  <button 
                    onClick={handleCancel}
                    className="glass-button text-white px-5 py-2 font-bold"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleSave}
                    className="bg-white text-black px-5 py-2 rounded-xl font-bold hover:opacity-90 transition-opacity shadow-lg shadow-white/10"
                  >
                    Save
                  </button>
                </div>
              )}
            </div>
          </div>
          
          {isEditing ? (
            <div className="space-y-4 mb-4 mt-2">
              <input 
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Name"
                className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-xl p-3 text-white focus:outline-none focus:border-primary shadow-sm"
              />
              <textarea 
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Bio"
                rows={3}
                className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-xl p-3 text-white focus:outline-none focus:border-primary resize-none shadow-sm"
              />
            </div>
          ) : (
            <div className="mt-2">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                {name || 'Anonymous User'}
                {hasOnChainProfile && <CheckCircle className="w-5 h-5 text-accent" />}
              </h2>
              <p className="text-textMuted font-mono text-sm mt-1">@{address.slice(0, 10)}...</p>
              
              <p className="text-gray-200 mt-4 mb-4 leading-relaxed">{bio}</p>
              
              <div className="flex gap-6 text-textMuted text-sm">
                <div className="flex items-center gap-1"><span className="font-bold text-white">1,250</span> <span className="text-accent uppercase text-xs tracking-wider">BLOCX</span></div>
              </div>

              {!hasOnChainProfile && (
                <button 
                  onClick={handleMintProfile}
                  disabled={isMinting}
                  className="mt-6 w-full bg-gradient-to-r from-primary to-accent hover:opacity-90 text-white px-4 py-3 rounded-xl font-bold transition-all shadow-lg shadow-primary/20 flex justify-center items-center gap-2"
                >
                  {isMinting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Mint Web3 Profile on Chain"}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[var(--border)] mb-6">
        <div className="flex-1 text-center py-4 cursor-pointer font-bold text-white relative">
          Network Broadcasts
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-16 h-1 bg-gradient-to-r from-primary to-accent rounded-full shadow-[0_0_10px_rgba(139,92,246,0.5)]" />
        </div>
        <div className="flex-1 text-center py-4 cursor-pointer font-medium text-textMuted hover:text-white transition-colors">
          Replies
        </div>
      </div>
      
      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-8 gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : userPosts.length > 0 ? (
        <div className="flex flex-col">
          {userPosts.map(post => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      ) : (
        <div className="glass-panel p-10 text-center">
          <h1 className="text-2xl font-bold text-white mb-2">No Broadcasts Found</h1>
          <p className="text-textMuted">When this node broadcasts to the network, it will appear here.</p>
        </div>
      )}
    </div>
  );
};

export default Profile;
