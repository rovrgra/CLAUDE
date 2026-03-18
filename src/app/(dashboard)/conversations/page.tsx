"use client";

import { useState } from "react";
import {
  MessageSquare, Search, Bot, User, Send, Phone,
  MoreHorizontal, CheckCheck, Clock, Filter,
} from "lucide-react";

interface MockConversation {
  id: string;
  patientName: string;
  lastMessage: string;
  time: string;
  unread: number;
  channel: string;
  aiEnabled: boolean;
}

export default function ConversationsPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState("");
  const [filter, setFilter] = useState<string>("all");

  return (
    <div className="flex h-[calc(100vh-7rem)] gap-0 overflow-hidden rounded-xl border border-gray-200 bg-white">
      {/* Conversation List */}
      <div className="flex w-80 flex-col border-r border-gray-200">
        <div className="border-b p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar conversación..."
              className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>
          <div className="mt-3 flex gap-2">
            {["all", "open", "pending", "resolved"].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${
                  filter === f ? "bg-primary-100 text-primary-700" : "bg-gray-100 text-gray-600"
                }`}
              >
                {f === "all" ? "Todas" : f === "open" ? "Abiertas" : f === "pending" ? "Pendientes" : "Resueltas"}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="flex h-full items-center justify-center p-4">
            <div className="text-center">
              <MessageSquare className="mx-auto h-12 w-12 text-gray-300" />
              <p className="mt-2 text-sm text-gray-500">No hay conversaciones</p>
              <p className="text-xs text-gray-400">Las conversaciones aparecerán cuando los pacientes escriban por WhatsApp</p>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex flex-1 flex-col">
        {!selectedId ? (
          <div className="flex flex-1 items-center justify-center">
            <div className="text-center">
              <MessageSquare className="mx-auto h-16 w-16 text-gray-200" />
              <h3 className="mt-4 text-lg font-medium text-gray-900">Selecciona una conversación</h3>
              <p className="mt-1 text-sm text-gray-500">
                Elige una conversación del panel izquierdo para comenzar
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <div className="flex items-center justify-between border-b px-6 py-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                  <User className="h-5 w-5 text-primary-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Paciente</p>
                  <p className="text-xs text-gray-500">WhatsApp</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button className="rounded-lg p-2 text-gray-400 hover:bg-gray-100">
                  <Bot className="h-5 w-5" />
                </button>
                <button className="rounded-lg p-2 text-gray-400 hover:bg-gray-100">
                  <Phone className="h-5 w-5" />
                </button>
                <button className="rounded-lg p-2 text-gray-400 hover:bg-gray-100">
                  <MoreHorizontal className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6">
              <p className="text-center text-sm text-gray-400">No hay mensajes</p>
            </div>

            {/* Input */}
            <div className="border-t p-4">
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  placeholder="Escribe un mensaje..."
                  className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
                <button className="rounded-lg bg-primary-600 p-2 text-white hover:bg-primary-700">
                  <Send className="h-5 w-5" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
