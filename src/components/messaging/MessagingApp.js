"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { MessageSquare, Send, Paperclip, Search, Plus, Megaphone, Users as UsersIcon, X, Loader2, FileText, ArrowLeft, MoreVertical, Pencil, Check, LogOut, Ban, ShieldOff } from "lucide-react";
import { apiFetch } from "@/components/shared/apiClient";
import { useTimezone } from "@/components/shared/TimezoneProvider";
import { formatRelative, formatDateTime } from "@/lib/helpers/dateFormat";
import ModalFocusTrap from "@/components/shared/ModalFocusTrap";

const POLL_MS = 12000;
const EDIT_WINDOW_MS = 2 * 60 * 1000; // mirrors the server-side window in messaging.js — UI-only, the server re-checks on save

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

  useEffect(() => {
    function onKey(e) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <ModalFocusTrap>
      <div role="dialog" aria-modal="true" aria-label="New Conversation" className="relative w-full max-w-md max-h-[85vh] overflow-y-auto bg-background border border-border rounded-xl shadow-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="text-foreground font-medium">New Conversation</p>
          <button onClick={onClose} aria-label="Close" className="text-muted-foreground hover:text-foreground cursor-pointer"><X className="h-4 w-4" /></button>
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
      </ModalFocusTrap>
    </div>
  );
}

function GroupInfoPanel({ conversation, currentUserId, messageableUsers, onClose, onLeave, onUpdated }) {
  const [participants, setParticipants] = useState(null);
  const [leaving, setLeaving] = useState(false);
  const [removingId, setRemovingId] = useState(null);
  const isAdmin = conversation.created_by === currentUserId;

  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(conversation.title || "");
  const [savingName, setSavingName] = useState(false);

  const [showAdd, setShowAdd] = useState(false);
  const [addSelected, setAddSelected] = useState([]);
  const [adding, setAdding] = useState(false);

  function load() {
    apiFetch(`/api/messaging/conversations/${conversation.id}/participants`)
      .then((res) => res.json())
      .then((data) => setParticipants(data.participants || []))
      .catch(() => setParticipants([]));
  }
  useEffect(() => { load(); }, [conversation.id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function leave() {
    if (!confirm("Leave this group? You'll stop receiving its messages.")) return;
    setLeaving(true);
    try {
      const res = await apiFetch(`/api/messaging/conversations/${conversation.id}/leave`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to leave group.");
      onLeave();
    } catch (err) { toast.error(err.message); setLeaving(false); }
  }

  async function saveName() {
    const trimmed = nameDraft.trim();
    if (!trimmed || trimmed === conversation.title) { setEditingName(false); return; }
    setSavingName(true);
    try {
      const res = await apiFetch(`/api/messaging/conversations/${conversation.id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: trimmed }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to rename group.");
      setEditingName(false);
      onUpdated();
    } catch (err) { toast.error(err.message); } finally { setSavingName(false); }
  }

  async function addMembers() {
    if (!addSelected.length) return;
    setAdding(true);
    try {
      const res = await apiFetch(`/api/messaging/conversations/${conversation.id}/participants`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userIds: addSelected }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to add members.");
      toast.success("Members added.");
      setAddSelected([]);
      setShowAdd(false);
      load();
      onUpdated();
    } catch (err) { toast.error(err.message); } finally { setAdding(false); }
  }

  async function removeMember(userId, name) {
    if (!confirm(`Remove ${name} from the group?`)) return;
    setRemovingId(userId);
    try {
      const res = await apiFetch(`/api/messaging/conversations/${conversation.id}/participants`, {
        method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to remove member.");
      load();
      onUpdated();
    } catch (err) { toast.error(err.message); } finally { setRemovingId(null); }
  }

  const memberIds = new Set((participants || []).map((p) => p.id));
  const addableUsers = (messageableUsers || []).filter((u) => !memberIds.has(u.id));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <ModalFocusTrap>
      <div role="dialog" aria-modal="true" aria-label="Group info" className="relative w-full max-w-sm max-h-[80vh] overflow-y-auto bg-background border border-border rounded-xl shadow-2xl p-5">
        <div className="flex items-center justify-between mb-4 gap-2">
          {editingName ? (
            <div className="flex items-center gap-1.5 flex-1 min-w-0">
              <input autoFocus value={nameDraft} onChange={(e) => setNameDraft(e.target.value)} onKeyDown={(e) => e.key === "Enter" && saveName()} maxLength={100} className="flex-1 min-w-0 px-2 py-1 rounded-lg bg-muted border border-border text-foreground text-sm" />
              <button onClick={saveName} disabled={savingName} aria-label="Save group name" className="text-emerald-400 hover:text-emerald-300 cursor-pointer disabled:opacity-60">{savingName ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}</button>
              <button onClick={() => { setEditingName(false); setNameDraft(conversation.title || ""); }} aria-label="Cancel" className="text-muted-foreground hover:text-foreground cursor-pointer"><X className="h-4 w-4" /></button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 min-w-0">
              <p className="text-foreground font-medium truncate">{conversationLabel(conversation)}</p>
              {isAdmin && (
                <button onClick={() => setEditingName(true)} aria-label="Rename group" className="text-muted-foreground hover:text-foreground cursor-pointer shrink-0"><Pencil className="h-3.5 w-3.5" /></button>
              )}
            </div>
          )}
          <button onClick={onClose} aria-label="Close" className="text-muted-foreground hover:text-foreground cursor-pointer shrink-0"><X className="h-4 w-4" /></button>
        </div>

        <div className="flex items-center justify-between mb-2">
          <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">{participants ? `${participants.length} members` : "Members"}</p>
          {isAdmin && (
            <button onClick={() => setShowAdd((s) => !s)} className="text-indigo-400 hover:text-indigo-300 text-xs font-medium cursor-pointer">{showAdd ? "Cancel" : "+ Add"}</button>
          )}
        </div>

        {showAdd && (
          <div className="mb-3 p-2.5 rounded-lg bg-muted/50 border border-border">
            {addableUsers.length === 0 ? (
              <p className="text-muted-foreground text-xs">Everyone in your company is already in this group.</p>
            ) : (
              <div className="max-h-40 overflow-y-auto space-y-1 mb-2">
                {addableUsers.map((u) => (
                  <label key={u.id} className="flex items-center gap-2 px-1 py-1 rounded-md hover:bg-muted cursor-pointer text-sm text-foreground">
                    <input type="checkbox" checked={addSelected.includes(u.id)} onChange={() => setAddSelected((prev) => prev.includes(u.id) ? prev.filter((x) => x !== u.id) : [...prev, u.id])} />
                    {u.name}
                  </label>
                ))}
              </div>
            )}
            {addableUsers.length > 0 && (
              <button onClick={addMembers} disabled={adding || !addSelected.length} className="w-full flex items-center justify-center gap-2 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium cursor-pointer disabled:opacity-50">
                {adding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null} Add Selected
              </button>
            )}
          </div>
        )}

        {!participants ? (
          <div className="flex justify-center py-6"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="space-y-1 mb-4">
            {participants.map((p) => (
              <div key={p.id} className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-muted group">
                <Avatar name={p.name} />
                <div className="min-w-0 flex-1">
                  <p className="text-foreground text-sm truncate">
                    {p.name}{p.id === currentUserId ? " (You)" : ""}{p.id === conversation.created_by ? " · Admin" : ""}
                  </p>
                  <p className="text-muted-foreground text-xs truncate">{p.email}</p>
                </div>
                {isAdmin && p.id !== currentUserId && (
                  <button onClick={() => removeMember(p.id, p.name)} disabled={removingId === p.id} aria-label={`Remove ${p.name}`} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-400 cursor-pointer disabled:opacity-60 shrink-0 transition-opacity">
                    {removingId === p.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
        <button onClick={leave} disabled={leaving} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-sm font-medium cursor-pointer disabled:opacity-60">
          {leaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />} Leave Group
        </button>
      </div>
      </ModalFocusTrap>
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
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [showHeaderMenu, setShowHeaderMenu] = useState(false);
  const [blockStatus, setBlockStatus] = useState({ blockedByMe: false, blockedMe: false });
  const [blockBusy, setBlockBusy] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const fileInputRef = useRef(null);
  const bottomRef = useRef(null);

  // Ticks the clock so an edit button quietly disappears the moment the
  // 2-minute window closes, instead of staying clickable until the next
  // unrelated re-render.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(id);
  }, []);

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

  // Mobile only — desktop always shows both panes side by side via the
  // md:flex overrides below. Picking a conversation switches the single
  // visible pane from the list to the chat; "Back" reverses it. Nothing
  // about this touches which conversation is active or how messages load.
  const [mobilePane, setMobilePane] = useState("list");

  function selectConversation(id) {
    setActiveId(id);
    setMobilePane("chat");
    setShowHeaderMenu(false);
    setEditingId(null);
    router.replace(`/workspace/messages/${id}`);
  }

  const activeConversation = conversations.find((c) => c.id === activeId);

  // Direct-conversation block status only means anything once we know who
  // the other person is — refetched whenever the active direct conversation
  // changes, reset to "not blocked" for groups/broadcast/no selection.
  useEffect(() => {
    if (activeConversation?.type === "direct" && activeConversation.other_participant_id) {
      apiFetch(`/api/messaging/users/${activeConversation.other_participant_id}/block`)
        .then((res) => res.json())
        .then((data) => setBlockStatus({ blockedByMe: !!data.blockedByMe, blockedMe: !!data.blockedMe }))
        .catch(() => setBlockStatus({ blockedByMe: false, blockedMe: false }));
    } else {
      setBlockStatus({ blockedByMe: false, blockedMe: false });
    }
  }, [activeConversation?.id, activeConversation?.type, activeConversation?.other_participant_id]);

  async function toggleBlock() {
    if (!activeConversation?.other_participant_id) return;
    setBlockBusy(true);
    setShowHeaderMenu(false);
    try {
      const method = blockStatus.blockedByMe ? "DELETE" : "POST";
      const res = await apiFetch(`/api/messaging/users/${activeConversation.other_participant_id}/block`, { method });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed.");
      setBlockStatus((s) => ({ ...s, blockedByMe: !s.blockedByMe }));
      toast.success(blockStatus.blockedByMe ? "Unblocked." : "Blocked. They can no longer message you.");
    } catch (err) { toast.error(err.message); } finally { setBlockBusy(false); }
  }

  function startEdit(m) {
    setEditingId(m.id);
    setEditText(m.body || "");
  }
  function cancelEdit() { setEditingId(null); setEditText(""); }

  async function saveEdit(messageId) {
    if (!editText.trim()) { toast.error("Message can't be empty."); return; }
    setSavingEdit(true);
    try {
      const res = await apiFetch(`/api/messaging/conversations/${activeId}/messages/${messageId}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ body: editText }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to save.");
      setEditingId(null); setEditText("");
      await loadMessages(activeId);
    } catch (err) { toast.error(err.message); } finally { setSavingEdit(false); }
  }

  function handleLeftGroup() {
    setShowGroupInfo(false);
    setConversations((prev) => prev.filter((c) => c.id !== activeId));
    setActiveId(null);
    setMobilePane("list");
    router.replace("/workspace/messages");
    toast.success("You left the group.");
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

  const active = activeConversation;
  const isBlocked = blockStatus.blockedByMe || blockStatus.blockedMe;
  const canPost = (!active || active.type !== "broadcast" || isSuperAdmin) && !(active?.type === "direct" && isBlocked);

  return (
    <div className="h-[calc(100vh-8rem)] flex bg-card border border-border rounded-xl overflow-hidden">
      <div className={`w-full md:w-80 shrink-0 border-r border-border flex-col ${mobilePane === "chat" ? "hidden md:flex" : "flex"}`}>
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

      <div className={`flex-1 flex-col min-w-0 ${mobilePane === "chat" ? "flex" : "hidden md:flex"}`}>
        {!active ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">Select a conversation, or start a new one.</div>
        ) : (
          <>
            <div className="px-4 py-3 border-b border-border flex items-center gap-2">
              <button onClick={() => setMobilePane("list")} className="md:hidden -ml-1 text-muted-foreground hover:text-foreground cursor-pointer p-1"><ArrowLeft className="h-4 w-4" /></button>
              {active.type === "broadcast" && <Megaphone className="h-4 w-4 text-amber-400" />}
              {active.type === "group" && <UsersIcon className="h-4 w-4 text-muted-foreground" />}
              <p className="text-foreground font-medium truncate">{conversationLabel(active)}</p>
              {active.type === "broadcast" && <span className="text-muted-foreground text-xs shrink-0">· {active.participant_count} recipients</span>}
              {active.type === "group" && <span className="text-muted-foreground text-xs shrink-0">· {active.participant_count} members</span>}

              {(active.type === "group" || (active.type === "direct" && active.other_participant_id)) && (
                <div className="relative ml-auto shrink-0">
                  <button onClick={() => setShowHeaderMenu((o) => !o)} aria-label="Conversation options" className="text-muted-foreground hover:text-foreground cursor-pointer p-1.5 rounded-lg hover:bg-muted"><MoreVertical className="h-4 w-4" /></button>
                  {showHeaderMenu && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setShowHeaderMenu(false)} />
                      <div className="absolute right-0 top-full mt-1 z-20 w-44 bg-background border border-border rounded-lg shadow-xl py-1">
                        {active.type === "group" && (
                          <button onClick={() => { setShowHeaderMenu(false); setShowGroupInfo(true); }} className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-foreground hover:bg-muted cursor-pointer">
                            <UsersIcon className="h-3.5 w-3.5" /> Group info
                          </button>
                        )}
                        {active.type === "direct" && (
                          <button onClick={toggleBlock} disabled={blockBusy || blockStatus.blockedMe} className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-foreground hover:bg-muted cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
                            {blockStatus.blockedByMe ? <ShieldOff className="h-3.5 w-3.5" /> : <Ban className="h-3.5 w-3.5" />}
                            {blockStatus.blockedByMe ? "Unblock" : "Block"}
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            {active.type === "direct" && isBlocked && (
              <div className="px-4 py-2 bg-red-500/10 border-b border-red-500/20 text-red-400 text-xs flex items-center justify-between gap-3">
                <span>{blockStatus.blockedByMe ? "You blocked this contact — they can't message you." : "You can't message this contact."}</span>
                {blockStatus.blockedByMe && <button onClick={toggleBlock} disabled={blockBusy} className="shrink-0 underline cursor-pointer">Unblock</button>}
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {loadingMessages && messages.length === 0 ? (
                <div className="flex justify-center pt-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
              ) : messages.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center pt-8">No messages yet — say hello.</p>
              ) : messages.map((m) => {
                if (m.message_type === "system") {
                  return <p key={m.id} className="text-muted-foreground text-xs text-center py-1">{m.body}</p>;
                }
                const mine = m.sender_id === currentUserId;
                const canEdit = mine && !m.file_url && now - new Date(m.created_at).getTime() < EDIT_WINDOW_MS;
                const isEditing = editingId === m.id;
                return (
                  <div key={m.id} className={`group flex gap-2.5 ${mine ? "flex-row-reverse" : ""}`}>
                    <Avatar name={m.sender_name} />
                    <div className={`max-w-[70%] ${mine ? "items-end" : "items-start"} flex flex-col`}>
                      {!mine && <p className="text-muted-foreground text-[11px] mb-0.5">{m.sender_name}</p>}
                      {isEditing ? (
                        <div className="w-full min-w-[220px] space-y-1.5">
                          <textarea autoFocus rows={2} value={editText} onChange={(e) => setEditText(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-muted border border-indigo-500/50 text-foreground text-sm focus:outline-none" />
                          <div className="flex items-center gap-1.5 justify-end">
                            <button onClick={cancelEdit} className="px-2 py-1 rounded-md text-xs text-muted-foreground hover:text-foreground cursor-pointer">Cancel</button>
                            <button onClick={() => saveEdit(m.id)} disabled={savingEdit} className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs btn-brand text-white cursor-pointer disabled:opacity-60">
                              {savingEdit ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />} Save
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className={`flex items-center gap-1 ${mine ? "flex-row-reverse" : ""}`}>
                          <div className={`rounded-2xl px-3.5 py-2 text-sm ${mine ? "bg-indigo-600 text-white" : "bg-muted text-foreground"}`}>
                            {m.body && <p className="whitespace-pre-wrap break-words">{m.body}</p>}
                            {m.file_url && (
                              <a href={m.file_url} target="_blank" rel="noreferrer" className={`flex items-center gap-1.5 mt-1.5 text-xs underline ${mine ? "text-white/80" : "text-indigo-400"}`}>
                                <FileText className="h-3.5 w-3.5" /> {m.file_name}
                              </a>
                            )}
                          </div>
                          {canEdit && (
                            <button onClick={() => startEdit(m)} aria-label="Edit message" className="opacity-0 group-hover:opacity-100 transition text-muted-foreground hover:text-foreground cursor-pointer p-1 shrink-0"><Pencil className="h-3 w-3" /></button>
                          )}
                        </div>
                      )}
                      <p className="text-muted-foreground text-[10px] mt-0.5" title={formatDateTime(m.created_at, timezone)}>
                        {formatRelative(m.created_at)}{m.edited_at ? " · edited" : ""}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            {canPost ? (
              <form onSubmit={send} className="p-3 border-t border-border flex items-center gap-2">
                <input ref={fileInputRef} type="file" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
                <button type="button" onClick={() => fileInputRef.current?.click()} aria-label="Attach file" className="shrink-0 text-muted-foreground hover:text-foreground cursor-pointer p-2"><Paperclip className="h-4 w-4" /></button>
                <input value={text} onChange={(e) => setText(e.target.value)} aria-label="Message" placeholder={file ? file.name : "Type a message…"} className="flex-1 px-3 py-2 rounded-lg bg-muted border border-border text-foreground text-sm" />
                <button type="submit" disabled={sending} aria-label="Send message" className="shrink-0 flex items-center justify-center h-9 w-9 rounded-lg btn-brand text-white disabled:opacity-60 cursor-pointer">
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </button>
              </form>
            ) : active.type === "broadcast" ? (
              <div className="p-3 border-t border-border text-center text-muted-foreground text-xs">Only a Super Admin can post in this announcement channel.</div>
            ) : (
              <div className="p-3 border-t border-border text-center text-muted-foreground text-xs">This conversation is blocked — no new messages can be sent.</div>
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

      {showGroupInfo && active?.type === "group" && (
        <GroupInfoPanel
          conversation={active} currentUserId={currentUserId} messageableUsers={messageableUsers}
          onClose={() => setShowGroupInfo(false)} onLeave={handleLeftGroup} onUpdated={refreshConversations}
        />
      )}
    </div>
  );
}
