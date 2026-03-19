"use client";

import { useState } from "react";
import { Plus, FileText, Bot, Loader2, Trash2, Edit2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useOrg } from "@/lib/org-context";

const docTypes = [
  { value: "faq", label: "FAQ / Preguntas frecuentes" },
  { value: "protocol", label: "Protocolo clínico" },
  { value: "price-list", label: "Lista de precios" },
  { value: "consent", label: "Consentimiento informado" },
  { value: "info", label: "Información general" },
];

export default function DocumentsPage() {
  const { organizationId } = useOrg();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newDoc, setNewDoc] = useState({ name: "", type: "faq", content: "" });

  const { data: documents, isLoading } = trpc.document.list.useQuery(
    { organizationId },
    { enabled: !!organizationId }
  );

  const utils = trpc.useUtils();

  const createDoc = trpc.document.create.useMutation({
    onSuccess: () => {
      utils.document.list.invalidate();
      setShowCreateModal(false);
      setNewDoc({ name: "", type: "faq", content: "" });
    },
  });

  const deleteDoc = trpc.document.delete.useMutation({
    onSuccess: () => utils.document.list.invalidate(),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Documentos</h1>
          <p className="text-gray-600">Base de conocimiento para el agente IA</p>
        </div>
        <button onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700">
          <Plus className="h-4 w-4" />Nuevo documento
        </button>
      </div>

      <div className="rounded-lg bg-primary-50 p-4">
        <div className="flex items-center gap-3">
          <Bot className="h-6 w-6 text-primary-600" />
          <div>
            <p className="text-sm font-medium text-primary-900">Base de conocimiento IA</p>
            <p className="text-xs text-primary-700">
              Los documentos que agregues aquí serán utilizados por el agente IA para responder preguntas de tus pacientes.
            </p>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex h-32 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {documents?.map((doc) => (
            <div key={doc.id} className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <FileText className="h-8 w-8 text-primary-500" />
                  <div>
                    <p className="font-medium text-gray-900">{doc.name}</p>
                    <p className="text-xs text-gray-500">{doc.type} - {doc.chunkCount} chunks</p>
                  </div>
                </div>
                <button onClick={() => deleteDoc.mutate({ organizationId, id: doc.id })}
                  className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-red-500">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <p className="mt-3 text-sm text-gray-500 line-clamp-3">{doc.content}</p>
              <p className="mt-2 text-xs text-gray-400">
                Actualizado: {new Date(doc.updatedAt).toLocaleDateString("es-CL")}
              </p>
            </div>
          ))}

          <div onClick={() => setShowCreateModal(true)}
            className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 p-8 transition-colors hover:border-primary-400 hover:bg-primary-50">
            <Plus className="h-8 w-8 text-gray-400" />
            <p className="mt-2 text-sm font-medium text-gray-600">Agregar documento</p>
          </div>
        </div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-2xl rounded-xl bg-white p-6">
            <h2 className="text-lg font-semibold text-gray-900">Nuevo documento</h2>
            <form className="mt-4 space-y-4" onSubmit={(e) => {
              e.preventDefault();
              createDoc.mutate({ organizationId, ...newDoc });
            }}>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Nombre</label>
                  <input type="text" required value={newDoc.name}
                    onChange={(e) => setNewDoc({ ...newDoc, name: e.target.value })}
                    className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Tipo</label>
                  <select value={newDoc.type} onChange={(e) => setNewDoc({ ...newDoc, type: e.target.value })}
                    className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500">
                    {docTypes.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Contenido</label>
                <textarea rows={12} required value={newDoc.content}
                  onChange={(e) => setNewDoc({ ...newDoc, content: e.target.value })}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  placeholder="Escribe o pega el contenido del documento aquí..." />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setShowCreateModal(false)}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancelar</button>
                <button type="submit" disabled={createDoc.isPending}
                  className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50">
                  {createDoc.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
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
