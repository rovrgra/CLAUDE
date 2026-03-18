"use client";

import { useState } from "react";
import { Bot, Building2, Globe, CreditCard, Key, Bell } from "lucide-react";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("general");

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
        {/* Sidebar */}
        <nav className="w-48 space-y-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium ${
                activeTab === tab.key ? "bg-primary-50 text-primary-700" : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </nav>

        {/* Content */}
        <div className="flex-1 rounded-xl border border-gray-200 bg-white p-6">
          {activeTab === "general" && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-gray-900">Información de la clínica</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Nombre de la clínica</label>
                  <input type="text" className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Tipo de negocio</label>
                  <select className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500">
                    <option value="dental_clinic">Clínica dental</option>
                    <option value="medical_clinic">Clínica médica</option>
                    <option value="beauty_salon">Salón de belleza</option>
                    <option value="other">Otro</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Teléfono</label>
                  <input type="tel" className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <input type="email" className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Dirección</label>
                  <input type="text" className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500" />
                </div>
              </div>
              <button className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700">
                Guardar cambios
              </button>
            </div>
          )}

          {activeTab === "ai" && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-gray-900">Configuración del Agente IA</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Nombre del agente</label>
                  <input type="text" defaultValue="Asistente" className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Personalidad</label>
                  <input type="text" defaultValue="profesional y amable" className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Instrucciones personalizadas</label>
                  <textarea rows={6} className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                    placeholder="Ej: Siempre ofrece agendar una cita cuando el paciente pregunte por precios. Menciona que tenemos estacionamiento gratuito..." />
                </div>
                <div className="flex items-center gap-3">
                  <input type="checkbox" id="autoReply" defaultChecked className="h-4 w-4 rounded border-gray-300 text-primary-600" />
                  <label htmlFor="autoReply" className="text-sm text-gray-700">Habilitar respuestas automáticas</label>
                </div>
              </div>
              <button className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700">
                Guardar configuración IA
              </button>
            </div>
          )}

          {activeTab === "channels" && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-gray-900">Canales de comunicación</h2>
              <div className="space-y-4">
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
                    <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">No conectado</span>
                  </div>
                  <div className="mt-4 space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Phone Number ID</label>
                      <input type="text" className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Access Token</label>
                      <input type="password" className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500" />
                    </div>
                    <button className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700">
                      Conectar WhatsApp
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {!["general", "ai", "channels"].includes(activeTab) && (
            <div className="py-12 text-center">
              <p className="text-gray-500">Próximamente</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
