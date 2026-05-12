import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useXMTP } from '../contexts/XMTPContext';
import { useWallet } from '../contexts/WalletContext';
import { getAddress } from 'ethers';
import { IdentifierKind } from '@xmtp/browser-sdk';
import type { Conversation, DecodedMessage } from '@xmtp/browser-sdk';
import {
  MessageSquare, Send, ArrowLeft, Loader2, ShieldCheck,
  Search, Plus, X, AlertCircle, RefreshCw
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ConversationWithLastMsg {
  conversation: Conversation;
  lastMsg: DecodedMessage | null;
  peerInboxId: string;
  unread: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const shortAddr = (s: string) =>
  s && s.length > 15 ? `${s.slice(0, 6)}…${s.slice(-4)}` : s;

const formatTime = (date: Date) => {
  const diff = Date.now() - date.getTime();
  if (diff < 86400000) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

const renderMsgContent = (content: any): string => {
  if (typeof content === 'string') return content;
  if (content?.text) return content.text;
  if (content && typeof content === 'object') {
    const k = Object.keys(content);
    if (k.includes('initiatedByInboxId') || k.includes('addedInboxes')) return 'Conversation started';
    return JSON.stringify(content);
  }
  return String(content ?? '');
};

const isApplicationMsg = (msg: DecodedMessage) =>
  (msg as any).kind === 'application' || !(msg as any).kind;

// ─── Sub-components ───────────────────────────────────────────────────────────

const EnableXMTP: React.FC<{ onEnable: () => void; loading: boolean; error: string | null }> = ({ onEnable, loading, error }) => (
  <div className="flex flex-col items-center justify-center h-full gap-6 px-6 text-center">
    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/40 to-accent/40 border border-white/10 flex items-center justify-center">
      <ShieldCheck className="w-10 h-10 text-primary" />
    </div>
    <div>
      <h2 className="text-2xl font-bold text-white mb-2">Enable Secure Messaging</h2>
      <p className="text-textMuted text-sm max-w-xs">
        BlocX uses <span className="text-primary font-medium">XMTP V3</span> — your messages are end-to-end encrypted using your wallet keys.
        You'll sign a free message to unlock your inbox.
      </p>
    </div>
    {error && (
      <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
        <AlertCircle className="w-4 h-4 shrink-0" />
        <span>{error}</span>
      </div>
    )}
    <button
      onClick={onEnable}
      disabled={loading}
      className="glass-button px-8 py-3 text-white font-bold flex items-center gap-3 disabled:opacity-50"
    >
      {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ShieldCheck className="w-5 h-5" />}
      {loading ? 'Unlocking…' : 'Enable Messaging'}
    </button>
    <p className="text-textMuted text-xs">No gas fees • Free forever • Works across all XMTP apps</p>
  </div>
);

const NewConversationModal: React.FC<{
  onClose: () => void;
  onStart: (address: string) => void;
  loading: boolean;
  errorMsg: string | null;
}> = ({ onClose, onStart, loading, errorMsg }) => {
  const [addr, setAddr] = useState('');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="glass-panel w-full max-w-md p-6 rounded-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-white">New Message</h3>
          <button onClick={onClose} className="text-textMuted hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-textMuted text-sm mb-4">Enter the wallet address of the person you want to message.</p>
        <input
          type="text"
          value={addr}
          onChange={(e) => setAddr(e.target.value)}
          placeholder="0x..."
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-textMuted focus:outline-none focus:border-primary/50 mb-3 text-sm font-mono"
        />
        {errorMsg && (
          <div className="flex items-center gap-2 text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2 mb-3">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            {errorMsg}
          </div>
        )}
        <button
          onClick={() => onStart(addr.trim())}
          disabled={!addr.trim() || loading}
          className="w-full glass-button py-3 text-white font-bold disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          {loading ? 'Starting…' : 'Start Conversation'}
        </button>
      </div>
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

const Messages: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { client, isConnectingXMTP, initClient, error: xmtpError } = useXMTP();
  const { address } = useWallet();

  const [conversations, setConversations] = useState<ConversationWithLastMsg[]>([]);
  const [activeConvo, setActiveConvo] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<DecodedMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [loadingConvos, setLoadingConvos] = useState(false);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [sendingMsg, setSendingMsg] = useState(false);
  const [showNewModal, setShowNewModal] = useState(false);
  const [startingNewConvo, setStartingNewConvo] = useState(false);
  const [newConvoError, setNewConvoError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileViewingChat, setIsMobileViewingChat] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  // Keep a ref to active convo so stream callbacks can access current value
  const activeConvoRef = useRef<Conversation | null>(null);
  // Stream cleanup refs
  const allMsgStreamRef = useRef<any>(null);
  const newConvoStreamRef = useRef<any>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // ── Load all conversations ──────────────────────────────────────────────────
  // CRITICAL: sync() before list() so network-delivered conversations appear
  const loadConversations = useCallback(async () => {
    if (!client) return;
    setLoadingConvos(true);
    try {
      await client.conversations.sync();
      const convos = await client.conversations.list();

      const withLast: ConversationWithLastMsg[] = await Promise.all(
        convos.map(async (c: any) => {
          const lastMsg = await c.lastMessage();
          const peerInboxId = c.peerInboxId ? await c.peerInboxId() : 'Group';
          return {
            conversation: c as Conversation,
            peerInboxId,
            lastMsg: lastMsg || null,
            unread: false,
          };
        })
      );

      withLast.sort((a, b) => {
        const ta = a.lastMsg?.sentAt?.getTime() ?? (a.conversation as any).createdAt?.getTime() ?? 0;
        const tb = b.lastMsg?.sentAt?.getTime() ?? (b.conversation as any).createdAt?.getTime() ?? 0;
        return tb - ta;
      });

      setConversations(withLast);
    } catch (e) {
      console.error('[XMTP] Failed to load conversations:', e);
    } finally {
      setLoadingConvos(false);
    }
  }, [client]);

  useEffect(() => {
    if (client) loadConversations();
  }, [client, loadConversations]);

  // ── Global real-time streams ────────────────────────────────────────────────
  useEffect(() => {
    if (!client) return;

    // 1. Stream ALL incoming messages across every conversation.
    //    - If the message is in the active conversation, append it to the chat.
    //    - Always update the conversation list preview.
    client.conversations.streamAllMessages({
      onValue: (msg: DecodedMessage) => {
        if (!isApplicationMsg(msg)) return;

        // Add to active chat (dedup by id)
        if (activeConvoRef.current && msg.conversationId === activeConvoRef.current.id) {
          setMessages((prev) => {
            if (prev.some((m) => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
          scrollToBottom();
        }

        // Update conversation list preview
        setConversations((prev) =>
          prev.map((c) =>
            c.conversation.id === msg.conversationId
              ? {
                  ...c,
                  lastMsg: msg,
                  unread: activeConvoRef.current?.id !== msg.conversationId,
                }
              : c
          )
        );
      },
    }).then((s: any) => {
      allMsgStreamRef.current = s;
    }).catch((e: any) => console.error('[XMTP] streamAllMessages error:', e));

    // 2. Stream new incoming conversations (when someone starts a DM with you).
    client.conversations.stream({
      onValue: () => loadConversations(),
    }).then((s: any) => {
      newConvoStreamRef.current = s;
    }).catch((e: any) => console.error('[XMTP] conversations.stream error:', e));

    return () => {
      allMsgStreamRef.current?.return?.();
      newConvoStreamRef.current?.return?.();
      allMsgStreamRef.current = null;
      newConvoStreamRef.current = null;
    };
  }, [client, loadConversations, scrollToBottom]);

  // ── Open a conversation ─────────────────────────────────────────────────────
  // CRITICAL: sync() before messages() so messages sent while offline appear
  const openConversation = useCallback(async (convo: Conversation) => {
    activeConvoRef.current = convo;
    setActiveConvo(convo);
    setIsMobileViewingChat(true);
    setLoadingMsgs(true);
    setMessages([]);
    try {
      await convo.sync();
      const msgs = await convo.messages();
      const appMsgs = (msgs as DecodedMessage[]).filter(isApplicationMsg);
      setMessages(appMsgs);
      setTimeout(scrollToBottom, 50);
    } catch (e) {
      console.error('[XMTP] Failed to open conversation:', e);
    } finally {
      setLoadingMsgs(false);
    }
  }, [scrollToBottom]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // ── Close active convo cleanup ──────────────────────────────────────────────
  useEffect(() => {
    return () => {
      activeConvoRef.current = null;
    };
  }, []);

  // ── Send a message ──────────────────────────────────────────────────────────
  const sendMessage = async () => {
    if (!activeConvo || !inputText.trim() || sendingMsg) return;
    const text = inputText.trim();
    setSendingMsg(true);
    setInputText('');
    try {
      await activeConvo.sendText(text);
      // Optimistic local message — stream will deduplicate the network echo
    } catch (e: any) {
      console.error('[XMTP] Failed to send message:', e);
      setInputText(text); // restore on failure
    } finally {
      setSendingMsg(false);
    }
  };

  // ── Start a new conversation ────────────────────────────────────────────────
  const startNewConversation = async (peerAddress: string) => {
    if (!client) return;
    setStartingNewConvo(true);
    setNewConvoError(null);
    try {
      const formattedAddress = getAddress(peerAddress);
      console.log(`[XMTP] Resolving inboxId for: ${formattedAddress}`);

      const inboxId = await client.fetchInboxIdByIdentifier({
        identifier: formattedAddress,
        identifierKind: IdentifierKind.Ethereum,
      });

      if (!inboxId) {
        setNewConvoError(`${shortAddr(peerAddress)} hasn't enabled XMTP yet. Ask them to open Messages first.`);
        return;
      }

      console.log(`[XMTP] Creating DM with inboxId: ${inboxId}`);
      const convo = await client.conversations.createDm(inboxId);
      setShowNewModal(false);
      await loadConversations();
      await openConversation(convo);
    } catch (e: any) {
      console.error('[XMTP] startNewConversation error:', e);
      setNewConvoError(e.message || 'Failed to start conversation');
    } finally {
      setStartingNewConvo(false);
    }
  };

  const filteredConvos = conversations.filter((c) =>
    c.peerInboxId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Redirect guard
  useEffect(() => {
    if (client && location.pathname !== '/messages') navigate('/messages');
  }, [client, location.pathname, navigate]);

  // Auto-open DM when navigated here with ?with=<address> (e.g. from user profile)
  useEffect(() => {
    if (!client) return;
    const params = new URLSearchParams(location.search);
    const withAddress = params.get('with');
    if (!withAddress) return;
    // Clear the query param so we don't re-trigger
    navigate('/messages', { replace: true });
    startNewConversation(withAddress);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, location.search]);

  if (!address) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-6">
        <MessageSquare className="w-14 h-14 text-textMuted" />
        <h2 className="text-xl font-bold text-white">Connect your wallet</h2>
        <p className="text-textMuted text-sm">You need to connect a wallet to use messaging.</p>
      </div>
    );
  }

  if (!client) {
    return <EnableXMTP onEnable={initClient} loading={isConnectingXMTP} error={xmtpError} />;
  }

  return (
    <>
      {showNewModal && (
        <NewConversationModal
          onClose={() => { setShowNewModal(false); setNewConvoError(null); }}
          onStart={startNewConversation}
          loading={startingNewConvo}
          errorMsg={newConvoError}
        />
      )}

      <div className="flex h-full overflow-hidden rounded-2xl">

        {/* ── Conversation List ──────────────────────────────────────────────── */}
        <div className={`
          flex flex-col w-full md:w-80 lg:w-96 shrink-0 border-r border-white/5
          ${isMobileViewingChat ? 'hidden md:flex' : 'flex'}
        `}>
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-4 border-b border-white/5">
            <h2 className="text-lg font-bold text-white">Messages</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={loadConversations}
                disabled={loadingConvos}
                className="w-8 h-8 rounded-xl hover:bg-white/10 flex items-center justify-center text-textMuted hover:text-white transition-colors"
                title="Refresh"
              >
                <RefreshCw className={`w-4 h-4 ${loadingConvos ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={() => { setShowNewModal(true); setNewConvoError(null); }}
                className="w-9 h-9 rounded-xl bg-primary/20 hover:bg-primary/40 flex items-center justify-center text-primary transition-colors"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="px-4 py-3 border-b border-white/5">
            <div className="flex items-center gap-3 bg-white/5 rounded-xl px-3 py-2">
              <Search className="w-4 h-4 text-textMuted shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search conversations…"
                className="flex-1 bg-transparent text-white placeholder-textMuted text-sm focus:outline-none"
              />
            </div>
          </div>

          {/* Conversation items */}
          <div className="flex-1 overflow-y-auto">
            {loadingConvos && conversations.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : filteredConvos.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3 text-center px-4">
                <MessageSquare className="w-10 h-10 text-textMuted/50" />
                <p className="text-textMuted text-sm">
                  No conversations yet.<br />Click <strong className="text-white">+</strong> to start one.
                </p>
              </div>
            ) : (
              filteredConvos.map((c) => (
                <button
                  key={c.conversation.id}
                  onClick={() => openConversation(c.conversation)}
                  className={`w-full flex items-center gap-3 px-4 py-4 text-left transition-colors hover:bg-white/5 border-b border-white/5 ${
                    activeConvo?.id === c.conversation.id ? 'bg-white/[0.08]' : ''
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-bold text-sm shrink-0">
                    {c.peerInboxId.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className={`text-sm font-mono truncate ${c.unread ? 'text-white font-semibold' : 'text-white/80'}`}>
                        {shortAddr(c.peerInboxId)}
                      </span>
                      {c.lastMsg?.sentAt && (
                        <span className="text-textMuted text-xs shrink-0 ml-2">{formatTime(c.lastMsg.sentAt)}</span>
                      )}
                    </div>
                    <p className="text-textMuted text-xs truncate mt-0.5">
                      {c.lastMsg
                        ? `${c.lastMsg.senderInboxId === client.inboxId ? 'You: ' : ''}${renderMsgContent(c.lastMsg.content)}`
                        : 'No messages yet'}
                    </p>
                  </div>
                  {c.unread && <span className="w-2 h-2 rounded-full bg-accent shrink-0" />}
                </button>
              ))
            )}
          </div>
        </div>

        {/* ── Chat Area ──────────────────────────────────────────────────────── */}
        <div className={`flex-1 flex flex-col min-w-0 ${!isMobileViewingChat ? 'hidden md:flex' : 'flex'}`}>
          {!activeConvo ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-6">
              <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center">
                <MessageSquare className="w-8 h-8 text-textMuted" />
              </div>
              <h3 className="text-white font-bold">Select a conversation</h3>
              <p className="text-textMuted text-sm">Choose from the left or start a new message.</p>
              <button
                onClick={() => { setShowNewModal(true); setNewConvoError(null); }}
                className="glass-button px-6 py-2.5 text-white font-medium flex items-center gap-2"
              >
                <Plus className="w-4 h-4" /> New Message
              </button>
            </div>
          ) : (
            <>
              {/* Chat Header */}
              <div className="flex items-center gap-3 px-4 py-4 border-b border-white/5">
                <button
                  onClick={() => { setIsMobileViewingChat(false); setActiveConvo(null); activeConvoRef.current = null; }}
                  className="md:hidden text-textMuted hover:text-white transition-colors mr-1"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-bold text-sm shrink-0">
                  {conversations.find((c) => c.conversation.id === activeConvo.id)?.peerInboxId?.slice(0, 2).toUpperCase() || 'DM'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-semibold text-sm font-mono truncate">
                    {shortAddr(conversations.find((c) => c.conversation.id === activeConvo.id)?.peerInboxId || 'Conversation')}
                  </p>
                  <p className="text-textMuted text-xs flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-green-400" />
                    End-to-end encrypted
                  </p>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
                {loadingMsgs ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex items-center justify-center py-8 text-textMuted text-sm">
                    No messages yet. Say hi! 👋
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isMe = msg.senderInboxId === client.inboxId;
                    return (
                      <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                        {!isMe && (
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-bold text-xs mr-2 shrink-0 mt-auto mb-1">
                            {msg.senderInboxId.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div className="max-w-[70%]">
                          <div className={`
                            px-4 py-2.5 rounded-2xl text-sm leading-relaxed
                            ${isMe
                              ? 'bg-primary/80 text-white rounded-br-sm'
                              : 'bg-white/8 text-white rounded-bl-sm border border-white/10'}
                          `}>
                            {renderMsgContent(msg.content)}
                          </div>
                          <p className={`text-textMuted text-xs mt-1 ${isMe ? 'text-right' : 'text-left'}`}>
                            {msg.sentAt ? formatTime(msg.sentAt) : ''}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="px-4 py-4 border-t border-white/5">
                <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl px-4 py-3 focus-within:border-primary/40 transition-colors">
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                    placeholder="Type a message…"
                    className="flex-1 bg-transparent text-white placeholder-textMuted text-sm focus:outline-none"
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!inputText.trim() || sendingMsg}
                    className="w-9 h-9 rounded-xl bg-primary/80 hover:bg-primary flex items-center justify-center text-white transition-colors disabled:opacity-40 shrink-0"
                  >
                    {sendingMsg ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default Messages;
