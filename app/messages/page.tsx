"use client";
import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { apiGetConversations, apiGetMessages, apiSendMessage, apiGetOrCreateConversation } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import { pushNotification } from "@/lib/notifications-store";
import type { Conversation, Message } from "@/lib/types";

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function MessagesPage() {
  return (
    <Suspense fallback={<div className="max-w-7xl mx-auto px-4 py-10"><div className="h-96 bg-white/5 rounded-2xl animate-pulse" /></div>}>
      <MessagesContent />
    </Suspense>
  );
}

function MessagesContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [input, setInput] = useState("");
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Load conversations
  useEffect(() => {
    if (!user) return;
    apiGetConversations(user.id).then((data) => {
      setConversations(data);
      setLoadingConvs(false);

      // If redirected from "Message Seller" with ?with=<userId>&name=<name>
      const withUserId = searchParams.get("with");
      const withName = searchParams.get("name");
      if (withUserId && withName && user) {
        apiGetOrCreateConversation(user.id, withUserId).then((convId) => {
          const existing = data.find((c) => c.id === convId);
          if (existing) {
            setActiveConv(existing);
          } else {
            // New conversation — add it to list
            const newConv: Conversation = {
              id: convId,
              participantId: withUserId,
              participantName: decodeURIComponent(withName),
              lastMessage: "",
              lastMessageAt: new Date().toISOString(),
              unreadCount: 0,
              isAdmin: false,
            };
            setConversations((prev) => [newConv, ...prev]);
            setActiveConv(newConv);
          }
        });
      }
    });
  }, [user, searchParams]);

  // Load messages when conversation changes
  useEffect(() => {
    if (!activeConv) return;
    setLoadingMsgs(true);
    apiGetMessages(activeConv.id).then((data) => {
      setMessages(data);
      setLoadingMsgs(false);
    });
  }, [activeConv]);

  // Real-time listener for new messages in active conversation
  useEffect(() => {
    if (!activeConv) return;

    // Remove previous channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase
      .channel(`messages:${activeConv.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${activeConv.id}`,
        },
        (payload) => {
          const row = payload.new as Record<string, unknown>;
          const newMsg: Message = {
            id: row.id as string,
            senderId: row.sender_id as string,
            senderName: row.sender_name as string,
            content: row.content as string,
            createdAt: row.created_at as string,
            read: row.read as boolean,
          };
          // Avoid duplicate if we already added it optimistically
          setMessages((prev) =>
            prev.find((m) => m.id === newMsg.id) ? prev : [...prev, newMsg]
          );
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeConv]);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !activeConv || !user) return;
    setSending(true);
    const content = input.trim();
    setInput("");

    // Optimistic update
    const optimistic: Message = {
      id: `temp-${Date.now()}`,
      senderId: user.id,
      senderName: user.name,
      content,
      createdAt: new Date().toISOString(),
      read: false,
    };
    setMessages((prev) => [...prev, optimistic]);

    try {
      const saved = await apiSendMessage(activeConv.id, content, user.id, user.name);
      // Replace optimistic with real
      setMessages((prev) => prev.map((m) => m.id === optimistic.id ? saved : m));
      // Update last message in conv list
      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeConv.id
            ? { ...c, lastMessage: content, lastMessageAt: saved.createdAt }
            : c
        )
      );
      // Notify the other participant
      await pushNotification(
        activeConv.participantId,
        `New message from ${user.name}`,
        content.length > 60 ? content.slice(0, 60) + "…" : content
      );
    } catch {
      // Remove optimistic on failure
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
    }

    setSending(false);
  };

  if (!user) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-20 text-center">
        <p className="text-gray-400">Please <a href="/login" className="text-violet-400 hover:text-violet-300">sign in</a> to view messages.</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 animate-fade-in">
      <h1 className="text-3xl font-black text-white mb-6">Messages</h1>

      <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden flex h-[600px]">

        {/* Conversation list */}
        <div className={`w-full sm:w-72 border-r border-white/10 flex flex-col ${activeConv ? "hidden sm:flex" : "flex"}`}>
          <div className="p-4 border-b border-white/10">
            <p className="text-sm font-semibold text-gray-400">Conversations</p>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loadingConvs ? (
              <div className="p-4 space-y-3">
                {[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-white/5 rounded-xl animate-pulse" />)}
              </div>
            ) : conversations.length === 0 ? (
              <div className="p-8 text-center text-gray-500 text-sm">
                <p className="text-3xl mb-2">💬</p>
                No conversations yet.
              </div>
            ) : (
              conversations.map((conv) => (
                <button key={conv.id} onClick={() => setActiveConv(conv)}
                  className={`w-full text-left px-4 py-3 hover:bg-white/5 transition-colors border-b border-white/5 ${activeConv?.id === conv.id ? "bg-violet-600/10 border-l-2 border-l-violet-500" : ""}`}>
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-sm font-semibold text-white truncate">{conv.participantName}</span>
                    <span className="text-xs text-gray-500 shrink-0 ml-2">{timeAgo(conv.lastMessageAt)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-500 truncate flex-1">{conv.lastMessage || "No messages yet"}</p>
                    {conv.unreadCount > 0 && (
                      <span className="ml-2 bg-violet-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center shrink-0">
                        {conv.unreadCount}
                      </span>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Thread view */}
        <div className={`flex-1 flex flex-col ${!activeConv ? "hidden sm:flex" : "flex"}`}>
          {!activeConv ? (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <p className="text-4xl mb-3">💬</p>
                <p className="text-sm">Select a conversation to start messaging</p>
              </div>
            </div>
          ) : (
            <>
              {/* Thread header */}
              <div className="px-4 py-3 border-b border-white/10 flex items-center gap-3">
                <button onClick={() => setActiveConv(null)} className="sm:hidden text-gray-400 hover:text-white">←</button>
                <div className="w-8 h-8 rounded-full bg-violet-600/30 flex items-center justify-center text-violet-300 text-xs font-bold">
                  {activeConv.participantName[0].toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-white text-sm">{activeConv.participantName}</p>
                  <p className="text-xs text-green-400">Active</p>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {loadingMsgs ? (
                  <div className="space-y-3">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className={`h-12 bg-white/5 rounded-xl animate-pulse ${i % 2 === 0 ? "w-2/3" : "w-2/3 ml-auto"}`} />
                    ))}
                  </div>
                ) : messages.length === 0 ? (
                  <p className="text-center text-gray-500 text-sm py-8">No messages yet. Say hello!</p>
                ) : (
                  messages.map((msg) => {
                    const isMe = msg.senderId === user.id;
                    return (
                      <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-xs lg:max-w-md px-4 py-2.5 rounded-2xl text-sm ${isMe ? "bg-violet-600 text-white rounded-br-sm" : "bg-white/10 text-gray-200 rounded-bl-sm"}`}>
                          {!isMe && <p className="text-xs font-semibold text-violet-300 mb-1">{msg.senderName}</p>}
                          <p>{msg.content}</p>
                          <p className={`text-xs mt-1 ${isMe ? "text-violet-200" : "text-gray-500"}`}>
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={bottomRef} />
              </div>

              {/* Input */}
              <form onSubmit={handleSend} className="p-4 border-t border-white/10 flex gap-3">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type a message…"
                  className="flex-1 px-4 py-2.5 bg-white/5 border border-white/15 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 transition-all text-sm"
                />
                <button type="submit" disabled={sending || !input.trim()}
                  className="px-5 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-semibold rounded-xl transition-colors text-sm">
                  {sending ? "…" : "Send"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
