"use client";

import { useState, useEffect } from "react";
import { Clock, ChefHat, CheckCircle2, XCircle, Loader2, Bell, UtensilsCrossed } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useOrg } from "@/lib/org-context";

const statusColors: Record<string, string> = {
  RECEIVED: "border-red-500 bg-red-50",
  CONFIRMED: "border-blue-500 bg-blue-50",
  PREPARING: "border-yellow-500 bg-yellow-50",
  READY: "border-green-500 bg-green-50",
};

const statusLabels: Record<string, string> = {
  RECEIVED: "Nuevo",
  CONFIRMED: "Confirmado",
  PREPARING: "Preparando",
  READY: "Listo",
};

const nextStatus: Record<string, string> = {
  RECEIVED: "CONFIRMED",
  CONFIRMED: "PREPARING",
  PREPARING: "READY",
  READY: "DELIVERED",
};

const typeLabels: Record<string, string> = {
  DINE_IN: "Mesa",
  TAKEAWAY: "Para llevar",
  DELIVERY: "Delivery",
  QR_ORDER: "QR",
};

export default function KitchenPage() {
  const { organizationId } = useOrg();
  const [now, setNow] = useState(new Date());

  // Auto-refresh every 10 seconds
  const { data: orders, isLoading } = trpc.order.active.useQuery(
    { organizationId },
    { enabled: !!organizationId, refetchInterval: 10000 }
  );

  const utils = trpc.useUtils();
  const updateStatus = trpc.order.updateStatus.useMutation({
    onSuccess: () => utils.order.active.invalidate(),
  });
  const updateItemStatus = trpc.order.updateItemStatus.useMutation({
    onSuccess: () => utils.order.active.invalidate(),
  });

  // Update clock
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  function getElapsedMinutes(createdAt: string | Date) {
    return Math.floor((now.getTime() - new Date(createdAt).getTime()) / 60000);
  }

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-gray-400" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ChefHat className="h-7 w-7 text-primary-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Cocina</h1>
            <p className="text-gray-600">{orders?.length ?? 0} pedidos activos</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-lg font-mono font-bold text-gray-700">
            {now.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
          </span>
        </div>
      </div>

      {!orders?.length ? (
        <div className="flex h-96 items-center justify-center rounded-xl border-2 border-dashed border-gray-300">
          <div className="text-center">
            <UtensilsCrossed className="mx-auto h-16 w-16 text-gray-300" />
            <h3 className="mt-4 text-xl font-medium text-gray-500">Sin pedidos activos</h3>
            <p className="mt-1 text-sm text-gray-400">Los pedidos nuevos aparecerán aquí automáticamente</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {orders.map((order) => {
            const elapsed = getElapsedMinutes(order.createdAt);
            const isUrgent = elapsed > 20;

            return (
              <div key={order.id}
                className={`rounded-xl border-2 p-4 transition-shadow hover:shadow-lg ${statusColors[order.status]} ${isUrgent ? "animate-pulse" : ""}`}>
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold text-gray-900">#{order.number}</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                      order.status === "RECEIVED" ? "bg-red-200 text-red-800" :
                      order.status === "PREPARING" ? "bg-yellow-200 text-yellow-800" :
                      order.status === "READY" ? "bg-green-200 text-green-800" :
                      "bg-blue-200 text-blue-800"
                    }`}>
                      {statusLabels[order.status]}
                    </span>
                  </div>
                  <div className={`flex items-center gap-1 text-sm font-mono ${isUrgent ? "text-red-600 font-bold" : "text-gray-500"}`}>
                    <Clock className="h-4 w-4" />
                    {elapsed}m
                  </div>
                </div>

                {/* Meta */}
                <div className="mt-2 flex items-center gap-2 text-xs text-gray-600">
                  <span className="rounded bg-gray-200 px-1.5 py-0.5 font-medium">{typeLabels[order.type]}</span>
                  {order.table && <span>Mesa {order.table.number}</span>}
                  {order.customerName && <span>{order.customerName}</span>}
                </div>

                {/* Items */}
                <div className="mt-3 space-y-1.5">
                  {order.items.map((item) => (
                    <div key={item.id}
                      className={`flex items-center justify-between rounded-lg px-2 py-1.5 text-sm ${
                        item.status === "READY" ? "bg-green-100 line-through opacity-60" :
                        item.status === "PREPARING" ? "bg-yellow-100" :
                        item.status === "CANCELLED" ? "bg-red-100 line-through opacity-40" :
                        "bg-white"
                      }`}>
                      <div className="flex-1">
                        <span className="font-medium">{item.quantity}x</span>{" "}
                        <span>{item.name}</span>
                        {item.notes && <p className="text-xs text-red-600 font-medium">{item.notes}</p>}
                        {item.modifiers && Array.isArray(item.modifiers) && (
                          <p className="text-xs text-gray-500">
                            {(item.modifiers as any[]).map((m: any) => m.name).join(", ")}
                          </p>
                        )}
                      </div>
                      {item.status !== "READY" && item.status !== "CANCELLED" && (
                        <button onClick={() => updateItemStatus.mutate({
                          organizationId, id: item.id,
                          status: item.status === "PENDING" ? "PREPARING" : "READY",
                        })}
                          className="rounded p-1 hover:bg-white/50">
                          {item.status === "PENDING" ? (
                            <ChefHat className="h-4 w-4 text-yellow-600" />
                          ) : (
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                          )}
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {order.notes && (
                  <p className="mt-2 rounded-lg bg-yellow-100 px-2 py-1 text-xs font-medium text-yellow-800">
                    {order.notes}
                  </p>
                )}

                {/* Actions */}
                <div className="mt-3 flex gap-2">
                  {order.status !== "READY" ? (
                    <button onClick={() => updateStatus.mutate({
                      organizationId, id: order.id,
                      status: nextStatus[order.status] as any,
                    })}
                      className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-white py-2 text-sm font-bold text-gray-900 shadow-sm hover:bg-gray-50">
                      {order.status === "RECEIVED" && <><Bell className="h-4 w-4" />Confirmar</>}
                      {order.status === "CONFIRMED" && <><ChefHat className="h-4 w-4" />Preparar</>}
                      {order.status === "PREPARING" && <><CheckCircle2 className="h-4 w-4" />Listo!</>}
                    </button>
                  ) : (
                    <button onClick={() => updateStatus.mutate({
                      organizationId, id: order.id, status: "DELIVERED",
                    })}
                      className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-green-600 py-2 text-sm font-bold text-white shadow-sm hover:bg-green-700">
                      <CheckCircle2 className="h-4 w-4" />Entregado
                    </button>
                  )}
                  {order.status === "RECEIVED" && (
                    <button onClick={() => updateStatus.mutate({
                      organizationId, id: order.id, status: "CANCELLED", cancelReason: "Rechazado por cocina",
                    })}
                      className="rounded-lg bg-white p-2 text-red-500 shadow-sm hover:bg-red-50">
                      <XCircle className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
