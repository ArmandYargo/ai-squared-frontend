import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  PanelLeft,
  Plus,
  Search,
  MessageSquare,
  Paperclip,
  Mic,
  MicOff,
  SendHorizontal,
  Trash2,
  Bot,
  User,
  Sparkles,
  ChevronDown,
  LogOut,
  Lock,
} from "lucide-react";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

const DEFAULT_ASSISTANT_MESSAGE =
  "Hi — I’m your AI Squared assistant. I can help with engineering workflows, RAM wizard steps, and document-based Q&A once your backend is connected.";

function timeNow() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function makeBrowserId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `browser_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

function getOrCreateBrowserId() {
  const key = "ai_squared_browser_id";
  let value = localStorage.getItem(key);
  if (!value) {
    value = makeBrowserId();
    localStorage.setItem(key, value);
  }
  return value;
}

function formatMessageFromApi(msg) {
  return {
    id: msg.id,
    role: msg.role,
    text: msg.content || "",
    speaker: msg.speaker || (msg.role === "assistant" ? "ASSISTANT" : "USER"),
    time: msg.created_at
      ? new Date(msg.created_at).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })
      : timeNow(),
  };
}

function buildDefaultMessages(text = DEFAULT_ASSISTANT_MESSAGE) {
  return [
    {
      role: "assistant",
      text,
      speaker: "ASSISTANT",
      time: timeNow(),
    },
  ];
}

function LoginScreen({ password, setPassword, loginError, isLoggingIn, onLogin }) {
  return (
    <div className="min-h-screen w-full bg-zinc-950 text-zinc-100 flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-3xl border border-zinc-800 bg-zinc-900 p-8 shadow-2xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-11 w-11 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
            <Lock className="h-5 w-5 text-emerald-300" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">AI Squared</h1>
            <p className="text-sm text-zinc-400">Private access only</p>
          </div>
        </div>

        <p className="text-sm text-zinc-300 mb-4">
          Enter the shared password to access the assistant.
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            onLogin();
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-sm text-zinc-300 mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 outline-none focus:border-zinc-500"
              placeholder="Enter password"
              autoFocus
            />
          </div>

          {loginError && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {loginError}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoggingIn || !password.trim()}
            className="w-full rounded-xl bg-zinc-100 text-zinc-900 px-4 py-3 text-sm font-medium hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoggingIn ? "Signing in..." : "Enter AI Squared"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function AISquaredChatUIStarter() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState(buildDefaultMessages());

  const [attachments, setAttachments] = useState([]);
  const [isListening, setIsListening] = useState(false);
  const [micSupported, setMicSupported] = useState(null);
  const [status, setStatus] = useState("Ready.");
  const [model, setModel] = useState("AI-Squared Agent");
  const [isSending, setIsSending] = useState(false);

  const [browserId, setBrowserId] = useState(null);
  const [conversationId, setConversationId] = useState(
    localStorage.getItem("ai_squared_conversation_id") ||
      localStorage.getItem("ai_squared_session_id") ||
      null
  );

  const [conversations, setConversations] = useState([]);
  const [isLoadingConversations, setIsLoadingConversations] = useState(false);
  const [isOpeningConversation, setIsOpeningConversation] = useState(false);
  const [chatSearch, setChatSearch] = useState("");

  const [authChecked, setAuthChecked] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const fileInputRef = useRef(null);
  const recognitionRef = useRef(null);

  const filteredConversations = useMemo(() => {
    const q = chatSearch.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter((c) => {
      const title = (c.title || "").toLowerCase();
      const preview = (c.last_message_preview || "").toLowerCase();
      return title.includes(q) || preview.includes(q);
    });
  }, [chatSearch, conversations]);

  const appendMessage = (msg) => {
    setMessages((prev) => [...prev, msg]);
  };

  const saveConversationId = (id) => {
    if (!id) return;
    setConversationId(id);
    localStorage.setItem("ai_squared_conversation_id", id);
    localStorage.setItem("ai_squared_session_id", id);
  };

  const clearConversationId = () => {
    setConversationId(null);
    localStorage.removeItem("ai_squared_conversation_id");
    localStorage.removeItem("ai_squared_session_id");
  };

  const loadConversations = async (resolvedBrowserId) => {
    if (!resolvedBrowserId) return;

    setIsLoadingConversations(true);
    try {
      const res = await fetch(
        `${API_BASE}/api/conversations?browser_id=${encodeURIComponent(resolvedBrowserId)}`,
        {
          method: "GET",
          credentials: "include",
        }
      );

      if (res.status === 401) {
        setIsAuthenticated(false);
        return;
      }

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Failed to load conversations.");
      }

      const data = await res.json();
      setConversations(Array.isArray(data.items) ? data.items : []);
    } catch (err) {
      setStatus(err.message || "Failed to load conversations.");
    } finally {
      setIsLoadingConversations(false);
    }
  };

  const openConversation = async (id, resolvedBrowserId = browserId) => {
    if (!id || !resolvedBrowserId) return;

    setIsOpeningConversation(true);
    setStatus("Opening saved chat...");

    try {
      const res = await fetch(
        `${API_BASE}/api/conversations/${encodeURIComponent(
          id
        )}?browser_id=${encodeURIComponent(resolvedBrowserId)}`,
        {
          method: "GET",
          credentials: "include",
        }
      );

      if (res.status === 401) {
        setIsAuthenticated(false);
        throw new Error("Session expired. Please sign in again.");
      }

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Failed to open conversation.");
      }

      const data = await res.json();
      const nextMessages =
        Array.isArray(data.messages) && data.messages.length > 0
          ? data.messages.map(formatMessageFromApi)
          : buildDefaultMessages("Reopened chat. Continue where you left off.");

      setMessages(nextMessages);
      saveConversationId(data.conversation_id || id);
      setStatus("Saved chat reopened.");
    } catch (err) {
      appendMessage({
        role: "assistant",
        text: `⚠️ ${err.message || "Failed to open conversation."}`,
        speaker: "ASSISTANT",
        time: timeNow(),
      });
      setStatus("Could not open saved chat.");
    } finally {
      setIsOpeningConversation(false);
    }
  };

  useEffect(() => {
    const storedBrowserId = getOrCreateBrowserId();
    setBrowserId(storedBrowserId);
  }, []);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/me`, {
          method: "GET",
          credentials: "include",
        });

        if (!res.ok) {
          setIsAuthenticated(false);
          setAuthChecked(true);
          return;
        }

        const data = await res.json();
        setIsAuthenticated(Boolean(data.authenticated));
      } catch {
        setIsAuthenticated(false);
      } finally {
        setAuthChecked(true);
      }
    };

    checkAuth();
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !browserId) return;

    loadConversations(browserId);
  }, [isAuthenticated, browserId]);

  useEffect(() => {
    if (!isAuthenticated || !browserId || !conversationId) return;
    openConversation(conversationId, browserId);
  }, [isAuthenticated, browserId]); // intentionally only when auth/browser become ready

  const handleLogin = async () => {
    if (!password.trim()) return;

    setIsLoggingIn(true);
    setLoginError("");

    try {
      const res = await fetch(`${API_BASE}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ password }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.detail || "Login failed.");
      }

      setIsAuthenticated(true);
      setPassword("");
      setStatus("Authenticated.");

      if (browserId) {
        await loadConversations(browserId);
        if (conversationId) {
          await openConversation(conversationId, browserId);
        }
      }
    } catch (err) {
      setLoginError(err.message || "Login failed.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch(`${API_BASE}/api/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch {
      // ignore
    }

    setIsAuthenticated(false);
    clearConversationId();
    setConversations([]);
    setMessages(buildDefaultMessages());
    setStatus("Signed out.");
  };

  const startNewChat = () => {
    clearConversationId();
    setMessages(buildDefaultMessages("New chat started. I’m ready when you are."));
    setInput("");
    setAttachments([]);
    setStatus("New conversation ready.");
  };

  const uploadAttachments = async (files) => {
    const uploaded = [];

    for (const file of files) {
      const form = new FormData();
      form.append("file", file);

      const res = await fetch(`${API_BASE}/api/upload`, {
        method: "POST",
        body: form,
        credentials: "include",
      });

      if (res.status === 401) {
        setIsAuthenticated(false);
        throw new Error("Session expired. Please sign in again.");
      }

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `Upload failed for ${file.name}`);
      }

      const data = await res.json();
      uploaded.push(data);
    }

    return uploaded;
  };

  const handleSend = async () => {
    if (isSending || isOpeningConversation) return;

    const trimmed = input.trim();
    if (!trimmed && attachments.length === 0) return;

    setIsSending(true);

    try {
      if (trimmed) {
        appendMessage({
          role: "user",
          text: trimmed,
          speaker: "USER",
          time: timeNow(),
        });
      } else if (attachments.length > 0) {
        appendMessage({
          role: "user",
          text:
            attachments.length === 1
              ? `📎 ${attachments[0].name}`
              : `📎 ${attachments.length} files attached`,
          speaker: "USER",
          time: timeNow(),
        });
      }

      let uploadedFiles = [];
      if (attachments.length > 0) {
        setStatus(`Uploading ${attachments.length} file(s)...`);
        uploadedFiles = await uploadAttachments(attachments);

        appendMessage({
          role: "assistant",
          text:
            uploadedFiles.length === 1
              ? `Uploaded: ${uploadedFiles[0].filename}`
              : `Uploaded ${uploadedFiles.length} files successfully.`,
          speaker: "ASSISTANT",
          time: timeNow(),
        });
      }

      let messageForBackend = trimmed;
      if (!messageForBackend && uploadedFiles.length > 0) {
        messageForBackend = uploadedFiles[0].server_path;
      }

      if (!messageForBackend) {
        setAttachments([]);
        setInput("");
        setStatus("Files uploaded. Add a message or continue the wizard.");
        return;
      }

      setStatus("Sending to backend...");

      const res = await fetch(`${API_BASE}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          message: messageForBackend,
          conversation_id: conversationId,
          browser_id: browserId,
        }),
      });

      if (res.status === 401) {
        setIsAuthenticated(false);
        throw new Error("Session expired. Please sign in again.");
      }

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Backend error");
      }

      const data = await res.json();

      if (data.conversation_id) {
        saveConversationId(data.conversation_id);
      }

      appendMessage({
        role: "assistant",
        text: data.reply || "(No response)",
        speaker: data.speaker || "ASSISTANT",
        time: timeNow(),
      });

      setStatus(
        data.conversation_id
          ? `Connected • chat ${String(data.conversation_id).slice(0, 8)}...`
          : "Connected"
      );

      setInput("");
      setAttachments([]);
      await loadConversations(browserId);
    } catch (err) {
      appendMessage({
        role: "assistant",
        text: `⚠️ ${err.message || "Something went wrong."}`,
        speaker: "ASSISTANT",
        time: timeNow(),
      });
      setStatus("Error talking to backend.");
    } finally {
      setIsSending(false);
    }
  };

  const onFilesPicked = (files) => {
    const picked = Array.from(files || []);
    if (!picked.length) return;
    setAttachments((prev) => [...prev, ...picked]);
    setStatus(`${picked.length} file(s) added.`);
  };

  const toggleMic = () => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setMicSupported(false);
      setStatus("Microphone speech recognition is not supported in this browser.");
      return;
    }

    setMicSupported(true);

    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = true;
    recognition.continuous = false;

    recognition.onstart = () => {
      setIsListening(true);
      setStatus("Listening… speak now.");
    };

    recognition.onresult = (event) => {
      let transcript = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        transcript += event.results[i][0].transcript;
      }
      setInput((prev) => (prev ? `${prev} ${transcript}` : transcript));
    };

    recognition.onerror = (e) => {
      setStatus(`Mic error: ${e.error || "unknown"}`);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
      setStatus("Mic stopped.");
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const removeAttachment = (index) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const onDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer?.files?.length) onFilesPicked(e.dataTransfer.files);
  };

  const onDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  if (!authChecked) {
    return (
      <div className="min-h-screen w-full bg-zinc-950 text-zinc-100 flex items-center justify-center">
        <div className="text-sm text-zinc-400">Checking access…</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <LoginScreen
        password={password}
        setPassword={setPassword}
        loginError={loginError}
        isLoggingIn={isLoggingIn}
        onLogin={handleLogin}
      />
    );
  }

  return (
    <div className="h-screen w-full bg-zinc-950 text-zinc-100 flex">
      <aside
        className={`${
          sidebarOpen ? "w-72" : "w-0"
        } transition-all duration-200 border-r border-zinc-800 overflow-hidden bg-zinc-900/70 hidden md:flex md:flex-col`}
      >
        <div className="p-3 border-b border-zinc-800">
          <button
            className="w-full flex items-center gap-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 px-3 py-2 text-sm"
            onClick={startNewChat}
          >
            <Plus className="h-4 w-4" />
            New chat
          </button>
        </div>

        <div className="p-3">
          <div className="flex items-center gap-2 rounded-xl bg-zinc-800/60 px-3 py-2">
            <Search className="h-4 w-4 text-zinc-400" />
            <input
              value={chatSearch}
              onChange={(e) => setChatSearch(e.target.value)}
              placeholder="Search chats"
              className="w-full bg-transparent text-sm text-zinc-200 outline-none placeholder:text-zinc-500"
            />
          </div>
        </div>

        <div className="px-2 pb-3 space-y-1 overflow-y-auto">
          {isLoadingConversations && (
            <div className="px-3 py-2 text-xs text-zinc-500">Loading chats...</div>
          )}

          {!isLoadingConversations && filteredConversations.length === 0 && (
            <div className="px-3 py-2 text-xs text-zinc-500">No saved chats yet.</div>
          )}

          {filteredConversations.map((chat) => {
            const active = conversationId === chat.id;
            return (
              <button
                key={chat.id}
                className={`w-full rounded-lg px-3 py-2 text-left hover:bg-zinc-800 ${
                  active ? "bg-zinc-800" : ""
                }`}
                onClick={() => openConversation(chat.id)}
                type="button"
              >
                <div className="flex items-start gap-2">
                  <MessageSquare className="h-4 w-4 text-zinc-400 mt-0.5 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm text-zinc-100">
                      {chat.title || "Untitled chat"}
                    </div>
                    {chat.last_message_preview && (
                      <div className="truncate text-xs text-zinc-500 mt-0.5">
                        {chat.last_message_preview}
                      </div>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-auto p-3 border-t border-zinc-800 text-xs text-zinc-400 flex items-center justify-between gap-3">
          <span className="truncate">
            AI Squared • {conversationId ? `Chat ${conversationId.slice(0, 8)}...` : "Signed in"}
          </span>
          <button
            onClick={handleLogout}
            className="rounded-lg p-2 hover:bg-zinc-800"
            title="Sign out"
            type="button"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b border-zinc-800 px-3 md:px-4 flex items-center justify-between bg-zinc-950/80 backdrop-blur">
          <div className="flex items-center gap-2">
            <button
              className="rounded-lg p-2 hover:bg-zinc-800"
              onClick={() => setSidebarOpen((s) => !s)}
              title="Toggle sidebar"
              type="button"
            >
              <PanelLeft className="h-4 w-4" />
            </button>

            <div className="hidden sm:flex items-center gap-2 rounded-xl bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-sm">
              <Sparkles className="h-4 w-4 text-zinc-300" />
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="bg-transparent outline-none"
              >
                <option>AI-Squared Agent</option>
                <option>Engineering Copilot</option>
                <option>Document Analyst</option>
              </select>
              <ChevronDown className="h-4 w-4 text-zinc-400" />
            </div>
          </div>

          <div className="text-xs text-zinc-400 truncate max-w-[60%] text-right">
            {status}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-3 md:px-6 py-4 md:py-6">
          <div className="max-w-3xl mx-auto space-y-5">
            {messages.map((m, i) => (
              <div
                key={m.id || i}
                className={`flex gap-3 ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {m.role !== "user" && (
                  <div className="h-8 w-8 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0 mt-1">
                    <Bot className="h-4 w-4" />
                  </div>
                )}

                <div
                  className={`max-w-[88%] rounded-2xl px-4 py-3 border ${
                    m.role === "user"
                      ? "bg-zinc-100 text-zinc-900 border-zinc-200"
                      : "bg-zinc-900 border-zinc-800"
                  }`}
                >
                  <p className="text-sm leading-6 whitespace-pre-wrap">{m.text}</p>
                  <div
                    className={`mt-2 text-[11px] ${
                      m.role === "user" ? "text-zinc-600" : "text-zinc-500"
                    }`}
                  >
                    {m.time}
                  </div>
                </div>

                {m.role === "user" && (
                  <div className="h-8 w-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0 mt-1">
                    <User className="h-4 w-4" />
                  </div>
                )}
              </div>
            ))}

            {(isSending || isOpeningConversation) && (
              <div className="flex gap-3 justify-start">
                <div className="h-8 w-8 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0 mt-1">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="max-w-[88%] rounded-2xl px-4 py-3 border bg-zinc-900 border-zinc-800">
                  <p className="text-sm leading-6 text-zinc-400">
                    {isOpeningConversation ? "Loading saved chat..." : "Working…"}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-zinc-800 px-3 md:px-6 py-3 bg-zinc-950">
          <div className="max-w-3xl mx-auto">
            <div
              onDrop={onDrop}
              onDragOver={onDragOver}
              className="rounded-2xl border border-zinc-700 bg-zinc-900 p-2 shadow-2xl"
            >
              {attachments.length > 0 && (
                <div className="flex flex-wrap gap-2 p-2">
                  {attachments.map((file, idx) => (
                    <div
                      key={`${file.name}-${idx}`}
                      className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs"
                    >
                      <Paperclip className="h-3 w-3" />
                      <span className="max-w-40 truncate">{file.name}</span>
                      <button
                        className="text-zinc-400 hover:text-zinc-100"
                        onClick={() => removeAttachment(idx)}
                        title="Remove file"
                        type="button"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                rows={1}
                placeholder="Message AI Squared… (Shift+Enter for new line)"
                className="w-full resize-none bg-transparent px-3 py-2 text-sm outline-none placeholder:text-zinc-500 min-h-[44px] max-h-40"
              />

              <div className="flex items-center justify-between gap-2 px-1 pt-1">
                <div className="flex items-center gap-1">
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    multiple
                    onChange={(e) => onFilesPicked(e.target.files)}
                  />

                  <button
                    className="rounded-lg p-2 hover:bg-zinc-800 disabled:opacity-50"
                    title="Attach files"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isSending || isOpeningConversation}
                    type="button"
                  >
                    <Paperclip className="h-4 w-4" />
                  </button>

                  <button
                    className={`rounded-lg p-2 hover:bg-zinc-800 ${
                      isListening ? "bg-zinc-800" : ""
                    } disabled:opacity-50`}
                    title="Use microphone"
                    onClick={toggleMic}
                    disabled={isSending || isOpeningConversation}
                    type="button"
                  >
                    {isListening ? (
                      <MicOff className="h-4 w-4" />
                    ) : (
                      <Mic className="h-4 w-4" />
                    )}
                  </button>
                </div>

                <button
                  className="rounded-xl bg-zinc-100 text-zinc-900 px-3 py-2 text-sm font-medium hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  onClick={handleSend}
                  disabled={
                    isSending ||
                    isOpeningConversation ||
                    (!input.trim() && attachments.length === 0)
                  }
                  type="button"
                >
                  <SendHorizontal className="h-4 w-4" />
                  {isSending ? "Sending..." : "Send"}
                </button>
              </div>
            </div>

            <p className="text-xs text-zinc-500 mt-2 px-1">
              Protected mode: authenticated requests are sent to <code>{API_BASE}</code>.
              {micSupported === false ? " (Mic recognition not supported in this browser.)" : ""}
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}