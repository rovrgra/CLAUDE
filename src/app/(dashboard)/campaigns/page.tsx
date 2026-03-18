"use client";

import { useState } from "react";
import { Plus, Megaphone, Send, Users, BarChart3 } from "lucide-react";

export default function CampaignsPage() {
  const [activeTab, setActiveTab] = useState<"campaigns" | "templates" | "automations">("campaigns");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Campañas</h1>
          <p className="text-gray-600">Envíos masivos, plantillas y automatizaciones</p>
        </div>
        <button className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700">
          <Plus className="h-4 w-4" />
          {activeTab === "campaigns" ? "Nueva campaña" : activeTab === "templates" ? "Nueva plantilla" : "Nueva automatización"}
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-8">
          {[
            { key: "campaigns", label: "Campañas", icon: Megaphone },
            { key: "templates", label: "Plantillas", icon: Send },
            { key: "automations", label: "Automatizaciones", icon: BarChart3 },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex items-center gap-2 border-b-2 px-1 py-3 text-sm font-medium ${
                activeTab === tab.key
                  ? "border-primary-500 text-primary-600"
                  : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
        <Megaphone className="mx-auto h-12 w-12 text-gray-300" />
        <h3 className="mt-4 text-lg font-medium text-gray-900">
          {activeTab === "campaigns" && "No hay campañas"}
          {activeTab === "templates" && "No hay plantillas"}
          {activeTab === "automations" && "No hay automatizaciones"}
        </h3>
        <p className="mt-2 text-sm text-gray-500">
          {activeTab === "campaigns" && "Crea tu primera campaña de WhatsApp para llegar a tus pacientes"}
          {activeTab === "templates" && "Crea plantillas de mensajes para tus campañas y automatizaciones"}
          {activeTab === "automations" && "Configura automatizaciones para recordatorios, seguimientos y más"}
        </p>
      </div>
    </div>
  );
}
