import React, { useState, useEffect, useRef } from 'react';
import { useWallet } from '../contexts/WalletContext';
import { usePosts } from '../hooks/usePosts';
import PostCard from '../components/post/PostCard';
import { CheckCircle, Loader2, ArrowLeft, Camera, CloudUpload } from 'lucide-react';
import { uploadJSONToIPFS, uploadFileToIPFS } from '../services/ipfs';
import { Contract, parseUnits } from 'ethers';
import { CONTRACT_ADDRESSES, ABIs } from '../config/contracts';
import { useNavigate } from 'react-router-dom';
import { invalidateProfileCache } from '../hooks/useProfileData';

const GAS = {
  maxPriorityFeePerGas: parseUnits('30', 'gwei'),
  maxFeePerGas: parseUnits('40', 'gwei'),
};

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
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // Load from localStorage on mount, then try to load from on-chain
  useEffect(() => {
    if (!address) return;
    const storedName = localStorage.getItem(`profileName_${address}`);
    const storedBio = localStorage.getItem(`profileBio_${address}`);
    const storedAvatar = localStorage.getItem(`profileAvatar_${address}`);
    if (storedName) setName(storedName);
    if (storedBio) setBio(storedBio);
    if (storedAvatar) setAvatarPreview(storedAvatar);

    checkAndLoadOnChainProfile();
  }, [address, provider]);

  const checkAndLoadOnChainProfile = async () => {
    if (!address || !provider) return;
    try {
      const contract = new Contract(CONTRACT_ADDRESSES.profile, ABIs.profile, provider);
      const hasProf: boolean = await contract.hasProfile(address);
      setHasOnChainProfile(hasProf);

      // If on-chain profile exists, load its data to pre-fill the form
      if (hasProf) {
        const tokenId: bigint = await contract.addressToProfileId(address);
        const uri: string = await contract.tokenURI(tokenId);
        const res = await fetch(uri.startsWith('ipfs://')
          ? uri.replace('ipfs://', 'https://ipfs.io/ipfs/')
          : uri);
        const data = await res.json();
        // Only overwrite localStorage if nothing is stored locally
        if (!localStorage.getItem(`profileName_${address}`) && data.name) setName(data.name);
        if (!localStorage.getItem(`profileBio_${address}`) && data.bio) setBio(data.bio);
        if (!localStorage.getItem(`profileAvatar_${address}`) && data.avatar) {
          const resolved = data.avatar.startsWith('ipfs://')
            ? data.avatar.replace('ipfs://', 'https://ipfs.io/ipfs/')
            : data.avatar;
          setAvatarPreview(resolved);
        }
      }
    } catch (err) {
      console.error('Failed to check on-chain profile:', err);
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

  // Save = upload to IPFS + createProfile (first time) or updateProfile (existing)
  const handleSave = async () => {
    if (!address || !provider) return;
    setIsSaving(true);
    setSaveStatus('idle');
    try {
      // Persist to localStorage first
      localStorage.setItem(`profileName_${address}`, name);
      localStorage.setItem(`profileBio_${address}`, bio);

      let avatarUri = avatarPreview && !avatarPreview.startsWith('data:')
        ? avatarPreview
        : `https://api.dicebear.com/7.x/identicon/svg?seed=${address}`;

      if (avatarFile) {
        avatarUri = await uploadFileToIPFS(avatarFile);
        const resolved = avatarUri.startsWith('ipfs://')
          ? avatarUri.replace('ipfs://', 'https://ipfs.io/ipfs/')
          : avatarUri;
        setAvatarPreview(resolved);
        localStorage.setItem(`profileAvatar_${address}`, resolved);
      } else if (avatarPreview) {
        localStorage.setItem(`profileAvatar_${address}`, avatarPreview);
      }

      const profileData = { name: name || 'Anonymous', bio, avatar: avatarUri };
      const ipfsHash = await uploadJSONToIPFS(profileData);

      const signer = await provider.getSigner();
      const contract = new Contract(CONTRACT_ADDRESSES.profile, ABIs.profile, signer);

      let tx;
      if (hasOnChainProfile) {
        tx = await contract.updateProfile(ipfsHash, GAS);
      } else {
        tx = await contract.createProfile(ipfsHash, GAS);
      }
      await tx.wait();

      setHasOnChainProfile(true);
      setAvatarFile(null);
      // Bust the cache so PostCard immediately shows updated data
      invalidateProfileCache(address);
      setSaveStatus('success');
    } catch (err: any) {
      console.error('Failed to save profile:', err);
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
      setIsEditing(false);
      setTimeout(() => setSaveStatus('idle'), 4000);
    }
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

      {/* Status toast */}
      {saveStatus === 'success' && (
        <div className="mx-4 p-3 rounded-xl bg-green-500/20 border border-green-500/30 text-green-400 text-sm text-center font-medium flex items-center justify-center gap-2">
          <CheckCircle className="w-4 h-4" /> Profile saved on-chain — visible to everyone now!
        </div>
      )}
      {saveStatus === 'error' && (
        <div className="mx-4 p-3 rounded-xl bg-red-500/20 border border-red-500/30 text-red-400 text-sm text-center font-medium">
          Failed to save profile. Please try again.
        </div>
      )}

      <div className="glass-panel overflow-hidden relative mb-6">
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
                    disabled={isSaving}
                    className="glass-button text-white px-5 py-2 font-bold disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="bg-white text-black px-5 py-2 rounded-xl font-bold hover:opacity-90 transition-opacity shadow-lg shadow-white/10 flex items-center gap-2 disabled:opacity-60"
                  >
                    {isSaving ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
                    ) : (
                      <><CloudUpload className="w-4 h-4" /> Save &amp; Publish</>
                    )}
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
                placeholder="Display name"
                className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-xl p-3 text-white focus:outline-none focus:border-primary shadow-sm"
              />
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Bio"
                rows={3}
                className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-xl p-3 text-white focus:outline-none focus:border-primary resize-none shadow-sm"
              />
              <p className="text-xs text-textMuted flex items-center gap-1">
                <CloudUpload className="w-3.5 h-3.5" />
                Saving will upload your profile to IPFS and publish it on Polygon — visible to all users.
              </p>
            </div>
          ) : (
            <div className="mt-2">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                {name || 'Anonymous User'}
                {hasOnChainProfile && (
                  <CheckCircle className="w-5 h-5 text-accent" />
                )}
              </h2>
              <p className="text-textMuted font-mono text-sm mt-1">@{address.slice(0, 10)}...</p>
              <p className="text-gray-200 mt-4 mb-4 leading-relaxed">{bio}</p>
              <div className="flex gap-6 text-textMuted text-sm">
                <div className="flex items-center gap-1">
                  <span className="font-bold text-white">1,250</span>
                  <span className="text-accent uppercase text-xs tracking-wider">BLOCX</span>
                </div>
              </div>

              {!hasOnChainProfile && (
                <p className="mt-4 text-sm text-yellow-400/80 bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-4 py-3">
                  Your profile isn't on-chain yet. Click <strong>Edit profile → Save &amp; Publish</strong> to make it visible to others.
                </p>
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
