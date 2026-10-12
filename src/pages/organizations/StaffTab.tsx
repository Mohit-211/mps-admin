import { UserMinus, UserPlus } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { organizationsApi, type OrganizationDetail } from "../../api/organizations";
import { ROLE_LABELS } from "../../api/users";
import { useAuth } from "../../auth/useAuth";
import { useQuery } from "../../hooks/useQuery";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { ApiError } from "../../lib/api";
import { CreateUserDialog } from "../users/CreateUserDialog";

type Member = OrganizationDetail["members"][number];

/** The organization's staff (members), with add and remove. Users are customers; employees are under Staff. */
export function StaffTab({ detail, onChanged }: { detail: OrganizationDetail; onChanged: () => void }) {
  const { can } = useAuth();
  const navigate = useNavigate();
  const canWrite = can("platform.write");
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<Member | null>(null);
  const org = detail.organization;

  // Phase 21: members limited to clients (and client users) show which clients they see.
  const needsClients = org.type === "agency" && detail.members.some((m) => (m.client_ids ?? []).length > 0);
  const clients = useQuery(`org-clients:${org.id}:${needsClients}`, (signal) =>
    needsClients ? organizationsApi.clients(org.id, signal) : Promise.resolve(null),
  );
  const clientName = new Map((clients.data ?? []).map((c) => [c.id, c.name ?? "Unnamed client"]));

  const members = [...detail.members].sort(
    (a, b) => Number(b.status === "active") - Number(a.status === "active") || Number(b.role === "owner") - Number(a.role === "owner"),
  );

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border-light)] px-5 py-3">
        <p className="text-sm text-[var(--color-text-secondary)]">
          {detail.billing.users.used} of {detail.billing.users.limit} user seats in use.
        </p>
        <div className="flex gap-2">
          <Link
            to={`/users?organization_id=${org.id}&org_name=${encodeURIComponent(org.name)}`}
            className="inline-flex h-9 items-center rounded-md px-3 text-xs font-semibold text-[var(--color-primary)] hover:bg-[var(--color-surface-muted)]"
          >
            Open in Users
          </Link>
          {canWrite && (
            <Button size="sm" onClick={() => setAdding(true)}>
              <UserPlus size={15} /> Add staff member
            </Button>
          )}
        </div>
      </div>

      <div className="table-scroll">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-[var(--color-surface-muted)] text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--color-text-muted)]">
            <tr>
              <th className="px-5 py-2.5">Person</th>
              <th className="px-5 py-2.5">Role</th>
              <th className="px-5 py-2.5">Membership</th>
              <th className="px-5 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {members.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-5 py-8 text-center text-[var(--color-text-muted)]">
                  No members.
                </td>
              </tr>
            ) : (
              members.map((m) => (
                <tr key={m.user_id} className="border-t border-[var(--color-border-light)]">
                  <td className="px-5 py-3">
                    <Link to={`/users/${m.user_id}`} className="font-semibold text-[var(--color-text-primary)] hover:text-[var(--color-primary)]">
                      {m.name || m.email || "Unknown user"}
                    </Link>
                    {m.name && <div className="text-xs text-[var(--color-text-muted)]">{m.email}</div>}
                  </td>
                  <td className="px-5 py-3 text-[var(--color-text-secondary)]">
                    {ROLE_LABELS[m.role] ?? m.role}
                    {(m.client_ids ?? []).length > 0 && (
                      <div className="text-xs text-[var(--color-text-muted)]">
                        Clients: {(m.client_ids ?? []).map((id) => clientName.get(id) ?? "…").join(", ")}
                      </div>
                    )}
                    {m.role === "member" && m.restricted === false && org.type === "agency" && (
                      <div className="text-xs text-[var(--color-text-muted)]">Every client</div>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <Badge tone={m.status === "active" ? "green" : "gray"}>
                      <span className="capitalize">{m.status}</span>
                    </Badge>
                  </td>
                  <td className="px-5 py-3 text-right">
                    {canWrite && m.role !== "owner" && m.status === "active" && (
                      <Button variant="ghost" size="sm" className="text-[var(--color-danger)]" onClick={() => setRemoving(m)}>
                        <UserMinus size={14} /> Remove
                      </Button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <CreateUserDialog
        open={adding}
        onClose={() => setAdding(false)}
        organization={{ id: org.id, name: org.name, type: org.type }}
        onCreated={(user) => {
          onChanged();
          navigate(`/users/${user.id}`);
        }}
      />

      <ConfirmDialog
        open={!!removing}
        onClose={() => setRemoving(null)}
        title={`Remove from ${org.name}?`}
        description={
          <>
            <strong>{removing?.name || removing?.email}</strong> loses access to {org.name}. Their account and any other
            organizations they belong to are not affected.
          </>
        }
        confirmLabel="Remove"
        danger
        requireReason
        onConfirm={async (reason) => {
          if (!removing) return;
          try {
            await organizationsApi.removeMember(org.id, removing.user_id, reason);
          } catch (error) {
            if (error instanceof ApiError && error.reason === "owner_protected") {
              throw new Error("The organization owner can't be removed.");
            }
            if (error instanceof ApiError && error.reason === "not_found") {
              onChanged();
              throw new Error("They're no longer a member of this organization.");
            }
            throw error;
          }
          toast.success(`${removing.name || removing.email} was removed from ${org.name}.`);
          onChanged();
        }}
      />
    </div>
  );
}
