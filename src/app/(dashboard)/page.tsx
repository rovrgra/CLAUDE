"use client";

import { DollarSign, ShoppingCart, TrendingUp, TrendingDown, Activity, Utensils } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useOrg } from "@/lib/org-context";

function formatCLP(amount: number): string {
  return "$" + Math.round(amount).toLocaleString("es-CL");
}

function formatTime(date: Date | string): string {
  return new Date(date).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" });
}

const STATUS_LABELS: Record<string, string> = {
  RECEIVED: "Recibido",
  CONFIRMED: "Confirmado",
  PREPARING: "Preparando",
  READY: "Listo",
  DELIVERED: "Entregado",
  COMPLETED: "Completado",
  CANCELLED: "Cancelado",
};

const STATUS_COLORS: Record<string, string> = {
  RECEIVED: "bg-blue-100 text-blue-700",
  CONFIRMED: "bg-indigo-100 text-indigo-700",
  PREPARING: "bg-yellow-100 text-yellow-700",
  READY: "bg-green-100 text-green-700",
  DELIVERED: "bg-emerald-100 text-emerald-700",
  COMPLETED: "bg-gray-100 text-gray-600",
  CANCELLED: "bg-red-100 text-red-700",
};

const TYPE_LABELS: Record<string, string> = {
  DINE_IN: "En mesa",
  TAKEAWAY: "Para llevar",
  DELIVERY: "Delivery",
  QR_ORDER: "QR",
};

const TYPE_COLORS: Record<string, string> = {
  DINE_IN: "bg-primary-600",
  TAKEAWAY: "bg-amber-500",
  DELIVERY: "bg-blue-500",
  QR_ORDER: "bg-purple-500",
};

function StatCard({
  title,
  value,
  icon: Icon,
  color,
  change,
  subtitle,
}: {
  title: string;
  value: string;
  icon: React.ElementType;
  color: string;
  change?: number | null;
  subtitle?: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <div className="flex items-center justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="mt-1 text-2xl font-bold text-gray-900 truncate">{value}</p>
          {change != null && change !== 0 && (
            <div className={`mt-1 flex items-center gap-1 text-xs font-medium ${change > 0 ? "text-green-600" : "text-red-600"}`}>
              {change > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              <span>{change > 0 ? "+" : ""}{change}% vs ayer</span>
            </div>
          )}
          {subtitle && <p className="mt-1 text-xs text-gray-400">{subtitle}</p>}
        </div>
        <div className={`rounded-lg p-3 ${color}`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
      </div>
    </div>
  );
}

function BarChart({
  data,
  labelKey,
  valueKey,
  formatValue,
  color = "bg-primary-600",
  height = 160,
}: {
  data: Record<string, unknown>[];
  labelKey: string;
  valueKey: string;
  formatValue?: (v: number) => string;
  color?: string;
  height?: number;
}) {
  const maxVal = Math.max(...data.map((d) => Number(d[valueKey]) || 0), 1);

  return (
    <div className="flex items-end gap-1" style={{ height }}>
      {data.map((d, i) => {
        const val = Number(d[valueKey]) || 0;
        const barH = Math.max((val / maxVal) * (height - 24), 2);
        return (
          <div key={i} className="flex flex-1 flex-col items-center gap-1" title={formatValue ? formatValue(val) : String(val)}>
            <div className={`w-full rounded-t ${color} transition-all`} style={{ height: barH }} />
            <span className="text-[10px] text-gray-500 leading-none truncate max-w-full">
              {String(d[labelKey])}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function DashboardPage() {
  const { organizationId } = useOrg();

  const { data: analytics, isLoading } = trpc.order.analytics.useQuery(
    { organizationId },
    { enabled: !!organizationId, refetchInterval: 30000 }
  );

  const { data: stats } = trpc.order.todayStats.useQuery(
    { organizationId },
    { enabled: !!organizationId, refetchInterval: 30000 }
  );

  if (!organizationId) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        Selecciona una organizacion para ver el dashboard
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Cargando datos...</p>
        </div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-xl border border-gray-200 bg-gray-50" />
          ))}
        </div>
      </div>
    );
  }

  const revenueByDay = analytics?.revenueByDay ?? [];
  const ordersByHour = analytics?.ordersByHour ?? [];
  const topItems = analytics?.topItems ?? [];
  const orderTypeDist = analytics?.orderTypeDistribution ?? [];
  const recentOrders = analytics?.recentOrders ?? [];

  const dayLabels = revenueByDay.map((d) => {
    const dt = new Date(d.date + "T12:00:00");
    return {
      ...d,
      label: dt.toLocaleDateString("es-CL", { weekday: "short" }),
    };
  });

  const hourLabels = ordersByHour.map((h) => ({
    ...h,
    label: String(h.hour).padStart(2, "0"),
  }));

  const maxItemQty = Math.max(...topItems.map((t) => t.quantity), 1);
  const totalTypeDist = orderTypeDist.reduce((s, d) => s + d.count, 0) || 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">Resumen de tu restaurante</p>
      </div>

      {/* Row 1: Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Ventas hoy"
          value={formatCLP(analytics?.todayRevenue ?? Number(stats?.todayRevenue ?? 0))}
          icon={DollarSign}
          color="bg-green-500"
          change={analytics?.todayRevenueChange}
        />
        <StatCard
          title="Pedidos hoy"
          value={String(analytics?.todayOrders ?? stats?.todayOrders ?? 0)}
          icon={ShoppingCart}
          color="bg-blue-500"
        />
        <StatCard
          title="Pedidos activos"
          value={String(analytics?.activeOrders ?? stats?.activeOrders ?? 0)}
          icon={Activity}
          color="bg-amber-500"
          subtitle="Recibidos, confirmados, preparando, listos"
        />
        <StatCard
          title="Ticket promedio"
          value={formatCLP(analytics?.todayAvgOrderValue ?? 0)}
          icon={Utensils}
          color="bg-purple-500"
          subtitle="Promedio hoy"
        />
      </div>

      {/* Row 2: Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Revenue last 7 days */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <div className="mb-1 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Ventas ultimos 7 dias</h3>
            {analytics?.weekRevenueChange != null && analytics.weekRevenueChange !== 0 && (
              <span className={`flex items-center gap-1 text-sm font-medium ${analytics.weekRevenueChange > 0 ? "text-green-600" : "text-red-600"}`}>
                {analytics.weekRevenueChange > 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                {analytics.weekRevenueChange > 0 ? "+" : ""}{analytics.weekRevenueChange}% vs semana anterior
              </span>
            )}
          </div>
          <p className="mb-4 text-sm text-gray-500">Total semana: {formatCLP(analytics?.thisWeekRevenue ?? 0)}</p>
          <BarChart
            data={dayLabels}
            labelKey="label"
            valueKey="revenue"
            formatValue={formatCLP}
            color="bg-primary-600"
            height={180}
          />
        </div>

        {/* Orders by hour */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h3 className="text-lg font-semibold text-gray-900">Pedidos por hora (hoy)</h3>
          <p className="mb-4 text-sm text-gray-500">Analisis de horas peak</p>
          <BarChart
            data={hourLabels}
            labelKey="label"
            valueKey="count"
            color="bg-blue-500"
            height={180}
          />
        </div>
      </div>

      {/* Row 3: Top items + Order type distribution */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Top 5 items */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h3 className="text-lg font-semibold text-gray-900">Top 5 productos (semana)</h3>
          <div className="mt-4 space-y-3">
            {topItems.length === 0 ? (
              <p className="text-sm text-gray-500">No hay datos esta semana</p>
            ) : (
              topItems.map((item, i) => (
                <div key={i}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700 truncate flex-1 mr-2">{item.name}</span>
                    <span className="text-sm text-gray-500 shrink-0">{item.quantity} uds &middot; {formatCLP(item.revenue)}</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-gray-100">
                    <div
                      className="h-2 rounded-full bg-primary-600 transition-all"
                      style={{ width: `${(item.quantity / maxItemQty) * 100}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Order type distribution */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h3 className="text-lg font-semibold text-gray-900">Tipos de pedido (semana)</h3>
          <div className="mt-4 space-y-3">
            {orderTypeDist.length === 0 ? (
              <p className="text-sm text-gray-500">No hay datos esta semana</p>
            ) : (
              orderTypeDist.map((d, i) => {
                const pct = Math.round((d.count / totalTypeDist) * 100);
                return (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <div className={`h-3 w-3 rounded-full ${TYPE_COLORS[d.type] ?? "bg-gray-400"}`} />
                        <span className="text-sm font-medium text-gray-700">{TYPE_LABELS[d.type] ?? d.type}</span>
                      </div>
                      <span className="text-sm text-gray-500">{d.count} ({pct}%)</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-gray-100">
                      <div
                        className={`h-2 rounded-full ${TYPE_COLORS[d.type] ?? "bg-gray-400"} transition-all`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Row 4: Recent orders */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">Pedidos recientes</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-gray-500">
                <th className="pb-3 font-medium">#</th>
                <th className="pb-3 font-medium">Estado</th>
                <th className="pb-3 font-medium">Tipo</th>
                <th className="pb-3 font-medium">Cliente</th>
                <th className="pb-3 font-medium text-right">Total</th>
                <th className="pb-3 font-medium text-right">Hora</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {recentOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-500">No hay pedidos recientes</td>
                </tr>
              ) : (
                recentOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="py-3 font-medium text-gray-900">#{order.number}</td>
                    <td className="py-3">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[order.status] ?? "bg-gray-100 text-gray-600"}`}>
                        {STATUS_LABELS[order.status] ?? order.status}
                      </span>
                    </td>
                    <td className="py-3 text-gray-600">{TYPE_LABELS[order.type] ?? order.type}</td>
                    <td className="py-3 text-gray-600">{order.customerName ?? order.tableName ?? "-"}</td>
                    <td className="py-3 text-right font-medium text-gray-900">{formatCLP(order.total)}</td>
                    <td className="py-3 text-right text-gray-500">{formatTime(order.createdAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
