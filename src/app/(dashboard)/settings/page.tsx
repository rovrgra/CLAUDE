"use client";

import { useState, useEffect } from "react";
import { Bot, Building2, Globe, CreditCard, Key, Bell, Loader2, Check } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useOrg } from "@/lib/org-context";

export default function SettingsPage() {
  const { organizationId } = useOrg();
  const [activeTab, setActiveTab] = useState("general");
  const [saved, setSaved] = useState(false);

  const { data: org } = trpc.organization.get.useQuery(
    { organizationId },
    { enabled: !!organizationId }
  );

  const [form, setForm] = useState({
    name: "", phone: "", email: "", address: "", businessType: "dental_clinic",
    aiAgentName: "Asistente", aiAgentPersonality: "profesional y amable",
    aiAgentInstructions: "", aiAutoReply: true,
  });

  useEffect(() => {
    if (org) {
      setForm({
        name: org.name || "",
        phone: org.phone || "",
        email: org.email || "",
        address: org.address || "",
        businessType: org.businessType,
        aiAgentName: org.aiAgentName,
        aiAgentPersonality: org.aiAgentPersonality,
        aiAgentInstructions: org.aiAgentInstructions || "",
        aiAutoReply: org.aiAutoReply,
      });
    }
  }, [org]);

  const utils = trpc.useUtils();
  const updateOrg = trpc.organization.update.useMutation({
    onSuccess: () => {
      utils.organization.get.invalidate();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
  });

  function handleSave() {
    updateOrg.mutate({ organizationId, ...form });
  }

  const tabs = [
    { key: "general", label: "General", icon: Building2 },
    { key: "ai", label: "Agente IA", icon: Bot },
    { key: "channels", label: "Canales", icon: Globe },
    { key: "billing", label: "Facturación", icon: CreditCard },
    { key: "api", label: "API Keys", icon: Key },
    { key: "notifications", label: "Notificaciones", icon: Bell },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Configuración</h1>
        <p className="text-gray-600">Administra tu clínica y el agente IA</p>
      </div>

      <div className="flex gap-6">
        <nav className="w-48 space-y-1">
          {tabs.map((tab) => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium ${
                activeTab === tab.key ? "bg-primary-50 text-primary-700" : "text-gray-600 hover:bg-gray-50"
              }`}>
              <tab.icon className="h-4 w-4" />{tab.label}
            </button>
          ))}
        </nav>

        <div className="flex-1 rounded-xl border border-gray-200 bg-white p-6">
          {activeTab === "general" && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-gray-900">Información de la clínica</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Nombre de la clínica</label>
                  <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Tipo de negocio</label>
                  <select value={form.businessType} onChange={(e) => setForm({ ...form, businessType: e.target.value })}
                    className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500">
                    <option value="dental_clinic">Clínica dental</option>
                    <option value="medical_clinic">Clínica médica</option>
                    <option value="beauty_salon">Salón de belleza</option>
                    <option value="other">Otro</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Teléfono</label>
                  <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Dirección</label>
                  <input type="text" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })}
                    className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500" />
                </div>
              </div>
              <button onClick={handleSave} disabled={updateOrg.isPending}
                className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50">
                {updateOrg.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <Check className="h-4 w-4" /> : null}
                {saved ? "Guardado" : "Guardar cambios"}
              </button>
            </div>
          )}

          {activeTab === "ai" && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-gray-900">Configuración del Agente IA</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Nombre del agente</label>
                  <input type="text" value={form.aiAgentName} onChange={(e) => setForm({ ...form, aiAgentName: e.target.value })}
                    className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Personalidad</label>
                  <input type="text" value={form.aiAgentPersonality} onChange={(e) => setForm({ ...form, aiAgentPersonality: e.target.value })}
                    className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Instrucciones personalizadas</label>
                  <textarea rows={6} value={form.aiAgentInstructions} onChange={(e) => setForm({ ...form, aiAgentInstructions: e.target.value })}
                    className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                    placeholder="Ej: Siempre ofrece agendar una cita cuando el paciente pregunte por precios..." />
                </div>
                <div className="flex items-center gap-3">
                  <input type="checkbox" id="autoReply" checked={form.aiAutoReply}
                    onChange={(e) => setForm({ ...form, aiAutoReply: e.target.checked })}
                    className="h-4 w-4 rounded border-gray-300 text-primary-600" />
                  <label htmlFor="autoReply" className="text-sm text-gray-700">Habilitar respuestas automáticas</label>
                </div>
              </div>
              <button onClick={handleSave} disabled={updateOrg.isPending}
                className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50">
                {updateOrg.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <Check className="h-4 w-4" /> : null}
                {saved ? "Guardado" : "Guardar configuración IA"}
              </button>
            </div>
          )}

          {activeTab === "channels" && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-gray-900">Canales de comunicación</h2>
              <div className="rounded-lg border border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
                      <span className="text-lg">📱</span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">WhatsApp Business</p>
                      <p className="text-sm text-gray-500">Conecta tu número de WhatsApp Business</p>
                    </div>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-medium ${
                    org?.whatsappPhoneId ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                  }`}>
                    {org?.whatsappPhoneId ? "Conectado" : "No conectado"}
                  </span>
                </div>
              </div>
            </div>
          )}

          {!["general", "ai", "channels"].includes(activeTab) && (
            <div className="py-12 text-center"><p className="text-gray-500">Próximamente</p></div>
          )}
        </div>
      </div>
    </div>
  );
}
