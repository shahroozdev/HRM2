"use client";

import { PageHeader } from "@/components/shared/page-header";
import { useAuthSession } from "@/hooks/use-auth-session";
import {
  createDepartmentChannel,
  fetchThread,
  markConversationRead,
  openSlackDm,
  sendSlackMessage,
  setTyping,
  uploadSlackFile,
  useSlackConversations,
  useSlackMessages,
  useSlackUserSearch,
  useSlackUsers,
} from "@/hooks/use-slack";
import { api } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

export default function MessagesPage(): React.JSX.Element {
  const session = useAuthSession();
  const role = session.data?.user?.role;
  const token = session.data?.accessToken;
  const isAdminOrHr = role === "super_admin" || role === "hr_manager";

  const users = useSlackUsers();
  const conversations = useSlackConversations();
  const departments = useQuery({
    queryKey: ["msg-departments"],
    queryFn: async () => (await api.get("/settings/departments")).data.data ?? [],
    enabled: isAdminOrHr,
  });

  const [channelId, setChannelId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [threadTs, setThreadTs] = useState<string | null>(null);
  const [threadItems, setThreadItems] = useState<any[]>([]);
  const [liveMessages, setLiveMessages] = useState<any[]>([]);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [readReceipts, setReadReceipts] = useState<Array<{ userId: string; lastReadTs: string | null }>>([]);

  const [departmentId, setDepartmentId] = useState("");
  const [channelPrefix, setChannelPrefix] = useState("dept");
  const [privateChannel, setPrivateChannel] = useState(true);

  const [mentionQuery, setMentionQuery] = useState("");
  const mentionLookup = useSlackUserSearch(mentionQuery);

  const [attachment, setAttachment] = useState<File | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const messagesQuery = useSlackMessages(channelId);

  useEffect(() => {
    if (!channelId || !token) {
      setLiveMessages([]);
      setTypingUsers([]);
      setOnlineUsers([]);
      setReadReceipts([]);
      return;
    }

    const streamUrl = `${process.env.NEXT_PUBLIC_API_URL}/slack/conversations/${channelId}/stream?token=${encodeURIComponent(token)}`;
    const eventSource = new EventSource(streamUrl);

    eventSource.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as { messages: any[]; typingUsers: string[]; onlineUsers: string[]; readReceipts: Array<{ userId: string; lastReadTs: string | null }> };
        setLiveMessages(payload.messages ?? []);
        setTypingUsers(payload.typingUsers ?? []);
        setOnlineUsers(payload.onlineUsers ?? []);
        setReadReceipts(payload.readReceipts ?? []);
      } catch {
        // ignore malformed events
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
    };

    return () => eventSource.close();
  }, [channelId, token]);

  const currentMessages = useMemo(() => {
    if (liveMessages.length) return liveMessages;
    return messagesQuery.data?.data ?? [];
  }, [liveMessages, messagesQuery.data]);

  useEffect(() => {
    if (!channelId || !currentMessages.length) return;
    const latestTs = currentMessages[0]?.ts;
    if (latestTs) {
      void markConversationRead(channelId, latestTs);
    }
  }, [channelId, currentMessages]);

  const currentUserId = session.data?.user?.id;

  const typingOthers = typingUsers.filter((id) => id !== currentUserId);
  const onlineCount = onlineUsers.length;

  return (
    <div>
      <PageHeader title="Messages" description="Slack-powered internal chat inside HRM (live typing, mentions, threads, files)" />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4">
          <div className="rounded-xl border p-4">
            <h3 className="mb-2 text-sm font-semibold">Start Direct Message</h3>
            <div className="space-y-2">
              {(users.data?.data ?? []).map((u: any) => (
                <button
                  key={u.id}
                  type="button"
                  className="w-full rounded border px-3 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800"
                  onClick={async () => {
                    if (!u.linked) {
                      toast.error("User has no Slack email linked");
                      return;
                    }
                    try {
                      const res = await openSlackDm(u.id);
                      const id = res?.data?.channelId;
                      if (id) {
                        setChannelId(id);
                        toast.success(`DM opened with ${u.email}`);
                      }
                    } catch (e: any) {
                      toast.error(e?.response?.data?.error?.message ?? "Failed to open DM");
                    }
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="font-medium">{u.email}</div>
                    {onlineUsers.includes(u.id) && <span className="rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] text-white">online</span>}
                  </div>
                  <div className="text-xs text-slate-500">{u.linked ? u.slackEmail : "No Slack mapping"}</div>
                </button>
              ))}
            </div>
          </div>

          {isAdminOrHr && (
            <div className="rounded-xl border p-4">
              <h3 className="mb-2 text-sm font-semibold">Create Department Channel</h3>
              <div className="space-y-2">
                <select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} className="w-full rounded border p-2 text-sm">
                  <option value="">Select department</option>
                  {(departments.data ?? []).map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
                <input value={channelPrefix} onChange={(e) => setChannelPrefix(e.target.value)} placeholder="Channel prefix" className="w-full rounded border p-2 text-sm" />
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={privateChannel} onChange={(e) => setPrivateChannel(e.target.checked)} />
                  Private channel
                </label>
                <button
                  type="button"
                  className="rounded bg-[var(--accent)] px-3 py-2 text-sm text-white"
                  onClick={async () => {
                    if (!departmentId) {
                      toast.error("Select a department");
                      return;
                    }
                    try {
                      const res = await createDepartmentChannel(departmentId, privateChannel, channelPrefix || "dept");
                      toast.success(`Channel created: ${res?.data?.channelName ?? "success"}`);
                      await conversations.refetch();
                    } catch (e: any) {
                      toast.error(e?.response?.data?.error?.message ?? "Failed to create channel");
                    }
                  }}
                >
                  Create Channel from Department
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="rounded-xl border p-4">
          <h3 className="mb-2 text-sm font-semibold">Conversations</h3>
          <div className="mb-2 text-xs text-slate-500">Online users: {onlineCount}</div>
          <div className="space-y-2">
            {(conversations.data?.data ?? []).map((c: any) => (
              <button
                key={c.id}
                type="button"
                className={`w-full rounded border px-3 py-2 text-left text-sm ${channelId === c.id ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40" : "hover:bg-slate-50 dark:hover:bg-slate-800"}`}
                onClick={() => {
                  setChannelId(c.id);
                  setThreadTs(null);
                  setThreadItems([]);
                }}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{c.name}</span>
                  {Number(c.unreadCount ?? 0) > 0 && <span className="rounded-full bg-indigo-600 px-2 py-0.5 text-xs text-white">{c.unreadCount}</span>}
                </div>
                <div className="text-xs text-slate-500">
                  {c.isIm ? "Direct" : c.isGroup ? "Group" : c.isChannel ? "Channel" : "Conversation"}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-xl border p-4 lg:col-span-1">
          <h3 className="mb-2 text-sm font-semibold">Messages {channelId ? `(Live)` : ""}</h3>
          {!channelId ? (
            <p className="text-sm text-slate-500">Pick a conversation to view and send messages.</p>
          ) : (
            <>
              <div className="mb-3 max-h-80 space-y-2 overflow-y-auto rounded border p-2">
                {currentMessages.map((m: any) => (
                  <div key={m.ts} className="rounded border p-2 text-sm">
                    <div className="text-xs text-slate-500">{m.user ?? "bot"} | {m.ts}</div>
                    <div>{m.text}</div>
                    <div className="mt-1 flex gap-2">
                      {m.replyCount > 0 && (
                        <button
                          type="button"
                          className="text-xs text-indigo-600"
                          onClick={async () => {
                            setThreadTs(m.threadTs ?? m.ts);
                            const res = await fetchThread(channelId, m.threadTs ?? m.ts);
                            setThreadItems(res.data ?? []);
                          }}
                        >
                          View thread ({m.replyCount})
                        </button>
                      )}
                      <button type="button" className="text-xs text-slate-600" onClick={() => setThreadTs(m.threadTs ?? m.ts)}>
                        Reply in thread
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {threadTs && (
                <div className="mb-3 rounded border p-2 text-xs">
                  <div className="mb-1 font-semibold">Thread {threadTs}</div>
                  <div className="max-h-28 space-y-1 overflow-y-auto">
                    {threadItems.map((item) => (
                      <div key={item.ts} className="rounded bg-slate-100 p-1 dark:bg-slate-800">{item.user ?? "bot"}: {item.text}</div>
                    ))}
                  </div>
                </div>
              )}

              <div className="mb-2 text-xs text-slate-500">
                {typingOthers.length > 0 ? `${typingOthers.length} user(s) typing...` : ""}
              </div>

              <div className="mb-2">
                <input
                  value={mentionQuery}
                  onChange={(e) => setMentionQuery(e.target.value)}
                  placeholder="Search user to mention"
                  className="w-full rounded border p-2 text-sm"
                />
                {mentionQuery.trim() && (
                  <div className="mt-1 max-h-24 overflow-y-auto rounded border bg-white p-1 text-xs dark:bg-slate-900">
                    {(mentionLookup.data?.data ?? []).map((u: any) => (
                      <button
                        key={u.id}
                        type="button"
                        className="block w-full rounded px-2 py-1 text-left hover:bg-slate-100 dark:hover:bg-slate-800"
                        onClick={() => {
                          setMessage((prev) => `${prev}${prev ? " " : ""}<@${u.id}>`);
                          setMentionQuery("");
                        }}
                      >
                        {u.name} ({u.email || u.username})
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {readReceipts.length > 0 && (
                <div className="mb-2 rounded border p-2 text-xs text-slate-500">
                  Read receipts: {readReceipts.filter((r) => r.lastReadTs).length}
                </div>
              )}

              <div className="mb-2">
                <input type="file" onChange={(e) => setAttachment(e.target.files?.[0] ?? null)} className="w-full rounded border p-2 text-xs" />
              </div>

              <div className="flex gap-2">
                <input
                  value={message}
                  onChange={async (e) => {
                    const value = e.target.value;
                    setMessage(value);
                    if (!channelId) return;
                    await setTyping(channelId, true);
                    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
                    typingTimeoutRef.current = setTimeout(() => {
                      void setTyping(channelId, false);
                    }, 1500);
                  }}
                  placeholder={threadTs ? "Reply in thread..." : "Send message..."}
                  className="w-full rounded border p-2 text-sm"
                />
                <button
                  type="button"
                  className="rounded bg-[var(--accent)] px-3 py-2 text-white"
                  onClick={async () => {
                    if (!message.trim() && !attachment) return;
                    try {
                      if (attachment && channelId) {
                        await uploadSlackFile(channelId, attachment, message.trim() || undefined, threadTs ?? undefined);
                        setAttachment(null);
                      } else if (channelId) {
                        await sendSlackMessage(channelId, message.trim(), threadTs ?? undefined);
                      }
                      setMessage("");
                      if (channelId) await setTyping(channelId, false);
                      toast.success("Sent");
                    } catch (e: any) {
                      toast.error(e?.response?.data?.error?.message ?? "Failed to send");
                    }
                  }}
                >
                  Send
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
