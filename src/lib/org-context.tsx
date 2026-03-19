"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { useSession } from "next-auth/react";

interface OrgContextType {
  organizationId: string | null;
  organizationName: string | null;
  role: string | null;
  setOrganizationId: (id: string) => void;
}

const OrgContext = createContext<OrgContextType>({
  organizationId: null,
  organizationName: null,
  role: null,
  setOrganizationId: () => {},
});

export function OrgProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const [organizationId, setOrganizationId] = useState<string | null>(null);

  // Auto-select first organization
  useEffect(() => {
    if (session?.memberships?.length && !organizationId) {
      setOrganizationId(session.memberships[0].organization.id);
    }
  }, [session, organizationId]);

  const membership = session?.memberships?.find(
    (m) => m.organization.id === organizationId
  );

  return (
    <OrgContext.Provider
      value={{
        organizationId,
        organizationName: membership?.organization.name ?? null,
        role: membership?.role ?? null,
        setOrganizationId,
      }}
    >
      {children}
    </OrgContext.Provider>
  );
}

export function useOrg() {
  const ctx = useContext(OrgContext);
  if (!ctx.organizationId) {
    return { ...ctx, organizationId: "" };
  }
  return ctx as OrgContextType & { organizationId: string };
}
