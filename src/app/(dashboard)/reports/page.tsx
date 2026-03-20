"use client";

import { useState, useMemo } from "react";
import {
  BarChart3,
  Download,
  Calendar,
  DollarSign,
  ShoppingCart,
  TrendingUp,
  Package,
  Loader2,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useOrg } from "@/lib/org-context";

function formatCLP(value: number): string {
  return "$" + Math.round(value).toLocaleString("es-CL");
}

function toISODate(date: Date): string {
  return date.toISOString().split("T")[0];
}

const typeLabels: Record<string, string> = {
  DINE_IN: "En mesa",
  TAKEAWAY: "Para llevar",
  DELIVERY: "Delivery",
  QR_ORDER: "QR",
};

const _sourceLabels: Record<string, string> = {
  POS: "Punto de venta",
  QR: "QR Mesa",
  WHATSAPP: "WhatsApp",
  WEB: "Web",
  PHONE: "Teléfono",
};

const methodLabels: Record<string, string> = {
  CASH: "Efectivo",
  CARD: "Tarjeta",
  TRANSFER: "Transferencia",
  STRIPE: "Stripe",
  MERCADOPAGO: "MercadoPago",
  OTHER: "Otro",
  PENDING: "Pendiente",
};

const typeColors: Record<string, string> = {
  DINE_IN: "bg-blue-500",
  TAKEAWAY: "bg-amber-500",
  DELIVERY: "bg-green-500",
  QR_ORDER: "bg-purple-500",
};

const methodColors: Record<string, string> = {
  CASH: "bg-green-500",
  CARD: "bg-blue-500",
  TRANSFER: "bg-indigo-500",
  STRIPE: "bg-purple-500",
  MERCADOPAGO: "bg-cyan-500",
  OTHER: "bg-gray-500",
  PENDING: "bg-yellow-500",
};

export default function ReportsPage() {
  const { organizationId } = useOrg();

  const today = new Date();
  const [startDate, setStartDate] = useState(toISODate(today));
  const [endDate, setEndDate] = useState(toISODate(today));

  const { data: report, isLoading } = trpc.reporting.salesReport.useQuery(
    { organizationId, startDate, endDate },
    { enabled: !!organizationId }
  );

  const { refetch: exportOrders, isFetching: exportingOrders } =
    trpc.reporting.exportCSV.useQuery(
      { organizationId, startDate, endDate, type: "orders" },
      { enabled: false }
    );
  const { refetch: exportItems, isFetching: exportingItems } =
    trpc.reporting.exportCSV.useQuery(
      { organizationId, startDate, endDate, type: "items" },
      { enabled: false }
    );
  const { refetch: exportSummary, isFetching: exportingSummary } =
    trpc.reporting.exportCSV.useQuery(
      { organizationId, startDate, endDate, type: "summary" },
      { enabled: false }
    );

  function downloadCSV(csv: string, filename: string) {
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleExport(type: "orders" | "items" | "summary") {
    let result;
    if (type === "orders") result = await exportOrders();
    else if (type === "items") result = await exportItems();
    else result = await exportSummary();

    if (result.data) {
      downloadCSV(result.data, `restobot_${type}_${startDate}_${endDate}.csv`);
    }
  }

  // Quick filters
  function setToday() {
    const d = toISODate(new Date());
    setStartDate(d);
    setEndDate(d);
  }

  function setThisWeek() {
    const now = new Date();
    const day = now.getDay();
    const diff = day === 0 ? 6 : day - 1; // Monday start
    const monday = new Date(now);
    monday.setDate(now.getDate() - diff);
    setStartDate(toISODate(monday));
    setEndDate(toISODate(now));
  }

  function setThisMonth() {
    const now = new Date();
    const first = new Date(now.getFullYear(), now.getMonth(), 1);
    setStartDate(toISODate(first));
    setEndDate(toISODate(now));
  }

  function setLastMonth() {
    const now = new Date();
    const first = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const last = new Date(now.getFullYear(), now.getMonth(), 0);
    setStartDate(toISODate(first));
    setEndDate(toISODate(last));
  }

  // Chart helpers
  const maxDailyRevenue = useMemo(() => {
    if (!report?.dailyRevenue.length) return 0;
    return Math.max(...report.dailyRevenue.map((d) => d.revenue));
  }, [report?.dailyRevenue]);

  const maxTypeRevenue = useMemo(() => {
    if (!report?.revenueByOrderType.length) return 0;
    return Math.max(...report.revenueByOrderType.map((d) => d.revenue));
  }, [report?.revenueByOrderType]);

  const maxMethodRevenue = useMemo(() => {
    if (!report?.paymentBreakdown.length) return 0;
    return Math.max(...report.paymentBreakdown.map((d) => d.revenue));
  }, [report?.paymentBreakdown]);

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BarChart3 className="h-7 w-7 text-indigo-600" />
          <h1 className="text-2xl font-bold text-gray-900">Reportes</h1>
        </div>
      </div>

      {/* Date Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Calendar className="inline h-4 w-4 mr-1" />
              Desde
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Hasta
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={setToday}
            className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
          >
            Hoy
          </button>
          <button
            onClick={setThisWeek}
            className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
          >
            Esta semana
          </button>
          <button
            onClick={setThisMonth}
            className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
          >
            Este mes
          </button>
          <button
            onClick={setLastMonth}
            className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
          >
            Último mes
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
          <span className="ml-3 text-gray-500">Cargando reportes...</span>
        </div>
      ) : !report ? (
        <div className="text-center py-20 text-gray-500">
          Selecciona un rango de fechas para ver los reportes.
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <SummaryCard
              icon={<DollarSign className="h-5 w-5" />}
              label="Total ventas"
              value={formatCLP(report.totalRevenue)}
              color="bg-green-50 text-green-700"
              iconColor="bg-green-100"
            />
            <SummaryCard
              icon={<ShoppingCart className="h-5 w-5" />}
              label="Total pedidos"
              value={report.totalOrders.toString()}
              color="bg-blue-50 text-blue-700"
              iconColor="bg-blue-100"
            />
            <SummaryCard
              icon={<TrendingUp className="h-5 w-5" />}
              label="Ticket promedio"
              value={formatCLP(report.avgOrderValue)}
              color="bg-purple-50 text-purple-700"
              iconColor="bg-purple-100"
            />
            <SummaryCard
              icon={<Package className="h-5 w-5" />}
              label="Items vendidos"
              value={report.totalItemsSold.toString()}
              color="bg-amber-50 text-amber-700"
              iconColor="bg-amber-100"
            />
          </div>

          {/* Revenue by Day Chart */}
          {report.dailyRevenue.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-4 md:p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Ingresos por día
              </h2>
              <div className="space-y-2">
                {report.dailyRevenue.map((day) => {
                  const pct =
                    maxDailyRevenue > 0
                      ? (day.revenue / maxDailyRevenue) * 100
                      : 0;
                  return (
                    <div key={day.date} className="flex items-center gap-3">
                      <span className="text-sm text-gray-600 w-24 shrink-0">
                        {new Date(day.date + "T12:00:00").toLocaleDateString(
                          "es-CL",
                          { day: "2-digit", month: "short" }
                        )}
                      </span>
                      <div className="flex-1 h-8 bg-gray-100 rounded-lg overflow-hidden relative">
                        <div
                          className="h-full bg-indigo-500 rounded-lg transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-medium text-gray-700">
                          {formatCLP(day.revenue)} ({day.orders} pedidos)
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Revenue by Type & Payment Method */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* By Order Type */}
            {report.revenueByOrderType.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-4 md:p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Ingresos por tipo de pedido
                </h2>
                <div className="space-y-3">
                  {report.revenueByOrderType.map((item) => {
                    const pct =
                      maxTypeRevenue > 0
                        ? (item.revenue / maxTypeRevenue) * 100
                        : 0;
                    return (
                      <div key={item.type}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="font-medium text-gray-700">
                            {typeLabels[item.type] || item.type}
                          </span>
                          <span className="text-gray-600">
                            {formatCLP(item.revenue)}
                          </span>
                        </div>
                        <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${typeColors[item.type] || "bg-gray-400"}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* By Payment Method */}
            {report.paymentBreakdown.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-4 md:p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Ingresos por método de pago
                </h2>
                <div className="space-y-3">
                  {report.paymentBreakdown.map((item) => {
                    const pct =
                      maxMethodRevenue > 0
                        ? (item.revenue / maxMethodRevenue) * 100
                        : 0;
                    return (
                      <div key={item.method}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="font-medium text-gray-700">
                            {methodLabels[item.method] || item.method}
                          </span>
                          <span className="text-gray-600">
                            {formatCLP(item.revenue)} ({item.count})
                          </span>
                        </div>
                        <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${methodColors[item.method] || "bg-gray-400"}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Top Items Table */}
          {report.topItems.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-4 md:p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Top 10 items
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 px-3 font-medium text-gray-500">
                        #
                      </th>
                      <th className="text-left py-2 px-3 font-medium text-gray-500">
                        Item
                      </th>
                      <th className="text-right py-2 px-3 font-medium text-gray-500">
                        Cantidad
                      </th>
                      <th className="text-right py-2 px-3 font-medium text-gray-500">
                        Ingresos
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.topItems.map((item, i) => (
                      <tr
                        key={item.name + i}
                        className="border-b border-gray-100 hover:bg-gray-50"
                      >
                        <td className="py-2 px-3 text-gray-400">{i + 1}</td>
                        <td className="py-2 px-3 font-medium text-gray-900">
                          {item.name}
                        </td>
                        <td className="py-2 px-3 text-right text-gray-600">
                          {item.quantity}
                        </td>
                        <td className="py-2 px-3 text-right font-medium text-gray-900">
                          {formatCLP(item.revenue)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Export Buttons */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 md:p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Exportar datos
            </h2>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => handleExport("orders")}
                disabled={exportingOrders}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
              >
                {exportingOrders ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                Pedidos (CSV)
              </button>
              <button
                onClick={() => handleExport("items")}
                disabled={exportingItems}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
              >
                {exportingItems ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                Items (CSV)
              </button>
              <button
                onClick={() => handleExport("summary")}
                disabled={exportingSummary}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
              >
                {exportingSummary ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                Resumen (CSV)
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  color,
  iconColor,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
  iconColor: string;
}) {
  return (
    <div className={`rounded-xl border border-gray-200 p-4 ${color}`}>
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${iconColor}`}>{icon}</div>
        <div>
          <p className="text-sm opacity-80">{label}</p>
          <p className="text-xl font-bold">{value}</p>
        </div>
      </div>
    </div>
  );
}
