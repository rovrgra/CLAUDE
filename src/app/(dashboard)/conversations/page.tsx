"use client";

import { useState } from "react";
import {
  MessageSquare, Search, Bot, User, Send, Phone,
  MoreHorizontal, Loader2,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useOrg } from "@/lib/org-context";

export default function ConversationsPage() {
  const { organizationId } = useOrg();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState("");
  const [filter, setFilter] = useState<string>("all");

  const statusMap: Record<string, string | undefined> = {
    all: undefined, open: "OPEN", pending: "PENDING", resolved: "RESOLVED",
  };

  const { data, isLoading } = trpc.conversation.list.useQuery(
    { organizationId, status: statusMap[filter] as any },
    { enabled: !!organizationId }
  );

  const { data: selectedConv } = trpc.conversation.get.useQuery(
    { organizationId, id: selectedId! },
    { enabled: !!organizationId && !!selectedId }
  );

  const utils = trpc.useUtils();
  const sendMessage = trpc.conversation.sendMessage.useMutation({
    onSuccess: () => {
      setMessageInput("");
      utils.conversation.get.invalidate({ organizationId, id: selectedId! });
      utils.conversation.list.invalidate();
    },
  });

  return (
    <div className="flex h-[calc(100vh-7rem)] gap-0 overflow-hidden rounded-xl border border-gray-200 bg-white">
      {/* Conversation List */}
      <div className="flex w-80 flex-col border-r border-gray-200">
        <div className="border-b p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input type="text" placeholder="Buscar conversación..."
              className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500" />
          </div>
          <div className="mt-3 flex gap-2">
            {["all", "open", "pending", "resolved"].map((f) => (
              <button key={f} onClick={() => setFilter(f)}
                className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${
                  filter === f ? "bg-primary-100 text-primary-700" : "bg-gray-100 text-gray-600"
                }`}>
                {f === "all" ? "Todas" : f === "open" ? "Abiertas" : f === "pending" ? "Pendientes" : "Resueltas"}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex h-32 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : !data?.conversations.length ? (
            <div className="flex h-full items-center justify-center p-4">
              <div className="text-center">
                <MessageSquare className="mx-auto h-12 w-12 text-gray-300" />
                <p className="mt-2 text-sm text-gray-500">No hay conversaciones</p>
              </div>
            </div>
          ) : (
            data.conversations.map((conv) => (
              <button key={conv.id} onClick={() => setSelectedId(conv.id)}
                className={`w-full border-b p-4 text-left hover:bg-gray-50 ${selectedId === conv.id ? "bg-primary-50" : ""}`}>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-100">
                    <User className="h-5 w-5 text-primary-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-900">
                      {conv.patient ? `${conv.patient.firstName} ${conv.patient.lastName}` : "Desconocido"}
                    </p>
                    <p className="truncate text-xs text-gray-500">
                      {conv.messages[0]?.content || "Sin mensajes"}
                    </p>
                  </div>
                  {conv.aiEnabled && <Bot className="h-4 w-4 text-primary-500" />}
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex flex-1 flex-col">
        {!selectedId || !selectedConv ? (
          <div className="flex flex-1 items-center justify-center">
            <div className="text-center">
              <MessageSquare className="mx-auto h-16 w-16 text-gray-200" />
              <h3 className="mt-4 text-lg font-medium text-gray-900">Selecciona una conversación</h3>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between border-b px-6 py-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                  <User className="h-5 w-5 text-primary-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">
                    {selectedConv.patient ? `${selectedConv.patient.firstName} ${selectedConv.patient.lastName}` : "Desconocido"}
                  </p>
                  <p className="text-xs text-gray-500">{selectedConv.channel} {selectedConv.aiEnabled ? "- IA activa" : ""}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button className="rounded-lg p-2 text-gray-400 hover:bg-gray-100"><Bot className="h-5 w-5" /></button>
                <button className="rounded-lg p-2 text-gray-400 hover:bg-gray-100"><Phone className="h-5 w-5" /></button>
                <button className="rounded-lg p-2 text-gray-400 hover:bg-gray-100"><MoreHorizontal className="h-5 w-5" /></button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {selectedConv.messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.direction === "OUTBOUND" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[70%] rounded-lg px-4 py-2 ${
                    msg.direction === "OUTBOUND"
                      ? msg.aiGenerated ? "bg-purple-100 text-purple-900" : "bg-primary-600 text-white"
                      : "bg-gray-100 text-gray-900"
                  }`}>
                    {msg.aiGenerated && <p className="mb-1 text-xs font-medium opacity-70">IA</p>}
                    <p className="text-sm">{msg.content}</p>
                    <p className="mt-1 text-xs opacity-60">
                      {new Date(msg.createdAt).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t p-4">
              <form onSubmit={(e) => {
                e.preventDefault();
                if (!messageInput.trim()) return;
                sendMessage.mutate({ organizationId, conversationId: selectedId, content: messageInput });
              }} className="flex items-center gap-3">
                <input type="text" value={messageInput} onChange={(e) => setMessageInput(e.target.value)}
                  placeholder="Escribe un mensaje..."
                  className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500" />
                <button type="submit" disabled={sendMessage.isPending}
                  className="rounded-lg bg-primary-600 p-2 text-white hover:bg-primary-700 disabled:opacity-50">
                  <Send className="h-5 w-5" />
                </button>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
