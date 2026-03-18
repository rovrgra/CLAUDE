"use client";

import { Users, MessageSquare, Calendar, DollarSign, TrendingUp, Clock } from "lucide-react";
import { trpc } from "@/lib/trpc";

function StatCard({ title, value, icon: Icon, color }: {
  title: string; value: string | number; icon: any; color: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
        </div>
        <div className={`rounded-lg p-3 ${color}`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  // For now, show static demo data since we need org context
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">Resumen de tu clínica</p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Pacientes totales" value={0} icon={Users} color="bg-blue-500" />
        <StatCard title="Conversaciones abiertas" value={0} icon={MessageSquare} color="bg-green-500" />
        <StatCard title="Citas próximas" value={0} icon={Calendar} color="bg-purple-500" />
        <StatCard title="Ingresos del mes" value="$0" icon={DollarSign} color="bg-yellow-500" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h3 className="text-lg font-semibold text-gray-900">Actividad reciente</h3>
          <div className="mt-4 space-y-4">
            <p className="text-sm text-gray-500">No hay actividad reciente</p>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h3 className="text-lg font-semibold text-gray-900">Citas de hoy</h3>
          <div className="mt-4 space-y-4">
            <p className="text-sm text-gray-500">No hay citas programadas para hoy</p>
          </div>
        </div>
      </div>
    </div>
  );
}
