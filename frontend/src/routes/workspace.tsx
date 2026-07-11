import { createFileRoute, Link } from "@tanstack/react-router";
import { motion, AnimatePresence } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Plus, Upload, MessageSquare, FileText, History, Settings, HelpCircle,
  PanelLeftClose, PanelLeft, Send, Paperclip, Mic, Copy, RefreshCw,
  ThumbsUp, ThumbsDown, Sparkles, CheckCircle2, User, FileUp, X,
} from "lucide-react";
import { AnimatedBackground } from "@/components/lexora/Background";
import { LexoraLogo } from "@/components/lexora/Logo";
const API_URL = "https://lexora-ai-legal-production.up.railway.app";
export const Route = createFileRoute("/workspace")({
  head: () => ({
    meta: [
      { title: "Workspace — Lexora AI" },
      { name: "description", content: "Chat with your legal documents using Lexora AI." },
    ],
  }),
  component: Workspace,
});

type Msg = {
  id: string;
  role: "user" | "assistant";
  content: string;
  time: string;
  meta?: { context: number; confidence: number; timeMs: number; doc: string };
  loading?: boolean;
};

const suggestedPrompts = [
  "Who is the petitioner?",
  "Summarize this judgment",
  "What are the bail conditions?",
  "What sections of law are mentioned?",
  "Generate case summary",
];

function greet() {
  const h = new Date().getHours();
  if (h < 12) return "Good Morning";
  if (h < 18) return "Good Afternoon";
  return "Good Evening";
}

function Workspace() {
  const [collapsed, setCollapsed] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [chatId, setChatId] = useState("");
const [recentChats, setRecentChats] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [docs, setDocs] = useState<
  {
    name: string;
    size: number;
    status: "uploading" | "ready";
    progress: number;
  }[]
>([]);
  const [dragOver, setDragOver] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const startUpload = useCallback(async (file: File) => {

  setShowUpload(false);

  setDocs((prev) => [
    ...prev,
    {
      name: file.name,
      size: file.size,
      status: "uploading",
      progress: 20,
    }
  ]);

  const formData = new FormData();
  formData.append("file", file);

  try {

    const response = await fetch(`${API_URL}/upload`, {
      method: "POST",
      body: formData,
    });

    const data = await response.json();

    console.log(data);

    setDocs((prev) =>
  prev.map((d) =>
    d.name === file.name
      ? {
          ...d,
          status: "ready",
          progress: 100,
        }
      : d
  )
);

  } catch (err) {

    console.error(err);

    alert("Upload failed");

  }

}, []);

  const send = useCallback(async (text: string) => {
  const q = text.trim();
  if (!q) return;

  // Create a chat only if one doesn't exist yet
  let currentChatId = chatId;

if (!currentChatId) {
  currentChatId = await createNewChat();
}

  const now = new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  const userMsg = {
    id: Date.now().toString(),
    role: "user",
    content: q,
    time: now,
  };

  const loadingMsg = {
    id: (Date.now() + 1).toString(),
    role: "assistant",
    content: "",
    time: now,
    loading: true,
  };

  setMessages((m) => [...m, userMsg, loadingMsg]);
  setInput("");
  console.log("Before asking, docs =", docs);

  try {
    const response = await fetch(`${API_URL}/ask`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        question: q,
        uploaded_files: docs.map(doc => doc.name),
        chat_id: currentChatId
      }),
    });

    const data = await response.json();

    setMessages((m) =>
      m.map((msg) =>
        msg.id === loadingMsg.id
          ? {
              ...msg,
              loading: false,
              content: data.answer,
            }
          : msg
      )
    );
    loadChats();
  } catch (err) {
    console.error(err);

    setMessages((m) =>
      m.map((msg) =>
        msg.id === loadingMsg.id
          ? {
              ...msg,
              loading: false,
              content: "Error connecting to backend.",
            }
          : msg
      )
    );
  }
}, [docs, chatId]);
useEffect(() => {
  loadChats();
}, []);

const loadChats = async () => {
  const res = await fetch(`${API_URL}/chats`);
  const data = await res.json();
  setRecentChats(data);
};

const createNewChat = async () => {
  const res = await fetch(`${API_URL}/new-chat`, {
    method: "POST",
  });

  const data = await res.json();

  setChatId(data.chat_id);
  setMessages([]);

  loadChats();
  return data.chat_id;
};

const loadChat = async (id: string) => {
  const res = await fetch(`${API_URL}/chat/${id}`);
  const data = await res.json();

  console.log(data);

  setChatId(id);

  const loadedMessages = data.messages.map((msg: any, index: number) => ({
    id: index.toString(),
    role: msg.role,
    content: msg.content,
    time: "",
  }));

  setMessages(loadedMessages);

  if (data.uploaded_files) {
    setDocs(
      data.uploaded_files.map((file: string) => ({
        name: file,
        size: 0,
        status: "ready",
        progress: 100,
      }))
    );
  }
};

  return (
    <div className="relative flex h-screen w-full overflow-hidden text-foreground">
      <AnimatedBackground />

      {/* Sidebar */}
      <motion.aside
        animate={{ width: collapsed ? 76 : 280 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-20 flex h-full shrink-0 flex-col glass-strong border-r border-white/5"
      >
        <div className="flex items-center justify-between p-4">
          {!collapsed && <LexoraLogo />}
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="grid h-9 w-9 place-items-center rounded-xl text-muted-foreground transition hover:bg-white/10 hover:text-foreground"
          >
            {collapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </button>
        </div>

        <div className="px-3">
          <button
            onClick={createNewChat}
            className="flex w-full items-center gap-3 rounded-xl bg-primary/15 px-3 py-2.5 text-sm font-medium text-foreground transition hover:bg-primary/25"
          >
            <Plus className="h-4 w-4 text-primary" />
            {!collapsed && "New Chat"}
          </button>
          <button
            onClick={() => setShowUpload(true)}
            className="mt-2 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-muted-foreground transition hover:bg-white/5 hover:text-foreground"
          >
            <Upload className="h-4 w-4" />
            {!collapsed && "Upload Document"}
          </button>
        </div>

        <div className="mt-6 flex-1 overflow-y-auto px-3">
          {!collapsed && (
            <div className="px-2 text-xs font-medium uppercase tracking-wider text-muted-foreground/70">Recent Chats</div>
          )}
          <div className="mt-2 space-y-1">
            {recentChats.map((chat) => (
  <button
  key={chat.chat_id}
  onClick={() => loadChat(chat.chat_id)}
  className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm text-muted-foreground transition hover:bg-white/5 hover:text-foreground"
>
    <MessageSquare className="h-4 w-4 shrink-0" />

    {!collapsed && (
      <span className="truncate">
        {chat.title}
      </span>
    )}
  </button>
))}
          </div>
        </div>

        {/* Pinned bottom items */}
        <div className="border-t border-white/5 p-3">
          <div className="space-y-1">
            {[
  { icon: Settings, label: "Settings" },
  { icon: HelpCircle, label: "Help & Support" },
].map(({ icon: Icon, label }) => (
  <button
    key={label}
    className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-muted-foreground transition hover:bg-white/5 hover:text-foreground"
  >
    <Icon className="h-4 w-4 shrink-0" />
    {!collapsed && <span>{label}</span>}
  </button>
))}
              
            
          </div>
          <div className="mt-3 flex items-center gap-3 rounded-xl glass p-2.5">
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-primary to-accent text-xs font-semibold text-primary-foreground">
              RE
            </div>
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">Ragavi Elangovan</div>
                <div className="truncate text-xs text-muted-foreground">Legal Researcher</div>
              </div>
            )}
          </div>
        </div>
      </motion.aside>

      {/* Main */}
      <div className="relative z-10 flex h-full min-w-0 flex-1 flex-col">
        {/* Top nav */}
        <header className="flex items-center justify-between border-b border-white/5 px-6 py-3 glass-strong">
          <Link to="/" className="text-sm text-muted-foreground transition hover:text-foreground">← Home</Link>
          <div className="flex items-center gap-3 rounded-full glass px-4 py-1.5 text-xs">
            <FileText className="h-3.5 w-3.5 text-primary" />
            <span className="text-muted-foreground">Active Document:</span>
            <span className="max-w-[300px] truncate font-medium">
  {docs.length > 0
    ? `${docs.length} Documents Uploaded`
    : "No document uploaded"}
</span>
          </div>
          <div className="flex items-center gap-2">
            <button className="grid h-9 w-9 place-items-center rounded-xl text-muted-foreground transition hover:bg-white/5 hover:text-foreground">
              <Settings className="h-4 w-4" />
            </button>
            <div className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-primary to-accent text-xs font-semibold text-primary-foreground">
              AS
            </div>
          </div>
        </header>

        {/* Chat scroll */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-3xl px-6 py-10">
            {messages.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="pt-10"
              >
                <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl text-gradient">
                  {greet()} 👋
                </h1>
                <p className="mt-3 text-lg text-muted-foreground">
                  What legal document would you like to analyze today?
                </p>

                {docs.length === 0 && (
                  <button
                    onClick={() => setShowUpload(true)}
                    className="mt-8 group flex w-full items-center gap-4 rounded-2xl glass p-5 text-left transition hover:border-primary/30"
                  >
                    <div className="grid h-12 w-12 place-items-center rounded-xl bg-primary/15 glow-blue">
                      <FileUp className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">Upload a legal PDF to get started</div>
                      <div className="text-sm text-muted-foreground">Drag & drop or click to browse</div>
                    </div>
                  </button>
                )}

                <div className="mt-10">
                  <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Suggested Prompts</div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {suggestedPrompts.map((p) => (
                      <button
                        key={p}
                        onClick={() => send(p)}
                        className="rounded-full glass px-4 py-2 text-sm text-muted-foreground transition hover:border-primary/40 hover:text-foreground hover:bg-white/5"
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            ) : (
              <div className="space-y-6">
                <AnimatePresence initial={false}>
                  {messages.map((m) => (
                    <motion.div
                      key={m.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                      className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}
                    >
                      <div
                        className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-xs font-semibold ${
                          m.role === "user"
                            ? "bg-white/10 text-foreground"
                            : "bg-gradient-to-br from-primary to-accent text-primary-foreground glow-blue"
                        }`}
                      >
                        {m.role === "user" ? <User className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
                      </div>
                      <div className={`max-w-[80%] ${m.role === "user" ? "items-end" : ""} flex flex-col`}>
                        {m.role === "user" ? (
                          <div className="rounded-2xl bg-primary px-4 py-3 text-sm text-primary-foreground">
                            {m.content}
                          </div>
                        ) : (
                          <div className="rounded-2xl glass p-4">
                            {m.loading ? (
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <span className="flex gap-1">
                                  {[0, 1, 2].map((i) => (
                                    <motion.span
                                      key={i}
                                      animate={{ opacity: [0.3, 1, 0.3] }}
                                      transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
                                      className="h-1.5 w-1.5 rounded-full bg-primary"
                                    />
                                  ))}
                                </span>
                                Thinking…
                              </div>
                            ) : (
                              <>
                                <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/95">
                                  {m.content}
                                </div>
                                {m.meta && (
                                  <div className="mt-4 flex flex-wrap gap-2 border-t border-white/5 pt-3 text-[10px] text-muted-foreground">
                                    <span className="rounded-full bg-white/5 px-2 py-0.5">📚 Context: {m.meta.context} chunks</span>
                                    <span className="rounded-full bg-white/5 px-2 py-0.5">✓ Confidence {m.meta.confidence}%</span>
                                    <span className="rounded-full bg-white/5 px-2 py-0.5">⚡ {(m.meta.timeMs / 1000).toFixed(2)}s</span>
                                    <span className="rounded-full bg-white/5 px-2 py-0.5 max-w-[180px] truncate">📄 {m.meta.doc}</span>
                                  </div>
                                )}
                                <div className="mt-3 flex items-center gap-1 text-muted-foreground">
                                  {[
                                    { icon: Copy, label: "Copy" },
                                    { icon: RefreshCw, label: "Regenerate" },
                                    { icon: ThumbsUp, label: "Like" },
                                    { icon: ThumbsDown, label: "Dislike" },
                                  ].map(({ icon: Icon, label }) => (
                                    <button
                                      key={label}
                                      title={label}
                                      onClick={() => label === "Copy" && navigator.clipboard.writeText(m.content)}
                                      className="grid h-7 w-7 place-items-center rounded-lg transition hover:bg-white/10 hover:text-foreground"
                                    >
                                      <Icon className="h-3.5 w-3.5" />
                                    </button>
                                  ))}
                                </div>
                              </>
                            )}
                          </div>
                        )}
                        <div className={`mt-1 text-[10px] text-muted-foreground ${m.role === "user" ? "text-right" : ""}`}>
                          {m.time}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>

        {/* Document status pill */}
        {docs.length > 0 && (
          <div className="px-6">
            <div className="mx-auto flex max-w-3xl items-center gap-3 rounded-2xl glass p-3">
              <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/15">
                <FileText className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-sm">
                  <span className="truncate font-medium">{docs[docs.length - 1].name}</span>
                  {docs[docs.length - 1].status === "ready" && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-green-500/15 px-2 py-0.5 text-[10px] text-green-400">
                      <CheckCircle2 className="h-3 w-3" /> Ready
                    </span>
                  )}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {(docs[docs.length - 1].size / 1024).toFixed(1)} KB · {docs[docs.length - 1].status === "uploading" ? `Uploading ${docs[docs.length - 1].progress}%` : "Indexed"}
                </div>
                {docs[docs.length - 1].status === "uploading" && (
                  <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/10">
                    <motion.div
                      className="h-full bg-primary glow-blue"
                      animate={{ width: `${docs[docs.length - 1].progress}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                )}
              </div>
              <button onClick={() => setDocs([])} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Input */}
        <div className="px-6 pb-6 pt-3">
          <form
            onSubmit={(e) => { e.preventDefault(); send(input); }}
            className="mx-auto flex max-w-3xl items-end gap-2 rounded-3xl glass-strong p-2 transition focus-within:border-primary/40"
            style={{ boxShadow: "0 0 0 1px var(--border)" }}
          >
            <button type="button" className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl text-muted-foreground transition hover:bg-white/10 hover:text-foreground" onClick={() => setShowUpload(true)}>
              <Paperclip className="h-4 w-4" />
            </button>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); }
              }}
              rows={1}
              placeholder="Ask anything about the uploaded legal document..."
              className="flex-1 resize-none bg-transparent px-2 py-2.5 text-sm placeholder:text-muted-foreground/70 focus:outline-none"
              style={{ maxHeight: 160 }}
            />
            <button type="button" className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl text-muted-foreground transition hover:bg-white/10 hover:text-foreground">
              <Mic className="h-4 w-4" />
            </button>
            <button
              type="submit"
              disabled={!input.trim()}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground glow-blue transition hover:scale-105 disabled:opacity-40 disabled:hover:scale-100"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
          <div className="mt-2 text-center text-[10px] text-muted-foreground">
            Lexora AI can make mistakes. Verify critical legal information.
          </div>
        </div>
      </div>

      {/* Upload modal */}
      <AnimatePresence>
        {showUpload && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 grid place-items-center bg-background/70 backdrop-blur-md p-6"
            onClick={() => setShowUpload(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg rounded-3xl glass-strong p-6 glow-blue"
            >
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-display text-lg font-semibold">Upload Legal Document</h3>
                <button onClick={() => setShowUpload(false)} className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-white/10">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
  e.preventDefault();
  setDragOver(false);

  const files = Array.from(e.dataTransfer.files);

  files.forEach((file) => startUpload(file));
}}
                onClick={() => fileRef.current?.click()}
                className={`group cursor-pointer rounded-2xl border-2 border-dashed p-10 text-center transition ${
                  dragOver ? "border-primary bg-primary/10" : "border-white/15 hover:border-primary/50 hover:bg-white/[0.02]"
                }`}
              >
                <motion.div
                  animate={{ y: [0, -6, 0] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                  className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-primary/15 glow-blue"
                >
                  <FileUp className="h-7 w-7 text-primary" />
                </motion.div>
                <div className="font-medium">Drop your PDF here, or click to browse</div>
                <div className="mt-1 text-xs text-muted-foreground">PDF · DOCX · TXT · up to 50MB</div>
                <input
                  ref={fileRef}
                  type="file"
                  multiple
                  accept=".pdf,.docx,.txt"
                  className="hidden"
                  onChange={(e) => {
  const files = Array.from(e.target.files || []);

  files.forEach((file) => startUpload(file));
}}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
