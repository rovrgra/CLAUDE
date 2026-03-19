"use client";

import { useState } from "react";
import { Plus, Users, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useOrg } from "@/lib/org-context";

const statusConfig: Record<string, { color: string; bg: string; label: string }> = {
  AVAILABLE: { color: "text-green-700", bg: "bg-green-100 border-green-300", label: "Libre" },
  OCCUPIED: { color: "text-red-700", bg: "bg-red-100 border-red-300", label: "Ocupada" },
  RESERVED: { color: "text-blue-700", bg: "bg-blue-100 border-blue-300", label: "Reservada" },
  CLEANING: { color: "text-yellow-700", bg: "bg-yellow-100 border-yellow-300", label: "Limpiando" },
  BLOCKED: { color: "text-gray-700", bg: "bg-gray-100 border-gray-300", label: "Bloqueada" },
};

export default function TablesPage() {
  const { organizationId } = useOrg();
  const [showCreate, setShowCreate] = useState(false);
  const [newTable, setNewTable] = useState({ number: 1, name: "", section: "", capacity: 4 });
  const [sectionFilter, setSectionFilter] = useState("");

  const { data: tables, isLoading } = trpc.table.list.useQuery(
    { organizationId },
    { enabled: !!organizationId, refetchInterval: 15000 }
  );

  const utils = trpc.useUtils();
  const createTable = trpc.table.create.useMutation({
    onSuccess: () => { utils.table.list.invalidate(); setShowCreate(false); },
  });
  const updateStatus = trpc.table.updateStatus.useMutation({
    onSuccess: () => utils.table.list.invalidate(),
  });

  const sections = Array.from(new Set(tables?.map((t) => t.section).filter(Boolean) || []));
  const filtered = sectionFilter ? tables?.filter((t) => t.section === sectionFilter) : tables;

  // Stats
  const stats = {
    total: tables?.length ?? 0,
    available: tables?.filter((t) => t.status === "AVAILABLE").length ?? 0,
    occupied: tables?.filter((t) => t.status === "OCCUPIED").length ?? 0,
    reserved: tables?.filter((t) => t.status === "RESERVED").length ?? 0,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mesas</h1>
          <p className="text-gray-600">
            {stats.available} libres / {stats.occupied} ocupadas / {stats.reserved} reservadas
          </p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700">
          <Plus className="h-4 w-4" />Nueva mesa
        </button>
      </div>

      {/* Section filters */}
      {sections.length > 0 && (
        <div className="flex gap-2">
          <button onClick={() => setSectionFilter("")}
            className={`rounded-full px-3 py-1 text-sm font-medium ${!sectionFilter ? "bg-primary-100 text-primary-700" : "bg-gray-100 text-gray-600"}`}>
            Todas
          </button>
          {sections.map((section) => (
            <button key={section} onClick={() => setSectionFilter(section!)}
              className={`rounded-full px-3 py-1 text-sm font-medium ${sectionFilter === section ? "bg-primary-100 text-primary-700" : "bg-gray-100 text-gray-600"}`}>
              {section}
            </button>
          ))}
        </div>
      )}

      {isLoading ? (
        <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-gray-400" /></div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {filtered?.map((table) => {
            const cfg = statusConfig[table.status];
            const activeOrder = table.orders[0];

            return (
              <div key={table.id} className={`rounded-xl border-2 p-4 transition-all hover:shadow-md ${cfg.bg}`}>
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold text-gray-900">{table.number}</span>
                  <span className={`text-xs font-bold ${cfg.color}`}>{cfg.label}</span>
                </div>
                {table.name && <p className="mt-1 text-xs text-gray-600">{table.name}</p>}
                <div className="mt-2 flex items-center gap-1 text-xs text-gray-500">
                  <Users className="h-3 w-3" /> {table.capacity} personas
                </div>
                {table.section && <p className="mt-1 text-xs text-gray-400">{table.section}</p>}

                {activeOrder && (
                  <div className="mt-2 rounded-lg bg-white/60 px-2 py-1">
                    <p className="text-xs font-medium text-gray-900">Pedido #{activeOrder.number}</p>
                    <p className="text-xs text-gray-500">{activeOrder.items.length} items - ${Number(activeOrder.total).toLocaleString("es-CL")}</p>
                  </div>
                )}

                <div className="mt-3 flex gap-1">
                  {table.status === "AVAILABLE" && (
                    <button onClick={() => updateStatus.mutate({ organizationId, id: table.id, status: "OCCUPIED" })}
                      className="flex-1 rounded-lg bg-red-500 py-1.5 text-xs font-bold text-white hover:bg-red-600">
                      Ocupar
                    </button>
                  )}
                  {table.status === "OCCUPIED" && (
                    <button onClick={() => updateStatus.mutate({ organizationId, id: table.id, status: "CLEANING" })}
                      className="flex-1 rounded-lg bg-yellow-500 py-1.5 text-xs font-bold text-white hover:bg-yellow-600">
                      Liberar
                    </button>
                  )}
                  {table.status === "CLEANING" && (
                    <button onClick={() => updateStatus.mutate({ organizationId, id: table.id, status: "AVAILABLE" })}
                      className="flex-1 rounded-lg bg-green-500 py-1.5 text-xs font-bold text-white hover:bg-green-600">
                      Lista
                    </button>
                  )}
                  {table.status === "RESERVED" && (
                    <button onClick={() => updateStatus.mutate({ organizationId, id: table.id, status: "OCCUPIED" })}
                      className="flex-1 rounded-lg bg-red-500 py-1.5 text-xs font-bold text-white hover:bg-red-600">
                      Sentar
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Table Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-xl bg-white p-6">
            <h2 className="text-lg font-semibold text-gray-900">Nueva mesa</h2>
            <form className="mt-4 space-y-4" onSubmit={(e) => {
              e.preventDefault();
              createTable.mutate({ organizationId, ...newTable, name: newTable.name || undefined, section: newTable.section || undefined });
            }}>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Número</label>
                  <input type="number" required min={1} value={newTable.number}
                    onChange={(e) => setNewTable({ ...newTable, number: parseInt(e.target.value) })}
                    className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Capacidad</label>
                  <input type="number" min={1} value={newTable.capacity}
                    onChange={(e) => setNewTable({ ...newTable, capacity: parseInt(e.target.value) })}
                    className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Nombre (opcional)</label>
                <input type="text" value={newTable.name} placeholder="Ej: VIP, Ventana, Barra 1"
                  onChange={(e) => setNewTable({ ...newTable, name: e.target.value })}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Sección</label>
                <input type="text" value={newTable.section} placeholder="Ej: Terraza, Interior, Segundo piso"
                  onChange={(e) => setNewTable({ ...newTable, section: e.target.value })}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowCreate(false)}
                  className="rounded-lg border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancelar</button>
                <button type="submit" disabled={createTable.isPending}
                  className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50">
                  {createTable.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  Crear mesa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
