import { initTRPC, TRPCError } from "@trpc/server";
import { getServerSession } from "next-auth";
import superjson from "superjson";
import { ZodError } from "zod";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export const createTRPCContext = async (opts: { headers: Headers }) => {
  const session = await getServerSession(authOptions);
  return { session, prisma, headers: opts.headers };
};

const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError: error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

export const createCallerFactory = t.createCallerFactory;
export const router = t.router;
export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({
    ctx: { session: ctx.session, userId: (ctx.session.user as any).id as string },
  });
});

export const orgProcedure = protectedProcedure.use(async (opts) => {
  const { ctx, next } = opts;
  const rawInput = await (opts as any).getRawInput();
  const organizationId = (rawInput as any)?.organizationId;
  if (!organizationId) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "organizationId is required" });
  }

  const member = await ctx.prisma.member.findUnique({
    where: { userId_organizationId: { userId: ctx.userId, organizationId } },
  });

  if (!member || !member.isActive) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Not a member of this organization" });
  }

  return next({ ctx: { ...ctx, member, organizationId } });
});
