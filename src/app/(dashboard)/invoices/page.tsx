"use client";

import { useState } from "react";
import { Plus, Search, FileText, DollarSign, Download } from "lucide-react";

const statusColors: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  SENT: "bg-blue-100 text-blue-700",
  PAID: "bg-green-100 text-green-700",
  PARTIALLY_PAID: "bg-yellow-100 text-yellow-700",
  OVERDUE: "bg-red-100 text-red-700",
  CANCELLED: "bg-gray-100 text-gray-500",
};

const statusLabels: Record<string, string> = {
  DRAFT: "Borrador",
  SENT: "Enviada",
  PAID: "Pagada",
  PARTIALLY_PAID: "Pago parcial",
  OVERDUE: "Vencida",
  CANCELLED: "Cancelada",
};

export default function InvoicesPage() {
  const [showCreateModal, setShowCreateModal] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Facturación</h1>
          <p className="text-gray-600">Gestiona facturas y pagos</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
        >
          <Plus className="h-4 w-4" />
          Nueva factura
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        {[
          { label: "Total facturado", value: "$0", color: "text-gray-900" },
          { label: "Pagado", value: "$0", color: "text-green-600" },
          { label: "Pendiente", value: "$0", color: "text-yellow-600" },
          { label: "Vencido", value: "$0", color: "text-red-600" },
        ].map((item) => (
          <div key={item.label} className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="text-sm text-gray-500">{item.label}</p>
            <p className={`mt-1 text-2xl font-bold ${item.color}`}>{item.value}</p>
          </div>
        ))}
      </div>

      {/* Invoice Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">N° Factura</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Paciente</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Total</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Estado</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Fecha</th>
              <th className="px-6 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            <tr>
              <td colSpan={6} className="px-6 py-12 text-center text-sm text-gray-500">
                No hay facturas aún
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
