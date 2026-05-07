"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Send, Sparkles, Loader2, MessageCircle, Trash2, Plus, ChevronLeft, Download, Eye, Folder, Image, Film, Music, FileText, File as FileIcon, X } from "lucide-react";

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

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  fileRefs?: FileRef[];
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

function getTypeIcon(mime: string | null, size = "w-4 h-4") {
  if (!mime) return <FileIcon className={`${size} text-gray-500`} />;
  if (mime.startsWith("image/")) return <Image className={`${size} text-green-400`} />;
  if (mime.startsWith("video/")) return <Film className={`${size} text-blue-400`} />;
  if (mime.startsWith("audio/")) return <Music className={`${size} text-pink-400`} />;
  if (mime.includes("pdf")) return <FileText className={`${size} text-red-400`} />;
  return <FileIcon className={`${size} text-gray-400`} />;
}

function FileCard({ file }: { file: FileRef }) {
  const [preview, setPreview] = useState(false);

  return (
    <>
      <div className="flex items-center gap-3 p-2.5 bg-gray-800/50 hover:bg-gray-800 rounded-xl transition-colors cursor-pointer group"
        onClick={() => setPreview(true)}
      >
        {file.thumbnailUrl ? (
          <img src={file.thumbnailUrl} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0" />
        ) : (
          <div className="w-12 h-12 rounded-lg bg-gray-700 flex items-center justify-center shrink-0">
            {getTypeIcon(file.mimeType, "w-5 h-5")}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{file.name}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[10px] text-gray-500">{formatBytes(Number(file.fileSize))}</span>
            <span className="text-[10px] text-gray-600">
              <Folder className="w-2.5 h-2.5 inline text-amber-400" /> {file.folderName}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={(e) => { e.stopPropagation(); setPreview(true); }}
            className="p-1.5 hover:bg-gray-700 rounded-lg" title="Preview">
            <Eye className="w-3.5 h-3.5 text-gray-400" />
          </button>
          {file.url && (
            <a href={file.url} download={file.name} onClick={e => e.stopPropagation()}
              className="p-1.5 hover:bg-gray-700 rounded-lg" title="Download">
              <Download className="w-3.5 h-3.5 text-gray-400" />
            </a>
          )}
        </div>
      </div>

      {/* Preview Modal */}
      {preview && (
        <div className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center p-4" onClick={() => setPreview(false)}>
          <button className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full z-10">
            <X className="w-6 h-6 text-white" />
          </button>
          <div className="max-w-4xl max-h-[90vh] w-full flex flex-col items-center" onClick={e => e.stopPropagation()}>
            {file.mimeType?.startsWith("image/") && file.url && (
              <img src={file.url} alt={file.name} className="max-w-full max-h-[80vh] object-contain rounded-xl" />
            )}
            {file.mimeType?.startsWith("video/") && file.url && (
              <video src={file.url} controls className="max-w-full max-h-[80vh] rounded-xl" autoPlay />
            )}
            {file.mimeType?.startsWith("audio/") && file.url && (
              <div className="bg-gray-900 rounded-xl p-8 w-full max-w-md">
                <audio src={file.url} controls className="w-full" />
              </div>
            )}
            <p className="text-sm font-medium text-white mt-4">{file.name}</p>
            <p className="text-xs text-gray-400">{formatBytes(Number(file.fileSize))}</p>
          </div>
        </div>
      )}
    </>
  );
}

export default function ChatPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConvoId, setCurrentConvoId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingConvos, setLoadingConvos] = useState(true);
  const [showSidebar, setShowSidebar] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

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

  const startNew = () => {
    setCurrentConvoId(null);
    setMessages([]);
    inputRef.current?.focus();
  };

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

    // Optimistic: add user message immediately
    const tempId = `temp-${Date.now()}`;
    setMessages(prev => [...prev, { id: tempId, role: "user", content: userMessage, createdAt: new Date().toISOString() }]);

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
          fetchConversations(); // Refresh sidebar
        }
        setMessages(prev => [...prev, {
          id: `ai-${Date.now()}`,
          role: "assistant",
          content: data.reply,
          fileRefs: data.files,
          createdAt: new Date().toISOString(),
        }]);
      } else {
        setMessages(prev => [...prev, {
          id: `err-${Date.now()}`,
          role: "assistant",
          content: "Sorry, something went wrong. Please try again.",
          createdAt: new Date().toISOString(),
        }]);
      }
    } catch {
      setMessages(prev => [...prev, {
        id: `err-${Date.now()}`,
        role: "assistant",
        content: "Connection error. Please try again.",
        createdAt: new Date().toISOString(),
      }]);
    }

    setSending(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="h-[calc(100vh-64px)] flex overflow-hidden">
      {/* Sidebar — Conversation History */}
      <div className={`${showSidebar ? "w-72" : "w-0"} bg-[#0a0a0a] border-r border-gray-800 flex-col transition-all hidden md:flex`}>
        <div className="p-3 border-b border-gray-800">
          <button
            onClick={startNew}
            className="w-full px-3 py-2.5 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-xl flex items-center justify-center gap-2 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Chat
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {loadingConvos ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-gray-600" />
            </div>
          ) : conversations.length === 0 ? (
            <p className="text-xs text-gray-600 text-center py-8">No conversations yet</p>
          ) : (
            conversations.map(c => (
              <div
                key={c.id}
                className={`group flex items-center gap-2 p-2.5 rounded-xl cursor-pointer transition-colors ${
                  currentConvoId === c.id
                    ? "bg-violet-600/20 border border-violet-500/30"
                    : "hover:bg-gray-800/50"
                }`}
                onClick={() => loadConversation(c.id)}
              >
                <MessageCircle className="w-4 h-4 text-gray-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{c.title || "New Chat"}</p>
                  <p className="text-[10px] text-gray-600">{c.messageCount} messages</p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteConversation(c.id); }}
                  className="p-1 opacity-0 group-hover:opacity-100 hover:text-red-400 transition-all"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-800 flex items-center gap-3">
          <button onClick={() => setShowSidebar(prev => !prev)} className="md:hidden p-1.5 hover:bg-gray-800 rounded-lg">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <Sparkles className="w-5 h-5 text-violet-400" />
          <div>
            <h1 className="text-sm font-bold">AI Chat</h1>
            <p className="text-[10px] text-gray-500">Ask anything about your files</p>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <Sparkles className="w-12 h-12 text-violet-400/30 mb-4" />
              <h2 className="text-lg font-bold mb-2">Chat with your files</h2>
              <p className="text-sm text-gray-500 max-w-md mb-6">
                Ask questions about your files, search by description, or get insights about your storage.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-lg w-full">
                {[
                  "Tìm ảnh chụp gần đây nhất",
                  "Có bao nhiêu file PDF?",
                  "File nào chiếm nhiều dung lượng nhất?",
                  "Tìm video tôi upload tuần này",
                ].map((suggestion, i) => (
                  <button
                    key={i}
                    onClick={() => { setInput(suggestion); inputRef.current?.focus(); }}
                    className="text-left px-3 py-2.5 bg-gray-800/50 hover:bg-gray-800 border border-gray-700/50 rounded-xl text-xs text-gray-400 transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map(msg => (
            <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] ${msg.role === "user" ? "order-1" : ""}`}>
                {/* Message bubble */}
                <div className={`px-4 py-3 rounded-2xl ${
                  msg.role === "user"
                    ? "bg-violet-600 text-white rounded-br-md"
                    : "bg-gray-800/70 text-gray-200 rounded-bl-md border border-gray-700/50"
                }`}>
                  <div className="text-sm whitespace-pre-wrap leading-relaxed"
                    dangerouslySetInnerHTML={{
                      __html: msg.content
                        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                        .replace(/\*(.*?)\*/g, '<em>$1</em>')
                        .replace(/`(.*?)`/g, '<code class="px-1 py-0.5 bg-black/30 rounded text-xs">$1</code>')
                        .replace(/\n/g, '<br/>')
                    }}
                  />
                </div>

                {/* File references */}
                {msg.fileRefs && msg.fileRefs.length > 0 && (
                  <div className="mt-2 space-y-1.5">
                    {msg.fileRefs.map(file => (
                      <FileCard key={file.id} file={file} />
                    ))}
                  </div>
                )}

                {/* Timestamp */}
                <p className={`text-[10px] text-gray-600 mt-1 ${msg.role === "user" ? "text-right" : ""}`}>
                  {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {sending && (
            <div className="flex justify-start">
              <div className="px-4 py-3 bg-gray-800/70 rounded-2xl rounded-bl-md border border-gray-700/50">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <div className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <div className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="border-t border-gray-800 p-3">
          <div className="flex items-end gap-2 max-w-3xl mx-auto">
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about your files..."
                rows={1}
                className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700/50 rounded-2xl text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-violet-500/50 resize-none max-h-32"
                style={{ minHeight: "48px" }}
              />
            </div>
            <button
              onClick={sendMessage}
              disabled={!input.trim() || sending}
              className="p-3 bg-violet-600 hover:bg-violet-500 disabled:opacity-30 disabled:hover:bg-violet-600 text-white rounded-2xl transition-colors shrink-0"
            >
              {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            </button>
          </div>
          <p className="text-[10px] text-gray-600 text-center mt-2">AI can search your files and provide insights. Press Enter to send.</p>
        </div>
      </div>
    </div>
  );
}
