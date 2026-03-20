import { z } from "zod";
import { router, orgProcedure } from "@/server/trpc";

export const reportingRouter = router({
  salesReport: orgProcedure
    .input(
      z.object({
        organizationId: z.string(),
        startDate: z.string(), // ISO date string
        endDate: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const start = new Date(input.startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(input.endDate);
      end.setHours(23, 59, 59, 999);

      // Fetch all non-cancelled orders in range
      const orders = await ctx.prisma.order.findMany({
        where: {
          organizationId: ctx.organizationId,
          createdAt: { gte: start, lte: end },
          status: { not: "CANCELLED" },
        },
        include: {
          items: {
            where: { status: { not: "CANCELLED" } },
          },
        },
        orderBy: { createdAt: "asc" },
      });

      // Daily revenue
      const dailyMap = new Map<
        string,
        { date: string; revenue: number; orders: number }
      >();
      for (const order of orders) {
        const dateKey = order.createdAt.toISOString().split("T")[0];
        const existing = dailyMap.get(dateKey) || {
          date: dateKey,
          revenue: 0,
          orders: 0,
        };
        existing.revenue += Number(order.total);
        existing.orders += 1;
        dailyMap.set(dateKey, existing);
      }
      const dailyRevenue = Array.from(dailyMap.values());

      // Total metrics
      const totalRevenue = orders.reduce((s, o) => s + Number(o.total), 0);
      const totalOrders = orders.length;
      const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

      // Top items
      const itemMap = new Map<
        string,
        { name: string; quantity: number; revenue: number }
      >();
      for (const order of orders) {
        for (const item of order.items) {
          const key = item.menuItemId || item.name;
          const existing = itemMap.get(key) || {
            name: item.name,
            quantity: 0,
            revenue: 0,
          };
          existing.quantity += item.quantity;
          existing.revenue += Number(item.total);
          itemMap.set(key, existing);
        }
      }
      const topItems = Array.from(itemMap.values())
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10);

      // Total items sold
      const totalItemsSold = Array.from(itemMap.values()).reduce(
        (s, i) => s + i.quantity,
        0
      );

      // Revenue by order type
      const revenueByType = new Map<string, number>();
      for (const order of orders) {
        const current = revenueByType.get(order.type) || 0;
        revenueByType.set(order.type, current + Number(order.total));
      }
      const revenueByOrderType = Array.from(revenueByType.entries()).map(
        ([type, revenue]) => ({ type, revenue })
      );

      // Revenue by source
      const revenueBySourceMap = new Map<string, number>();
      for (const order of orders) {
        const current = revenueBySourceMap.get(order.source) || 0;
        revenueBySourceMap.set(order.source, current + Number(order.total));
      }
      const revenueBySource = Array.from(revenueBySourceMap.entries()).map(
        ([source, revenue]) => ({ source, revenue })
      );

      // Payment method breakdown
      const paymentMap = new Map<string, { count: number; revenue: number }>();
      for (const order of orders) {
        const method = order.paymentMethod || "PENDING";
        const existing = paymentMap.get(method) || { count: 0, revenue: 0 };
        existing.count += 1;
        existing.revenue += Number(order.total);
        paymentMap.set(method, existing);
      }
      const paymentBreakdown = Array.from(paymentMap.entries()).map(
        ([method, data]) => ({ method, ...data })
      );

      return {
        dailyRevenue,
        totalRevenue,
        totalOrders,
        avgOrderValue,
        totalItemsSold,
        topItems,
        revenueByOrderType,
        revenueBySource,
        paymentBreakdown,
      };
    }),

  exportCSV: orgProcedure
    .input(
      z.object({
        organizationId: z.string(),
        startDate: z.string(),
        endDate: z.string(),
        type: z.enum(["orders", "items", "summary"]),
      })
    )
    .query(async ({ ctx, input }) => {
      const start = new Date(input.startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(input.endDate);
      end.setHours(23, 59, 59, 999);

      const orders = await ctx.prisma.order.findMany({
        where: {
          organizationId: ctx.organizationId,
          createdAt: { gte: start, lte: end },
          status: { not: "CANCELLED" },
        },
        include: {
          items: {
            where: { status: { not: "CANCELLED" } },
          },
          table: true,
          patient: { select: { firstName: true, lastName: true } },
        },
        orderBy: { createdAt: "asc" },
      });

      if (input.type === "orders") {
        const header =
          "Número,Fecha,Tipo,Fuente,Cliente,Mesa,Subtotal,IVA,Descuento,Propina,Total,Método Pago,Estado Pago";
        const rows = orders.map((o) => {
          const customer = o.patient
            ? `${o.patient.firstName} ${o.patient.lastName}`
            : o.customerName || "";
          const table = o.table ? `${o.table.number}` : "";
          const date = o.createdAt.toISOString().replace("T", " ").slice(0, 19);
          return [
            o.number,
            date,
            o.type,
            o.source,
            `"${customer}"`,
            table,
            Number(o.subtotal),
            Number(o.tax),
            Number(o.discount),
            Number(o.tip),
            Number(o.total),
            o.paymentMethod || "",
            o.paymentStatus,
          ].join(",");
        });
        return [header, ...rows].join("\n");
      }

      if (input.type === "items") {
        const header =
          "Pedido,Fecha,Item,Cantidad,Precio Unitario,Total,Notas";
        const rows: string[] = [];
        for (const order of orders) {
          const date = order.createdAt
            .toISOString()
            .replace("T", " ")
            .slice(0, 19);
          for (const item of order.items) {
            rows.push(
              [
                order.number,
                date,
                `"${item.name}"`,
                item.quantity,
                Number(item.unitPrice),
                Number(item.total),
                `"${item.notes || ""}"`,
              ].join(",")
            );
          }
        }
        return [header, ...rows].join("\n");
      }

      // summary
      const dailyMap = new Map<
        string,
        { revenue: number; orders: number; items: number }
      >();
      for (const order of orders) {
        const dateKey = order.createdAt.toISOString().split("T")[0];
        const existing = dailyMap.get(dateKey) || {
          revenue: 0,
          orders: 0,
          items: 0,
        };
        existing.revenue += Number(order.total);
        existing.orders += 1;
        existing.items += order.items.reduce((s, i) => s + i.quantity, 0);
        dailyMap.set(dateKey, existing);
      }
      const header = "Fecha,Pedidos,Items Vendidos,Ingresos,Ticket Promedio";
      const rows = Array.from(dailyMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, d]) => {
          const avg = d.orders > 0 ? Math.round(d.revenue / d.orders) : 0;
          return [date, d.orders, d.items, Math.round(d.revenue), avg].join(
            ","
          );
        });
      return [header, ...rows].join("\n");
    }),
});
