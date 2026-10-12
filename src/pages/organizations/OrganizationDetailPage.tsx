import { Ban, PlayCircle } from "lucide-react";
import { useState } from "react";
import { useParams } from "react-router-dom";
import { toast } from "sonner";

import { billingApi } from "../../api/billing";
import { organizationsApi } from "../../api/organizations";
import { useAuth } from "../../auth/useAuth";
import { OrgStateBadge } from "../../components/StateBadges";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { Field } from "../../components/ui/Field";
import { textareaClass } from "../../components/ui/fieldStyles";
import { BackLink, DetailSkeleton } from "../../components/ui/PageHeader";
import { Notice } from "../../components/ui/Panel";
import { ErrorState } from "../../components/ui/States";
import { Tabs } from "../../components/ui/Tabs";
import { useQuery } from "../../hooks/useQuery";
import { useUrlState } from "../../hooks/useUrlState";
import { ApiError } from "../../lib/api";
import { formatDateTime } from "../../lib/format";
import { AuditTable } from "../billing/AuditTable";
import { InvoicesTable } from "../billing/InvoicesTable";
import { ReportsTable } from "../reports/ReportsTable";
import { LocationsTab } from "./LocationsTab";
import { OverviewTab } from "./OverviewTab";
import { StaffTab } from "./StaffTab";
import { SubscriptionTab } from "./SubscriptionTab";
import { TokensTab } from "./TokensTab";

type Tab = "overview" | "staff" | "locations" | "tokens" | "subscription" | "invoices" | "reports" | "audit";

export function OrganizationDetailPage() {
  const { organizationId = "" } = useParams();
  const { can } = useAuth();
  const { get, update } = useUrlState();
  const [tabPages, setTabPages] = useState<Record<string, number>>({});
  const [confirm, setConfirm] = useState<"suspend" | "unsuspend" | null>(null);
  const [unsuspendNote, setUnsuspendNote] = useState("");

  const canBilling = can("billing.read");
  const detail = useQuery(`org:${organizationId}`, (signal) => organizationsApi.get(organizationId, signal));
  const billing = useQuery(`org-billing:${organizationId}:${canBilling}`, (signal) =>
    canBilling ? billingApi.organization(organizationId, signal) : Promise.resolve(null),
  );

  const tabs: { value: Tab; label: string; hidden?: boolean }[] = [
    { value: "overview", label: "Overview" },
    { value: "staff", label: "Staff" },
    { value: "locations", label: "Locations" },
    { value: "tokens", label: "Tokens", hidden: !canBilling },
    { value: "subscription", label: "Subscription & limits" },
    { value: "invoices", label: "Invoices", hidden: !canBilling },
    { value: "reports", label: "Reports" },
    { value: "audit", label: "Audit", hidden: !canBilling },
  ];
  const visible = tabs.filter((t) => !t.hidden);
  const tab = (visible.find((t) => t.value === get("tab"))?.value ?? "overview") as Tab;
  const pageOf = (key: string) => tabPages[key] ?? 1;
  const setPageOf = (key: string) => (p: number) => setTabPages((prev) => ({ ...prev, [key]: p }));

  const refresh = () => {
    detail.reload();
    billing.reload();
  };

  if (detail.error) {
    return (
      <div className="page-container">
        <BackLink to="/organizations" label="Organizations" />
        <div className="surface">
          <ErrorState error={detail.error} onRetry={detail.reload} />
        </div>
      </div>
    );
  }

  const d = detail.data;
  if (!d) {
    return (
      <div className="page-container">
        <BackLink to="/organizations" label="Organizations" />
        <DetailSkeleton />
      </div>
    );
  }

  const org = d.organization;
  const canWrite = can("platform.write");

  return (
    <div className="page-container">
      <BackLink to="/organizations" label="Organizations" />

      <div className="surface mb-5 p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-xl font-semibold text-[var(--color-text-primary)]">{org.name}</h1>
              <OrgStateBadge state={d.billing.state} />
              <Badge tone="gray">
                <span className="capitalize">{org.type}</span>
              </Badge>
              {d.billing.plan.kind === "custom" && <Badge tone="purple">Custom plan</Badge>}
            </div>
            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
              {org.owner.email ?? "No owner email"}
              {org.country ? ` · ${org.country}` : ""} · {d.billing.currency}
            </p>
          </div>
          {canWrite && (
            <div className="flex flex-wrap gap-2">
              {org.suspended_at ? (
                <Button variant="secondary" size="sm" onClick={() => setConfirm("unsuspend")}>
                  <PlayCircle size={15} /> Unsuspend
                </Button>
              ) : (
                <Button variant="secondary" size="sm" className="text-[var(--color-danger)]" onClick={() => setConfirm("suspend")}>
                  <Ban size={15} /> Suspend
                </Button>
              )}
            </div>
          )}
        </div>
        {org.suspended_at && (
          <div className="mt-4">
            <Notice tone="red">
              Suspended {formatDateTime(org.suspended_at)}
              {org.suspended_reason ? `: “${org.suspended_reason}”` : ""}. Members can still sign in and read, but paid
              actions answer “organization suspended”.
            </Notice>
          </div>
        )}
      </div>

      <div className="surface overflow-hidden">
        <Tabs tabs={visible} value={tab} onChange={(v) => update({ tab: v === "overview" ? null : v }, false)} />

        {tab === "overview" && <OverviewTab detail={d} billing={billing.data ?? null} />}
        {tab === "staff" && <StaffTab detail={d} onChanged={refresh} />}
        {tab === "locations" && <LocationsTab detail={d} />}
        {tab === "tokens" && <TokensTab detail={d} onChanged={refresh} />}
        {tab === "subscription" && (
          <SubscriptionTab detail={d} billing={billing.data ?? null} billingError={billing.error} onChanged={refresh} />
        )}
        {tab === "invoices" && (
          <InvoicesTable
            filters={{ organization_id: org.id }}
            page={pageOf("invoices")}
            onPageChange={setPageOf("invoices")}
            showOrganization={false}
            emptyMessage="No invoices for this organization."
          />
        )}
        {tab === "reports" && (
          <ReportsTable
            filters={{ organization_id: org.id }}
            page={pageOf("reports")}
            onPageChange={setPageOf("reports")}
            showOrganization={false}
            emptyMessage="This organization hasn't generated any reports."
          />
        )}
        {tab === "audit" && (
          <AuditTable organizationId={org.id} page={pageOf("audit")} onPageChange={setPageOf("audit")} showOrganization={false} />
        )}
      </div>

      <ConfirmDialog
        open={confirm === "suspend"}
        onClose={() => setConfirm(null)}
        title={`Suspend ${org.name}?`}
        description="The organization becomes read-only: its members can still sign in and view data, but paid actions (refreshes, AI, adding locations, inviting) are blocked until you unsuspend it."
        confirmLabel="Suspend organization"
        danger
        requireReason
        onConfirm={async (reason) => {
          try {
            detail.setData(await organizationsApi.suspend(org.id, reason));
            billing.reload();
            toast.success(`${org.name} is suspended.`);
          } catch (error) {
            if (error instanceof ApiError && error.reason === "already_suspended") {
              refresh();
              toast.info("It was already suspended.");
              return;
            }
            throw error;
          }
        }}
      />

      <ConfirmDialog
        open={confirm === "unsuspend"}
        onClose={() => {
          setConfirm(null);
          setUnsuspendNote("");
        }}
        title={`Unsuspend ${org.name}?`}
        description="Paid actions work again straight away."
        confirmLabel="Unsuspend"
        onConfirm={async () => {
          try {
            detail.setData(await organizationsApi.unsuspend(org.id, unsuspendNote.trim() || undefined));
            billing.reload();
            setUnsuspendNote("");
            toast.success(`${org.name} is no longer suspended.`);
          } catch (error) {
            if (error instanceof ApiError && error.reason === "not_suspended") {
              refresh();
              toast.info("It wasn't suspended.");
              return;
            }
            throw error;
          }
        }}
      >
        <Field label="Note (optional)" htmlFor="unsuspend-note" hint="Saved in the audit log.">
          <textarea
            id="unsuspend-note"
            className={textareaClass}
            maxLength={500}
            value={unsuspendNote}
            onChange={(e) => setUnsuspendNote(e.target.value)}
          />
        </Field>
      </ConfirmDialog>
    </div>
  );
}
