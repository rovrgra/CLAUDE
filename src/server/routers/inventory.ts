import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, orgProcedure } from "@/server/trpc";

export const inventoryRouter = router({
  // List inventory items with category, filter by isActive, search by name
  list: orgProcedure
    .input(z.object({
      organizationId: z.string(),
      isActive: z.boolean().optional(),
      search: z.string().optional(),
      categoryId: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const where: any = { organizationId: ctx.organizationId };
      if (input.isActive !== undefined) where.isActive = input.isActive;
      if (input.categoryId) where.categoryId = input.categoryId;
      if (input.search) {
        where.name = { contains: input.search, mode: "insensitive" };
      }

      return ctx.prisma.inventoryItem.findMany({
        where,
        include: { category: true },
        orderBy: { name: "asc" },
      });
    }),

  // Get single item with movements
  get: orgProcedure
    .input(z.object({ organizationId: z.string(), id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.inventoryItem.findUniqueOrThrow({
        where: { id: input.id },
        include: {
          category: true,
          movements: {
            orderBy: { createdAt: "desc" },
            take: 50,
          },
        },
      });
    }),

  // Create inventory item
  create: orgProcedure
    .input(z.object({
      organizationId: z.string(),
      categoryId: z.string().optional(),
      name: z.string().min(1).max(200),
      sku: z.string().max(200).optional(),
      unit: z.string().max(200).default("unidad"),
      currentStock: z.number().min(0).default(0),
      minStock: z.number().min(0).default(0),
      maxStock: z.number().min(0).optional(),
      costPerUnit: z.number().min(0).default(0),
      supplier: z.string().max(200).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId: _orgId, ...data } = input;
      void _orgId;

      return ctx.prisma.inventoryItem.create({
        data: {
          organizationId: ctx.organizationId,
          ...data,
        },
        include: { category: true },
      });
    }),

  // Update inventory item
  update: orgProcedure
    .input(z.object({
      organizationId: z.string(),
      id: z.string(),
      categoryId: z.string().optional().nullable(),
      name: z.string().min(1).max(200).optional(),
      sku: z.string().max(200).optional().nullable(),
      unit: z.string().max(200).optional(),
      minStock: z.number().min(0).optional(),
      maxStock: z.number().min(0).optional().nullable(),
      costPerUnit: z.number().min(0).optional(),
      supplier: z.string().max(200).optional().nullable(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId: _orgId, id, ...data } = input;
      void _orgId;

      return ctx.prisma.inventoryItem.update({
        where: { id, organizationId: ctx.organizationId },
        data,
        include: { category: true },
      });
    }),

  // Record stock movement and update currentStock
  addMovement: orgProcedure
    .input(z.object({
      organizationId: z.string(),
      inventoryItemId: z.string(),
      type: z.enum(["PURCHASE", "SALE", "ADJUSTMENT", "WASTE"]),
      quantity: z.number().min(0),
      reason: z.string().max(5000).optional(),
      orderId: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId: _orgId, inventoryItemId, type, quantity, reason, orderId } = input;
      void _orgId;

      // Determine stock change: PURCHASE adds, others subtract
      const stockDelta = type === "PURCHASE" ? quantity : -quantity;

      const movement = await ctx.prisma.$transaction(async (tx) => {
        const item = await tx.inventoryItem.findUniqueOrThrow({
          where: { id: inventoryItemId },
        });

        if (item.organizationId !== ctx.organizationId) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }

        const newStock = Number(item.currentStock) + stockDelta;
        if (newStock < 0) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Stock insuficiente" });
        }

        const created = await tx.stockMovement.create({
          data: {
            inventoryItemId,
            organizationId: ctx.organizationId,
            type,
            quantity,
            reason,
            orderId,
            createdBy: ctx.userId,
          },
        });

        await tx.inventoryItem.update({
          where: { id: inventoryItemId },
          data: { currentStock: newStock },
        });

        return created;
      });

      return movement;
    }),

  // Get items where currentStock <= minStock (low stock alerts)
  lowStock: orgProcedure
    .input(z.object({ organizationId: z.string() }))
    .query(async ({ ctx }) => {
      return ctx.prisma.$queryRaw<any[]>`
        SELECT i.*, c.name as "categoryName"
        FROM "InventoryItem" i
        LEFT JOIN "InventoryCategory" c ON i."categoryId" = c.id
        WHERE i."organizationId" = ${ctx.organizationId}
          AND i."isActive" = true
          AND i."currentStock" <= i."minStock"
        ORDER BY (i."currentStock" - i."minStock") ASC`;
    }),

  // List categories
  categories: orgProcedure
    .input(z.object({ organizationId: z.string() }))
    .query(async ({ ctx }) => {
      return ctx.prisma.inventoryCategory.findMany({
        where: { organizationId: ctx.organizationId },
        include: { _count: { select: { items: true } } },
        orderBy: { name: "asc" },
      });
    }),

  // Create category
  createCategory: orgProcedure
    .input(z.object({
      organizationId: z.string(),
      name: z.string().min(1),
      description: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.inventoryCategory.create({
        data: {
          organizationId: ctx.organizationId,
          name: input.name,
          description: input.description,
        },
      });
    }),
});
