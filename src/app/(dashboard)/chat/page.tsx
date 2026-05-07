"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Send, Sparkles, Loader2, MessageCircle, Trash2, Plus, ChevronLeft,
  Download, Eye, Folder, Image, Film, Music, FileText, File as FileIcon,
  X, Link2, FolderPlus, BarChart3, Search, ArrowRight, ExternalLink, Copy, Check
} from "lucide-react";

interface FileRef {
  id: string;
  name: string;
  mimeType: string | null;
  fileSize: string;
  url: string | null;
  thumbnailUrl: string | null;
  folderName: string;
  createdAt: string;
}

interface ActionResult {
  type: string;
  message: string;
  data?: any;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  fileRefs?: FileRef[];
  action?: ActionResult;
  createdAt: string;
}

interface Conversation {
  id: string;
  title: string;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
}

function formatBytes(b: number): string {
  if (b === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(b) / Math.log(k));
  return `${parseFloat((b / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function getTypeIcon(mime: string | null) {
  if (!mime) return <FileIcon className="w-4 h-4 text-gray-400" />;
  if (mime.startsWith("image/")) return <Image className="w-4 h-4 text-emerald-400" />;
  if (mime.startsWith("video/")) return <Film className="w-4 h-4 text-blue-400" />;
  if (mime.startsWith("audio/")) return <Music className="w-4 h-4 text-pink-400" />;
  if (mime.includes("pdf")) return <FileText className="w-4 h-4 text-red-400" />;
  return <FileIcon className="w-4 h-4 text-gray-400" />;
}

/* ── Inline File Card ── */
function FileCard({ file }: { file: FileRef }) {
  const [preview, setPreview] = useState(false);
  return (
    <>
      <div
        className="flex items-center gap-3 px-3 py-2.5 bg-white/5 hover:bg-white/10 rounded-xl transition-all cursor-pointer border border-white/5 hover:border-white/10 group"
        onClick={() => setPreview(true)}
      >
        {file.thumbnailUrl ? (
          <img src={file.thumbnailUrl} alt="" className="w-11 h-11 rounded-lg object-cover shrink-0 ring-1 ring-white/10" />
        ) : (
          <div className="w-11 h-11 rounded-lg bg-white/5 flex items-center justify-center shrink-0 ring-1 ring-white/10">
            {getTypeIcon(file.mimeType)}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-medium text-white/90 truncate">{file.name}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[10px] text-white/40">{formatBytes(Number(file.fileSize))}</span>
            <span className="text-[10px] text-white/30 flex items-center gap-1">
              <Folder className="w-2.5 h-2.5" /> {file.folderName}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={(e) => { e.stopPropagation(); setPreview(true); }}
            className="p-1.5 hover:bg-white/10 rounded-lg transition-colors" title="Preview">
            <Eye className="w-3.5 h-3.5 text-white/50" />
          </button>
          {file.url && (
            <a href={file.url} download={file.name} onClick={e => e.stopPropagation()}
              className="p-1.5 hover:bg-white/10 rounded-lg transition-colors" title="Download">
              <Download className="w-3.5 h-3.5 text-white/50" />
            </a>
          )}
        </div>
      </div>

      {/* Preview Modal */}
      {preview && (
        <div className="fixed inset-0 z-[9999] bg-black/95 flex items-center justify-center p-4" onClick={() => setPreview(false)}>
          <button className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full z-10">
            <X className="w-5 h-5 text-white" />
          </button>
          <div className="max-w-4xl max-h-[90vh] w-full flex flex-col items-center" onClick={e => e.stopPropagation()}>
            {file.mimeType?.startsWith("image/") && file.url && (
              <img src={file.url} alt={file.name} className="max-w-full max-h-[80vh] object-contain rounded-xl" />
            )}
            {file.mimeType?.startsWith("video/") && file.url && (
              <video src={file.url} controls className="max-w-full max-h-[80vh] rounded-xl" autoPlay />
            )}
            {file.mimeType?.startsWith("audio/") && file.url && (
              <div className="bg-[#1a1a1a] rounded-xl p-8 w-full max-w-md"><audio src={file.url} controls className="w-full" /></div>
            )}
            <p className="text-sm font-medium text-white mt-4">{file.name}</p>
            <p className="text-xs text-white/40">{formatBytes(Number(file.fileSize))}</p>
          </div>
        </div>
      )}
    </>
  );
}

/* ── Action Card (Share links, Collection created, etc.) ── */
function ActionCard({ action }: { action: ActionResult }) {
  const [copied, setCopied] = useState<string | null>(null);

  const copyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopied(url);
    setTimeout(() => setCopied(null), 2000);
  };

  if (action.type === "share" && action.data?.links) {
    return (
      <div className="mt-2 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
        <div className="flex items-center gap-2 mb-2">
          <Link2 className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-semibold text-emerald-400">Share Links Created</span>
        </div>
        <div className="space-y-1.5">
          {action.data.links.map((link: { fileName: string; shareUrl: string }, i: number) => (
            <div key={i} className="flex items-center gap-2 text-xs">
              <span className="text-white/70 truncate flex-1">{link.fileName}</span>
              <button
                onClick={() => copyLink(link.shareUrl)}
                className="flex items-center gap-1 px-2 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 rounded-lg text-emerald-400 transition-colors shrink-0"
              >
                {copied === link.shareUrl ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {copied === link.shareUrl ? "Copied!" : "Copy"}
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (action.type === "create_collection" && action.data) {
    return (
      <div className="mt-2 p-3 bg-violet-500/10 border border-violet-500/20 rounded-xl">
        <div className="flex items-center gap-2 mb-1">
          <FolderPlus className="w-4 h-4 text-violet-400" />
          <span className="text-xs font-semibold text-violet-400">Collection Created</span>
        </div>
        <p className="text-xs text-white/60">
          <span className="text-white/90 font-medium">{action.data.name}</span> — {action.data.count} files
        </p>
        <a href="/collections" className="inline-flex items-center gap-1 mt-2 text-[11px] text-violet-400 hover:text-violet-300 transition-colors">
          View Collections <ArrowRight className="w-3 h-3" />
        </a>
      </div>
    );
  }

  if (action.type === "stats") {
    return (
      <div className="mt-2 p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-xl">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-semibold text-cyan-400">Storage Insights</span>
        </div>
      </div>
    );
  }

  return null;
}

/* ── Format AI message with markdown ── */
function formatMessage(content: string) {
  return content
    .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white font-semibold">$1</strong>')
    .replace(/\*(.*?)\*/g, '<em class="text-white/80">$1</em>')
    .replace(/`(.*?)`/g, '<code class="px-1.5 py-0.5 bg-white/10 rounded text-[11px] text-violet-300 font-mono">$1</code>')
    .replace(/\n/g, '<br/>');
}

export default function ChatPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConvoId, setCurrentConvoId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingConvos, setLoadingConvos] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  useEffect(() => { scrollToBottom(); }, [messages]);

  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch("/api/ai/conversations");
      if (res.ok) {
        const data = await res.json();
        setConversations(data.conversations || []);
      }
    } catch { /* */ }
    setLoadingConvos(false);
  }, []);

  useEffect(() => { fetchConversations(); }, [fetchConversations]);

  const loadConversation = async (id: string) => {
    setCurrentConvoId(id);
    try {
      const res = await fetch(`/api/ai/conversations/${id}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.conversation.messages || []);
      }
    } catch { /* */ }
  };

  const startNew = () => { setCurrentConvoId(null); setMessages([]); inputRef.current?.focus(); };

  const deleteConversation = async (id: string) => {
    await fetch(`/api/ai/conversations/${id}`, { method: "DELETE" });
    setConversations(prev => prev.filter(c => c.id !== id));
    if (currentConvoId === id) startNew();
  };

  const sendMessage = async () => {
    if (!input.trim() || sending) return;
    const userMessage = input.trim();
    setInput("");
    setSending(true);

    setMessages(prev => [...prev, {
      id: `temp-${Date.now()}`,
      role: "user",
      content: userMessage,
      createdAt: new Date().toISOString(),
    }]);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage, conversationId: currentConvoId }),
      });

      if (res.ok) {
        const data = await res.json();
        if (!currentConvoId) {
          setCurrentConvoId(data.conversationId);
          fetchConversations();
        }
        setMessages(prev => [...prev, {
          id: `ai-${Date.now()}`,
          role: "assistant",
          content: data.reply,
          fileRefs: data.files,
          action: data.action,
          createdAt: new Date().toISOString(),
        }]);
      } else {
        setMessages(prev => [...prev, {
          id: `err-${Date.now()}`, role: "assistant",
          content: "Có lỗi xảy ra. Thử lại nhé!", createdAt: new Date().toISOString(),
        }]);
      }
    } catch {
      setMessages(prev => [...prev, {
        id: `err-${Date.now()}`, role: "assistant",
        content: "Mất kết nối. Thử lại nhé!", createdAt: new Date().toISOString(),
      }]);
    }
    setSending(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const suggestions = [
    { icon: <Search className="w-4 h-4" />, text: "Tìm ảnh chụp gần đây", color: "text-emerald-400" },
    { icon: <BarChart3 className="w-4 h-4" />, text: "Thống kê dung lượng storage", color: "text-cyan-400" },
    { icon: <FolderPlus className="w-4 h-4" />, text: "Tạo album ảnh của tôi", color: "text-violet-400" },
    { icon: <Link2 className="w-4 h-4" />, text: "Chia sẻ file mới nhất", color: "text-amber-400" },
  ];

  return (
    <div className="h-[calc(100vh-64px)] flex overflow-hidden bg-[#0a0a0a]">
      {/* ── Sidebar ── */}
      <div className={`${sidebarOpen ? "w-72" : "w-0 overflow-hidden"} border-r border-white/5 flex-col transition-all duration-300 hidden md:flex bg-[#080808]`}>
        <div className="p-3 border-b border-white/5">
          <button
            onClick={startNew}
            className="w-full px-3 py-2.5 bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-500 hover:to-violet-400 text-white text-sm font-medium rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-violet-500/20"
          >
            <Plus className="w-4 h-4" /> New Chat
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {loadingConvos ? (
            <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-white/20" /></div>
          ) : conversations.length === 0 ? (
            <p className="text-[11px] text-white/20 text-center py-8">No conversations yet</p>
          ) : (
            conversations.map(c => (
              <div
                key={c.id}
                className={`group flex items-center gap-2.5 px-3 py-2.5 rounded-xl cursor-pointer transition-all ${
                  currentConvoId === c.id
                    ? "bg-violet-500/15 border border-violet-500/20"
                    : "hover:bg-white/5 border border-transparent"
                }`}
                onClick={() => loadConversation(c.id)}
              >
                <MessageCircle className={`w-4 h-4 shrink-0 ${currentConvoId === c.id ? "text-violet-400" : "text-white/20"}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-medium text-white/80 truncate">{c.title || "New Chat"}</p>
                  <p className="text-[10px] text-white/25">{c.messageCount} messages</p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteConversation(c.id); }}
                  className="p-1 opacity-0 group-hover:opacity-100 hover:text-red-400 text-white/20 transition-all"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── Main Chat ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="px-4 py-3 border-b border-white/5 flex items-center gap-3 bg-[#0a0a0a]/80 backdrop-blur-xl">
          <button onClick={() => setSidebarOpen(prev => !prev)} className="p-1.5 hover:bg-white/5 rounded-lg transition-colors hidden md:block">
            <ChevronLeft className={`w-4 h-4 text-white/40 transition-transform ${sidebarOpen ? "" : "rotate-180"}`} />
          </button>
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white/90">AI Assistant</h1>
            <p className="text-[10px] text-white/30">Search, organize, share — ask anything</p>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500/20 to-cyan-500/20 flex items-center justify-center mb-5 ring-1 ring-white/10">
                  <Sparkles className="w-7 h-7 text-violet-400" />
                </div>
                <h2 className="text-xl font-bold text-white/90 mb-2">Chat with your files</h2>
                <p className="text-sm text-white/40 max-w-md mb-8">
                  Search files, get storage insights, create collections, or generate share links — all through natural conversation.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-w-lg w-full">
                  {suggestions.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => { setInput(s.text); inputRef.current?.focus(); }}
                      className="flex items-center gap-3 text-left px-4 py-3 bg-white/[0.03] hover:bg-white/[0.07] border border-white/5 hover:border-white/10 rounded-xl transition-all group"
                    >
                      <div className={`${s.color} opacity-60 group-hover:opacity-100 transition-opacity`}>{s.icon}</div>
                      <span className="text-[13px] text-white/50 group-hover:text-white/70 transition-colors">{s.text}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map(msg => (
              <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[88%] sm:max-w-[80%]`}>
                  {/* Avatar + Bubble */}
                  <div className={`flex items-start gap-2.5 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                    {msg.role === "assistant" && (
                      <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center shrink-0 mt-0.5">
                        <Sparkles className="w-3.5 h-3.5 text-white" />
                      </div>
                    )}

                    <div>
                      <div className={`px-4 py-3 rounded-2xl ${
                        msg.role === "user"
                          ? "bg-violet-600 text-white rounded-tr-md"
                          : "bg-white/[0.06] text-white/85 rounded-tl-md border border-white/5"
                      }`}>
                        <div
                          className="text-[13px] leading-relaxed"
                          dangerouslySetInnerHTML={{ __html: formatMessage(msg.content) }}
                        />
                      </div>

                      {/* Action Card */}
                      {msg.action && msg.action.type !== "none" && (
                        <ActionCard action={msg.action} />
                      )}

                      {/* File Cards */}
                      {msg.fileRefs && msg.fileRefs.length > 0 && (
                        <div className="mt-2 space-y-1.5">
                          {msg.fileRefs.map(file => (
                            <FileCard key={file.id} file={file} />
                          ))}
                        </div>
                      )}

                      {/* Timestamp */}
                      <p className={`text-[10px] text-white/20 mt-1.5 ${msg.role === "user" ? "text-right" : ""}`}>
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* Typing */}
            {sending && (
              <div className="flex items-start gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center shrink-0">
                  <Sparkles className="w-3.5 h-3.5 text-white" />
                </div>
                <div className="px-4 py-3 bg-white/[0.06] rounded-2xl rounded-tl-md border border-white/5">
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <div className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <div className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input */}
        <div className="border-t border-white/5 p-3 bg-[#0a0a0a]/80 backdrop-blur-xl">
          <div className="flex items-end gap-2.5 max-w-3xl mx-auto">
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about your files..."
                rows={1}
                className="w-full px-4 py-3 bg-white/[0.04] border border-white/10 rounded-2xl text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-violet-500/40 focus:bg-white/[0.06] resize-none max-h-32 transition-all"
                style={{ minHeight: "48px" }}
              />
            </div>
            <button
              onClick={sendMessage}
              disabled={!input.trim() || sending}
              className="p-3 bg-violet-600 hover:bg-violet-500 disabled:opacity-20 disabled:hover:bg-violet-600 text-white rounded-2xl transition-all shrink-0 shadow-lg shadow-violet-500/20"
            >
              {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            </button>
          </div>
          <p className="text-[10px] text-white/15 text-center mt-2">
            Search · Create Collections · Share Files · Storage Insights
          </p>
        </div>
      </div>
    </div>
  );
}
