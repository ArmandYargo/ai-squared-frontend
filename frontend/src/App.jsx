import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  Pencil,
  Check,
  X,
  Download,
  FolderDown,
  BarChart3,
  TrendingUp,
  DollarSign,
  Clock,
  AlertTriangle,
  Loader2,
  ArrowLeft,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

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
    wizard_ui: msg.wizard_ui || null,
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

const TYPEWRITER_CHARS_PER_TICK = 6;
const TYPEWRITER_INTERVAL_MS = 12;

function TypewriterText({ text, animate, scrollRef }) {
  const [displayed, setDisplayed] = useState(animate ? "" : text);
  const idxRef = useRef(0);
  const tickCount = useRef(0);

  useEffect(() => {
    if (!animate) { setDisplayed(text); return; }
    idxRef.current = 0;
    tickCount.current = 0;
    setDisplayed("");
    const id = setInterval(() => {
      idxRef.current += TYPEWRITER_CHARS_PER_TICK;
      tickCount.current += 1;
      if (idxRef.current >= text.length) {
        setDisplayed(text);
        clearInterval(id);
        scrollRef?.current?.scrollIntoView({ behavior: "smooth" });
      } else {
        setDisplayed(text.slice(0, idxRef.current));
        if (tickCount.current % 8 === 0) {
          scrollRef?.current?.scrollIntoView({ behavior: "smooth" });
        }
      }
    }, TYPEWRITER_INTERVAL_MS);
    return () => clearInterval(id);
  }, [text, animate, scrollRef]);

  return <span>{displayed}</span>;
}

function MaintenanceTable({ categories, practices, legend, editable, onSave }) {
  const [values, setValues] = React.useState(() => {
    const init = {};
    categories.forEach((cat) => {
      init[cat] = practices[cat] ?? 0;
    });
    return init;
  });
  const [saved, setSaved] = React.useState(false);

  const handleChange = (cat, val) => {
    setValues((prev) => ({ ...prev, [cat]: parseInt(val, 10) }));
  };

  const handleSave = () => {
    const parts = categories.map((cat, i) => `${i + 1}:${values[cat]}`);
    setSaved(true);
    onSave(parts.join(", "));
  };

  const isEditable = editable && !saved;

  return (
    <div className="mt-2 mb-1">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="border-b border-zinc-700">
            <th className="text-left py-1.5 px-2 text-zinc-400 font-medium">#</th>
            <th className="text-left py-1.5 px-2 text-zinc-400 font-medium">Component</th>
            <th className="text-left py-1.5 px-2 text-zinc-400 font-medium">Maintenance Practice</th>
          </tr>
        </thead>
        <tbody>
          {categories.map((cat, idx) => (
            <tr key={cat} className="border-b border-zinc-800/50">
              <td className="py-1 px-2 text-zinc-500">{idx + 1}</td>
              <td className="py-1 px-2 text-zinc-300">{cat}</td>
              <td className="py-1 px-2">
                {isEditable ? (
                  <select
                    value={values[cat]}
                    onChange={(e) => handleChange(cat, e.target.value)}
                    className="bg-zinc-800 border border-zinc-600 rounded px-1.5 py-0.5 text-xs text-zinc-200 focus:border-emerald-500 focus:outline-none"
                  >
                    {Object.entries(legend).map(([code, name]) => (
                      <option key={code} value={code}>
                        {code} – {name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="text-zinc-400">
                    {values[cat]} – {legend[String(values[cat])] || "Unknown"}
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {isEditable && (
        <button
          onClick={handleSave}
          className="mt-2 px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition-colors"
        >
          Save
        </button>
      )}
      {saved && (
        <p className="mt-1 text-[11px] text-emerald-400">Saved</p>
      )}
    </div>
  );
}

function InputSheetEditor({ sheets, editable, onSave }) {
  const sheetNames = React.useMemo(() => Object.keys(sheets || {}), [sheets]);
  const [activeTab, setActiveTab] = React.useState(sheetNames[0] || "");
  const [edited, setEdited] = React.useState(() => JSON.parse(JSON.stringify(sheets || {})));
  const [saved, setSaved] = React.useState(false);

  const isEditable = editable && !saved;

  const handleCellChange = (sheetName, rowIdx, col, value) => {
    setEdited((prev) => {
      const next = { ...prev };
      const sheet = { ...next[sheetName] };
      const rows = [...sheet.rows];
      rows[rowIdx] = { ...rows[rowIdx], [col]: value };
      sheet.rows = rows;
      next[sheetName] = sheet;
      return next;
    });
  };

  const handleSave = () => {
    setSaved(true);
    onSave("__SHEET_SAVE__:" + JSON.stringify({ sheets: edited }));
  };

  if (!sheetNames.length) return null;

  const activeSheet = edited[activeTab];

  return (
    <div className="mt-2 mb-1">
      <div className="flex gap-1 mb-2 flex-wrap">
        {sheetNames.map((name) => (
          <button
            key={name}
            onClick={() => setActiveTab(name)}
            className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
              activeTab === name
                ? "bg-emerald-600 text-white"
                : "bg-zinc-800 text-zinc-400 hover:text-zinc-200"
            }`}
          >
            {name}
          </button>
        ))}
      </div>
      {activeSheet && (
        <div className="overflow-x-auto rounded border border-zinc-700">
          <table className="text-xs border-collapse whitespace-nowrap">
            <thead>
              <tr className="bg-zinc-800">
                <th className="py-1.5 px-2 text-zinc-500 font-medium border-r border-zinc-700 text-left">#</th>
                {activeSheet.columns.map((col) => (
                  <th
                    key={col}
                    className="py-1.5 px-2 text-zinc-400 font-medium border-r border-zinc-700 text-left"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {activeSheet.rows.map((row, rowIdx) => (
                <tr key={rowIdx} className="border-t border-zinc-800/50">
                  <td className="py-0.5 px-2 text-zinc-600 border-r border-zinc-800">{rowIdx + 1}</td>
                  {activeSheet.columns.map((col) => (
                    <td key={col} className="py-0.5 px-1 border-r border-zinc-800">
                      {isEditable ? (
                        <input
                          type="text"
                          value={row[col] ?? ""}
                          onChange={(e) => handleCellChange(activeTab, rowIdx, col, e.target.value)}
                          className="w-full min-w-[60px] bg-zinc-900 border border-zinc-700 rounded px-1 py-0.5 text-xs text-zinc-200 font-mono focus:border-emerald-500 focus:outline-none"
                        />
                      ) : (
                        <span className="px-1 text-zinc-300 font-mono">{String(row[col] ?? "")}</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {isEditable && (
        <button
          onClick={handleSave}
          className="mt-2 px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition-colors"
        >
          Save
        </button>
      )}
      {saved && (
        <p className="mt-1 text-[11px] text-emerald-400">Saved — input sheet updated</p>
      )}
    </div>
  );
}

const PLOT_ICONS = {
  availability: TrendingUp,
  failures: AlertTriangle,
  costs_by_component: DollarSign,
  costs_over_time: DollarSign,
  downtime_by_component: Clock,
  downtime_over_time: Clock,
};

const CHART_COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

function SimChart({ chartData, onBack, height = 280 }) {
  if (!chartData) return null;
  const { chart_type, title, x_label, y_label, labels, datasets } = chartData;

  const data = labels.map((label, i) => {
    const point = { name: label };
    datasets.forEach((ds, dsIdx) => {
      point[ds.label] = ds.data[i];
    });
    return point;
  });

  const tickFormatter = (value) => {
    if (typeof value === "string" && value.length > 7) return value.slice(0, 7);
    if (typeof value === "number") return value.toLocaleString();
    return value;
  };

  return (
    <div className="mt-2 mb-1">
      <div className="flex items-center gap-2 mb-2">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-xs text-zinc-400 hover:text-emerald-400 transition-colors"
        >
          <ArrowLeft className="h-3 w-3" /> Back to plots
        </button>
      </div>
      <p className="text-xs font-medium text-zinc-300 mb-2">{title}</p>
      <div className="rounded-lg border border-zinc-700 bg-zinc-950 p-3">
        <ResponsiveContainer width="100%" height={height}>
          {chart_type === "bar" ? (
            <BarChart data={data} margin={{ top: 5, right: 20, bottom: 40, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 10, fill: "#a1a1aa" }}
                angle={-45}
                textAnchor="end"
                interval={0}
                height={60}
              />
              <YAxis tick={{ fontSize: 10, fill: "#a1a1aa" }} tickFormatter={tickFormatter} />
              <Tooltip
                contentStyle={{ backgroundColor: "#18181b", border: "1px solid #3f3f46", borderRadius: "8px", fontSize: "12px" }}
                labelStyle={{ color: "#e4e4e7" }}
                itemStyle={{ color: "#10b981" }}
              />
              {datasets.map((ds, idx) => (
                <Bar key={ds.label} dataKey={ds.label} fill={CHART_COLORS[idx % CHART_COLORS.length]} radius={[4, 4, 0, 0]} />
              ))}
            </BarChart>
          ) : (
            <LineChart data={data} margin={{ top: 5, right: 20, bottom: 40, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 10, fill: "#a1a1aa" }}
                angle={-45}
                textAnchor="end"
                interval={Math.max(0, Math.floor(labels.length / 12) - 1)}
                height={60}
              />
              <YAxis tick={{ fontSize: 10, fill: "#a1a1aa" }} tickFormatter={tickFormatter} />
              <Tooltip
                contentStyle={{ backgroundColor: "#18181b", border: "1px solid #3f3f46", borderRadius: "8px", fontSize: "12px" }}
                labelStyle={{ color: "#e4e4e7" }}
                itemStyle={{ color: "#10b981" }}
              />
              <Legend wrapperStyle={{ fontSize: "11px" }} />
              {datasets.map((ds, idx) => (
                <Line
                  key={ds.label}
                  type="monotone"
                  dataKey={ds.label}
                  stroke={CHART_COLORS[idx % CHART_COLORS.length]}
                  strokeWidth={2}
                  dot={labels.length <= 24}
                  activeDot={{ r: 4 }}
                />
              ))}
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>
      <p className="text-[10px] text-zinc-600 mt-1">
        {x_label && y_label ? `${x_label} vs ${y_label}` : ""}
      </p>
    </div>
  );
}

function SimPlotMenu({ plots, conversationId, browserId, onShowPlot }) {
  const [loading, setLoading] = useState(null);
  const [error, setError] = useState(null);

  const fetchPlot = async (plotId) => {
    setLoading(plotId);
    setError(null);
    try {
      const res = await fetch(
        `${API_BASE}/api/plots/${encodeURIComponent(conversationId)}/${plotId}?browser_id=${encodeURIComponent(browserId || "")}`,
        { method: "GET", credentials: "include" }
      );
      if (!res.ok) {
        const detail = await res.json().catch(() => ({}));
        throw new Error(detail.detail || `HTTP ${res.status}`);
      }
      const data = await res.json();
      if (onShowPlot) onShowPlot(data);
    } catch (err) {
      setError(err.message || "Failed to load plot data");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="mt-2 mb-1">
      <div className="grid grid-cols-2 gap-2">
        {plots.map((plot) => {
          const Icon = PLOT_ICONS[plot.id] || BarChart3;
          const isLoading = loading === plot.id;
          return (
            <button
              key={plot.id}
              onClick={() => fetchPlot(plot.id)}
              disabled={!!loading}
              className="flex items-start gap-2 p-2.5 rounded-lg border border-zinc-700 bg-zinc-800/50 hover:bg-zinc-800 hover:border-emerald-500/40 transition-all text-left disabled:opacity-50 disabled:cursor-wait"
            >
              <div className="h-7 w-7 rounded-md bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0 mt-0.5">
                {isLoading ? (
                  <Loader2 className="h-3.5 w-3.5 text-emerald-400 animate-spin" />
                ) : (
                  <Icon className="h-3.5 w-3.5 text-emerald-400" />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-zinc-200 leading-tight">{plot.label}</p>
                <p className="text-[10px] text-zinc-500 leading-tight mt-0.5">{plot.description}</p>
              </div>
            </button>
          );
        })}
      </div>
      {error && (
        <p className="mt-2 text-xs text-red-400">{error}</p>
      )}
    </div>
  );
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
  const [sidebarWidth, setSidebarWidth] = useState(288);
  const sidebarDragging = useRef(false);
  const [activePlot, setActivePlot] = useState(null);
  const [plotPanelWidth, setPlotPanelWidth] = useState(480);
  const plotPanelDragging = useRef(false);
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

  const [artifacts, setArtifacts] = useState([]);
  const [isLoadingArtifacts, setIsLoadingArtifacts] = useState(false);
  const [renamingConversationId, setRenamingConversationId] = useState(null);
  const [renameValue, setRenameValue] = useState("");
  const [deletingConversationId, setDeletingConversationId] = useState(null);
  const [deletingArtifactId, setDeletingArtifactId] = useState(null);

  const [authChecked, setAuthChecked] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const [simProgress, setSimProgress] = useState(null);
  const [sendingElapsed, setSendingElapsed] = useState(0);
  const sendingStartRef = useRef(null);

  const fileInputRef = useRef(null);
  const recognitionRef = useRef(null);
  const chatEndRef = useRef(null);

  const filteredConversations = useMemo(() => {
    const q = chatSearch.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter((c) => {
      const title = (c.title || "").toLowerCase();
      const preview = (c.last_message_preview || "").toLowerCase();
      return title.includes(q) || preview.includes(q);
    });
  }, [chatSearch, conversations]);

  const lastAnimatedIdx = useRef(-1);

  const appendMessage = useCallback((msg) => {
    setMessages((prev) => {
      const nextIdx = prev.length;
      if (msg.role === "assistant") lastAnimatedIdx.current = nextIdx;
      return [...prev, msg];
    });
  }, []);

  useEffect(() => {
    const onMouseMove = (e) => {
      if (sidebarDragging.current) {
        setSidebarWidth(Math.max(180, Math.min(600, e.clientX)));
      } else if (plotPanelDragging.current) {
        const fromRight = window.innerWidth - e.clientX;
        setPlotPanelWidth(Math.max(320, Math.min(900, fromRight)));
      }
    };
    const onMouseUp = () => {
      sidebarDragging.current = false;
      plotPanelDragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => { window.removeEventListener("mousemove", onMouseMove); window.removeEventListener("mouseup", onMouseUp); };
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isSending, simProgress]);

  useEffect(() => {
    if (!isSending || !conversationId) {
      setSimProgress(null);
      setSendingElapsed(0);
      sendingStartRef.current = null;
      return;
    }
    sendingStartRef.current = Date.now();
    let cancelled = false;

    const timer = setInterval(() => {
      if (sendingStartRef.current) {
        setSendingElapsed(Math.floor((Date.now() - sendingStartRef.current) / 1000));
      }
    }, 1000);

    const poll = async () => {
      while (!cancelled) {
        try {
          const res = await fetch(`${API_BASE}/api/progress/${conversationId}`, { credentials: "include" });
          if (res.ok) {
            const data = await res.json();
            if (data && (data.step || (typeof data.current === "number" && data.current > 0))) {
              setSimProgress(data);
            }
          }
        } catch {}
        await new Promise((r) => setTimeout(r, 1500));
      }
    };
    poll();
    return () => { cancelled = true; clearInterval(timer); setSimProgress(null); setSendingElapsed(0); sendingStartRef.current = null; };
  }, [isSending, conversationId]);

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

  const loadArtifacts = async (id, resolvedBrowserId = browserId) => {
    if (!id || !resolvedBrowserId) {
      setArtifacts([]);
      return;
    }

    setIsLoadingArtifacts(true);
    try {
      const res = await fetch(
        `${API_BASE}/api/conversations/${encodeURIComponent(
          id
        )}/artifacts?browser_id=${encodeURIComponent(resolvedBrowserId)}`,
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
        throw new Error(err.detail || "Failed to load artifacts.");
      }

      const data = await res.json();
      setArtifacts(Array.isArray(data.items) ? data.items : []);
    } catch (err) {
      setStatus(err.message || "Failed to load artifacts.");
    } finally {
      setIsLoadingArtifacts(false);
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
      await loadArtifacts(data.conversation_id || id, resolvedBrowserId);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, browserId]);

  useEffect(() => {
    if (!isAuthenticated || !browserId || !conversationId) {
      setArtifacts([]);
      return;
    }
    loadArtifacts(conversationId, browserId);
  }, [isAuthenticated, browserId, conversationId]);

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
    setArtifacts([]);
    setMessages(buildDefaultMessages());
    setStatus("Signed out.");
  };

  const startNewChat = () => {
    clearConversationId();
    setArtifacts([]);
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

      if (conversationId) {
        form.append("conversation_id", conversationId);
      }
      if (browserId) {
        form.append("browser_id", browserId);
      }

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

      if (data.conversation_id) {
        saveConversationId(data.conversation_id);
      }

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

        const autoReply = uploadedFiles[0]?.auto_reply;
        if (autoReply) {
          appendMessage({
            role: "assistant",
            text: autoReply,
            speaker: "WIZARD",
            time: timeNow(),
            wizard_ui: uploadedFiles[0]?.wizard_ui || null,
          });
        } else {
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

        await loadConversations(browserId);

        const activeConversationId =
          uploadedFiles[0]?.conversation_id || conversationId;

        if (activeConversationId) {
          await loadArtifacts(activeConversationId, browserId);
        }
      }

      let messageForBackend = trimmed;

      if (!messageForBackend) {
        setAttachments([]);
        setInput("");
        setStatus("Connected");
        return;
      }

      setStatus("Sending to backend...");

      const activeConversationId =
        uploadedFiles[0]?.conversation_id || conversationId;

      const chatAbort = new AbortController();
      const chatTimeout = setTimeout(() => chatAbort.abort(), 180_000);
      let res;
      try {
        res = await fetch(`${API_BASE}/api/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          signal: chatAbort.signal,
          body: JSON.stringify({
            message: messageForBackend,
            conversation_id: activeConversationId,
            browser_id: browserId,
          }),
        });
      } catch (fetchErr) {
        clearTimeout(chatTimeout);
        if (fetchErr.name === "AbortError") throw new Error("Request timed out after 3 minutes. The backend may still be processing — try refreshing the chat.");
        throw fetchErr;
      }
      clearTimeout(chatTimeout);

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
        wizard_ui: data.wizard_ui || null,
      });

      setStatus(
        data.conversation_id
          ? `Connected • chat ${String(data.conversation_id).slice(0, 8)}...`
          : "Connected"
      );

      setInput("");
      setAttachments([]);
      await loadConversations(browserId);

      if (data.conversation_id) {
        await loadArtifacts(data.conversation_id, browserId);
      }
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

  const sendMessageDirect = async (text) => {
    if (isSending || !text) return;
    setIsSending(true);
    const displayText = text.startsWith("__SHEET_SAVE__:") ? "Saved input sheet edits" : text;
    appendMessage({ role: "user", text: displayText, speaker: "USER", time: timeNow() });
    try {
      const chatAbort = new AbortController();
      const chatTimeout = setTimeout(() => chatAbort.abort(), 180_000);
      let res;
      try {
        res = await fetch(`${API_BASE}/api/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          signal: chatAbort.signal,
          body: JSON.stringify({
            message: text,
            conversation_id: conversationId,
            browser_id: browserId,
          }),
        });
      } catch (fetchErr) {
        clearTimeout(chatTimeout);
        if (fetchErr.name === "AbortError") throw new Error("Request timed out after 3 minutes. The backend may still be processing — try refreshing the chat.");
        throw fetchErr;
      }
      clearTimeout(chatTimeout);
      if (res.status === 401) { setIsAuthenticated(false); throw new Error("Session expired."); }
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.detail || "Backend error"); }
      const data = await res.json();
      if (data.conversation_id) saveConversationId(data.conversation_id);
      appendMessage({
        role: "assistant",
        text: data.reply || "(No response)",
        speaker: data.speaker || "ASSISTANT",
        time: timeNow(),
        wizard_ui: data.wizard_ui || null,
      });
      setStatus(data.conversation_id ? `Connected • chat ${String(data.conversation_id).slice(0, 8)}...` : "Connected");
    } catch (err) {
      appendMessage({ role: "assistant", text: `⚠️ ${err.message || "Something went wrong."}`, speaker: "ASSISTANT", time: timeNow() });
      setStatus("Error talking to backend.");
    } finally {
      setIsSending(false);
    }
  };

  const handleRenameConversation = async (id) => {
    const title = renameValue.trim();
    if (!id || !title) return;

    try {
      const res = await fetch(`${API_BASE}/api/conversations/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          title,
          browser_id: browserId,
        }),
      });

      if (res.status === 401) {
        setIsAuthenticated(false);
        throw new Error("Session expired. Please sign in again.");
      }

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Failed to rename conversation.");
      }

      setConversations((prev) =>
        prev.map((c) => (c.id === id ? { ...c, title } : c))
      );
      setRenamingConversationId(null);
      setRenameValue("");
      setStatus("Conversation renamed.");
    } catch (err) {
      setStatus(err.message || "Rename failed.");
    }
  };

  const handleDeleteConversation = async (id) => {
    if (!id) return;

    const confirmed = window.confirm("Delete this conversation and its artifacts?");
    if (!confirmed) return;

    setDeletingConversationId(id);

    try {
      const res = await fetch(
        `${API_BASE}/api/conversations/${encodeURIComponent(
          id
        )}?browser_id=${encodeURIComponent(browserId)}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      if (res.status === 401) {
        setIsAuthenticated(false);
        throw new Error("Session expired. Please sign in again.");
      }

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Failed to delete conversation.");
      }

      setConversations((prev) => prev.filter((c) => c.id !== id));

      if (conversationId === id) {
        clearConversationId();
        setArtifacts([]);
        setMessages(buildDefaultMessages("Conversation deleted. Start a new chat."));
      }

      setStatus("Conversation deleted.");
    } catch (err) {
      setStatus(err.message || "Delete failed.");
    } finally {
      setDeletingConversationId(null);
    }
  };

  const handleDeleteArtifact = async (artifactId) => {
    if (!artifactId) return;

    const confirmed = window.confirm("Delete this artifact?");
    if (!confirmed) return;

    setDeletingArtifactId(artifactId);

    try {
      const res = await fetch(
        `${API_BASE}/api/artifacts/${encodeURIComponent(
          artifactId
        )}?browser_id=${encodeURIComponent(browserId)}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      if (res.status === 401) {
        setIsAuthenticated(false);
        throw new Error("Session expired. Please sign in again.");
      }

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Failed to delete artifact.");
      }

      setArtifacts((prev) => prev.filter((a) => a.id !== artifactId));
      setStatus("Artifact deleted.");
    } catch (err) {
      setStatus(err.message || "Artifact delete failed.");
    } finally {
      setDeletingArtifactId(null);
    }
  };

  const artifactDownloadUrl = (artifactId) =>
    `${API_BASE}/api/artifacts/${encodeURIComponent(
      artifactId
    )}/download?browser_id=${encodeURIComponent(browserId || "")}`;

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
        style={sidebarOpen ? { width: sidebarWidth, minWidth: 180, maxWidth: 600 } : { width: 0 }}
        className="transition-all duration-200 border-r border-zinc-800 overflow-hidden bg-zinc-900/70 hidden md:flex md:flex-col relative"
      >
        <div className="p-3 border-b border-zinc-800">
          <button
            className="w-full flex items-center gap-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 px-3 py-2 text-sm"
            onClick={startNewChat}
            type="button"
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
            const isRenaming = renamingConversationId === chat.id;
            const isDeleting = deletingConversationId === chat.id;

            return (
              <div
                key={chat.id}
                className={`group rounded-lg px-2 py-1 ${
                  active ? "bg-zinc-800" : "hover:bg-zinc-800"
                }`}
              >
                <div className="flex items-start gap-2">
                  <button
                    className="flex min-w-0 flex-1 items-start gap-2 text-left px-1 py-1"
                    onClick={() => openConversation(chat.id)}
                    type="button"
                    disabled={isDeleting}
                  >
                    <MessageSquare className="h-4 w-4 text-zinc-400 mt-0.5 shrink-0" />
                    <div className="min-w-0 flex-1">
                      {isRenaming ? (
                        <div
                          className="flex items-center gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-sm outline-none"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                handleRenameConversation(chat.id);
                              }
                              if (e.key === "Escape") {
                                setRenamingConversationId(null);
                                setRenameValue("");
                              }
                            }}
                          />
                          <button
                            className="rounded p-1 hover:bg-zinc-700"
                            type="button"
                            onClick={() => handleRenameConversation(chat.id)}
                            title="Save name"
                          >
                            <Check className="h-3.5 w-3.5" />
                          </button>
                          <button
                            className="rounded p-1 hover:bg-zinc-700"
                            type="button"
                            onClick={() => {
                              setRenamingConversationId(null);
                              setRenameValue("");
                            }}
                            title="Cancel rename"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="truncate text-sm text-zinc-100">
                            {chat.title || "Untitled chat"}
                          </div>
                          {chat.last_message_preview && (
                            <div className="truncate text-xs text-zinc-500 mt-0.5">
                              {chat.last_message_preview}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </button>

                  {!isRenaming && (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        className="rounded-md p-1.5 hover:bg-zinc-700"
                        type="button"
                        title="Rename"
                        onClick={(e) => {
                          e.stopPropagation();
                          setRenamingConversationId(chat.id);
                          setRenameValue(chat.title || "");
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>

                      <button
                        className="rounded-md p-1.5 hover:bg-zinc-700 disabled:opacity-50"
                        type="button"
                        title="Delete"
                        disabled={isDeleting}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteConversation(chat.id);
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
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
        {sidebarOpen && (
          <div
            className="absolute top-0 right-0 w-1.5 h-full cursor-col-resize hover:bg-emerald-500/30 active:bg-emerald-500/50 transition-colors z-10"
            onMouseDown={(e) => { e.preventDefault(); sidebarDragging.current = true; document.body.style.cursor = "col-resize"; document.body.style.userSelect = "none"; }}
          />
        )}
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
          {conversationId && (
            <div className="max-w-3xl mx-auto mb-4">
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900 px-3 py-3">
                <div className="text-xs uppercase tracking-wide text-zinc-500 mb-2">
                  Conversation artifacts
                </div>

                {isLoadingArtifacts ? (
                  <div className="text-sm text-zinc-400">Loading artifacts...</div>
                ) : artifacts.length === 0 ? (
                  <div className="text-sm text-zinc-500">No artifacts for this conversation yet.</div>
                ) : (
                  <div className="space-y-2">
                    {artifacts.map((artifact) => (
                      <div
                        key={artifact.id}
                        className="flex items-center justify-between gap-3 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-xs"
                      >
                        <div className="min-w-0 flex items-center gap-2">
                          <Paperclip className="h-3 w-3 shrink-0" />
                          <div className="min-w-0">
                            <div className="truncate text-zinc-100">
                              {artifact.title || artifact.output_type || "Artifact"}
                            </div>
                            <div className="truncate text-zinc-500">
                              {artifact.output_type}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <a
                            href={artifactDownloadUrl(artifact.id)}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-md p-1.5 hover:bg-zinc-700 text-zinc-300"
                            title="Download artifact"
                          >
                            <Download className="h-3.5 w-3.5" />
                          </a>
                          <button
                            className="text-zinc-400 hover:text-zinc-100 disabled:opacity-50"
                            onClick={() => handleDeleteArtifact(artifact.id)}
                            title="Delete artifact"
                            type="button"
                            disabled={deletingArtifactId === artifact.id}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}

                    {artifacts.some((a) => a.available) && (
                      <a
                        href={`${API_BASE}/api/conversations/${encodeURIComponent(conversationId)}/artifacts/download-all?browser_id=${encodeURIComponent(browserId || "")}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-center gap-2 w-full mt-2 px-3 py-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 text-xs font-medium transition-colors"
                      >
                        <FolderDown className="h-3.5 w-3.5" />
                        Download All (.zip)
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

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
                  <p className="text-sm leading-6 whitespace-pre-wrap">
                    <TypewriterText
                      text={m.text}
                      animate={m.role === "assistant" && i === lastAnimatedIdx.current}
                      scrollRef={chatEndRef}
                    />
                  </p>
                  {m.wizard_ui && m.wizard_ui.type === "maintenance_table" && (
                    <MaintenanceTable
                      categories={m.wizard_ui.categories}
                      practices={m.wizard_ui.practices}
                      legend={m.wizard_ui.legend}
                      editable={!!m.wizard_ui.editable}
                      onSave={sendMessageDirect}
                    />
                  )}
                  {m.wizard_ui && m.wizard_ui.type === "input_sheet_editor" && (
                    <InputSheetEditor
                      sheets={m.wizard_ui.sheets}
                      editable={!!m.wizard_ui.editable}
                      onSave={sendMessageDirect}
                    />
                  )}
                  {m.wizard_ui && m.wizard_ui.type === "sim_plots_menu" && (
                    <SimPlotMenu
                      plots={m.wizard_ui.plots}
                      conversationId={conversationId}
                      browserId={browserId}
                      onShowPlot={(data) => setActivePlot(data)}
                    />
                  )}
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
                  {(() => {
                    const est = simProgress?.est_seconds;
                    const estLabel = est ? `Predicted: ~${est}s` : null;

                    if (isOpeningConversation) {
                      return <p className="text-sm leading-6 text-zinc-400">Loading saved chat...</p>;
                    }

                    if (simProgress?.step === "simulation" && simProgress.current) {
                      return (
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-zinc-200">
                            Running RAM Simulation — {simProgress.current}/{simProgress.total}
                          </p>
                          <div className="w-full bg-zinc-700 rounded-full h-2.5">
                            <div
                              className="bg-emerald-500 h-2.5 rounded-full transition-all duration-500"
                              style={{ width: `${Math.round((simProgress.current / simProgress.total) * 100)}%` }}
                            />
                          </div>
                          <div className="flex justify-between text-[11px] text-zinc-400">
                            <span>{Math.round((simProgress.current / simProgress.total) * 100)}%</span>
                            <span>{simProgress.avg_per_sim}s/sim</span>
                            <span>ETA {simProgress.eta_seconds}s</span>
                          </div>
                          <p className="text-[10px] text-zinc-600">Elapsed: {sendingElapsed}s</p>
                        </div>
                      );
                    }

                    if (simProgress?.step === "simulation" && !simProgress.current) {
                      return (
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-zinc-200">Starting RAM simulation</p>
                          <p className="text-[11px] text-zinc-500">Initialising Monte Carlo engine...</p>
                          {estLabel && <p className="text-[11px] text-emerald-500/70">{estLabel}</p>}
                          <p className="text-[10px] text-zinc-600">Elapsed: {sendingElapsed}s</p>
                        </div>
                      );
                    }

                    if (simProgress?.step === "readiness") {
                      return (
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-zinc-200">
                            Checking data readiness{sendingElapsed > 0 ? ` (${sendingElapsed}s)` : ""}…
                          </p>
                          <p className="text-[11px] text-zinc-500">
                            {simProgress.message || "Ingesting CMMS data and validating columns..."}
                          </p>
                          {estLabel && <p className="text-[11px] text-emerald-500/70">{estLabel}</p>}
                          <p className="text-[10px] text-zinc-600">Elapsed: {sendingElapsed}s</p>
                        </div>
                      );
                    }

                    if (simProgress?.step === "classification") {
                      const SUBSTEP_LABELS = {
                        starting: "Starting classification pipeline",
                        ingest: "Step 2/7 — Ingesting workbook",
                        readiness: "Step 3/7 — Assessing data readiness",
                        date_filter: "Step 4/7 — Applying date filter",
                        categories: "Step 5/7 — Preparing categories",
                        classify: "Step 6/7 — Classifying work-orders",
                        build_input: "Step 7/7 — Building input sheet",
                      };
                      const substep = simProgress.substep || "";
                      const substepLabel = SUBSTEP_LABELS[substep] || simProgress.message || "Processing...";
                      const substepKeys = Object.keys(SUBSTEP_LABELS);
                      const substepIdx = Math.max(0, substepKeys.indexOf(substep));
                      const substepPct = Math.round(((substepIdx + 1) / substepKeys.length) * 100);

                      return (
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-zinc-200">
                            Building RAM input sheet{sendingElapsed > 0 ? ` (${sendingElapsed}s)` : ""}…
                          </p>
                          <div className="w-full bg-zinc-700 rounded-full h-1.5">
                            <div
                              className="bg-emerald-500 h-1.5 rounded-full transition-all duration-700"
                              style={{ width: `${substepPct}%` }}
                            />
                          </div>
                          <p className="text-[11px] text-zinc-400">{substepLabel}</p>
                          {estLabel && <p className="text-[11px] text-emerald-500/70">{estLabel}</p>}
                          <p className="text-[10px] text-zinc-600">Elapsed: {sendingElapsed}s</p>
                        </div>
                      );
                    }

                    if (simProgress?.step === "aggregation") {
                      return (
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-zinc-200">
                            Aggregating simulation data{sendingElapsed > 0 ? ` (${sendingElapsed}s)` : ""}…
                          </p>
                          <p className="text-[11px] text-zinc-500">
                            Simulation 100% complete — now aggregating results across components and time periods.
                          </p>
                          {estLabel && <p className="text-[11px] text-emerald-500/70">{estLabel}</p>}
                          <p className="text-[10px] text-zinc-600">Elapsed: {sendingElapsed}s</p>
                        </div>
                      );
                    }

                    if (simProgress?.step === "done") {
                      return (
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-zinc-200">
                            Saving results{sendingElapsed > 0 ? ` (${sendingElapsed}s)` : ""}…
                          </p>
                          <p className="text-[11px] text-zinc-500">Simulation finished — writing artifacts to database.</p>
                          {estLabel && <p className="text-[11px] text-emerald-500/70">{estLabel}</p>}
                          <p className="text-[10px] text-zinc-600">Elapsed: {sendingElapsed}s</p>
                        </div>
                      );
                    }

                    return (
                      <div className="space-y-1">
                        <p className="text-sm leading-6 text-zinc-400">
                          Working{sendingElapsed > 0 ? ` (${sendingElapsed}s)` : ""}…
                        </p>
                        {sendingElapsed >= 3 && (
                          <p className="text-[11px] text-zinc-500">
                            {sendingElapsed < 10
                              ? "Processing your request..."
                              : sendingElapsed < 30
                                ? "Still working — this may take a moment."
                                : `Taking longer than expected (${sendingElapsed}s). Server may be under load.`}
                          </p>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
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

      {activePlot && (
        <aside
          style={{ width: plotPanelWidth, minWidth: 320, maxWidth: 900 }}
          className="border-l border-zinc-800 bg-zinc-950 hidden lg:flex flex-col relative"
        >
          <div
            className="absolute top-0 left-0 w-1.5 h-full cursor-col-resize hover:bg-emerald-500/30 active:bg-emerald-500/50 transition-colors z-10"
            onMouseDown={(e) => { e.preventDefault(); plotPanelDragging.current = true; document.body.style.cursor = "col-resize"; document.body.style.userSelect = "none"; }}
          />
          <div className="h-14 border-b border-zinc-800 px-4 flex items-center justify-between shrink-0">
            <span className="text-sm font-medium text-zinc-200 truncate">{activePlot.title}</span>
            <button
              onClick={() => setActivePlot(null)}
              className="rounded-lg p-1.5 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 transition-colors"
              title="Close plot"
              type="button"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <SimChart chartData={activePlot} onBack={() => setActivePlot(null)} height={Math.max(350, plotPanelWidth * 0.75)} />
          </div>
        </aside>
      )}
    </div>
  );
}