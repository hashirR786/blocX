import React, { useState, useRef } from 'react';
import { useWallet } from '../../contexts/WalletContext';
import { Image as ImageIcon, ShieldAlert, X, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { uploadFileToIPFS, uploadJSONToIPFS } from '../../services/ipfs';
import { moderateContent } from '../../services/moderation';
import { Contract, parseUnits } from 'ethers';
import { CONTRACT_ADDRESSES, ABIs } from '../../config/contracts';

interface CreatePostProps {
  onClose?: () => void;
}

const CreatePost: React.FC<CreatePostProps> = ({ onClose }) => {
  const { address, provider } = useWallet();
  const [content, setContent] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);
  const [showModeration, setShowModeration] = useState(false);
  const [modError, setModError] = useState<string | null>(null);
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const clearFile = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handlePost = async () => {
    if ((!content.trim() && !selectedFile) || !provider) return;
    
    setIsPublishing(true);
    
    try {
      setModError(null);
      // 1. Run AI Moderation
      setShowModeration(true);
      const modResult = await moderateContent(content, selectedFile);
      
      if (modResult.isFlagged) {
        setShowModeration(false);
        setIsPublishing(false);
        setModError(modResult.reason || 'Flagged by AI Moderation');
        return;
      }
      
      // Keep showing checking for UX feel, then hide
      await new Promise(resolve => setTimeout(resolve, 500));
      setShowModeration(false);
      
      let mediaUri = null;
      
      // 2. Upload Image to IPFS if exists
      if (selectedFile) {
        mediaUri = await uploadFileToIPFS(selectedFile);
      }
      
      // 3. Upload Post Metadata to IPFS
      const postMetadata = {
        content: content.trim(),
        media: mediaUri,
        author: address,
      };
      
      const metadataUri = await uploadJSONToIPFS(postMetadata);
      
      // 4. Create Post on Blockchain
      const signer = await provider.getSigner();
      const socialContract = new Contract(CONTRACT_ADDRESSES.social, ABIs.social, signer);
      
      const tx = await socialContract.createPost(metadataUri, {
        maxPriorityFeePerGas: parseUnits('30', 'gwei'),
        maxFeePerGas: parseUnits('40', 'gwei')
      });
      await tx.wait(); // Wait for mining
      
      // Reset form
      setContent('');
      clearFile();
      
      // Close modal if embedded
      onClose?.();
      
      // Ideally, trigger a refresh of the posts list here
      // For now, it will appear when they refresh or if we add a global event emitter
      
    } catch (error: any) {
      console.error("Failed to create post:", error);
      alert(error.reason || error.message || "Failed to create post. Do you have a Web3 Profile?");
    } finally {
      setIsPublishing(false);
    }
  };

  if (!address) return null;

  return (
    <div className="border-b border-border p-4 bg-background">
      <div className="flex gap-4">
        <img 
          src={`https://api.dicebear.com/7.x/identicon/svg?seed=${address}`} 
          alt="Avatar" 
          className="w-10 h-10 rounded-full bg-border shrink-0 cursor-pointer hover:opacity-90 transition-opacity" 
        />
        <div className="flex-1 min-w-0">
          <textarea 
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="What is happening?!"
            className="w-full bg-transparent border-none focus:outline-none text-textMain text-xl resize-none placeholder:text-textMuted pt-2"
            rows={2}
            disabled={isPublishing}
          />
          
          {previewUrl && (
            <div className="relative mt-2 mb-2">
              <img src={previewUrl} alt="Upload preview" className="rounded-2xl max-h-[40vh] object-cover w-full border border-border" />
              <button 
                onClick={clearFile}
                className="absolute top-2 right-2 p-1.5 bg-black/50 hover:bg-black/70 text-white rounded-full transition-colors backdrop-blur-sm"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
          
          <AnimatePresence>
            {showModeration && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-center gap-2 text-yellow-500 text-xs bg-yellow-500/10 p-2 rounded-lg mb-3"
              >
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>AI Moderation: Checking content for safety...</span>
              </motion.div>
            )}
            {modError && !isPublishing && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-center gap-2 text-red-500 text-xs bg-red-500/10 p-2 rounded-lg mb-3"
              >
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>{modError}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex items-center justify-between pt-2 border-t border-transparent mt-1">
            <div>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileSelect} 
                accept="image/*" 
                className="hidden" 
              />
              <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={isPublishing}
                className="p-2 text-primary hover:bg-primary/10 rounded-full transition-colors disabled:opacity-50"
              >
                <ImageIcon className="w-5 h-5" />
              </button>
            </div>
            
            <button 
              onClick={handlePost}
              disabled={(!content.trim() && !selectedFile) || isPublishing}
              className="px-4 py-1.5 bg-primary hover:bg-primaryHover text-white rounded-full font-bold transition-colors disabled:opacity-50 flex items-center gap-2 text-sm"
            >
              {isPublishing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Posting...
                </>
              ) : (
                'Post'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreatePost;
