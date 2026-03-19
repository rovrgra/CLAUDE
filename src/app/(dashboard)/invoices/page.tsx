"use client";

import { useState } from "react";
import { Plus, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useOrg } from "@/lib/org-context";

const statusColors: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  SENT: "bg-blue-100 text-blue-700",
  PAID: "bg-green-100 text-green-700",
  PARTIALLY_PAID: "bg-yellow-100 text-yellow-700",
  OVERDUE: "bg-red-100 text-red-700",
  CANCELLED: "bg-gray-100 text-gray-500",
  REFUNDED: "bg-purple-100 text-purple-700",
};

const statusLabels: Record<string, string> = {
  DRAFT: "Borrador", SENT: "Enviada", PAID: "Pagada",
  PARTIALLY_PAID: "Pago parcial", OVERDUE: "Vencida",
  CANCELLED: "Cancelada", REFUNDED: "Reembolsada",
};

export default function InvoicesPage() {
  const { organizationId } = useOrg();
  const [page, setPage] = useState(1);

  const { data, isLoading } = trpc.invoice.list.useQuery(
    { organizationId, page },
    { enabled: !!organizationId }
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Facturación</h1>
          <p className="text-gray-600">{data?.total ?? 0} facturas</p>
        </div>
        <button className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700">
          <Plus className="h-4 w-4" />Nueva factura
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">N° Factura</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Paciente</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Total</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Estado</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Fecha</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {isLoading ? (
              <tr><td colSpan={5} className="px-6 py-12 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-gray-400" /></td></tr>
            ) : !data?.invoices.length ? (
              <tr><td colSpan={5} className="px-6 py-12 text-center text-sm text-gray-500">No hay facturas aún</td></tr>
            ) : (
              data.invoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{inv.number}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {inv.patient.firstName} {inv.patient.lastName}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    ${Number(inv.total).toLocaleString("es-CL")}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${statusColors[inv.status]}`}>
                      {statusLabels[inv.status]}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {new Date(inv.createdAt).toLocaleDateString("es-CL")}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {data && data.pages > 1 && (
          <div className="flex items-center justify-between border-t px-6 py-3">
            <p className="text-sm text-gray-500">Página {page} de {data.pages}</p>
            <div className="flex gap-2">
              <button onClick={() => setPage(page - 1)} disabled={page === 1}
                className="rounded-lg border px-3 py-1 text-sm disabled:opacity-50">Anterior</button>
              <button onClick={() => setPage(page + 1)} disabled={page >= data.pages}
                className="rounded-lg border px-3 py-1 text-sm disabled:opacity-50">Siguiente</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
