"use client";

import Link from "next/link";
import { Users, MessageSquare, Calendar, DollarSign, UserPlus, Clock } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useOrg } from "@/lib/org-context";

function StatCard({ title, value, icon: Icon, color, href }: {
  title: string; value: string | number; icon: any; color: string; href: string;
}) {
  return (
    <Link href={href} className="rounded-xl border border-gray-200 bg-white p-6 transition-shadow hover:shadow-md">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
        </div>
        <div className={`rounded-lg p-3 ${color}`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
      </div>
    </Link>
  );
}

export default function DashboardPage() {
  const { organizationId } = useOrg();

  const { data: stats } = trpc.organization.stats.useQuery(
    { organizationId },
    { enabled: !!organizationId }
  );

  const { data: activity } = trpc.organization.recentActivity.useQuery(
    { organizationId },
    { enabled: !!organizationId }
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">Resumen de tu clínica</p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Pacientes totales" value={stats?.totalPatients ?? 0} icon={Users} color="bg-blue-500" href="/patients" />
        <StatCard title="Conversaciones abiertas" value={stats?.openConversations ?? 0} icon={MessageSquare} color="bg-green-500" href="/conversations" />
        <StatCard title="Citas próximas" value={stats?.upcomingAppointments ?? 0} icon={Calendar} color="bg-purple-500" href="/appointments" />
        <StatCard title="Ingresos totales" value={`$${Number(stats?.totalRevenue ?? 0).toLocaleString("es-CL")}`} icon={DollarSign} color="bg-yellow-500" href="/invoices" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Citas próximas */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Citas próximas</h3>
            <Link href="/appointments" className="text-sm font-medium text-primary-600 hover:text-primary-500">Ver todas</Link>
          </div>
          <div className="mt-4 space-y-3">
            {!activity?.recentAppointments.length ? (
              <p className="text-sm text-gray-500">No hay citas próximas</p>
            ) : (
              activity.recentAppointments.map((apt) => (
                <div key={apt.id} className="flex items-center gap-3 rounded-lg border border-gray-100 p-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-purple-100">
                    <Clock className="h-5 w-5 text-purple-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {apt.patient.firstName} {apt.patient.lastName}
                    </p>
                    <p className="text-xs text-gray-500">
                      {apt.service?.name || apt.title} - {new Date(apt.startTime).toLocaleDateString("es-CL", { weekday: "short", day: "numeric", month: "short" })} {new Date(apt.startTime).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-1 text-xs font-medium ${
                    apt.status === "CONFIRMED" ? "bg-green-100 text-green-700" :
                    apt.status === "PENDING" ? "bg-yellow-100 text-yellow-700" :
                    "bg-gray-100 text-gray-600"
                  }`}>
                    {apt.status === "CONFIRMED" ? "Confirmada" : apt.status === "PENDING" ? "Pendiente" : apt.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Conversaciones recientes */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Conversaciones recientes</h3>
            <Link href="/conversations" className="text-sm font-medium text-primary-600 hover:text-primary-500">Ver todas</Link>
          </div>
          <div className="mt-4 space-y-3">
            {!activity?.recentConversations.length ? (
              <p className="text-sm text-gray-500">No hay conversaciones recientes</p>
            ) : (
              activity.recentConversations.map((conv) => (
                <div key={conv.id} className="flex items-center gap-3 rounded-lg border border-gray-100 p-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-green-100">
                    <MessageSquare className="h-5 w-5 text-green-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {conv.patient ? `${conv.patient.firstName} ${conv.patient.lastName}` : "Desconocido"}
                    </p>
                    <p className="text-xs text-gray-500">
                      {conv.channel} - {conv.lastMessageAt ? new Date(conv.lastMessageAt).toLocaleDateString("es-CL", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "Sin mensajes"}
                    </p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-1 text-xs font-medium ${
                    conv.status === "OPEN" ? "bg-green-100 text-green-700" :
                    conv.status === "PENDING" ? "bg-yellow-100 text-yellow-700" :
                    "bg-gray-100 text-gray-600"
                  }`}>
                    {conv.status === "OPEN" ? "Abierta" : conv.status === "PENDING" ? "Pendiente" : "Resuelta"}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Nuevos pacientes */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Pacientes recientes</h3>
            <Link href="/patients" className="text-sm font-medium text-primary-600 hover:text-primary-500">Ver todos</Link>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {!activity?.recentPatients.length ? (
              <p className="text-sm text-gray-500">No hay pacientes aún</p>
            ) : (
              activity.recentPatients.map((patient) => (
                <Link key={patient.id} href={`/patients/${patient.id}`}
                  className="flex items-center gap-3 rounded-lg border border-gray-100 p-3 hover:bg-gray-50">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100">
                    <UserPlus className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{patient.firstName} {patient.lastName}</p>
                    <p className="text-xs text-gray-500">{patient.source || "directo"}</p>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
