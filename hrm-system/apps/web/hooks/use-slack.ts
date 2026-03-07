"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useSlackUsers() {
  return useQuery({
    queryKey: ["slack-users"],
    queryFn: async () => (await api.get("/slack/users")).data,
  });
}

export function useSlackUserSearch(query: string) {
  return useQuery({
    queryKey: ["slack-user-search", query],
    queryFn: async () => (await api.get("/slack/users/search", { params: { q: query } })).data,
    enabled: query.trim().length > 0,
  });
}

export function useSlackConversations() {
  return useQuery({
    queryKey: ["slack-conversations"],
    queryFn: async () => (await api.get("/slack/conversations")).data,
  });
}

export function useSlackMessages(channelId: string | null) {
  return useQuery({
    queryKey: ["slack-messages", channelId],
    queryFn: async () => (await api.get(`/slack/conversations/${channelId}/messages`)).data,
    enabled: Boolean(channelId),
    refetchInterval: false,
  });
}

export async function openSlackDm(targetUserId: string) {
  const response = await api.post("/slack/dm/open", { targetUserId });
  return response.data;
}

export async function createDepartmentChannel(departmentId: string, isPrivate = true, prefix = "dept") {
  const response = await api.post(`/slack/channels/from-department/${departmentId}`, { isPrivate, prefix });
  return response.data;
}

export async function setTyping(channelId: string, isTyping: boolean) {
  const response = await api.post(`/slack/conversations/${channelId}/typing`, { isTyping });
  return response.data;
}

export async function markConversationRead(channelId: string, lastReadTs?: string) {
  const response = await api.post(`/slack/conversations/${channelId}/read`, { lastReadTs });
  return response.data;
}

export async function sendSlackMessage(channelId: string, text: string, threadTs?: string) {
  const response = await api.post(`/slack/conversations/${channelId}/messages`, { text, threadTs });
  return response.data;
}

export async function uploadSlackFile(channelId: string, file: File, text?: string, threadTs?: string) {
  const formData = new FormData();
  formData.append("file", file);
  if (text) formData.append("text", text);
  if (threadTs) formData.append("threadTs", threadTs);
  const response = await api.post(`/slack/conversations/${channelId}/upload`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
}

export async function fetchThread(channelId: string, threadTs: string) {
  const response = await api.get(`/slack/conversations/${channelId}/threads/${encodeURIComponent(threadTs)}`);
  return response.data;
}
