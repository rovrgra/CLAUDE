"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Users, MessageSquare, Calendar,
  ShoppingBag, Megaphone, BookOpen, Settings, LogOut, UtensilsCrossed,
  ChefHat, Grid3X3, ClipboardList, Package, UserCog, BarChart3,
} from "lucide-react";
import { signOut } from "next-auth/react";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Pedidos", href: "/orders", icon: ShoppingBag },
  { name: "Cocina", href: "/kitchen", icon: ChefHat },
  { name: "Mesas", href: "/tables", icon: Grid3X3 },
  { name: "Menú", href: "/menu-admin", icon: ClipboardList },
  { name: "Inventario", href: "/inventory", icon: Package },
  { name: "Personal", href: "/staff", icon: UserCog },
  { name: "Reportes", href: "/reports", icon: BarChart3 },
  { name: "Clientes", href: "/patients", icon: Users },
  { name: "Conversaciones", href: "/conversations", icon: MessageSquare },
  { name: "Reservas", href: "/appointments", icon: Calendar },
  { name: "Campañas", href: "/campaigns", icon: Megaphone },
  { name: "Carta / Docs", href: "/documents", icon: BookOpen },
  { name: "Configuración", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-64 flex-col border-r border-gray-200 bg-white">
      <div className="flex h-16 items-center gap-2 border-b px-6">
        <UtensilsCrossed className="h-8 w-8 text-primary-600" />
        <span className="text-lg font-bold text-gray-900">RestoBot</span>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-primary-50 text-primary-700"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="border-t p-3">
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
        >
          <LogOut className="h-5 w-5" />
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
