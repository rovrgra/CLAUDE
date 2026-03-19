"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Bell, Search, Loader2, User } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useOrg } from "@/lib/org-context";

export function Header() {
  const { data: session } = useSession();
  const { organizationId } = useOrg();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [showResults, setShowResults] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  const { data: searchResults, isFetching } = trpc.patient.list.useQuery(
    { organizationId, search, limit: 5 },
    { enabled: !!organizationId && search.length >= 2 }
  );

  const { data: notifications } = trpc.organization.notifications.useQuery(
    { organizationId },
    { enabled: !!organizationId }
  );

  const unreadCount = notifications?.filter((n) => !n.isRead).length ?? 0;

  const markRead = trpc.organization.markNotificationRead.useMutation({
    onSuccess: () => utils.organization.notifications.invalidate(),
  });
  const utils = trpc.useUtils();

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowResults(false);
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setShowNotifications(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6">
      {/* Search */}
      <div ref={searchRef} className="relative w-96">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar pacientes, conversaciones..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setShowResults(true); }}
          onFocus={() => search.length >= 2 && setShowResults(true)}
          className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        />

        {showResults && search.length >= 2 && (
          <div className="absolute left-0 top-full z-50 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg">
            {isFetching ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
              </div>
            ) : !searchResults?.patients.length ? (
              <div className="px-4 py-3 text-sm text-gray-500">No se encontraron resultados</div>
            ) : (
              <>
                <div className="px-3 py-2 text-xs font-medium text-gray-500 uppercase">Pacientes</div>
                {searchResults.patients.map((p) => (
                  <button key={p.id} onClick={() => { router.push(`/patients/${p.id}`); setShowResults(false); setSearch(""); }}
                    className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-gray-50">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-100">
                      <User className="h-4 w-4 text-primary-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{p.firstName} {p.lastName}</p>
                      <p className="text-xs text-gray-500">{p.phone || p.email || ""}</p>
                    </div>
                  </button>
                ))}
                <button onClick={() => { router.push(`/patients?search=${encodeURIComponent(search)}`); setShowResults(false); }}
                  className="w-full border-t px-3 py-2 text-center text-xs font-medium text-primary-600 hover:bg-gray-50">
                  Ver todos los resultados
                </button>
              </>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-4">
        {/* Notifications */}
        <div ref={notifRef} className="relative">
          <button onClick={() => setShowNotifications(!showNotifications)}
            className="relative rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 top-full z-50 mt-1 w-80 rounded-lg border border-gray-200 bg-white shadow-lg">
              <div className="flex items-center justify-between border-b px-4 py-3">
                <h3 className="text-sm font-semibold text-gray-900">Notificaciones</h3>
                {unreadCount > 0 && (
                  <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">{unreadCount} nuevas</span>
                )}
              </div>
              <div className="max-h-80 overflow-y-auto">
                {!notifications?.length ? (
                  <div className="px-4 py-6 text-center text-sm text-gray-500">No hay notificaciones</div>
                ) : (
                  notifications.map((n) => (
                    <button key={n.id}
                      onClick={() => { if (!n.isRead) markRead.mutate({ organizationId, id: n.id }); }}
                      className={`w-full border-b px-4 py-3 text-left last:border-b-0 ${!n.isRead ? "bg-primary-50" : "hover:bg-gray-50"}`}>
                      <div className="flex items-start gap-3">
                        <div className={`mt-1 h-2 w-2 shrink-0 rounded-full ${!n.isRead ? "bg-primary-500" : "bg-transparent"}`} />
                        <div>
                          <p className="text-sm text-gray-900">{n.title}</p>
                          <p className="text-xs text-gray-500">{n.body}</p>
                          <p className="mt-1 text-xs text-gray-400">
                            {new Date(n.createdAt).toLocaleDateString("es-CL", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User */}
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center">
            <span className="text-sm font-medium text-primary-700">
              {session?.user?.name?.charAt(0) || "U"}
            </span>
          </div>
          <span className="text-sm font-medium text-gray-700">{session?.user?.name}</span>
        </div>
      </div>
    </header>
  );
}
