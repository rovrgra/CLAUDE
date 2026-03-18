"use client";

import { useState } from "react";
import { Plus, ChevronLeft, ChevronRight, Clock, User } from "lucide-react";
import { format, addDays, startOfWeek, isSameDay } from "date-fns";
import { es } from "date-fns/locale";

const hours = Array.from({ length: 12 }, (_, i) => i + 8); // 8:00 - 19:00

export default function AppointmentsPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<"day" | "week">("week");
  const [showCreateModal, setShowCreateModal] = useState(false);

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Agenda</h1>
          <p className="text-gray-600">Gestiona las citas de tu clínica</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
        >
          <Plus className="h-4 w-4" />
          Nueva cita
        </button>
      </div>

      {/* Calendar Navigation */}
      <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setCurrentDate(addDays(currentDate, -7))}
            className="rounded-lg p-1 hover:bg-gray-100"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h2 className="text-lg font-semibold text-gray-900">
            {format(weekStart, "d MMMM", { locale: es })} - {format(addDays(weekStart, 6), "d MMMM yyyy", { locale: es })}
          </h2>
          <button
            onClick={() => setCurrentDate(addDays(currentDate, 7))}
            className="rounded-lg p-1 hover:bg-gray-100"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setCurrentDate(new Date())}
            className="rounded-lg border border-gray-300 px-3 py-1 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Hoy
          </button>
          <button
            onClick={() => setView("day")}
            className={`rounded-lg px-3 py-1 text-sm font-medium ${view === "day" ? "bg-primary-100 text-primary-700" : "text-gray-600"}`}
          >
            Día
          </button>
          <button
            onClick={() => setView("week")}
            className={`rounded-lg px-3 py-1 text-sm font-medium ${view === "week" ? "bg-primary-100 text-primary-700" : "text-gray-600"}`}
          >
            Semana
          </button>
        </div>
      </div>

      {/* Weekly Calendar Grid */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="grid grid-cols-8 border-b">
          <div className="p-3 text-center text-xs font-medium text-gray-500" />
          {weekDays.map((day) => (
            <div
              key={day.toISOString()}
              className={`border-l p-3 text-center ${isSameDay(day, new Date()) ? "bg-primary-50" : ""}`}
            >
              <p className="text-xs font-medium text-gray-500">{format(day, "EEE", { locale: es })}</p>
              <p className={`mt-1 text-lg font-semibold ${isSameDay(day, new Date()) ? "text-primary-600" : "text-gray-900"}`}>
                {format(day, "d")}
              </p>
            </div>
          ))}
        </div>

        <div className="max-h-[600px] overflow-y-auto">
          {hours.map((hour) => (
            <div key={hour} className="grid grid-cols-8 border-b last:border-b-0">
              <div className="flex items-start justify-end p-2 pr-3">
                <span className="text-xs text-gray-400">{`${hour}:00`}</span>
              </div>
              {weekDays.map((day) => (
                <div
                  key={`${day.toISOString()}-${hour}`}
                  className="h-16 border-l hover:bg-gray-50 cursor-pointer"
                  onClick={() => setShowCreateModal(true)}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Create Appointment Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-xl bg-white p-6">
            <h2 className="text-lg font-semibold text-gray-900">Nueva cita</h2>
            <form className="mt-4 space-y-4" onSubmit={(e) => { e.preventDefault(); setShowCreateModal(false); }}>
              <div>
                <label className="block text-sm font-medium text-gray-700">Paciente</label>
                <select className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500">
                  <option>Seleccionar paciente...</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Servicio</label>
                <select className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500">
                  <option>Seleccionar servicio...</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Fecha</label>
                  <input type="date" className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Hora</label>
                  <input type="time" className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Notas</label>
                <textarea rows={3} className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500" />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setShowCreateModal(false)}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                  Cancelar
                </button>
                <button type="submit"
                  className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700">
                  Agendar cita
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
