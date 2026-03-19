"use client";

import { useState } from "react";
import { Loader2, ShoppingBag, Truck, QrCode, UtensilsCrossed } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useOrg } from "@/lib/org-context";

const statusColors: Record<string, string> = {
  RECEIVED: "bg-red-100 text-red-700",
  CONFIRMED: "bg-blue-100 text-blue-700",
  PREPARING: "bg-yellow-100 text-yellow-700",
  READY: "bg-green-100 text-green-700",
  DELIVERED: "bg-purple-100 text-purple-700",
  COMPLETED: "bg-gray-100 text-gray-600",
  CANCELLED: "bg-red-50 text-red-400",
};

const statusLabels: Record<string, string> = {
  RECEIVED: "Recibido", CONFIRMED: "Confirmado", PREPARING: "Preparando",
  READY: "Listo", DELIVERED: "Entregado", COMPLETED: "Completado", CANCELLED: "Cancelado",
};

const typeIcons: Record<string, any> = {
  DINE_IN: UtensilsCrossed, TAKEAWAY: ShoppingBag, DELIVERY: Truck, QR_ORDER: QrCode,
};
const typeLabels: Record<string, string> = {
  DINE_IN: "Mesa", TAKEAWAY: "Para llevar", DELIVERY: "Delivery", QR_ORDER: "QR",
};

export default function OrdersPage() {
  const { organizationId } = useOrg();
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");

  const { data: orders, isLoading } = trpc.order.list.useQuery(
    {
      organizationId,
      status: (statusFilter as any) || undefined,
      type: (typeFilter as any) || undefined,
      date: new Date().toISOString(),
    },
    { enabled: !!organizationId, refetchInterval: 15000 }
  );

  const { data: stats } = trpc.order.todayStats.useQuery(
    { organizationId },
    { enabled: !!organizationId, refetchInterval: 30000 }
  );

  const utils = trpc.useUtils();
  const updateStatus = trpc.order.updateStatus.useMutation({
    onSuccess: () => { utils.order.list.invalidate(); utils.order.todayStats.invalidate(); },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pedidos de hoy</h1>
          <p className="text-gray-600">
            {stats?.todayOrders ?? 0} pedidos - ${Number(stats?.todayRevenue ?? 0).toLocaleString("es-CL")} en ventas
            {(stats?.activeOrders ?? 0) > 0 && ` - ${stats?.activeOrders} activos`}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm">
          <option value="">Todos los estados</option>
          {Object.entries(statusLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm">
          <option value="">Todos los tipos</option>
          {Object.entries(typeLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-gray-400" /></div>
      ) : !orders?.length ? (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
          <ShoppingBag className="mx-auto h-12 w-12 text-gray-300" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">No hay pedidos</h3>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => {
            const TypeIcon = typeIcons[order.type] || ShoppingBag;
            return (
              <div key={order.id} className="rounded-xl border border-gray-200 bg-white p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gray-100">
                      <TypeIcon className="h-6 w-6 text-gray-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-gray-900">#{order.number}</span>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[order.status]}`}>
                          {statusLabels[order.status]}
                        </span>
                        <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600">{typeLabels[order.type]}</span>
                      </div>
                      <p className="text-sm text-gray-500">
                        {order.customerName || (order.patient ? `${order.patient.firstName} ${order.patient.lastName}` : "Sin nombre")}
                        {order.table && ` - Mesa ${order.table.number}`}
                        {" - "}{new Date(order.createdAt).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-gray-900">${Number(order.total).toLocaleString("es-CL")}</p>
                    <p className="text-xs text-gray-500">{order.items.length} items</p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-1">
                  {order.items.map((item) => (
                    <span key={item.id} className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700">
                      {item.quantity}x {item.name}
                    </span>
                  ))}
                </div>
                {order.status !== "COMPLETED" && order.status !== "CANCELLED" && (
                  <div className="mt-3 flex gap-2">
                    <button onClick={() => {
                      const next = order.status === "RECEIVED" ? "CONFIRMED" : order.status === "CONFIRMED" ? "PREPARING" :
                        order.status === "PREPARING" ? "READY" : order.status === "READY" ? "DELIVERED" : "COMPLETED";
                      updateStatus.mutate({ organizationId, id: order.id, status: next as any });
                    }}
                      className="rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-700">
                      {order.status === "DELIVERED" ? "Completar" : `Avanzar a ${statusLabels[
                        order.status === "RECEIVED" ? "CONFIRMED" : order.status === "CONFIRMED" ? "PREPARING" :
                        order.status === "PREPARING" ? "READY" : "DELIVERED"
                      ]}`}
                    </button>
                    {order.status === "RECEIVED" && (
                      <button onClick={() => updateStatus.mutate({ organizationId, id: order.id, status: "CANCELLED" })}
                        className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50">
                        Cancelar
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
