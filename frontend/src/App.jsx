import React, { useMemo, useRef, useState } from "react";
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
} from "lucide-react";

export default function AISquaredChatUIStarter() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      text: "Hi — I’m your AI Squared assistant. I can help with engineering workflows, calculations, and document-based Q&A once your backend is connected.",
      time: "09:41",
    },
  ]);
  const [attachments, setAttachments] = useState([]);
  const [isListening, setIsListening] = useState(false);
  const [micSupported, setMicSupported] = useState(null);
  const [status, setStatus] = useState("UI mode only — backend not connected yet.");
  const [model, setModel] = useState("AI-Squared Agent");
  const fileInputRef = useRef(null);
  const recognitionRef = useRef(null);

  const recentChats = useMemo(
    () => [
      "Pump sizing review",
      "Electrical load estimate",
      "P&ID discussion",
      "Material selection notes",
    ],
    []
  );

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed && attachments.length === 0) return;

    const next = [];
    if (trimmed) {
      next.push({ role: "user", text: trimmed, time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) });
    }
    if (attachments.length > 0) {
      next.push({
        role: "assistant",
        text: `📎 ${attachments.length} file(s) attached in UI. Once your backend is ready, these files can be uploaded to your API or object storage.`,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      });
    }

    setMessages((prev) => [
      ...prev,
      ...next,
      {
        role: "assistant",
        text: "This is a frontend-only prototype response. Next step: connect this input box to your Agent API endpoint (for example /api/chat).",
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
    setInput("");
    setAttachments([]);
    setStatus("Message sent (frontend demo).");
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

  return (
    <div className="h-screen w-full bg-zinc-950 text-zinc-100 flex">
      {/* Sidebar */}
      <aside
        className={`${sidebarOpen ? "w-72" : "w-0"} transition-all duration-200 border-r border-zinc-800 overflow-hidden bg-zinc-900/70 hidden md:flex md:flex-col`}
      >
        <div className="p-3 border-b border-zinc-800">
          <button className="w-full flex items-center gap-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 px-3 py-2 text-sm">
            <Plus className="h-4 w-4" />
            New chat
          </button>
        </div>

        <div className="p-3">
          <div className="flex items-center gap-2 rounded-xl bg-zinc-800/60 px-3 py-2 text-sm text-zinc-400">
            <Search className="h-4 w-4" /> Search chats
          </div>
        </div>

        <div className="px-2 pb-3 space-y-1 overflow-y-auto">
          {recentChats.map((title, idx) => (
            <button
              key={idx}
              className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-left hover:bg-zinc-800"
            >
              <MessageSquare className="h-4 w-4 text-zinc-400" />
              <span className="truncate">{title}</span>
            </button>
          ))}
        </div>

        <div className="mt-auto p-3 border-t border-zinc-800 text-xs text-zinc-400">
          AI Squared UI Prototype
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-14 border-b border-zinc-800 px-3 md:px-4 flex items-center justify-between bg-zinc-950/80 backdrop-blur">
          <div className="flex items-center gap-2">
            <button
              className="rounded-lg p-2 hover:bg-zinc-800"
              onClick={() => setSidebarOpen((s) => !s)}
              title="Toggle sidebar"
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

          <div className="text-xs text-zinc-400 truncate max-w-[55%] text-right">{status}</div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-3 md:px-6 py-4 md:py-6">
          <div className="max-w-3xl mx-auto space-y-5">
            {messages.map((m, i) => (
              <div key={i} className={`flex gap-3 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
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
                  <div className={`mt-2 text-[11px] ${m.role === "user" ? "text-zinc-600" : "text-zinc-500"}`}>
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
          </div>
        </div>

        {/* Composer */}
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
                    className="rounded-lg p-2 hover:bg-zinc-800"
                    title="Attach files"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Paperclip className="h-4 w-4" />
                  </button>

                  <button
                    className={`rounded-lg p-2 hover:bg-zinc-800 ${isListening ? "bg-zinc-800" : ""}`}
                    title="Use microphone"
                    onClick={toggleMic}
                  >
                    {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                  </button>
                </div>

                <button
                  className="rounded-xl bg-zinc-100 text-zinc-900 px-3 py-2 text-sm font-medium hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  onClick={handleSend}
                  disabled={!input.trim() && attachments.length === 0}
                >
                  <SendHorizontal className="h-4 w-4" />
                  Send
                </button>
              </div>
            </div>

            <p className="text-xs text-zinc-500 mt-2 px-1">
              UI-first prototype: file upload and microphone are working in the browser UI layer. Backend integration comes next.
              {micSupported === false ? " (Mic recognition not supported in this browser.)" : ""}
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
