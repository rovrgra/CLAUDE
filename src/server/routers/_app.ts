import { router } from "@/server/trpc";
import { patientRouter } from "./patient";
import { appointmentRouter } from "./appointment";
import { invoiceRouter } from "./invoice";
import { campaignRouter } from "./campaign";
import { organizationRouter } from "./organization";
import { documentRouter } from "./document";
import { authRouter } from "./auth";
import { menuRouter } from "./menu";
import { tableRouter } from "./table";
import { orderRouter } from "./order";
import { inventoryRouter } from "./inventory";
import { staffRouter } from "./staff";
import { reportingRouter } from "./reporting";

export const appRouter = router({
  auth: authRouter,
  organization: organizationRouter,
  patient: patientRouter,
  appointment: appointmentRouter,
  invoice: invoiceRouter,
  campaign: campaignRouter,
  document: documentRouter,
  menu: menuRouter,
  table: tableRouter,
  order: orderRouter,
  inventory: inventoryRouter,
  staff: staffRouter,
  reporting: reportingRouter,
});

export type AppRouter = typeof appRouter;
