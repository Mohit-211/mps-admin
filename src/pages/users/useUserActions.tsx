import { Ban, LogOut, MailCheck, MailPlus, Trash2, UserCheck, UserMinus } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

import { organizationsApi } from "../../api/organizations";
import { usersApi, type OwnsOrganizationBlocker, type UserDetail, type UserRow } from "../../api/users";
import { useAuth } from "../../auth/useAuth";
import type { ActionItem } from "../../components/ui/ActionMenu";
import { Button } from "../../components/ui/Button";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { Modal } from "../../components/ui/Modal";
import { ApiError, errorMessage } from "../../lib/api";

type Dialog =
  | { kind: "disable" | "logout" | "delete" | "verify"; user: UserRow }
  | { kind: "blocked"; user: UserRow; organizations: OwnsOrganizationBlocker[] }
  | { kind: "suspend"; user: UserRow; organization: OwnsOrganizationBlocker }
  | { kind: "removeMember"; user: UserRow; organization: OrgRef };

/** An organization the user is a (non-owner) member of. */
export type OrgRef = { id: string; name: string };

const label = (user: UserRow) => user.name || user.email;

/**
 * Actions on a customer account (docs/ADMIN_PANEL.md §5.4), shared by the users table and the detail page.
 * Needs platform.write; without it no actions are offered.
 */
export function useUserActions({
  onChanged,
  onDeleted,
  onMembershipRemoved,
}: {
  /** A fresh user detail after enable / disable / verify. */
  onChanged: (user: UserDetail) => void;
  onDeleted: (userId: string) => void;
  onMembershipRemoved?: (userId: string, organizationId: string) => void;
}) {
  const { can } = useAuth();
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const close = () => setDialog(null);
  const canWrite = can("platform.write");

  const run = async (fn: () => Promise<void>) => {
    try {
      await fn();
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  /** `removableFrom`: offer "Remove from <org>" for this membership (never for the owner). */
  const itemsFor = (user: UserRow, removableFrom?: OrgRef | null): ActionItem[] => {
    if (!canWrite) return [];
    const verified = !!user.email_verified_at;
    return [
      {
        label: "Enable sign-in",
        icon: UserCheck,
        hidden: !user.disabled,
        onSelect: () =>
          run(async () => {
            onChanged(await usersApi.enable(user.id));
            toast.success(`${label(user)} can sign in again.`);
          }),
      },
      {
        label: "Resend verification email",
        icon: MailPlus,
        hidden: verified,
        onSelect: () =>
          run(async () => {
            await usersApi.resendVerification(user.id);
            toast.success(`Verification email sent to ${user.email}.`);
          }),
      },
      {
        label: "Mark email verified",
        icon: MailCheck,
        hidden: verified,
        onSelect: () => setDialog({ kind: "verify", user }),
      },
      {
        label: "Sign out everywhere",
        icon: LogOut,
        onSelect: () => setDialog({ kind: "logout", user }),
      },
      {
        label: removableFrom ? `Remove from ${removableFrom.name}` : "Remove from organization",
        icon: UserMinus,
        danger: true,
        hidden: !removableFrom,
        onSelect: () => removableFrom && setDialog({ kind: "removeMember", user, organization: removableFrom }),
      },
      {
        label: "Disable sign-in",
        icon: Ban,
        danger: true,
        hidden: user.disabled,
        onSelect: () => setDialog({ kind: "disable", user }),
      },
      {
        label: "Delete user",
        icon: Trash2,
        danger: true,
        onSelect: () => setDialog({ kind: "delete", user }),
      },
    ];
  };

  /** Open the remove-member confirmation directly (e.g. from a membership list). */
  const removeFrom = (user: UserRow, organization: OrgRef) => setDialog({ kind: "removeMember", user, organization });

  const dialogs = (
    <>
      <ConfirmDialog
        open={dialog?.kind === "removeMember"}
        onClose={close}
        title="Remove from organization?"
        description={
          <>
            <strong>{dialog && label(dialog.user)}</strong> loses access to{" "}
            <strong>{dialog?.kind === "removeMember" ? dialog.organization.name : ""}</strong>. Their account and
            any other organizations they belong to are not affected.
          </>
        }
        confirmLabel="Remove"
        danger
        requireReason
        onConfirm={async (reason) => {
          if (dialog?.kind !== "removeMember") return;
          const { user, organization } = dialog;
          try {
            await organizationsApi.removeMember(organization.id, user.id, reason);
          } catch (error) {
            if (error instanceof ApiError && error.reason === "owner_protected") {
              throw new Error("The organization owner can't be removed. Delete the user or suspend the organization instead.");
            }
            if (error instanceof ApiError && error.reason === "not_found") {
              throw new Error("They're no longer a member of this organization.");
            }
            throw error;
          }
          toast.success(`${label(user)} was removed from ${organization.name}.`);
          onMembershipRemoved?.(user.id, organization.id);
        }}
      />

      <ConfirmDialog
        open={dialog?.kind === "disable"}
        onClose={close}
        title="Disable sign-in?"
        description={
          <>
            <strong>{dialog && label(dialog.user)}</strong> is signed out of every session and can't sign in
            until you enable the account again. Their organization and data are not affected.
          </>
        }
        confirmLabel="Disable sign-in"
        danger
        requireReason
        onConfirm={async (reason) => {
          if (!dialog) return;
          onChanged(await usersApi.disable(dialog.user.id, reason));
          toast.success(`${label(dialog.user)} can no longer sign in.`);
        }}
      />

      <ConfirmDialog
        open={dialog?.kind === "logout"}
        onClose={close}
        title="Sign out everywhere?"
        description={
          <>
            Ends every session of <strong>{dialog && label(dialog.user)}</strong>. They can sign in again
            straight away.
          </>
        }
        confirmLabel="Sign out"
        onConfirm={async () => {
          if (!dialog) return;
          await usersApi.logout(dialog.user.id);
          toast.success(`${label(dialog.user)} was signed out everywhere.`);
        }}
      />

      <ConfirmDialog
        open={dialog?.kind === "verify"}
        onClose={close}
        title="Mark email as verified?"
        description={
          <>
            Treat <strong>{dialog?.user.email}</strong> as verified without the user clicking the link.
          </>
        }
        confirmLabel="Mark verified"
        onConfirm={async () => {
          if (!dialog) return;
          onChanged(await usersApi.verify(dialog.user.id));
          toast.success("Email marked as verified.");
        }}
      />

      <ConfirmDialog
        open={dialog?.kind === "delete"}
        onClose={close}
        title="Delete this user permanently?"
        description={
          <>
            <strong>{dialog?.user.email}</strong> is deleted and can sign up again with the same email. Their
            Google connections are disconnected, and any organization they own <em>that is empty</em> is
            deleted too. This can't be undone.
          </>
        }
        confirmLabel="Delete user"
        danger
        requireReason
        onConfirm={async (reason) => {
          if (!dialog) return;
          const user = dialog.user;
          try {
            const result = await usersApi.remove(user.id, reason);
            const orgs = result.organizations_deleted.map((o) => o.name).join(", ");
            toast.success(`${user.email} was deleted.`, {
              description: orgs ? `Also deleted their empty organization: ${orgs}.` : undefined,
            });
            onDeleted(user.id);
          } catch (error) {
            if (error instanceof ApiError && error.reason === "owns_organization") {
              const organizations = (error.data?.organizations as OwnsOrganizationBlocker[] | undefined) ?? [];
              // Swap to the explanation dialog instead of showing an inline error.
              setTimeout(() => setDialog({ kind: "blocked", user, organizations }), 0);
              return;
            }
            throw error;
          }
        }}
      />

      <Modal
        open={dialog?.kind === "blocked"}
        onClose={close}
        title="This user can't be deleted yet"
        description="They own an organization that is still in use. Suspend it instead, or remove its members, locations and subscription first."
        footer={
          <Button variant="secondary" onClick={close}>
            Close
          </Button>
        }
      >
        <ul className="space-y-2">
          {dialog?.kind === "blocked" &&
            dialog.organizations.map((org) => (
              <li
                key={org.id}
                className="flex flex-col gap-3 rounded-md border border-[var(--color-border)] px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-[var(--color-text-primary)]">{org.name}</div>
                  <div className="mt-0.5 text-xs text-[var(--color-text-secondary)]">
                    {[
                      org.other_members > 0 && `${org.other_members} other member${org.other_members === 1 ? "" : "s"}`,
                      org.locations > 0 && `${org.locations} active location${org.locations === 1 ? "" : "s"}`,
                      org.open_subscription && "an open subscription",
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </div>
                  <Link
                    to={`/users?organization_id=${org.id}&org_name=${encodeURIComponent(org.name)}`}
                    onClick={close}
                    className="mt-1 inline-block text-xs font-semibold text-[var(--color-primary)] hover:underline"
                  >
                    View its members
                  </Link>
                </div>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => dialog.kind === "blocked" && setDialog({ kind: "suspend", user: dialog.user, organization: org })}
                >
                  Suspend organization
                </Button>
              </li>
            ))}
        </ul>
      </Modal>

      <ConfirmDialog
        open={dialog?.kind === "suspend"}
        onClose={close}
        title={`Suspend ${dialog?.kind === "suspend" ? dialog.organization.name : "organization"}?`}
        description="The organization becomes read-only: its members can still sign in and view data, but paid actions are blocked until you unsuspend it."
        confirmLabel="Suspend organization"
        danger
        requireReason
        onConfirm={async (reason) => {
          if (dialog?.kind !== "suspend") return;
          try {
            await organizationsApi.suspend(dialog.organization.id, reason);
            toast.success(`${dialog.organization.name} is suspended.`);
          } catch (error) {
            if (error instanceof ApiError && error.reason === "already_suspended") {
              toast.info(`${dialog.organization.name} was already suspended.`);
              return;
            }
            throw error;
          }
        }}
      />
    </>
  );

  return { itemsFor, removeFrom, dialogs, canWrite };
}
