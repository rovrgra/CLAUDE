"use client";

import { useState, useEffect } from "react";
import { Bot, Building2, Globe, CreditCard, Key, Bell, Loader2, Check, Copy, Eye, EyeOff, RefreshCw } from "lucide-react";
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
    name: "", phone: "", email: "", address: "", businessType: "restaurant",
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

  const SaveButton = ({ label }: { label?: string }) => (
    <button onClick={handleSave} disabled={updateOrg.isPending}
      className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50">
      {updateOrg.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <Check className="h-4 w-4" /> : null}
      {saved ? "Guardado" : label || "Guardar cambios"}
    </button>
  );

  const inputClass = "mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Configuración</h1>
        <p className="text-gray-600">Administra tu restaurante y el bot de WhatsApp</p>
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
          {/* General Tab */}
          {activeTab === "general" && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-gray-900">Información del restaurante</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Nombre del restaurante</label>
                  <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Tipo de cocina</label>
                  <select value={form.businessType} onChange={(e) => setForm({ ...form, businessType: e.target.value })} className={inputClass}>
                    <option value="restaurant">Restaurante</option>
                    <option value="fast_food">Comida rápida</option>
                    <option value="cafe">Café / Cafetería</option>
                    <option value="bar">Bar / Pub</option>
                    <option value="dark_kitchen">Dark Kitchen</option>
                    <option value="other">Otro</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Teléfono</label>
                  <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputClass} />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Dirección</label>
                  <input type="text" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className={inputClass} />
                </div>
              </div>
              <SaveButton />
            </div>
          )}

          {/* AI Agent Tab */}
          {activeTab === "ai" && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-gray-900">Configuración del Agente IA</h2>
              <p className="text-sm text-gray-500">El bot usa Claude (Anthropic) para responder automáticamente a tus clientes por WhatsApp.</p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Nombre del agente</label>
                  <input type="text" value={form.aiAgentName} onChange={(e) => setForm({ ...form, aiAgentName: e.target.value })} className={inputClass} />
                  <p className="mt-1 text-xs text-gray-400">El nombre que usará el agente para presentarse</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Personalidad</label>
                  <input type="text" value={form.aiAgentPersonality} onChange={(e) => setForm({ ...form, aiAgentPersonality: e.target.value })} className={inputClass} />
                  <p className="mt-1 text-xs text-gray-400">Ej: profesional y amable, cercano y empático, formal</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Instrucciones personalizadas</label>
                  <textarea rows={6} value={form.aiAgentInstructions} onChange={(e) => setForm({ ...form, aiAgentInstructions: e.target.value })}
                    className={inputClass}
                    placeholder="Ej: Siempre sugiere los platos del día. Ofrece hacer reserva cuando pregunten disponibilidad. No hagas descuentos sin autorización." />
                </div>
                <div className="flex items-center gap-3">
                  <input type="checkbox" id="autoReply" checked={form.aiAutoReply}
                    onChange={(e) => setForm({ ...form, aiAutoReply: e.target.checked })}
                    className="h-4 w-4 rounded border-gray-300 text-primary-600" />
                  <label htmlFor="autoReply" className="text-sm text-gray-700">Habilitar respuestas automáticas por WhatsApp</label>
                </div>
              </div>
              <SaveButton label="Guardar configuración IA" />
            </div>
          )}

          {/* Channels Tab */}
          {activeTab === "channels" && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-gray-900">Canales de comunicación</h2>

              {/* WhatsApp */}
              <div className="rounded-lg border border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
                      <span className="text-lg">📱</span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">WhatsApp Business</p>
                      <p className="text-sm text-gray-500">Recibe pedidos y reservas de clientes</p>
                    </div>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-medium ${
                    org?.whatsappPhoneId ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                  }`}>
                    {org?.whatsappPhoneId ? "Conectado" : "No conectado"}
                  </span>
                </div>
                {!org?.whatsappPhoneId && (
                  <div className="mt-4 rounded-lg bg-gray-50 p-4">
                    <h4 className="text-sm font-medium text-gray-900">Cómo conectar WhatsApp</h4>
                    <ol className="mt-2 space-y-1 text-sm text-gray-600">
                      <li>1. Crea una app en Meta for Developers</li>
                      <li>2. Configura WhatsApp Business API</li>
                      <li>3. Copia tu Phone Number ID y Access Token</li>
                      <li>4. Configura el webhook URL: <code className="rounded bg-gray-200 px-1.5 py-0.5 text-xs">{typeof window !== "undefined" ? window.location.origin : ""}/api/webhooks/whatsapp</code></li>
                      <li>5. Usa el token de verificación de tu archivo .env</li>
                    </ol>
                  </div>
                )}
              </div>

              {/* Web Chat */}
              <div className="rounded-lg border border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                      <span className="text-lg">💬</span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Chat Web</p>
                      <p className="text-sm text-gray-500">Widget de chat para tu sitio web</p>
                    </div>
                  </div>
                  <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">Próximamente</span>
                </div>
              </div>
            </div>
          )}

          {/* Billing Tab */}
          {activeTab === "billing" && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-gray-900">Facturación</h2>
              <p className="text-sm text-gray-500">Configura los datos de facturación y métodos de pago de tu clínica.</p>

              <div className="rounded-lg border border-gray-200 p-5">
                <h3 className="text-sm font-semibold text-gray-900">Plan actual</h3>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-gray-900">Gratis</span>
                  <span className="text-sm text-gray-500">/ para siempre</span>
                </div>
                <ul className="mt-4 space-y-2 text-sm text-gray-600">
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500" /> Hasta 100 pacientes</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500" /> WhatsApp Business API</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500" /> Agente IA con Claude</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500" /> Gestión de citas e inventario</li>
                </ul>
              </div>

              <div className="rounded-lg border border-gray-200 p-5">
                <h3 className="text-sm font-semibold text-gray-900">Datos de facturación</h3>
                <div className="mt-4 grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">RUT</label>
                    <input type="text" placeholder="12.345.678-9" className={inputClass} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Razón social</label>
                    <input type="text" placeholder="Mi Clínica SpA" className={inputClass} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Giro</label>
                    <input type="text" placeholder="Servicios odontológicos" className={inputClass} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Dirección fiscal</label>
                    <input type="text" placeholder="Av. Providencia 1234" className={inputClass} />
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-gray-200 p-5">
                <h3 className="text-sm font-semibold text-gray-900">Pasarela de pagos</h3>
                <p className="mt-1 text-xs text-gray-500">Para recibir pagos online de tus pacientes</p>
                <div className="mt-4 grid grid-cols-2 gap-4">
                  <div className="rounded-lg border border-gray-200 p-4 hover:border-primary-300 cursor-pointer">
                    <p className="font-medium text-gray-900">MercadoPago</p>
                    <p className="text-xs text-gray-500">Popular en Chile y Latinoamérica</p>
                    <span className="mt-2 inline-block rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">No configurado</span>
                  </div>
                  <div className="rounded-lg border border-gray-200 p-4 hover:border-primary-300 cursor-pointer">
                    <p className="font-medium text-gray-900">Stripe</p>
                    <p className="text-xs text-gray-500">Tarjetas de crédito internacionales</p>
                    <span className="mt-2 inline-block rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">No configurado</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* API Keys Tab */}
          {activeTab === "api" && <ApiKeysTab organizationId={organizationId} />}

          {/* Notifications Tab */}
          {activeTab === "notifications" && <NotificationsTab />}
        </div>
      </div>
    </div>
  );
}

function ApiKeysTab({ organizationId }: { organizationId: string }) {
  const [showKey, setShowKey] = useState(false);
  const [copied, setCopied] = useState(false);

  const webhookUrl = typeof window !== "undefined" ? `${window.location.origin}/api/webhooks/whatsapp` : "";
  const apiKeyPlaceholder = "dk_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx";

  function handleCopy(text: string) {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-gray-900">API Keys y webhooks</h2>
      <p className="text-sm text-gray-500">Claves de acceso para integraciones externas.</p>

      <div className="rounded-lg border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-900">Organization ID</h3>
        <div className="mt-2 flex items-center gap-2">
          <code className="flex-1 rounded-lg bg-gray-100 px-3 py-2 text-sm font-mono text-gray-800">{organizationId}</code>
          <button onClick={() => handleCopy(organizationId)}
            className="rounded-lg border px-3 py-2 text-sm text-gray-600 hover:bg-gray-50">
            {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-900">Webhook URL</h3>
        <p className="mt-1 text-xs text-gray-500">Configura esta URL en Meta for Developers para WhatsApp</p>
        <div className="mt-2 flex items-center gap-2">
          <code className="flex-1 rounded-lg bg-gray-100 px-3 py-2 text-sm font-mono text-gray-800 truncate">{webhookUrl}</code>
          <button onClick={() => handleCopy(webhookUrl)}
            className="rounded-lg border px-3 py-2 text-sm text-gray-600 hover:bg-gray-50">
            <Copy className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 p-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">API Key</h3>
            <p className="mt-1 text-xs text-gray-500">Para acceso programático a la API</p>
          </div>
          <button className="flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50">
            <RefreshCw className="h-3 w-3" /> Regenerar
          </button>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <code className="flex-1 rounded-lg bg-gray-100 px-3 py-2 text-sm font-mono text-gray-800">
            {showKey ? apiKeyPlaceholder : "dk_live_••••••••••••••••••••••••••••••••"}
          </code>
          <button onClick={() => setShowKey(!showKey)}
            className="rounded-lg border px-3 py-2 text-sm text-gray-600 hover:bg-gray-50">
            {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}

function NotificationsTab() {
  const [prefs, setPrefs] = useState({
    newMessage: true,
    appointmentReminder: true,
    paymentReceived: true,
    newPatient: true,
    aiHandoff: true,
    emailNotifs: false,
    browserNotifs: true,
  });

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-gray-900">Preferencias de notificaciones</h2>
      <p className="text-sm text-gray-500">Configura qué notificaciones deseas recibir.</p>

      <div className="rounded-lg border border-gray-200 divide-y">
        <h3 className="px-5 py-3 text-sm font-semibold text-gray-900">Eventos</h3>
        {[
          { key: "newMessage" as const, label: "Nuevo mensaje de paciente", desc: "Cuando un paciente envía un mensaje por WhatsApp" },
          { key: "appointmentReminder" as const, label: "Recordatorio de cita", desc: "Antes de una cita agendada" },
          { key: "paymentReceived" as const, label: "Pago recibido", desc: "Cuando se registra un pago de factura" },
          { key: "newPatient" as const, label: "Nuevo paciente", desc: "Cuando un paciente se registra por primera vez" },
          { key: "aiHandoff" as const, label: "Handoff de IA", desc: "Cuando el agente IA necesita intervención humana" },
        ].map((item) => (
          <div key={item.key} className="flex items-center justify-between px-5 py-4">
            <div>
              <p className="text-sm font-medium text-gray-900">{item.label}</p>
              <p className="text-xs text-gray-500">{item.desc}</p>
            </div>
            <button onClick={() => setPrefs({ ...prefs, [item.key]: !prefs[item.key] })}
              className={`relative h-6 w-11 rounded-full transition-colors ${prefs[item.key] ? "bg-primary-600" : "bg-gray-300"}`}>
              <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${prefs[item.key] ? "translate-x-5" : "translate-x-0.5"}`} />
            </button>
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-gray-200 divide-y">
        <h3 className="px-5 py-3 text-sm font-semibold text-gray-900">Canales de notificación</h3>
        <div className="flex items-center justify-between px-5 py-4">
          <div>
            <p className="text-sm font-medium text-gray-900">Notificaciones en el navegador</p>
            <p className="text-xs text-gray-500">Push notifications en desktop</p>
          </div>
          <button onClick={() => setPrefs({ ...prefs, browserNotifs: !prefs.browserNotifs })}
            className={`relative h-6 w-11 rounded-full transition-colors ${prefs.browserNotifs ? "bg-primary-600" : "bg-gray-300"}`}>
            <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${prefs.browserNotifs ? "translate-x-5" : "translate-x-0.5"}`} />
          </button>
        </div>
        <div className="flex items-center justify-between px-5 py-4">
          <div>
            <p className="text-sm font-medium text-gray-900">Email</p>
            <p className="text-xs text-gray-500">Resumen diario por correo electrónico</p>
          </div>
          <button onClick={() => setPrefs({ ...prefs, emailNotifs: !prefs.emailNotifs })}
            className={`relative h-6 w-11 rounded-full transition-colors ${prefs.emailNotifs ? "bg-primary-600" : "bg-gray-300"}`}>
            <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${prefs.emailNotifs ? "translate-x-5" : "translate-x-0.5"}`} />
          </button>
        </div>
      </div>
    </div>
  );
}
