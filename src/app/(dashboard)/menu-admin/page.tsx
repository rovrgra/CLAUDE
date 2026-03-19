"use client";

import { useState } from "react";
import { Plus, Loader2, Trash2, Eye, EyeOff, Star } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useOrg } from "@/lib/org-context";

const inputClass = "mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500";

export default function MenuAdminPage() {
  const { organizationId } = useOrg();
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showItemModal, setShowItemModal] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [newCategory, setNewCategory] = useState({ name: "", description: "" });
  const [newItem, setNewItem] = useState({ name: "", description: "", price: 0, preparationTime: 15, categoryId: "" });

  const { data: categories, isLoading } = trpc.menu.categories.useQuery(
    { organizationId },
    { enabled: !!organizationId }
  );

  const { data: items } = trpc.menu.items.useQuery(
    { organizationId, categoryId: selectedCategoryId || undefined },
    { enabled: !!organizationId }
  );

  const utils = trpc.useUtils();
  const createCategory = trpc.menu.createCategory.useMutation({
    onSuccess: () => { utils.menu.categories.invalidate(); setShowCategoryModal(false); setNewCategory({ name: "", description: "" }); },
  });
  const deleteCategory = trpc.menu.deleteCategory.useMutation({
    onSuccess: () => utils.menu.categories.invalidate(),
  });
  const createItem = trpc.menu.createItem.useMutation({
    onSuccess: () => { utils.menu.items.invalidate(); utils.menu.categories.invalidate(); setShowItemModal(false); setNewItem({ name: "", description: "", price: 0, preparationTime: 15, categoryId: "" }); },
  });
  const toggleAvailability = trpc.menu.toggleAvailability.useMutation({
    onSuccess: () => { utils.menu.items.invalidate(); utils.menu.categories.invalidate(); },
  });
  const deleteItem = trpc.menu.deleteItem.useMutation({
    onSuccess: () => { utils.menu.items.invalidate(); utils.menu.categories.invalidate(); },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Administrar Menú</h1>
          <p className="text-gray-600">Categorías, platos, precios y disponibilidad</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowCategoryModal(true)}
            className="flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
            <Plus className="h-4 w-4" />Categoría
          </button>
          <button onClick={() => { setNewItem({ ...newItem, categoryId: selectedCategoryId || "" }); setShowItemModal(true); }}
            className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700">
            <Plus className="h-4 w-4" />Nuevo plato
          </button>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Categories sidebar */}
        <div className="w-56 space-y-1">
          <button onClick={() => setSelectedCategoryId(null)}
            className={`w-full rounded-lg px-3 py-2 text-left text-sm font-medium ${!selectedCategoryId ? "bg-primary-50 text-primary-700" : "text-gray-600 hover:bg-gray-50"}`}>
            Todos los platos
          </button>
          {categories?.map((cat) => (
            <div key={cat.id} className="group flex items-center">
              <button onClick={() => setSelectedCategoryId(cat.id)}
                className={`flex-1 rounded-lg px-3 py-2 text-left text-sm font-medium ${selectedCategoryId === cat.id ? "bg-primary-50 text-primary-700" : "text-gray-600 hover:bg-gray-50"}`}>
                {cat.name}
                <span className="ml-1 text-xs text-gray-400">({cat.items.length})</span>
              </button>
              <button onClick={() => deleteCategory.mutate({ organizationId, id: cat.id })}
                className="invisible rounded p-1 text-gray-400 hover:text-red-500 group-hover:visible">
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>

        {/* Items grid */}
        <div className="flex-1">
          {isLoading ? (
            <div className="flex h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>
          ) : !items?.length ? (
            <div className="flex h-64 items-center justify-center rounded-xl border-2 border-dashed border-gray-300">
              <div className="text-center">
                <p className="text-gray-500">No hay platos en esta categoría</p>
                <button onClick={() => setShowItemModal(true)}
                  className="mt-2 text-sm font-medium text-primary-600 hover:text-primary-500">
                  Agregar plato
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {items.map((item) => (
                <div key={item.id} className={`flex items-center gap-4 rounded-xl border bg-white p-4 ${!item.isAvailable ? "opacity-60" : ""}`}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-900">{item.name}</p>
                      {item.isFeatured && <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />}
                      {!item.isAvailable && <span className="rounded bg-red-100 px-1.5 py-0.5 text-xs font-medium text-red-700">Agotado</span>}
                    </div>
                    {item.description && <p className="mt-0.5 text-sm text-gray-500 truncate">{item.description}</p>}
                    <p className="mt-1 text-xs text-gray-400">{item.category.name} - {item.preparationTime} min</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-gray-900">${Number(item.price).toLocaleString("es-CL")}</p>
                    {item.comparePrice && (
                      <p className="text-xs text-gray-400 line-through">${Number(item.comparePrice).toLocaleString("es-CL")}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => toggleAvailability.mutate({ organizationId, id: item.id })}
                      className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                      title={item.isAvailable ? "Marcar como agotado" : "Marcar como disponible"}>
                      {item.isAvailable ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </button>
                    <button onClick={() => deleteItem.mutate({ organizationId, id: item.id })}
                      className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-500">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create Category Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-xl bg-white p-6">
            <h2 className="text-lg font-semibold">Nueva categoría</h2>
            <form className="mt-4 space-y-4" onSubmit={(e) => { e.preventDefault(); createCategory.mutate({ organizationId, ...newCategory }); }}>
              <div>
                <label className="block text-sm font-medium text-gray-700">Nombre</label>
                <input type="text" required value={newCategory.name} onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                  className={inputClass} placeholder="Ej: Entradas, Platos de fondo, Postres..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Descripción (opcional)</label>
                <input type="text" value={newCategory.description} onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
                  className={inputClass} />
              </div>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setShowCategoryModal(false)} className="rounded-lg border px-4 py-2 text-sm">Cancelar</button>
                <button type="submit" disabled={createCategory.isPending}
                  className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50">Crear</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Item Modal */}
      {showItemModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-xl bg-white p-6">
            <h2 className="text-lg font-semibold">Nuevo plato</h2>
            <form className="mt-4 space-y-4" onSubmit={(e) => {
              e.preventDefault();
              if (!newItem.categoryId) return;
              createItem.mutate({ organizationId, ...newItem, description: newItem.description || undefined });
            }}>
              <div>
                <label className="block text-sm font-medium text-gray-700">Categoría</label>
                <select required value={newItem.categoryId} onChange={(e) => setNewItem({ ...newItem, categoryId: e.target.value })} className={inputClass}>
                  <option value="">Seleccionar...</option>
                  {categories?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Nombre del plato</label>
                <input type="text" required value={newItem.name} onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                  className={inputClass} placeholder="Ej: Lomo a lo pobre" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Descripción</label>
                <textarea rows={2} value={newItem.description} onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                  className={inputClass} placeholder="Ingredientes, preparación..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Precio ($)</label>
                  <input type="number" required min={0} value={newItem.price}
                    onChange={(e) => setNewItem({ ...newItem, price: parseInt(e.target.value) || 0 })}
                    className={inputClass} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Tiempo prep. (min)</label>
                  <input type="number" min={1} value={newItem.preparationTime}
                    onChange={(e) => setNewItem({ ...newItem, preparationTime: parseInt(e.target.value) || 15 })}
                    className={inputClass} />
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setShowItemModal(false)} className="rounded-lg border px-4 py-2 text-sm">Cancelar</button>
                <button type="submit" disabled={createItem.isPending}
                  className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50">Crear plato</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
