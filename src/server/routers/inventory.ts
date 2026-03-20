import { z } from "zod";
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
      name: z.string().min(1),
      sku: z.string().optional(),
      unit: z.string().default("unidad"),
      currentStock: z.number().default(0),
      minStock: z.number().default(0),
      maxStock: z.number().optional(),
      costPerUnit: z.number().default(0),
      supplier: z.string().optional(),
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
      name: z.string().min(1).optional(),
      sku: z.string().optional().nullable(),
      unit: z.string().optional(),
      minStock: z.number().optional(),
      maxStock: z.number().optional().nullable(),
      costPerUnit: z.number().optional(),
      supplier: z.string().optional().nullable(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId: _orgId, id, ...data } = input;
      void _orgId;

      return ctx.prisma.inventoryItem.update({
        where: { id },
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
      quantity: z.number(),
      reason: z.string().optional(),
      orderId: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId: _orgId, inventoryItemId, type, quantity, reason, orderId } = input;
      void _orgId;

      // Determine stock change: PURCHASE adds, others subtract
      const stockDelta = type === "PURCHASE" ? quantity : -quantity;

      const [movement] = await ctx.prisma.$transaction([
        ctx.prisma.stockMovement.create({
          data: {
            inventoryItemId,
            organizationId: ctx.organizationId,
            type,
            quantity,
            reason,
            orderId,
            createdBy: ctx.userId,
          },
        }),
        ctx.prisma.inventoryItem.update({
          where: { id: inventoryItemId },
          data: { currentStock: { increment: stockDelta } },
        }),
      ]);

      return movement;
    }),

  // Get items where currentStock <= minStock (low stock alerts)
  lowStock: orgProcedure
    .input(z.object({ organizationId: z.string() }))
    .query(async ({ ctx }) => {
      return ctx.prisma.$queryRawUnsafe<any[]>(
        `SELECT i.*, c.name as "categoryName"
         FROM "InventoryItem" i
         LEFT JOIN "InventoryCategory" c ON i."categoryId" = c.id
         WHERE i."organizationId" = $1
           AND i."isActive" = true
           AND i."currentStock" <= i."minStock"
         ORDER BY (i."currentStock" - i."minStock") ASC`,
        ctx.organizationId,
      );
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
