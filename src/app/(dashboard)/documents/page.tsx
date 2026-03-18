"use client";

import { useState } from "react";
import { Plus, FileText, Search, FolderOpen, Bot } from "lucide-react";

const docTypes = [
  { value: "faq", label: "FAQ / Preguntas frecuentes" },
  { value: "protocol", label: "Protocolo clínico" },
  { value: "price-list", label: "Lista de precios" },
  { value: "consent", label: "Consentimiento informado" },
  { value: "info", label: "Información general" },
];

export default function DocumentsPage() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newDoc, setNewDoc] = useState({ name: "", type: "faq", content: "" });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Documentos</h1>
          <p className="text-gray-600">Base de conocimiento para el agente IA</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
        >
          <Plus className="h-4 w-4" />
          Nuevo documento
        </button>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="flex items-center gap-3 rounded-lg bg-primary-50 p-4">
          <Bot className="h-6 w-6 text-primary-600" />
          <div>
            <p className="text-sm font-medium text-primary-900">Base de conocimiento IA</p>
            <p className="text-xs text-primary-700">
              Los documentos que agregues aquí serán utilizados por el agente IA para responder preguntas de tus pacientes con información precisa de tu clínica.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div
          onClick={() => setShowCreateModal(true)}
          className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 p-8 transition-colors hover:border-primary-400 hover:bg-primary-50"
        >
          <Plus className="h-8 w-8 text-gray-400" />
          <p className="mt-2 text-sm font-medium text-gray-600">Agregar documento</p>
        </div>
      </div>

      {/* Create Document Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-2xl rounded-xl bg-white p-6">
            <h2 className="text-lg font-semibold text-gray-900">Nuevo documento</h2>
            <form className="mt-4 space-y-4" onSubmit={(e) => { e.preventDefault(); setShowCreateModal(false); }}>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Nombre</label>
                  <input
                    type="text" required
                    value={newDoc.name}
                    onChange={(e) => setNewDoc({ ...newDoc, name: e.target.value })}
                    className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                    placeholder="Ej: Precios de servicios"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Tipo</label>
                  <select
                    value={newDoc.type}
                    onChange={(e) => setNewDoc({ ...newDoc, type: e.target.value })}
                    className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  >
                    {docTypes.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Contenido</label>
                <textarea
                  rows={12} required
                  value={newDoc.content}
                  onChange={(e) => setNewDoc({ ...newDoc, content: e.target.value })}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  placeholder="Escribe o pega el contenido del documento aquí..."
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setShowCreateModal(false)}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                  Cancelar
                </button>
                <button type="submit"
                  className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700">
                  Guardar documento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
