"use client";

import { useState } from "react";
import { Plus, Loader2, Search, AlertTriangle, ChevronDown, ChevronUp, Package, X } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useOrg } from "@/lib/org-context";

const inputClass = "mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500";

const movementTypeLabels: Record<string, string> = {
  PURCHASE: "Compra",
  ADJUSTMENT: "Ajuste",
  WASTE: "Merma",
};

function stockColor(current: number, min: number) {
  if (current <= min) return "text-red-700 bg-red-100";
  if (current <= min * 2) return "text-yellow-700 bg-yellow-100";
  return "text-green-700 bg-green-100";
}

type InventoryForm = {
  id?: string;
  name: string;
  categoryId: string;
  unit: string;
  currentStock: number;
  minStock: number;
  costPerUnit: number;
  supplier: string;
};

const emptyForm: InventoryForm = {
  name: "",
  categoryId: "",
  unit: "",
  currentStock: 0,
  minStock: 0,
  costPerUnit: 0,
  supplier: "",
};

type MovementForm = {
  inventoryItemId: string;
  type: "PURCHASE" | "ADJUSTMENT" | "WASTE";
  quantity: number;
  reason: string;
};

export default function InventoryPage() {
  const { organizationId } = useOrg();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [showItemModal, setShowItemModal] = useState(false);
  const [showMovementModal, setShowMovementModal] = useState(false);
  const [itemForm, setItemForm] = useState<InventoryForm>(emptyForm);
  const [movementForm, setMovementForm] = useState<MovementForm>({
    inventoryItemId: "",
    type: "PURCHASE",
    quantity: 0,
    reason: "",
  });
  const [expandedItem, setExpandedItem] = useState<string | null>(null);

  const { data: items, isLoading } = trpc.inventory.list.useQuery(
    { organizationId, search: search || undefined, categoryId: categoryFilter || undefined },
    { enabled: !!organizationId }
  );

  const { data: lowStockItems } = trpc.inventory.lowStock.useQuery(
    { organizationId },
    { enabled: !!organizationId }
  );

  const { data: categories } = trpc.inventory.categories.useQuery(
    { organizationId },
    { enabled: !!organizationId }
  );

  const utils = trpc.useUtils();

  const createItem = trpc.inventory.create.useMutation({
    onSuccess: () => {
      utils.inventory.list.invalidate();
      utils.inventory.lowStock.invalidate();
      setShowItemModal(false);
      setItemForm(emptyForm);
    },
  });

  const updateItem = trpc.inventory.update.useMutation({
    onSuccess: () => {
      utils.inventory.list.invalidate();
      utils.inventory.lowStock.invalidate();
      setShowItemModal(false);
      setItemForm(emptyForm);
    },
  });

  const addMovement = trpc.inventory.addMovement.useMutation({
    onSuccess: () => {
      utils.inventory.list.invalidate();
      utils.inventory.lowStock.invalidate();
      setShowMovementModal(false);
      setMovementForm({ inventoryItemId: "", type: "PURCHASE", quantity: 0, reason: "" });
    },
  });

  const isEditing = !!itemForm.id;

  function openEditModal(item: any) {
    setItemForm({
      id: item.id,
      name: item.name,
      categoryId: item.categoryId || "",
      unit: item.unit,
      currentStock: item.currentStock,
      minStock: item.minStock,
      costPerUnit: Number(item.costPerUnit),
      supplier: item.supplier || "",
    });
    setShowItemModal(true);
  }

  function openMovementModal(itemId: string) {
    setMovementForm({ inventoryItemId: itemId, type: "PURCHASE", quantity: 0, reason: "" });
    setShowMovementModal(true);
  }

  function handleItemSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      organizationId,
      name: itemForm.name,
      categoryId: itemForm.categoryId || undefined,
      unit: itemForm.unit,
      currentStock: itemForm.currentStock,
      minStock: itemForm.minStock,
      costPerUnit: itemForm.costPerUnit,
      supplier: itemForm.supplier || undefined,
    };
    if (isEditing) {
      updateItem.mutate({ ...payload, id: itemForm.id! });
    } else {
      createItem.mutate(payload);
    }
  }

  function handleMovementSubmit(e: React.FormEvent) {
    e.preventDefault();
    addMovement.mutate({
      organizationId,
      inventoryItemId: movementForm.inventoryItemId,
      type: movementForm.type,
      quantity: movementForm.quantity,
      reason: movementForm.reason || undefined,
    });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventario</h1>
          <p className="text-gray-600">Gestiona insumos, stock y movimientos</p>
        </div>
        <button
          onClick={() => { setItemForm(emptyForm); setShowItemModal(true); }}
          className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
        >
          <Plus className="h-4 w-4" />Agregar insumo
        </button>
      </div>

      {/* Low stock alerts */}
      {lowStockItems && lowStockItems.length > 0 && (
        <div className="rounded-xl border border-yellow-300 bg-yellow-50 p-4">
          <div className="flex items-center gap-2 text-yellow-800">
            <AlertTriangle className="h-5 w-5" />
            <h3 className="font-semibold">Alerta de stock bajo</h3>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {lowStockItems.map((item: any) => (
              <span
                key={item.id}
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  item.currentStock <= item.minStock
                    ? "bg-red-100 text-red-700"
                    : "bg-yellow-100 text-yellow-700"
                }`}
              >
                {item.name}: {item.currentStock} {item.unit}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Search and filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar insumo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">Todas las categorias</option>
          {categories?.map((cat: any) => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : !items?.length ? (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
          <Package className="mx-auto h-12 w-12 text-gray-300" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">No hay insumos</h3>
          <p className="mt-1 text-sm text-gray-500">Agrega tu primer insumo para comenzar</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Nombre</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Categoria</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Stock</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Unidad</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Costo</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Proveedor</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {items.map((item: any) => (
                <tr key={item.id} className="group">
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setExpandedItem(expandedItem === item.id ? null : item.id)}
                      className="flex items-center gap-1 font-medium text-gray-900 hover:text-primary-600"
                    >
                      {expandedItem === item.id ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                      {item.name}
                    </button>
                    {/* Inline expandable movements */}
                    {expandedItem === item.id && item.movements && (
                      <div className="mt-2 space-y-1 pl-5">
                        <p className="text-xs font-medium text-gray-500">Movimientos recientes:</p>
                        {item.movements.length === 0 ? (
                          <p className="text-xs text-gray-400">Sin movimientos</p>
                        ) : (
                          item.movements.map((mov: any, idx: number) => (
                            <div key={idx} className="flex items-center gap-2 text-xs text-gray-600">
                              <span className={`rounded px-1.5 py-0.5 font-medium ${
                                mov.type === "PURCHASE" ? "bg-green-100 text-green-700" :
                                mov.type === "WASTE" ? "bg-red-100 text-red-700" :
                                "bg-blue-100 text-blue-700"
                              }`}>
                                {movementTypeLabels[mov.type] || mov.type}
                              </span>
                              <span>{mov.type === "WASTE" ? "-" : "+"}{mov.quantity}</span>
                              {mov.reason && <span className="text-gray-400">- {mov.reason}</span>}
                              <span className="text-gray-400">
                                {new Date(mov.createdAt).toLocaleDateString("es-CL")}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {item.category?.name || "-"}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${stockColor(item.currentStock, item.minStock)}`}>
                      {item.currentStock}
                    </span>
                    <span className="ml-1 text-xs text-gray-400">min: {item.minStock}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{item.unit}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    ${Number(item.costPerUnit).toLocaleString("es-CL")}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{item.supplier || "-"}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => openMovementModal(item.id)}
                        className="rounded-lg px-2 py-1 text-xs font-medium text-primary-600 hover:bg-primary-50"
                      >
                        + Movimiento
                      </button>
                      <button
                        onClick={() => openEditModal(item)}
                        className="rounded-lg px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100"
                      >
                        Editar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create/Edit Item Modal */}
      {showItemModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-lg rounded-xl bg-white p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">{isEditing ? "Editar insumo" : "Nuevo insumo"}</h2>
              <button onClick={() => { setShowItemModal(false); setItemForm(emptyForm); }} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form className="mt-4 space-y-4" onSubmit={handleItemSubmit}>
              <div>
                <label className="block text-sm font-medium text-gray-700">Nombre</label>
                <input
                  type="text"
                  required
                  value={itemForm.name}
                  onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
                  className={inputClass}
                  placeholder="Ej: Harina, Aceite, Tomates..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Categoria</label>
                  <select
                    value={itemForm.categoryId}
                    onChange={(e) => setItemForm({ ...itemForm, categoryId: e.target.value })}
                    className={inputClass}
                  >
                    <option value="">Sin categoria</option>
                    {categories?.map((cat: any) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Unidad</label>
                  <input
                    type="text"
                    required
                    value={itemForm.unit}
                    onChange={(e) => setItemForm({ ...itemForm, unit: e.target.value })}
                    className={inputClass}
                    placeholder="Ej: kg, lt, unidad"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Stock actual</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={itemForm.currentStock}
                    onChange={(e) => setItemForm({ ...itemForm, currentStock: parseFloat(e.target.value) || 0 })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Stock minimo</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={itemForm.minStock}
                    onChange={(e) => setItemForm({ ...itemForm, minStock: parseFloat(e.target.value) || 0 })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Costo unitario ($)</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={itemForm.costPerUnit}
                    onChange={(e) => setItemForm({ ...itemForm, costPerUnit: parseFloat(e.target.value) || 0 })}
                    className={inputClass}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Proveedor (opcional)</label>
                <input
                  type="text"
                  value={itemForm.supplier}
                  onChange={(e) => setItemForm({ ...itemForm, supplier: e.target.value })}
                  className={inputClass}
                  placeholder="Nombre del proveedor"
                />
              </div>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => { setShowItemModal(false); setItemForm(emptyForm); }} className="rounded-lg border px-4 py-2 text-sm">
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={createItem.isPending || updateItem.isPending}
                  className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
                >
                  {isEditing ? "Guardar cambios" : "Crear insumo"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Movement Modal */}
      {showMovementModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-xl bg-white p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Registrar movimiento</h2>
              <button onClick={() => setShowMovementModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form className="mt-4 space-y-4" onSubmit={handleMovementSubmit}>
              <div>
                <label className="block text-sm font-medium text-gray-700">Tipo de movimiento</label>
                <select
                  required
                  value={movementForm.type}
                  onChange={(e) => setMovementForm({ ...movementForm, type: e.target.value as MovementForm["type"] })}
                  className={inputClass}
                >
                  <option value="PURCHASE">Compra</option>
                  <option value="ADJUSTMENT">Ajuste</option>
                  <option value="WASTE">Merma</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Cantidad</label>
                <input
                  type="number"
                  required
                  min={1}
                  value={movementForm.quantity}
                  onChange={(e) => setMovementForm({ ...movementForm, quantity: parseFloat(e.target.value) || 0 })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Motivo (opcional)</label>
                <input
                  type="text"
                  value={movementForm.reason}
                  onChange={(e) => setMovementForm({ ...movementForm, reason: e.target.value })}
                  className={inputClass}
                  placeholder="Ej: Compra semanal, Producto vencido..."
                />
              </div>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setShowMovementModal(false)} className="rounded-lg border px-4 py-2 text-sm">
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={addMovement.isPending}
                  className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
                >
                  Registrar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
