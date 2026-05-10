import React, { useState, useRef } from 'react';
import { useWallet } from '../../contexts/WalletContext';
import { useTransaction } from '../../contexts/TransactionContext';
import { Image as ImageIcon, ShieldAlert, X, Zap } from 'lucide-react';
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
  const { setTxState, setTxMessage } = useTransaction();
  
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
    setTxState('awaiting_signature');
    
    try {
      setModError(null);
      // 1. Run AI Moderation
      setShowModeration(true);
      const modResult = await moderateContent(content, selectedFile);
      
      if (modResult.isFlagged) {
        setShowModeration(false);
        setIsPublishing(false);
        setTxState('idle');
        setModError(modResult.reason || 'Flagged by AI Moderation');
        return;
      }
      
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
        timestamp: Date.now()
      };
      
      const metadataUri = await uploadJSONToIPFS(postMetadata);
      
      // 4. Create Post on Blockchain
      const signer = await provider.getSigner();
      const socialContract = new Contract(CONTRACT_ADDRESSES.social, ABIs.social, signer);
      
      const tx = await socialContract.createPost(metadataUri, {
        maxPriorityFeePerGas: parseUnits('30', 'gwei'),
        maxFeePerGas: parseUnits('40', 'gwei')
      });
      
      setTxState('mining');
      await tx.wait(); // Wait for mining
      
      setTxMessage("Post submitted to network successfully!");
      setTxState('success');

      // Reset form
      setContent('');
      clearFile();
      onClose?.();
      
    } catch (error: any) {
      console.error("Failed to create post:", error);
      setTxMessage(error.reason || error.message || "Failed to create post.");
      setTxState('error');
    } finally {
      setIsPublishing(false);
      setTimeout(() => {
        if (useTransaction().txState !== 'idle') setTxState('idle');
      }, 3000);
    }
  };

  if (!address) return null;

  return (
    <div className="glass-panel p-5 mb-6 relative overflow-hidden group">
      <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-accent/10 opacity-50 pointer-events-none" />
      
      <div className="flex gap-4 relative z-10">
        <img 
          src={`https://api.dicebear.com/7.x/identicon/svg?seed=${address}`} 
          alt="Avatar" 
          className="w-12 h-12 rounded-xl bg-[var(--border)] border border-white/10 shrink-0 cursor-pointer shadow-lg" 
        />
        <div className="flex-1 min-w-0">
          <textarea 
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="What is happening?!"
            className="w-full bg-transparent border-none focus:outline-none text-white text-xl resize-none placeholder:text-textMuted/50 pt-2"
            rows={content.split('\n').length > 2 ? content.split('\n').length : 2}
            disabled={isPublishing}
          />
          
          {previewUrl && (
            <div className="relative mt-2 mb-2">
              <img src={previewUrl} alt="Upload preview" className="rounded-xl max-h-[400px] object-cover w-full border border-[var(--border)] shadow-lg" />
              <button 
                onClick={clearFile}
                className="absolute top-2 right-2 p-2 bg-black/60 hover:bg-black/80 text-white rounded-lg transition-colors backdrop-blur-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          )}
          
          <AnimatePresence>
            {showModeration && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-center gap-2 text-accent text-sm bg-accent/10 border border-accent/20 p-3 rounded-xl mb-3 mt-2"
              >
                <ShieldAlert className="w-5 h-5 shrink-0" />
                <span>AI Sentinel: Validating content integrity...</span>
              </motion.div>
            )}
            {modError && !isPublishing && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 p-3 rounded-xl mb-3 mt-2"
              >
                <ShieldAlert className="w-5 h-5 shrink-0" />
                <span>{modError}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex items-center justify-between pt-4 border-t border-[var(--border)] mt-2">
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
                className="p-2.5 text-primary hover:bg-primary/20 rounded-xl transition-colors disabled:opacity-50 border border-transparent hover:border-primary/30"
              >
                <ImageIcon className="w-5 h-5" />
              </button>
            </div>
            
            <button 
              onClick={handlePost}
              disabled={(!content.trim() && !selectedFile) || isPublishing}
              className="px-6 py-2.5 bg-gradient-to-r from-primary to-accent hover:opacity-90 text-white rounded-xl font-bold transition-all disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-primary/20"
            >
              <Zap className="w-4 h-4" />
              {isPublishing ? 'Posting...' : 'Post'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreatePost;
