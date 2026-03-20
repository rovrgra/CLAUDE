import { z } from "zod";
import { router, orgProcedure, publicProcedure } from "@/server/trpc";

const orderItemInput = z.object({
  menuItemId: z.string().optional(),
  name: z.string(),
  quantity: z.number().min(1),
  unitPrice: z.number(),
  total: z.number(),
  notes: z.string().optional(),
  modifiers: z.any().optional(),
});

export const orderRouter = router({
  // List orders (with filters)
  list: orgProcedure
    .input(z.object({
      organizationId: z.string(),
      status: z.enum(["RECEIVED", "CONFIRMED", "PREPARING", "READY", "DELIVERED", "COMPLETED", "CANCELLED"]).optional(),
      type: z.enum(["DINE_IN", "TAKEAWAY", "DELIVERY", "QR_ORDER"]).optional(),
      date: z.string().optional(), // ISO date
    }))
    .query(async ({ ctx, input }) => {
      const where: any = { organizationId: ctx.organizationId };
      if (input.status) where.status = input.status;
      if (input.type) where.type = input.type;
      if (input.date) {
        const d = new Date(input.date);
        const start = new Date(d.getFullYear(), d.getMonth(), d.getDate());
        const end = new Date(start.getTime() + 86400000);
        where.createdAt = { gte: start, lt: end };
      }

      return ctx.prisma.order.findMany({
        where,
        include: {
          items: { include: { menuItem: true } },
          table: true,
          patient: { select: { firstName: true, lastName: true, phone: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 100,
      });
    }),

  // Get single order
  get: orgProcedure
    .input(z.object({ organizationId: z.string(), id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.order.findUniqueOrThrow({
        where: { id: input.id },
        include: {
          items: { include: { menuItem: true } },
          table: true,
          patient: { select: { firstName: true, lastName: true, phone: true } },
        },
      });
    }),

  // Active orders (for kitchen display)
  active: orgProcedure
    .input(z.object({ organizationId: z.string() }))
    .query(async ({ ctx }) => {
      return ctx.prisma.order.findMany({
        where: {
          organizationId: ctx.organizationId,
          status: { in: ["RECEIVED", "CONFIRMED", "PREPARING", "READY"] },
        },
        include: {
          items: { include: { menuItem: true } },
          table: true,
          patient: { select: { firstName: true, lastName: true } },
        },
        orderBy: { createdAt: "asc" },
      });
    }),

  // Create order (POS/waiter)
  create: orgProcedure
    .input(z.object({
      organizationId: z.string(),
      type: z.enum(["DINE_IN", "TAKEAWAY", "DELIVERY", "QR_ORDER"]),
      tableId: z.string().optional(),
      patientId: z.string().optional(),
      customerName: z.string().optional(),
      customerPhone: z.string().optional(),
      guests: z.number().optional(),
      deliveryAddress: z.string().optional(),
      deliveryNotes: z.string().optional(),
      notes: z.string().optional(),
      items: z.array(orderItemInput).min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId: _orgId, items, ...orderData } = input;
      void _orgId;

      // Get next order number for today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const lastOrder = await ctx.prisma.order.findFirst({
        where: { organizationId: ctx.organizationId, createdAt: { gte: today } },
        orderBy: { number: "desc" },
      });
      const number = (lastOrder?.number ?? 0) + 1;

      const subtotal = items.reduce((sum, item) => sum + item.total, 0);
      const tax = Math.round(subtotal * 0.19); // IVA Chile
      const total = subtotal + tax;

      const order = await ctx.prisma.order.create({
        data: {
          organizationId: ctx.organizationId,
          number,
          ...orderData,
          source: "POS",
          subtotal,
          tax,
          total,
          items: { createMany: { data: items } },
        },
        include: { items: true, table: true },
      });

      // Update table status if dine-in
      if (input.tableId) {
        await ctx.prisma.table.update({
          where: { id: input.tableId },
          data: { status: "OCCUPIED" },
        });
      }

      return order;
    }),

  // Public order (from QR / web)
  createPublic: publicProcedure
    .input(z.object({
      slug: z.string(),
      tableNumber: z.number().optional(),
      customerName: z.string(),
      customerPhone: z.string().optional(),
      type: z.enum(["QR_ORDER", "TAKEAWAY", "DELIVERY"]).default("QR_ORDER"),
      deliveryAddress: z.string().optional(),
      notes: z.string().optional(),
      items: z.array(orderItemInput).min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      const org = await ctx.prisma.organization.findUniqueOrThrow({
        where: { slug: input.slug },
      });

      // Find table by number if provided
      let tableId: string | undefined;
      if (input.tableNumber) {
        const table = await ctx.prisma.table.findUnique({
          where: { organizationId_number: { organizationId: org.id, number: input.tableNumber } },
        });
        tableId = table?.id;
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const lastOrder = await ctx.prisma.order.findFirst({
        where: { organizationId: org.id, createdAt: { gte: today } },
        orderBy: { number: "desc" },
      });
      const number = (lastOrder?.number ?? 0) + 1;

      const subtotal = input.items.reduce((sum, item) => sum + item.total, 0);
      const tax = Math.round(subtotal * 0.19);
      const total = subtotal + tax;

      const order = await ctx.prisma.order.create({
        data: {
          organizationId: org.id,
          number,
          type: input.type,
          source: input.tableNumber ? "QR" : "WEB",
          tableId,
          customerName: input.customerName,
          customerPhone: input.customerPhone,
          deliveryAddress: input.deliveryAddress,
          notes: input.notes,
          subtotal,
          tax,
          total,
          items: { createMany: { data: input.items } },
        },
        include: { items: true },
      });

      // Notify restaurant
      await ctx.prisma.notification.create({
        data: {
          organizationId: org.id,
          type: "new_order",
          title: `Nuevo pedido #${number}`,
          body: `${input.customerName} - ${input.items.length} items - $${total.toLocaleString("es-CL")}`,
          data: { orderId: order.id },
        },
      });

      if (tableId) {
        await ctx.prisma.table.update({ where: { id: tableId }, data: { status: "OCCUPIED" } });
      }

      return order;
    }),

  // Update order status (kitchen flow)
  updateStatus: orgProcedure
    .input(z.object({
      organizationId: z.string(), id: z.string(),
      status: z.enum(["RECEIVED", "CONFIRMED", "PREPARING", "READY", "DELIVERED", "COMPLETED", "CANCELLED"]),
      cancelReason: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const order = await ctx.prisma.order.update({
        where: { id: input.id },
        data: {
          status: input.status,
          cancelReason: input.cancelReason,
          ...(input.status === "COMPLETED" ? { paymentStatus: "COMPLETED", paidAt: new Date() } : {}),
        },
        include: { table: true },
      });

      // Free table when order is completed or cancelled
      if ((input.status === "COMPLETED" || input.status === "CANCELLED") && order.tableId) {
        await ctx.prisma.table.update({
          where: { id: order.tableId },
          data: { status: "CLEANING" },
        });
      }

      return order;
    }),

  // Update item status (kitchen)
  updateItemStatus: orgProcedure
    .input(z.object({
      organizationId: z.string(), id: z.string(),
      status: z.enum(["PENDING", "PREPARING", "READY", "SERVED", "CANCELLED"]),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.orderItem.update({
        where: { id: input.id },
        data: { status: input.status },
      });
    }),

  // Today stats
  todayStats: orgProcedure
    .input(z.object({ organizationId: z.string() }))
    .query(async ({ ctx }) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const [orders, revenue, activeOrders] = await Promise.all([
        ctx.prisma.order.count({
          where: { organizationId: ctx.organizationId, createdAt: { gte: today } },
        }),
        ctx.prisma.order.aggregate({
          where: { organizationId: ctx.organizationId, createdAt: { gte: today }, status: { not: "CANCELLED" } },
          _sum: { total: true },
        }),
        ctx.prisma.order.count({
          where: {
            organizationId: ctx.organizationId,
            status: { in: ["RECEIVED", "CONFIRMED", "PREPARING", "READY"] },
          },
        }),
      ]);

      return {
        todayOrders: orders,
        todayRevenue: revenue._sum.total ?? 0,
        activeOrders,
      };
    }),

  // Analytics dashboard
  analytics: orgProcedure
    .input(z.object({ organizationId: z.string() }))
    .query(async ({ ctx }) => {
      const now = new Date();

      // Date ranges
      const todayStart = new Date(now);
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date(todayStart.getTime() + 86400000);

      const yesterdayStart = new Date(todayStart.getTime() - 86400000);

      const thisWeekStart = new Date(todayStart);
      thisWeekStart.setDate(thisWeekStart.getDate() - thisWeekStart.getDay() + 1); // Monday
      if (thisWeekStart > todayStart) thisWeekStart.setDate(thisWeekStart.getDate() - 7);

      const lastWeekStart = new Date(thisWeekStart.getTime() - 7 * 86400000);
      const lastWeekEnd = new Date(thisWeekStart);

      const sevenDaysAgo = new Date(todayStart.getTime() - 6 * 86400000);

      const orgId = ctx.organizationId;
      const notCancelled = { not: "CANCELLED" as const };

      // --- All queries in parallel ---
      const [
        revenueByDayRaw,
        ordersByHourRaw,
        topItemsRaw,
        orderTypeDistRaw,
        thisWeekAgg,
        lastWeekAgg,
        todayRevAgg,
        yesterdayRevAgg,
        todayOrderCount,
        activeOrderCount,
        recentOrders,
      ] = await Promise.all([
        // 1. Revenue by day (last 7 days)
        ctx.prisma.order.groupBy({
          by: ["createdAt"],
          where: {
            organizationId: orgId,
            createdAt: { gte: sevenDaysAgo, lt: todayEnd },
            status: notCancelled,
          },
          _sum: { total: true },
          _count: true,
        }).then(async () => {
          // groupBy on createdAt gives individual rows; use raw aggregation instead
          const days: { date: string; revenue: number; orders: number }[] = [];
          for (let i = 6; i >= 0; i--) {
            const dayStart = new Date(todayStart.getTime() - i * 86400000);
            const dayEnd = new Date(dayStart.getTime() + 86400000);
            const agg = await ctx.prisma.order.aggregate({
              where: {
                organizationId: orgId,
                createdAt: { gte: dayStart, lt: dayEnd },
                status: notCancelled,
              },
              _sum: { total: true },
              _count: true,
            });
            days.push({
              date: dayStart.toISOString().slice(0, 10),
              revenue: Number(agg._sum.total ?? 0),
              orders: agg._count,
            });
          }
          return days;
        }),

        // 2. Orders by hour (today)
        (async () => {
          const hours: { hour: number; count: number }[] = [];
          for (let h = 0; h < 24; h++) {
            const hStart = new Date(todayStart.getTime() + h * 3600000);
            const hEnd = new Date(hStart.getTime() + 3600000);
            const count = await ctx.prisma.order.count({
              where: {
                organizationId: orgId,
                createdAt: { gte: hStart, lt: hEnd },
              },
            });
            hours.push({ hour: h, count });
          }
          return hours;
        })(),

        // 3. Top 5 selling items (this week)
        ctx.prisma.orderItem.groupBy({
          by: ["name"],
          where: {
            order: {
              organizationId: orgId,
              createdAt: { gte: thisWeekStart, lt: todayEnd },
              status: notCancelled,
            },
          },
          _sum: { quantity: true, total: true },
          orderBy: { _sum: { quantity: "desc" } },
          take: 5,
        }),

        // 4. Order type distribution (this week)
        ctx.prisma.order.groupBy({
          by: ["type"],
          where: {
            organizationId: orgId,
            createdAt: { gte: thisWeekStart, lt: todayEnd },
            status: notCancelled,
          },
          _count: true,
        }),

        // 5. This week revenue aggregate
        ctx.prisma.order.aggregate({
          where: {
            organizationId: orgId,
            createdAt: { gte: thisWeekStart, lt: todayEnd },
            status: notCancelled,
          },
          _sum: { total: true },
          _count: true,
        }),

        // 6. Last week revenue aggregate
        ctx.prisma.order.aggregate({
          where: {
            organizationId: orgId,
            createdAt: { gte: lastWeekStart, lt: lastWeekEnd },
            status: notCancelled,
          },
          _sum: { total: true },
          _count: true,
        }),

        // 7. Today revenue
        ctx.prisma.order.aggregate({
          where: {
            organizationId: orgId,
            createdAt: { gte: todayStart, lt: todayEnd },
            status: notCancelled,
          },
          _sum: { total: true },
          _count: true,
        }),

        // 8. Yesterday revenue
        ctx.prisma.order.aggregate({
          where: {
            organizationId: orgId,
            createdAt: { gte: yesterdayStart, lt: todayStart },
            status: notCancelled,
          },
          _sum: { total: true },
          _count: true,
        }),

        // 9. Today order count
        ctx.prisma.order.count({
          where: { organizationId: orgId, createdAt: { gte: todayStart, lt: todayEnd } },
        }),

        // 10. Active orders
        ctx.prisma.order.count({
          where: {
            organizationId: orgId,
            status: { in: ["RECEIVED", "CONFIRMED", "PREPARING", "READY"] },
          },
        }),

        // 11. Recent orders (last 10)
        ctx.prisma.order.findMany({
          where: { organizationId: orgId },
          include: {
            table: true,
            patient: { select: { firstName: true, lastName: true } },
          },
          orderBy: { createdAt: "desc" },
          take: 10,
        }),
      ]);

      // Compute derived values
      const todayRevenue = Number(todayRevAgg._sum.total ?? 0);
      const yesterdayRevenue = Number(yesterdayRevAgg._sum.total ?? 0);
      const todayRevenueChange = yesterdayRevenue > 0
        ? Math.round(((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100)
        : 0;

      const thisWeekRevenue = Number(thisWeekAgg._sum.total ?? 0);
      const lastWeekRevenue = Number(lastWeekAgg._sum.total ?? 0);
      const weekRevenueChange = lastWeekRevenue > 0
        ? Math.round(((thisWeekRevenue - lastWeekRevenue) / lastWeekRevenue) * 100)
        : 0;

      const thisWeekOrderCount = thisWeekAgg._count;
      const avgOrderValue = thisWeekOrderCount > 0
        ? Math.round(thisWeekRevenue / thisWeekOrderCount)
        : 0;

      const todayAvgOrderValue = todayRevAgg._count > 0
        ? Math.round(todayRevenue / todayRevAgg._count)
        : 0;

      // Format top items
      const topItems = topItemsRaw.map((item) => ({
        name: item.name,
        quantity: item._sum.quantity ?? 0,
        revenue: Number(item._sum.total ?? 0),
      }));

      // Format order type distribution
      const typeLabels: Record<string, string> = {
        DINE_IN: "En mesa",
        TAKEAWAY: "Para llevar",
        DELIVERY: "Delivery",
        QR_ORDER: "QR",
      };
      const orderTypeDistribution = orderTypeDistRaw.map((d) => ({
        type: d.type,
        label: typeLabels[d.type] ?? d.type,
        count: d._count,
      }));

      // Format recent orders
      const recentOrdersList = recentOrders.map((o) => ({
        id: o.id,
        number: o.number,
        status: o.status,
        type: o.type,
        customerName: o.customerName ?? (o.patient ? `${o.patient.firstName} ${o.patient.lastName}` : null),
        tableName: o.table?.name ?? null,
        total: Number(o.total),
        createdAt: o.createdAt,
      }));

      return {
        todayRevenue,
        todayRevenueChange,
        todayOrders: todayOrderCount,
        activeOrders: activeOrderCount,
        todayAvgOrderValue,
        revenueByDay: revenueByDayRaw,
        ordersByHour: ordersByHourRaw,
        topItems,
        orderTypeDistribution,
        avgOrderValue,
        weekRevenueChange,
        thisWeekRevenue,
        recentOrders: recentOrdersList,
      };
    }),
});
