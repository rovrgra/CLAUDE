import { router } from "@/server/trpc";
import { patientRouter } from "./patient";
import { conversationRouter } from "./conversation";
import { appointmentRouter } from "./appointment";
import { invoiceRouter } from "./invoice";
import { campaignRouter } from "./campaign";
import { organizationRouter } from "./organization";
import { documentRouter } from "./document";
import { authRouter } from "./auth";

export const appRouter = router({
  auth: authRouter,
  organization: organizationRouter,
  patient: patientRouter,
  conversation: conversationRouter,
  appointment: appointmentRouter,
  invoice: invoiceRouter,
  campaign: campaignRouter,
  document: documentRouter,
});

export type AppRouter = typeof appRouter;
