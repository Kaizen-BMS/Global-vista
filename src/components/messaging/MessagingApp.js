"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { MessageSquare, Send, Paperclip, Search, Plus, Megaphone, Users as UsersIcon, X, Loader2, FileText } from "lucide-react";
import { apiFetch } from "@/components/shared/apiClient";
import { useTimezone } from "@/components/shared/TimezoneProvider";
import { formatRelative, formatDateTime } from "@/lib/helpers/dateFormat";

const POLL_MS = 12000;

function Avatar({ name }) {
  return (
    <div className="h-9 w-9 shrink-0 rounded-full bg-indigo-500/15 text-indigo-400 flex items-center justify-center text-sm font-semibold">
      {name?.trim()?.[0]?.toUpperCase() || "?"}
    </div>
  );
}

function conversationLabel(c) {
  if (c.type === "broadcast") return c.title || "Company Announcements";
  if (c.type === "group") return c.title || c.other_participant_names || "Group";
  return c.other_participant_names || "Conversation";
}

function NewConversationModal({ users, isSuperAdmin, onClose, onCreated }) {
  const [mode, setMode] = useState("direct"); // direct | group | broadcast
  const [selected, setSelected] = useState([]);
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);

  function toggle(id) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function create() {
    setSaving(true);
    try {
      let body;
      if (mode === "direct") {
        if (selected.length !== 1) { toast.error("Select exactly one person."); setSaving(false); return; }
        body = { type: "direct", userId: selected[0] };
      } else if (mode === "group") {
        if (selected.length < 2) { toast.error("Select at least 2 people for a group."); setSaving(false); return; }
        body = { type: "group", participantIds: selected, title };
      } else {
        body = { type: "broadcast" };
      }
      const res = await apiFetch("/api/messaging/conversations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to start conversation.");
      onCreated(data.id);
    } catch (err) { toast.error(err.message); } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-background border border-border rounded-xl shadow-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="text-foreground font-medium">New Conversation</p>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground cursor-pointer"><X className="h-4 w-4" /></button>
        </div>

        <div className="flex items-center gap-1 p-1 rounded-lg bg-muted border border-border mb-4 w-fit">
          {[["direct", "Direct"], ["group", "Group"], ...(isSuperAdmin ? [["broadcast", "Broadcast"]] : [])].map(([key, label]) => (
            <button key={key} onClick={() => { setMode(key); setSelected([]); }} className={`px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer transition ${mode === key ? "bg-indigo-600 text-white" : "text-muted-foreground hover:text-foreground"}`}>{label}</button>
          ))}
        </div>

        {mode === "broadcast" ? (
          <p className="text-muted-foreground text-sm mb-4">Sends to every active employee in your company — everyone will see this in their Company Announcements thread.</p>
        ) : (
          <>
            {mode === "group" && (
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Group name (optional)" className="w-full mb-3 px-3 py-2 rounded-lg bg-muted border border-border text-foreground text-sm" />
            )}
            <div className="max-h-64 overflow-y-auto space-y-1 border border-border rounded-lg p-2">
              {users.length === 0 && <p className="text-muted-foreground text-xs p-2">No other employees to message yet.</p>}
              {users.map((u) => (
                <label key={u.id} className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-muted cursor-pointer">
                  <input type={mode === "direct" ? "radio" : "checkbox"} name="recipient" checked={selected.includes(u.id)} onChange={() => (mode === "direct" ? setSelected([u.id]) : toggle(u.id))} className="cursor-pointer accent-indigo-500" />
                  <Avatar name={u.name} />
                  <span className="text-foreground text-sm">{u.name}{u.is_super_admin ? <span className="text-muted-foreground text-xs ml-1.5">Super Admin</span> : ""}</span>
                </label>
              ))}
            </div>
          </>
        )}

        <button onClick={create} disabled={saving} className="w-full mt-4 flex items-center justify-center gap-2 py-2.5 rounded-lg btn-brand text-white text-sm font-medium disabled:opacity-60 cursor-pointer">
          {saving && <Loader2 className="h-4 w-4 animate-spin" />} {mode === "broadcast" ? "Open Announcements" : "Start Conversation"}
        </button>
      </div>
    </div>
  );
}

export default function MessagingApp({ currentUserId, isSuperAdmin, initialConversations, messageableUsers, initialConversationId }) {
  const router = useRouter();
  const timezone = useTimezone();
  const [conversations, setConversations] = useState(initialConversations);
  const [activeId, setActiveId] = useState(initialConversationId || initialConversations[0]?.id || null);
  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [text, setText] = useState("");
  const [file, setFile] = useState(null);
  const [sending, setSending] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState(null);
  const fileInputRef = useRef(null);
  const bottomRef = useRef(null);

  const refreshConversations = useCallback(async () => {
    try {
      const res = await apiFetch("/api/messaging/conversations");
      const data = await res.json();
      if (data.conversations) setConversations(data.conversations);
    } catch { /* next poll retries */ }
  }, []);

  const loadMessages = useCallback(async (id) => {
    if (!id) return;
    setLoadingMessages(true);
    try {
      const res = await apiFetch(`/api/messaging/conversations/${id}/messages`);
      const data = await res.json();
      setMessages(data.messages || []);
      await apiFetch(`/api/messaging/conversations/${id}/read`, { method: "POST" });
      refreshConversations();
    } catch { toast.error("Failed to load messages."); } finally { setLoadingMessages(false); }
  }, [refreshConversations]);

  useEffect(() => { if (activeId) loadMessages(activeId); }, [activeId, loadMessages]);

  useEffect(() => {
    const id = setInterval(() => {
      refreshConversations();
      if (activeId) loadMessages(activeId);
    }, POLL_MS);
    return () => clearInterval(id);
  }, [activeId, refreshConversations, loadMessages]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ block: "end" }); }, [messages]);

  function selectConversation(id) {
    setActiveId(id);
    router.replace(`/workspace/messages/${id}`);
  }

  async function send(e) {
    e.preventDefault();
    if (!text.trim() && !file) return;
    setSending(true);
    try {
      let res;
      if (file) {
        const formData = new FormData();
        formData.append("body", text);
        formData.append("file", file);
        res = await apiFetch(`/api/messaging/conversations/${activeId}/messages`, { method: "POST", body: formData });
      } else {
        res = await apiFetch(`/api/messaging/conversations/${activeId}/messages`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ body: text }) });
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send.");
      setText(""); setFile(null);
      await loadMessages(activeId);
    } catch (err) { toast.error(err.message); } finally { setSending(false); }
  }

  async function runSearch(q) {
    setSearch(q);
    if (!q.trim()) { setSearchResults(null); return; }
    try {
      const res = await apiFetch(`/api/messaging/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setSearchResults(data.results || []);
    } catch { setSearchResults([]); }
  }

  const active = conversations.find((c) => c.id === activeId);
  const canPost = !active || active.type !== "broadcast" || isSuperAdmin;

  return (
    <div className="h-[calc(100vh-8rem)] flex bg-card border border-border rounded-xl overflow-hidden">
      <div className="w-80 shrink-0 border-r border-border flex flex-col">
        <div className="p-3 border-b border-border space-y-2">
          <button onClick={() => setShowNew(true)} className="w-full flex items-center justify-center gap-2 py-2 rounded-lg btn-brand text-white text-sm font-medium cursor-pointer">
            <Plus className="h-4 w-4" /> New Conversation
          </button>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input value={search} onChange={(e) => runSearch(e.target.value)} placeholder="Search messages…" className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-muted border border-border text-foreground text-xs" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {searchResults ? (
            searchResults.length === 0 ? <p className="text-muted-foreground text-xs p-4">No matches.</p> : searchResults.map((r) => (
              <button key={r.id} onClick={() => { setSearchResults(null); setSearch(""); selectConversation(r.conversation_id); }} className="w-full text-left px-3 py-2.5 border-b border-border/50 hover:bg-muted cursor-pointer">
                <p className="text-foreground text-xs font-medium truncate">{r.conversation_title || r.sender_name}</p>
                <p className="text-muted-foreground text-xs truncate">{r.sender_name}: {r.body}</p>
              </button>
            ))
          ) : conversations.length === 0 ? (
            <div className="p-6 text-center">
              <MessageSquare className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground text-sm">No conversations yet.</p>
            </div>
          ) : conversations.map((c) => (
            <button key={c.id} onClick={() => selectConversation(c.id)} className={`w-full text-left px-3 py-3 border-b border-border/50 cursor-pointer transition ${activeId === c.id ? "bg-indigo-600/10" : "hover:bg-muted"}`}>
              <div className="flex items-center justify-between gap-2 mb-0.5">
                <p className="text-foreground text-sm font-medium truncate flex items-center gap-1.5">
                  {c.type === "broadcast" && <Megaphone className="h-3.5 w-3.5 text-amber-400 shrink-0" />}
                  {c.type === "group" && <UsersIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
                  {conversationLabel(c)}
                </p>
                {c.unread_count > 0 && <span className="shrink-0 h-4.5 min-w-4.5 px-1 flex items-center justify-center rounded-full bg-red-500 text-[10px] text-white">{c.unread_count > 99 ? "99+" : c.unread_count}</span>}
              </div>
              <p className="text-muted-foreground text-xs truncate">{c.last_message || "No messages yet"}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        {!active ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">Select a conversation, or start a new one.</div>
        ) : (
          <>
            <div className="px-4 py-3 border-b border-border flex items-center gap-2">
              {active.type === "broadcast" && <Megaphone className="h-4 w-4 text-amber-400" />}
              <p className="text-foreground font-medium">{conversationLabel(active)}</p>
              {active.type === "broadcast" && <span className="text-muted-foreground text-xs">· {active.participant_count} recipients</span>}
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {loadingMessages && messages.length === 0 ? (
                <div className="flex justify-center pt-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
              ) : messages.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center pt-8">No messages yet — say hello.</p>
              ) : messages.map((m) => {
                const mine = m.sender_id === currentUserId;
                return (
                  <div key={m.id} className={`flex gap-2.5 ${mine ? "flex-row-reverse" : ""}`}>
                    <Avatar name={m.sender_name} />
                    <div className={`max-w-[70%] ${mine ? "items-end" : "items-start"} flex flex-col`}>
                      {!mine && <p className="text-muted-foreground text-[11px] mb-0.5">{m.sender_name}</p>}
                      <div className={`rounded-2xl px-3.5 py-2 text-sm ${mine ? "bg-indigo-600 text-white" : "bg-muted text-foreground"}`}>
                        {m.body && <p className="whitespace-pre-wrap break-words">{m.body}</p>}
                        {m.file_url && (
                          <a href={m.file_url} target="_blank" rel="noreferrer" className={`flex items-center gap-1.5 mt-1.5 text-xs underline ${mine ? "text-white/80" : "text-indigo-400"}`}>
                            <FileText className="h-3.5 w-3.5" /> {m.file_name}
                          </a>
                        )}
                      </div>
                      <p className="text-muted-foreground text-[10px] mt-0.5" title={formatDateTime(m.created_at, timezone)}>{formatRelative(m.created_at)}</p>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            {canPost ? (
              <form onSubmit={send} className="p-3 border-t border-border flex items-center gap-2">
                <input ref={fileInputRef} type="file" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
                <button type="button" onClick={() => fileInputRef.current?.click()} className="shrink-0 text-muted-foreground hover:text-foreground cursor-pointer p-2"><Paperclip className="h-4 w-4" /></button>
                <input value={text} onChange={(e) => setText(e.target.value)} placeholder={file ? file.name : "Type a message…"} className="flex-1 px-3 py-2 rounded-lg bg-muted border border-border text-foreground text-sm" />
                <button type="submit" disabled={sending} className="shrink-0 flex items-center justify-center h-9 w-9 rounded-lg btn-brand text-white disabled:opacity-60 cursor-pointer">
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </button>
              </form>
            ) : (
              <div className="p-3 border-t border-border text-center text-muted-foreground text-xs">Only a Super Admin can post in this announcement channel.</div>
            )}
          </>
        )}
      </div>

      {showNew && (
        <NewConversationModal
          users={messageableUsers}
          isSuperAdmin={isSuperAdmin}
          onClose={() => setShowNew(false)}
          onCreated={(id) => { setShowNew(false); refreshConversations(); selectConversation(id); }}
        />
      )}
    </div>
  );
}
