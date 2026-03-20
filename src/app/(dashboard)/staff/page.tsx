"use client";

import { useState } from "react";
import { Plus, Loader2, Phone, Mail, ChevronDown, ChevronUp, X, UserCog, Clock } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useOrg } from "@/lib/org-context";

const inputClass = "mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500";

const roleColors: Record<string, string> = {
  MANAGER: "bg-purple-100 text-purple-700",
  CHEF: "bg-red-100 text-red-700",
  COOK: "bg-orange-100 text-orange-700",
  WAITER: "bg-blue-100 text-blue-700",
  BARTENDER: "bg-yellow-100 text-yellow-700",
  CASHIER: "bg-green-100 text-green-700",
  HOST: "bg-pink-100 text-pink-700",
  DELIVERY: "bg-indigo-100 text-indigo-700",
  CLEANER: "bg-gray-100 text-gray-700",
};

const roleLabels: Record<string, string> = {
  MANAGER: "Gerente",
  CHEF: "Chef",
  COOK: "Cocinero",
  WAITER: "Mesero",
  BARTENDER: "Barman",
  CASHIER: "Cajero",
  HOST: "Anfitrion",
  DELIVERY: "Repartidor",
  CLEANER: "Limpieza",
};

const salaryTypeLabels: Record<string, string> = {
  MONTHLY: "Mensual",
  HOURLY: "Por hora",
  DAILY: "Diario",
};

type StaffRole = "MANAGER" | "CHEF" | "COOK" | "WAITER" | "BARTENDER" | "CASHIER" | "HOST" | "DELIVERY" | "CLEANER";
type SalaryType = "monthly" | "hourly";

type StaffForm = {
  id?: string;
  firstName: string;
  lastName: string;
  role: StaffRole;
  phone: string;
  email: string;
  pin: string;
  salary: number;
  salaryType: SalaryType;
};

const emptyForm: StaffForm = {
  firstName: "",
  lastName: "",
  role: "WAITER",
  phone: "",
  email: "",
  pin: "",
  salary: 0,
  salaryType: "monthly",
};

function getInitials(firstName: string, lastName: string) {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

const initialsColors = [
  "bg-blue-500", "bg-green-500", "bg-purple-500", "bg-red-500",
  "bg-yellow-500", "bg-pink-500", "bg-indigo-500", "bg-teal-500",
];

function getInitialsColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return initialsColors[Math.abs(hash) % initialsColors.length];
}

export default function StaffPage() {
  const { organizationId } = useOrg();
  const [roleFilter, setRoleFilter] = useState<StaffRole | "">("");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<StaffForm>(emptyForm);
  const [expandedStaff, setExpandedStaff] = useState<string | null>(null);

  const { data: staffList, isLoading } = trpc.staff.list.useQuery(
    { organizationId, role: (roleFilter || undefined) as StaffRole | undefined, isActive: true },
    { enabled: !!organizationId }
  );

  const { data: todayShifts } = trpc.staff.todayShifts.useQuery(
    { organizationId },
    { enabled: !!organizationId }
  );

  const utils = trpc.useUtils();

  const createStaff = trpc.staff.create.useMutation({
    onSuccess: () => {
      utils.staff.list.invalidate();
      setShowModal(false);
      setForm(emptyForm);
    },
  });

  const updateStaff = trpc.staff.update.useMutation({
    onSuccess: () => {
      utils.staff.list.invalidate();
      setShowModal(false);
      setForm(emptyForm);
    },
  });

  const deactivateStaff = trpc.staff.deactivate.useMutation({
    onSuccess: () => utils.staff.list.invalidate(),
  });

  const isEditing = !!form.id;

  function openEditModal(staff: any) {
    setForm({
      id: staff.id,
      firstName: staff.firstName,
      lastName: staff.lastName,
      role: staff.role,
      phone: staff.phone || "",
      email: staff.email || "",
      pin: staff.pin || "",
      salary: Number(staff.salary) || 0,
      salaryType: staff.salaryType || "MONTHLY",
    });
    setShowModal(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      organizationId,
      firstName: form.firstName,
      lastName: form.lastName,
      role: form.role as StaffRole,
      phone: form.phone || undefined,
      email: form.email || undefined,
      pin: form.pin || undefined,
      salary: form.salary || undefined,
      salaryType: (form.salaryType || undefined) as SalaryType | undefined,
    };
    if (isEditing) {
      updateStaff.mutate({ ...payload, id: form.id! });
    } else {
      createStaff.mutate(payload);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Personal</h1>
          <p className="text-gray-600">Gestiona empleados, roles y turnos</p>
        </div>
        <button
          onClick={() => { setForm(emptyForm); setShowModal(true); }}
          className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
        >
          <Plus className="h-4 w-4" />Agregar empleado
        </button>
      </div>

      {/* Filter by role */}
      <div className="flex flex-wrap gap-2">
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value as StaffRole | "")}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">Todos los roles</option>
          {Object.entries(roleLabels).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>

      {/* Staff grid */}
      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : !staffList?.length ? (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
          <UserCog className="mx-auto h-12 w-12 text-gray-300" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">No hay personal registrado</h3>
          <p className="mt-1 text-sm text-gray-500">Agrega tu primer empleado para comenzar</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {staffList.map((staff: any) => {
            const isExpanded = expandedStaff === staff.id;
            return (
              <div key={staff.id} className="rounded-xl border border-gray-200 bg-white p-4">
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <div className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${getInitialsColor(staff.firstName + staff.lastName)}`}>
                    {getInitials(staff.firstName, staff.lastName)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="truncate font-semibold text-gray-900">
                        {staff.firstName} {staff.lastName}
                      </h3>
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${roleColors[staff.role] || "bg-gray-100 text-gray-700"}`}>
                        {roleLabels[staff.role] || staff.role}
                      </span>
                    </div>
                    {staff.phone && (
                      <div className="mt-1 flex items-center gap-1 text-sm text-gray-500">
                        <Phone className="h-3 w-3" />
                        {staff.phone}
                      </div>
                    )}
                    {staff.email && (
                      <div className="mt-0.5 flex items-center gap-1 text-sm text-gray-500">
                        <Mail className="h-3 w-3" />
                        <span className="truncate">{staff.email}</span>
                      </div>
                    )}
                    <div className="mt-1 flex items-center gap-1">
                      <span className={`inline-flex rounded-full px-1.5 py-0.5 text-xs font-medium ${
                        staff.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                      }`}>
                        {staff.isActive ? "Activo" : "Inactivo"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Expand/Collapse */}
                <div className="mt-3 border-t pt-2">
                  <button
                    onClick={() => setExpandedStaff(isExpanded ? null : staff.id)}
                    className="flex w-full items-center justify-between text-xs font-medium text-gray-500 hover:text-gray-700"
                  >
                    <span>Detalles y turnos</span>
                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                  {isExpanded && (
                    <div className="mt-2 space-y-2">
                      {staff.salary != null && (
                        <p className="text-xs text-gray-500">
                          Salario: ${Number(staff.salary).toLocaleString("es-CL")} {salaryTypeLabels[staff.salaryType] || staff.salaryType}
                        </p>
                      )}
                      {staff.shifts && staff.shifts.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-gray-500">Turnos recientes:</p>
                          {staff.shifts.map((shift: any, idx: number) => (
                            <div key={idx} className="flex items-center gap-2 text-xs text-gray-600">
                              <Clock className="h-3 w-3" />
                              <span>{new Date(shift.date).toLocaleDateString("es-CL")}</span>
                              <span>{shift.startTime} - {shift.endTime || "en curso"}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="flex gap-2">
                        <button
                          onClick={() => openEditModal(staff)}
                          className="rounded-lg px-2 py-1 text-xs font-medium text-primary-600 hover:bg-primary-50"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => deactivateStaff.mutate({ organizationId, id: staff.id })}
                          className="rounded-lg px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                        >
                          Desactivar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Today's shifts section */}
      {todayShifts && todayShifts.length > 0 && (
        <div>
          <h2 className="mb-3 text-lg font-semibold text-gray-900">Turnos de hoy</h2>
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Empleado</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Rol</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Inicio</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Fin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {todayShifts.map((shift: any, idx: number) => (
                  <tr key={idx}>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {shift.staff?.firstName} {shift.staff?.lastName}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${roleColors[shift.staff?.role] || "bg-gray-100 text-gray-700"}`}>
                        {roleLabels[shift.staff?.role] || shift.staff?.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{shift.startTime}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{shift.endTime || "En curso"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create/Edit Staff Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-lg rounded-xl bg-white p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">{isEditing ? "Editar empleado" : "Nuevo empleado"}</h2>
              <button onClick={() => { setShowModal(false); setForm(emptyForm); }} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Nombre</label>
                  <input
                    type="text"
                    required
                    value={form.firstName}
                    onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                    className={inputClass}
                    placeholder="Nombre"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Apellido</label>
                  <input
                    type="text"
                    required
                    value={form.lastName}
                    onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                    className={inputClass}
                    placeholder="Apellido"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Rol</label>
                <select
                  required
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value as StaffRole })}
                  className={inputClass}
                >
                  {Object.entries(roleLabels).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Telefono</label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className={inputClass}
                    placeholder="+56 9 1234 5678"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className={inputClass}
                    placeholder="correo@ejemplo.com"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">PIN de acceso</label>
                <input
                  type="text"
                  value={form.pin}
                  onChange={(e) => setForm({ ...form, pin: e.target.value })}
                  className={inputClass}
                  placeholder="PIN de 4 digitos"
                  maxLength={6}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Salario ($)</label>
                  <input
                    type="number"
                    min={0}
                    value={form.salary}
                    onChange={(e) => setForm({ ...form, salary: parseFloat(e.target.value) || 0 })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Tipo de pago</label>
                  <select
                    value={form.salaryType}
                    onChange={(e) => setForm({ ...form, salaryType: e.target.value as SalaryType })}
                    className={inputClass}
                  >
                    {Object.entries(salaryTypeLabels).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => { setShowModal(false); setForm(emptyForm); }} className="rounded-lg border px-4 py-2 text-sm">
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={createStaff.isPending || updateStaff.isPending}
                  className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
                >
                  {isEditing ? "Guardar cambios" : "Crear empleado"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
