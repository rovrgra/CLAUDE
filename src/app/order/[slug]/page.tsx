"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { Plus, Minus, Send, Loader2, UtensilsCrossed, MapPin, X, Check } from "lucide-react";
import { trpc } from "@/lib/trpc";

interface CartItem {
  menuItemId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
  notes?: string;
  modifiers?: { name: string; price: number }[];
}

export default function PublicOrderPage() {
  const { slug } = useParams<{ slug: string }>();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [orderType, setOrderType] = useState<"QR_ORDER" | "TAKEAWAY" | "DELIVERY">("QR_ORDER");
  const [customer, setCustomer] = useState({ name: "", phone: "", address: "", notes: "", tableNumber: "" });
  const [orderSuccess, setOrderSuccess] = useState<number | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const { data, isLoading } = trpc.menu.publicMenu.useQuery({ slug });
  const createOrder = trpc.order.createPublic.useMutation({
    onSuccess: (order) => {
      setOrderSuccess(order.number);
      setCart([]);
      setShowCheckout(false);
    },
  });

  function addToCart(item: { id: string; name: string; price: number }) {
    setCart((prev) => {
      const existing = prev.find((c) => c.menuItemId === item.id && !c.notes);
      if (existing) {
        return prev.map((c) =>
          c.menuItemId === item.id && !c.notes
            ? { ...c, quantity: c.quantity + 1, total: (c.quantity + 1) * c.unitPrice }
            : c
        );
      }
      return [...prev, {
        menuItemId: item.id, name: item.name, quantity: 1,
        unitPrice: Number(item.price), total: Number(item.price),
      }];
    });
  }

  function updateQuantity(index: number, delta: number) {
    setCart((prev) => {
      const item = prev[index];
      const newQty = item.quantity + delta;
      if (newQty <= 0) return prev.filter((_, i) => i !== index);
      return prev.map((c, i) => i === index ? { ...c, quantity: newQty, total: newQty * c.unitPrice } : c);
    });
  }

  const cartTotal = cart.reduce((sum, item) => sum + item.total, 0);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-gray-500">Restaurante no encontrado</p>
      </div>
    );
  }

  // Order success view
  if (orderSuccess) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-green-50 px-4">
        <div className="rounded-full bg-green-100 p-6">
          <Check className="h-16 w-16 text-green-600" />
        </div>
        <h1 className="mt-6 text-3xl font-bold text-gray-900">Pedido enviado!</h1>
        <p className="mt-2 text-lg text-gray-600">Tu número de pedido es</p>
        <span className="mt-2 text-6xl font-black text-green-600">#{orderSuccess}</span>
        <p className="mt-4 text-sm text-gray-500">Te avisaremos cuando esté listo</p>
        <button onClick={() => setOrderSuccess(null)}
          className="mt-8 rounded-xl bg-primary-600 px-8 py-3 text-sm font-bold text-white hover:bg-primary-700">
          Pedir de nuevo
        </button>
      </div>
    );
  }

  const { organization: org, categories } = data;
  const visibleCategories = categories.filter((c) => c.items.length > 0);

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white shadow-sm">
        <div className="mx-auto max-w-lg px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-100">
              <UtensilsCrossed className="h-5 w-5 text-primary-600" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">{org.name}</h1>
              {org.address && (
                <p className="flex items-center gap-1 text-xs text-gray-500">
                  <MapPin className="h-3 w-3" />{org.address}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Category tabs */}
        <div className="overflow-x-auto border-t">
          <div className="mx-auto flex max-w-lg gap-1 px-4 py-2">
            {visibleCategories.map((cat) => (
              <button key={cat.id} onClick={() => {
                setActiveCategory(cat.id);
                document.getElementById(`cat-${cat.id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
                className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  activeCategory === cat.id ? "bg-primary-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}>
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Menu */}
      <div className="mx-auto max-w-lg px-4 py-4 space-y-6">
        {visibleCategories.map((category) => (
          <div key={category.id} id={`cat-${category.id}`}>
            <h2 className="mb-3 text-lg font-bold text-gray-900">{category.name}</h2>
            {category.description && <p className="mb-2 text-sm text-gray-500">{category.description}</p>}
            <div className="space-y-2">
              {category.items.map((item) => {
                const cartItem = cart.find((c) => c.menuItemId === item.id);
                return (
                  <div key={item.id} className={`flex items-center gap-3 rounded-xl border bg-white p-3 transition-all ${
                    !item.isAvailable ? "opacity-50" : "hover:shadow-sm"
                  }`}>
                    {item.image && (
                      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                        <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm font-semibold text-gray-900">
                            {item.isFeatured && "⭐ "}{item.name}
                          </p>
                          {item.description && <p className="mt-0.5 text-xs text-gray-500 line-clamp-2">{item.description}</p>}
                        </div>
                      </div>
                      <div className="mt-1 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-gray-900">${Number(item.price).toLocaleString("es-CL")}</span>
                          {item.comparePrice && (
                            <span className="text-xs text-gray-400 line-through">${Number(item.comparePrice).toLocaleString("es-CL")}</span>
                          )}
                        </div>
                        {item.isAvailable ? (
                          cartItem ? (
                            <div className="flex items-center gap-2">
                              <button onClick={() => updateQuantity(cart.indexOf(cartItem), -1)}
                                className="rounded-full bg-gray-200 p-1 hover:bg-gray-300">
                                <Minus className="h-3 w-3" />
                              </button>
                              <span className="w-5 text-center text-sm font-bold">{cartItem.quantity}</span>
                              <button onClick={() => updateQuantity(cart.indexOf(cartItem), 1)}
                                className="rounded-full bg-primary-600 p-1 text-white hover:bg-primary-700">
                                <Plus className="h-3 w-3" />
                              </button>
                            </div>
                          ) : (
                            <button onClick={() => addToCart({ id: item.id, name: item.name, price: Number(item.price) })}
                              className="rounded-full bg-primary-600 p-1.5 text-white hover:bg-primary-700">
                              <Plus className="h-3.5 w-3.5" />
                            </button>
                          )
                        ) : (
                          <span className="text-xs text-red-500 font-medium">Agotado</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Floating cart button */}
      {cartCount > 0 && !showCart && !showCheckout && (
        <div className="fixed bottom-0 left-0 right-0 z-40 p-4">
          <button onClick={() => setShowCart(true)}
            className="mx-auto flex w-full max-w-lg items-center justify-between rounded-xl bg-primary-600 px-6 py-4 text-white shadow-2xl hover:bg-primary-700">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-500">
                <span className="text-sm font-bold">{cartCount}</span>
              </div>
              <span className="text-sm font-bold">Ver pedido</span>
            </div>
            <span className="text-lg font-bold">${cartTotal.toLocaleString("es-CL")}</span>
          </button>
        </div>
      )}

      {/* Cart sheet */}
      {showCart && (
        <div className="fixed inset-0 z-50 flex flex-col bg-white">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <h2 className="text-lg font-bold">Tu pedido</h2>
            <button onClick={() => setShowCart(false)} className="rounded-lg p-1 hover:bg-gray-100"><X className="h-5 w-5" /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {cart.map((item, i) => (
              <div key={i} className="flex items-center gap-3 rounded-lg border p-3">
                <div className="flex-1">
                  <p className="text-sm font-semibold">{item.name}</p>
                  <p className="text-sm text-gray-500">${item.unitPrice.toLocaleString("es-CL")} c/u</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => updateQuantity(i, -1)} className="rounded-full bg-gray-200 p-1"><Minus className="h-3 w-3" /></button>
                  <span className="w-5 text-center text-sm font-bold">{item.quantity}</span>
                  <button onClick={() => updateQuantity(i, 1)} className="rounded-full bg-primary-600 p-1 text-white"><Plus className="h-3 w-3" /></button>
                </div>
                <span className="w-20 text-right text-sm font-bold">${item.total.toLocaleString("es-CL")}</span>
              </div>
            ))}
          </div>
          <div className="border-t p-4">
            <div className="flex items-center justify-between text-lg font-bold">
              <span>Total</span>
              <span>${cartTotal.toLocaleString("es-CL")}</span>
            </div>
            <button onClick={() => { setShowCart(false); setShowCheckout(true); }}
              className="mt-3 w-full rounded-xl bg-primary-600 py-3 text-sm font-bold text-white hover:bg-primary-700">
              Continuar
            </button>
          </div>
        </div>
      )}

      {/* Checkout sheet */}
      {showCheckout && (
        <div className="fixed inset-0 z-50 flex flex-col bg-white">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <h2 className="text-lg font-bold">Confirmar pedido</h2>
            <button onClick={() => setShowCheckout(false)} className="rounded-lg p-1 hover:bg-gray-100"><X className="h-5 w-5" /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Tipo de pedido</label>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {([["QR_ORDER", "En mesa"], ["TAKEAWAY", "Para llevar"], ["DELIVERY", "Delivery"]] as const).map(([type, label]) => (
                  <button key={type} onClick={() => setOrderType(type)}
                    className={`rounded-lg border-2 py-2 text-xs font-bold ${orderType === type ? "border-primary-600 bg-primary-50 text-primary-700" : "border-gray-200 text-gray-600"}`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
            {orderType === "QR_ORDER" && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Número de mesa</label>
                <input type="number" value={customer.tableNumber} onChange={(e) => setCustomer({ ...customer, tableNumber: e.target.value })}
                  className="mt-1 block w-full rounded-lg border px-3 py-2 text-sm" placeholder="Ej: 5" />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700">Tu nombre *</label>
              <input type="text" required value={customer.name} onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
                className="mt-1 block w-full rounded-lg border px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">WhatsApp (opcional)</label>
              <input type="tel" value={customer.phone} onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
                className="mt-1 block w-full rounded-lg border px-3 py-2 text-sm" placeholder="+56 9 1234 5678" />
            </div>
            {orderType === "DELIVERY" && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Dirección de entrega *</label>
                <input type="text" value={customer.address} onChange={(e) => setCustomer({ ...customer, address: e.target.value })}
                  className="mt-1 block w-full rounded-lg border px-3 py-2 text-sm" placeholder="Calle, número, depto, comuna" />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700">Notas</label>
              <textarea rows={2} value={customer.notes} onChange={(e) => setCustomer({ ...customer, notes: e.target.value })}
                className="mt-1 block w-full rounded-lg border px-3 py-2 text-sm" placeholder="Sin cebolla, extra salsa, etc." />
            </div>

            <div className="rounded-lg bg-gray-50 p-3 space-y-1">
              {cart.map((item, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span>{item.quantity}x {item.name}</span>
                  <span className="font-medium">${item.total.toLocaleString("es-CL")}</span>
                </div>
              ))}
              <div className="border-t pt-1 flex justify-between text-sm font-bold">
                <span>Total</span>
                <span>${cartTotal.toLocaleString("es-CL")}</span>
              </div>
            </div>
          </div>
          <div className="border-t p-4">
            <button disabled={!customer.name || createOrder.isPending}
              onClick={() => createOrder.mutate({
                slug,
                type: orderType,
                customerName: customer.name,
                customerPhone: customer.phone || undefined,
                tableNumber: customer.tableNumber ? parseInt(customer.tableNumber) : undefined,
                deliveryAddress: customer.address || undefined,
                notes: customer.notes || undefined,
                items: cart,
              })}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary-600 py-3 text-sm font-bold text-white hover:bg-primary-700 disabled:opacity-50">
              {createOrder.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Enviar pedido - ${cartTotal.toLocaleString("es-CL")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
