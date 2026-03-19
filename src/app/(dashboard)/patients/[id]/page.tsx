"use client";

import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useOrg } from "@/lib/org-context";

export default function PatientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { organizationId } = useOrg();
  const patientId = params.id as string;

  const { data: patient, isLoading } = trpc.patient.get.useQuery(
    { organizationId, id: patientId },
    { enabled: !!organizationId && !!patientId }
  );

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!patient) {
    return <p className="text-gray-500">Paciente no encontrado</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => router.back()} className="rounded-lg p-2 hover:bg-gray-100">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {patient.firstName} {patient.lastName}
          </h1>
          <p className="text-gray-500">
            {patient.phone && <span className="mr-4">{patient.phone}</span>}
            {patient.email && <span>{patient.email}</span>}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Info principal */}
        <div className="space-y-6 lg:col-span-2">
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h3 className="text-lg font-semibold text-gray-900">Información personal</h3>
            <dl className="mt-4 grid grid-cols-2 gap-4">
              <div>
                <dt className="text-sm text-gray-500">RUT</dt>
                <dd className="text-sm font-medium">{patient.rut || "-"}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Fecha de nacimiento</dt>
                <dd className="text-sm font-medium">
                  {patient.dateOfBirth ? new Date(patient.dateOfBirth).toLocaleDateString("es-CL") : "-"}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Género</dt>
                <dd className="text-sm font-medium">{patient.gender || "-"}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Fuente</dt>
                <dd className="text-sm font-medium">{patient.source || "-"}</dd>
              </div>
            </dl>
          </div>

          {/* Notas médicas */}
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h3 className="text-lg font-semibold text-gray-900">Información médica</h3>
            <dl className="mt-4 space-y-3">
              <div>
                <dt className="text-sm text-gray-500">Notas médicas</dt>
                <dd className="text-sm">{patient.medicalNotes || "Sin notas"}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Alergias</dt>
                <dd className="text-sm">{patient.allergies || "Ninguna registrada"}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Medicamentos</dt>
                <dd className="text-sm">{patient.medications || "Ninguno registrado"}</dd>
              </div>
            </dl>
          </div>

          {/* Citas */}
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h3 className="text-lg font-semibold text-gray-900">Últimas citas</h3>
            {patient.appointments.length === 0 ? (
              <p className="mt-4 text-sm text-gray-500">No hay citas registradas</p>
            ) : (
              <div className="mt-4 space-y-3">
                {patient.appointments.map((apt) => (
                  <div key={apt.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <p className="text-sm font-medium">{apt.title}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(apt.startTime).toLocaleDateString("es-CL")} {new Date(apt.startTime).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                    <span className={`rounded-full px-2 py-1 text-xs font-medium ${
                      apt.status === "COMPLETED" ? "bg-green-100 text-green-700" :
                      apt.status === "CANCELLED" ? "bg-red-100 text-red-700" :
                      "bg-blue-100 text-blue-700"
                    }`}>
                      {apt.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h3 className="font-semibold text-gray-900">Resumen</h3>
            <dl className="mt-4 space-y-3">
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Balance</dt>
                <dd className="text-sm font-medium">${Number(patient.balance).toLocaleString("es-CL")}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Valor de vida</dt>
                <dd className="text-sm font-medium">${Number(patient.lifetimeValue).toLocaleString("es-CL")}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Score</dt>
                <dd className="text-sm font-medium">{patient.score}</dd>
              </div>
            </dl>
          </div>

          {/* Tags */}
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h3 className="font-semibold text-gray-900">Tags</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {patient.tags.length === 0 ? (
                <p className="text-sm text-gray-500">Sin tags</p>
              ) : (
                patient.tags.map((pt) => (
                  <span key={pt.tag.id} className="rounded-full px-3 py-1 text-xs font-medium"
                    style={{ backgroundColor: pt.tag.color + "20", color: pt.tag.color }}>
                    {pt.tag.name}
                  </span>
                ))
              )}
            </div>
          </div>

          {/* Facturas */}
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h3 className="font-semibold text-gray-900">Facturas recientes</h3>
            {patient.invoices.length === 0 ? (
              <p className="mt-3 text-sm text-gray-500">Sin facturas</p>
            ) : (
              <div className="mt-3 space-y-2">
                {patient.invoices.map((inv) => (
                  <div key={inv.id} className="flex items-center justify-between text-sm">
                    <span>{inv.number}</span>
                    <span className="font-medium">${Number(inv.total).toLocaleString("es-CL")}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
