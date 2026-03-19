"use client";

import { useState } from "react";
import { Plus, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { format, addDays, startOfWeek, isSameDay, startOfDay, endOfDay, addWeeks } from "date-fns";
import { es } from "date-fns/locale";
import { trpc } from "@/lib/trpc";
import { useOrg } from "@/lib/org-context";

const hours = Array.from({ length: 15 }, (_, i) => i + 8); // 8:00 - 22:00

export default function ReservationsPage() {
  const { organizationId } = useOrg();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<"day" | "week">("week");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newRes, setNewRes] = useState({ patientId: "", serviceId: "", title: "", date: "", time: "", notes: "", guests: "2" });

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const { data } = trpc.appointment.list.useQuery(
    {
      organizationId,
      startDate: startOfDay(weekStart).toISOString(),
      endDate: endOfDay(addDays(weekStart, 6)).toISOString(),
    },
    { enabled: !!organizationId }
  );

  const { data: services } = trpc.appointment.services.useQuery(
    { organizationId },
    { enabled: !!organizationId }
  );

  const { data: clients } = trpc.patient.list.useQuery(
    { organizationId, limit: 100 },
    { enabled: !!organizationId && showCreateModal }
  );

  const utils = trpc.useUtils();
  const createReservation = trpc.appointment.create.useMutation({
    onSuccess: () => {
      utils.appointment.list.invalidate();
      setShowCreateModal(false);
      setNewRes({ patientId: "", serviceId: "", title: "", date: "", time: "", notes: "", guests: "2" });
    },
  });

  function getReservationsForSlot(day: Date, hour: number) {
    if (!data?.appointments) return [];
    return data.appointments.filter((apt) => {
      const d = new Date(apt.startTime);
      return isSameDay(d, day) && d.getHours() === hour;
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reservas</h1>
          <p className="text-gray-600">{data?.total ?? 0} reservas esta semana</p>
        </div>
        <button onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700">
          <Plus className="h-4 w-4" />Nueva reserva
        </button>
      </div>

      <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4">
        <div className="flex items-center gap-4">
          <button onClick={() => setCurrentDate(addWeeks(currentDate, -1))} className="rounded-lg p-1 hover:bg-gray-100">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h2 className="text-lg font-semibold text-gray-900">
            {format(weekStart, "d MMMM", { locale: es })} - {format(addDays(weekStart, 6), "d MMMM yyyy", { locale: es })}
          </h2>
          <button onClick={() => setCurrentDate(addWeeks(currentDate, 1))} className="rounded-lg p-1 hover:bg-gray-100">
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setCurrentDate(new Date())} className="rounded-lg border border-gray-300 px-3 py-1 text-sm font-medium text-gray-700 hover:bg-gray-50">Hoy</button>
          <button onClick={() => setView("day")} className={`rounded-lg px-3 py-1 text-sm font-medium ${view === "day" ? "bg-primary-100 text-primary-700" : "text-gray-600"}`}>Día</button>
          <button onClick={() => setView("week")} className={`rounded-lg px-3 py-1 text-sm font-medium ${view === "week" ? "bg-primary-100 text-primary-700" : "text-gray-600"}`}>Semana</button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="grid grid-cols-8 border-b">
          <div className="p-3 text-center text-xs font-medium text-gray-500" />
          {weekDays.map((day) => (
            <div key={day.toISOString()} className={`border-l p-3 text-center ${isSameDay(day, new Date()) ? "bg-primary-50" : ""}`}>
              <p className="text-xs font-medium text-gray-500">{format(day, "EEE", { locale: es })}</p>
              <p className={`mt-1 text-lg font-semibold ${isSameDay(day, new Date()) ? "text-primary-600" : "text-gray-900"}`}>{format(day, "d")}</p>
            </div>
          ))}
        </div>
        <div className="max-h-[600px] overflow-y-auto">
          {hours.map((hour) => (
            <div key={hour} className="grid grid-cols-8 border-b last:border-b-0">
              <div className="flex items-start justify-end p-2 pr-3">
                <span className="text-xs text-gray-400">{`${hour}:00`}</span>
              </div>
              {weekDays.map((day) => {
                const slotRes = getReservationsForSlot(day, hour);
                return (
                  <div key={`${day.toISOString()}-${hour}`} className="h-16 border-l hover:bg-gray-50 cursor-pointer relative p-0.5"
                    onClick={() => setShowCreateModal(true)}>
                    {slotRes.map((res) => (
                      <div key={res.id}
                        className="rounded px-1.5 py-0.5 text-xs font-medium truncate"
                        style={{ backgroundColor: (res.service?.color || "#6366f1") + "30", color: res.service?.color || "#6366f1" }}>
                        {res.patient.firstName} {res.patient.lastName}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-xl bg-white p-6">
            <h2 className="text-lg font-semibold text-gray-900">Nueva reserva</h2>
            <form className="mt-4 space-y-4" onSubmit={(e) => {
              e.preventDefault();
              if (!newRes.patientId || !newRes.date || !newRes.time) return;
              const service = services?.find((s) => s.id === newRes.serviceId);
              const startTime = new Date(`${newRes.date}T${newRes.time}`);
              const endTime = new Date(startTime.getTime() + (service?.duration || 120) * 60000);
              createReservation.mutate({
                organizationId,
                patientId: newRes.patientId,
                serviceId: newRes.serviceId || undefined,
                title: newRes.title || `Mesa para ${newRes.guests}`,
                startTime: startTime.toISOString(),
                endTime: endTime.toISOString(),
                notes: newRes.notes ? `${newRes.guests} personas. ${newRes.notes}` : `${newRes.guests} personas`,
              });
            }}>
              <div>
                <label className="block text-sm font-medium text-gray-700">Cliente</label>
                <select required value={newRes.patientId} onChange={(e) => setNewRes({ ...newRes, patientId: e.target.value })}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500">
                  <option value="">Seleccionar cliente...</option>
                  {clients?.patients.map((p) => (
                    <option key={p.id} value={p.id}>{p.firstName} {p.lastName}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Comensales</label>
                <select value={newRes.guests} onChange={(e) => setNewRes({ ...newRes, guests: e.target.value })}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500">
                  {[1,2,3,4,5,6,7,8,10,12,15,20].map((n) => (
                    <option key={n} value={n}>{n} {n === 1 ? "persona" : "personas"}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Fecha</label>
                  <input type="date" required value={newRes.date} onChange={(e) => setNewRes({ ...newRes, date: e.target.value })}
                    className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Hora</label>
                  <input type="time" required value={newRes.time} onChange={(e) => setNewRes({ ...newRes, time: e.target.value })}
                    className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Notas</label>
                <textarea rows={2} value={newRes.notes} onChange={(e) => setNewRes({ ...newRes, notes: e.target.value })}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  placeholder="Ej: Cumpleaños, alergia a mariscos, terraza..." />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setShowCreateModal(false)}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancelar</button>
                <button type="submit" disabled={createReservation.isPending}
                  className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50">
                  {createReservation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  Reservar mesa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
