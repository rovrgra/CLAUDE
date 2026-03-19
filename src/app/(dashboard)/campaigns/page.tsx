"use client";

import { useState } from "react";
import { Plus, Megaphone, Send, BarChart3, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useOrg } from "@/lib/org-context";

const campaignStatusColors: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  SCHEDULED: "bg-blue-100 text-blue-700",
  RUNNING: "bg-yellow-100 text-yellow-700",
  COMPLETED: "bg-green-100 text-green-700",
  CANCELLED: "bg-red-100 text-red-700",
};

export default function CampaignsPage() {
  const { organizationId } = useOrg();
  const [activeTab, setActiveTab] = useState<"campaigns" | "templates" | "automations">("campaigns");

  const { data: campaigns, isLoading: loadingCampaigns } = trpc.campaign.list.useQuery(
    { organizationId },
    { enabled: !!organizationId && activeTab === "campaigns" }
  );

  const { data: templates, isLoading: loadingTemplates } = trpc.campaign.templates.useQuery(
    { organizationId },
    { enabled: !!organizationId && activeTab === "templates" }
  );

  const { data: automations, isLoading: loadingAutomations } = trpc.campaign.automations.useQuery(
    { organizationId },
    { enabled: !!organizationId && activeTab === "automations" }
  );

  const isLoading = activeTab === "campaigns" ? loadingCampaigns : activeTab === "templates" ? loadingTemplates : loadingAutomations;
  const isEmpty = activeTab === "campaigns" ? !campaigns?.length : activeTab === "templates" ? !templates?.length : !automations?.length;

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

      <div className="border-b border-gray-200">
        <nav className="flex gap-8">
          {[
            { key: "campaigns" as const, label: "Campañas", icon: Megaphone },
            { key: "templates" as const, label: "Plantillas", icon: Send },
            { key: "automations" as const, label: "Automatizaciones", icon: BarChart3 },
          ].map((tab) => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 border-b-2 px-1 py-3 text-sm font-medium ${
                activeTab === tab.key ? "border-primary-500 text-primary-600" : "border-transparent text-gray-500 hover:border-gray-300"
              }`}>
              <tab.icon className="h-4 w-4" />{tab.label}
            </button>
          ))}
        </nav>
      </div>

      {isLoading ? (
        <div className="flex h-32 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>
      ) : isEmpty ? (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
          <Megaphone className="mx-auto h-12 w-12 text-gray-300" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">
            {activeTab === "campaigns" ? "No hay campañas" : activeTab === "templates" ? "No hay plantillas" : "No hay automatizaciones"}
          </h3>
        </div>
      ) : activeTab === "campaigns" ? (
        <div className="space-y-3">
          {campaigns?.map((c) => (
            <div key={c.id} className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4">
              <div>
                <p className="font-medium text-gray-900">{c.name}</p>
                <p className="text-sm text-gray-500">{c.type} - {c.channel}</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right text-sm text-gray-500">
                  <span>Enviados: {c.sentCount}</span> / <span>Leídos: {c.readCount}</span>
                </div>
                <span className={`rounded-full px-2 py-1 text-xs font-medium ${campaignStatusColors[c.status]}`}>{c.status}</span>
              </div>
            </div>
          ))}
        </div>
      ) : activeTab === "templates" ? (
        <div className="space-y-3">
          {templates?.map((t) => (
            <div key={t.id} className="rounded-xl border border-gray-200 bg-white p-4">
              <p className="font-medium text-gray-900">{t.name}</p>
              <p className="mt-1 text-sm text-gray-500 line-clamp-2">{t.body}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {automations?.map((a) => (
            <div key={a.id} className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4">
              <div>
                <p className="font-medium text-gray-900">{a.name}</p>
                <p className="text-sm text-gray-500">{a.trigger} - {a.executionCount} ejecuciones</p>
              </div>
              <span className={`rounded-full px-2 py-1 text-xs font-medium ${a.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                {a.isActive ? "Activa" : "Inactiva"}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
