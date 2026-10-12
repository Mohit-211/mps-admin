import { zodResolver } from "@hookform/resolvers/zod";
import { Building2, Search, X } from "lucide-react";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { organizationsApi, type OrganizationRow } from "../../api/organizations";
import { usersApi, type CreateUserInput, type UserDetail } from "../../api/users";
import { Button } from "../../components/ui/Button";
import { Field, FormError } from "../../components/ui/Field";
import { inputClass } from "../../components/ui/fieldStyles";
import { Modal } from "../../components/ui/Modal";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { useQuery } from "../../hooks/useQuery";
import { ApiError, errorMessage } from "../../lib/api";

type Mode = "new" | "existing";

const schema = z
  .object({
    mode: z.enum(["new", "existing"]),
    name: z.string().trim().min(1, "Enter a name.").max(100),
    email: z.string().trim().min(1, "Enter an email address.").email("Enter a valid email address.").max(200),
    send_email: z.boolean(),
    account_type: z.enum(["business", "agency"]),
    organization_name: z.string().trim().max(120).optional(),
    country: z.enum(["US", "CA"]),
    organization_id: z.string().optional(),
    role: z.enum(["member", "client_user"]),
    client_ids: z.array(z.string()),
    /** Phase 21: an agency member limited to some clients (else they work on every client). */
    limit_clients: z.boolean(),
  })
  .superRefine((v, ctx) => {
    if (v.mode === "new" && (v.organization_name ?? "").trim().length < 2) {
      ctx.addIssue({ code: "custom", path: ["organization_name"], message: "Enter the business or agency name (at least 2 characters)." });
    }
    if (v.mode === "existing" && !v.organization_id) {
      ctx.addIssue({ code: "custom", path: ["organization_id"], message: "Choose an organization." });
    }
    if (v.mode === "existing" && v.role === "member" && v.limit_clients && v.client_ids.length === 0) {
      ctx.addIssue({ code: "custom", path: ["client_ids"], message: "Choose at least one client, or untick “Limit to some clients”." });
    }
  });

type Values = z.infer<typeof schema>;

const defaults: Values = {
  mode: "new",
  name: "",
  email: "",
  send_email: true,
  account_type: "business",
  organization_name: "",
  country: "US",
  organization_id: "",
  role: "member",
  client_ids: [],
  limit_clients: false,
};

type CreateUserDialogProps = {
  open: boolean;
  onClose: () => void;
  onCreated: (user: UserDetail) => void;
  /** Start in "existing organization" mode with this organization chosen. */
  organization?: { id: string; name: string; type?: "business" | "agency" } | null;
};

export function CreateUserDialog(props: CreateUserDialogProps) {
  // Mounted only while open, so the form starts from the right defaults each time.
  return props.open ? <CreateUserForm {...props} /> : null;
}

function CreateUserForm({ onClose, onCreated, organization }: CreateUserDialogProps) {
  const [formError, setFormError] = useState<string | null>(null);
  // type is null when the dialog was opened for an organization whose type we don't know.
  const [org, setOrg] = useState<
    (Pick<OrganizationRow, "id" | "name" | "owner_email"> & { type: OrganizationRow["type"] | null }) | null
  >(organization ? { id: organization.id, name: organization.name, type: organization.type ?? null, owner_email: null } : null);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    setError,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: organization ? { ...defaults, mode: "existing", organization_id: organization.id } : defaults,
  });

  const mode = useWatch({ control, name: "mode" });
  const accountType = useWatch({ control, name: "account_type" });
  const sendEmail = useWatch({ control, name: "send_email" });
  const role = useWatch({ control, name: "role" });
  const clientIds = useWatch({ control, name: "client_ids" }) ?? [];
  const limitClients = useWatch({ control, name: "limit_clients" });

  const chooseOrg = (row: Pick<OrganizationRow, "id" | "name" | "type" | "owner_email"> | null) => {
    setOrg(row);
    setValue("organization_id", row?.id ?? "");
    if (row) clearErrors("organization_id");
    if (row?.type === "business") setValue("role", "member");
    setValue("client_ids", []);
    setValue("limit_clients", false);
  };

  const onSubmit = handleSubmit(async (v) => {
    setFormError(null);
    const body: CreateUserInput =
      v.mode === "new"
        ? {
            email: v.email,
            name: v.name,
            account_type: v.account_type,
            organization_name: (v.organization_name ?? "").trim(),
            country: v.country,
            send_email: v.send_email,
          }
        : {
            email: v.email,
            name: v.name,
            organization_id: v.organization_id!,
            role: v.role,
            ...((v.role === "client_user" || (v.role === "member" && v.limit_clients)) && v.client_ids.length
              ? { client_ids: v.client_ids }
              : {}),
            send_email: v.send_email,
          };
    try {
      const result = await usersApi.create(body);
      const who = result.user.email;
      if (!result.new_account) {
        toast.success(`${who} already had an account. They were added to ${org?.name ?? "the organization"}.`);
      } else if (v.send_email && result.password_email_sent) {
        toast.success(`Account created. ${who} was emailed a link to set their password.`);
      } else if (v.send_email) {
        toast.warning(`Account created, but the set-password email to ${who} couldn't be sent.`);
      } else {
        toast.success(`Account created for ${who}. No email was sent.`);
      }
      onCreated(result.user);
      onClose();
    } catch (error) {
      const reason = error instanceof ApiError ? error.reason : undefined;
      if (reason === "email_taken") setError("email", { message: "An account with this email already exists. Add it to an existing organization instead." });
      else if (reason === "already_member") setError("email", { message: "This person is already a member of that organization." });
      else if (reason === "organization_not_found") setError("organization_id", { message: "That organization no longer exists." });
      else if (reason === "agency_only") setError("role", { message: "Client users exist only in agency organizations." });
      else if (reason === "invalid_clients") setError("client_ids", { message: "Some of these clients no longer belong to this agency. Reselect them." });
      else setFormError(errorMessage(error));
    }
  });

  return (
    <Modal
      open
      onClose={isSubmitting ? () => undefined : onClose}
      title="Add user"
      description="Create a customer login. The account is verified straight away."
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" form="create-user-form" loading={isSubmitting}>
            Create user
          </Button>
        </>
      }
    >
      <form id="create-user-form" className="space-y-5" onSubmit={onSubmit} noValidate>
        <FormError message={formError} />

        <div className="grid gap-2 sm:grid-cols-2">
          {(
            [
              { value: "new", title: "New customer", body: "A new Business or Agency account they own. Their trial starts now." },
              { value: "existing", title: "Team member of a customer", body: "Add someone to an existing business or agency." },
            ] as { value: Mode; title: string; body: string }[]
          ).map((option) => (
            <label
              key={option.value}
              className={`flex cursor-pointer gap-3 rounded-md border px-3 py-2.5 ${
                mode === option.value
                  ? "border-[var(--color-primary)] bg-[var(--color-primary-light)]"
                  : "border-[var(--color-border)] hover:bg-[var(--color-surface-muted)]"
              }`}
            >
              <input type="radio" value={option.value} className="mt-1 accent-[var(--color-primary)]" {...register("mode")} />
              <span>
                <span className="block text-sm font-medium text-[var(--color-text-primary)]">{option.title}</span>
                <span className="block text-xs text-[var(--color-text-secondary)]">{option.body}</span>
              </span>
            </label>
          ))}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name" htmlFor="user-name" error={errors.name?.message}>
            <input id="user-name" className={inputClass} aria-invalid={!!errors.name} autoComplete="off" {...register("name")} />
          </Field>
          <Field label="Email address" htmlFor="user-email" error={errors.email?.message}>
            <input
              id="user-email"
              type="email"
              className={inputClass}
              aria-invalid={!!errors.email}
              autoComplete="off"
              {...register("email")}
            />
          </Field>
        </div>

        {mode === "new" ? (
          <div className="space-y-4">
            <Field label="Account type" htmlFor="user-account-type">
              <div id="user-account-type" className="grid grid-cols-2 gap-2">
                {(["business", "agency"] as const).map((type) => (
                  <label
                    key={type}
                    className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm ${
                      accountType === type
                        ? "border-[var(--color-primary)] bg-[var(--color-primary-light)] font-medium text-[var(--color-primary)]"
                        : "border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-muted)]"
                    }`}
                  >
                    <input type="radio" value={type} className="accent-[var(--color-primary)]" {...register("account_type")} />
                    {type === "business" ? "Business" : "Agency"}
                  </label>
                ))}
              </div>
            </Field>
            <div className="grid gap-4 sm:grid-cols-[1fr_160px]">
              <Field
                label={accountType === "agency" ? "Agency name" : "Business name"}
                htmlFor="user-org-name"
                error={errors.organization_name?.message}
              >
                <input
                  id="user-org-name"
                  className={inputClass}
                  aria-invalid={!!errors.organization_name}
                  autoComplete="off"
                  {...register("organization_name")}
                />
              </Field>
              <Field label="Country" htmlFor="user-country">
                <select id="user-country" className={inputClass} {...register("country")}>
                  <option value="US">United States</option>
                  <option value="CA">Canada</option>
                </select>
              </Field>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <Field label="Organization" htmlFor="user-org-search" error={errors.organization_id?.message}>
              {org ? (
                <div className="flex items-center justify-between gap-3 rounded-md border border-[var(--color-primary)] bg-[var(--color-primary-light)] px-3 py-2">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-[var(--color-text-primary)]">{org.name}</div>
                    <div className="truncate text-xs capitalize text-[var(--color-text-secondary)]">
                      {org.type ?? "organization"}
                      {org.owner_email ? ` · ${org.owner_email}` : ""}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => chooseOrg(null)}
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded text-[var(--color-text-muted)] hover:bg-white"
                    aria-label="Change organization"
                  >
                    <X size={15} />
                  </button>
                </div>
              ) : (
                <OrganizationSearch invalid={!!errors.organization_id} onPick={chooseOrg} />
              )}
            </Field>

            <Field
              label="Role"
              htmlFor="user-role"
              error={errors.role?.message}
              hint={
                role === "client_user"
                  ? "Client users only see the clients assigned to them."
                  : "Team members work on every location, unless an agency limits them to some clients."
              }
            >
              <select id="user-role" className={inputClass} {...register("role")}>
                <option value="member">Team member</option>
                {org && org.type !== "business" && <option value="client_user">Client user</option>}
              </select>
            </Field>

            {org && org.type !== "business" && role === "member" && (
              <label className="flex cursor-pointer items-start gap-2.5 text-sm text-[var(--color-text-primary)]">
                <input type="checkbox" className="mt-0.5 h-4 w-4 accent-[var(--color-primary)]" {...register("limit_clients")} />
                <span>
                  Limit to some clients
                  <span className="block text-xs text-[var(--color-text-secondary)]">
                    They then see and work only on those clients' locations. Unticked: every client.
                  </span>
                </span>
              </label>
            )}

            {org && (role === "client_user" || (role === "member" && limitClients && org.type !== "business")) && (
              <Field label="Clients they can see" htmlFor="user-clients" error={errors.client_ids?.message}>
                <ClientPicker
                  organizationId={org.id}
                  selected={clientIds}
                  onChange={(ids) => setValue("client_ids", ids, { shouldValidate: true })}
                />
              </Field>
            )}
          </div>
        )}

        <label className="flex cursor-pointer items-start gap-2.5 text-sm text-[var(--color-text-primary)]">
          <input type="checkbox" className="mt-0.5 h-4 w-4 accent-[var(--color-primary)]" {...register("send_email")} />
          <span>
            Email them a link to set their password
            <span className="block text-xs text-[var(--color-text-secondary)]">
              {sendEmail
                ? "The link opens the customer app and is valid for 72 hours."
                : "Without it they can't sign in until they use “Forgot password” in the app."}
            </span>
          </span>
        </label>
      </form>
    </Modal>
  );
}

function OrganizationSearch({
  invalid,
  onPick,
}: {
  invalid: boolean;
  onPick: (org: OrganizationRow) => void;
}) {
  const [term, setTerm] = useState("");
  const q = useDebouncedValue(term.trim(), 300);
  const results = useQuery(`org-search:${q}`, (signal) => organizationsApi.list({ q: q || undefined, limit: 8 }, signal));

  return (
    <div className="rounded-md border border-[var(--color-border)] aria-[invalid=true]:border-[var(--color-danger)]" aria-invalid={invalid}>
      <div className="relative border-b border-[var(--color-border-light)]">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
        <input
          id="user-org-search"
          type="search"
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          placeholder="Search by organization name or owner email…"
          className="h-10 w-full rounded-t-md bg-white pl-9 pr-3 text-sm outline-none"
          autoComplete="off"
        />
      </div>
      <ul className="max-h-56 overflow-y-auto py-1">
        {results.loading && !results.data ? (
          <li className="px-3 py-3 text-sm text-[var(--color-text-muted)]">Searching…</li>
        ) : results.error ? (
          <li className="px-3 py-3 text-sm text-[var(--color-danger)]">{errorMessage(results.error)}</li>
        ) : results.data?.organizations.length === 0 ? (
          <li className="px-3 py-3 text-sm text-[var(--color-text-muted)]">No organizations found.</li>
        ) : (
          results.data?.organizations.map((row) => (
            <li key={row.id}>
              <button
                type="button"
                onClick={() => onPick(row)}
                className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-[var(--color-surface-muted)]"
              >
                <Building2 size={16} className="shrink-0 text-[var(--color-text-muted)]" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-[var(--color-text-primary)]">{row.name}</span>
                  <span className="block truncate text-xs text-[var(--color-text-secondary)]">
                    <span className="capitalize">{row.type}</span>
                    {row.owner_email ? ` · ${row.owner_email}` : ""}
                    {row.suspended_at ? " · suspended" : ""}
                  </span>
                </span>
              </button>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}

function ClientPicker({
  organizationId,
  selected,
  onChange,
}: {
  organizationId: string;
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  const clients = useQuery(`clients:${organizationId}`, (signal) => organizationsApi.clients(organizationId, signal));
  const toggle = (id: string) => onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);

  return (
    <div id="user-clients" className="rounded-md border border-[var(--color-border)]">
      {clients.loading && !clients.data ? (
        <p className="px-3 py-3 text-sm text-[var(--color-text-muted)]">Loading clients…</p>
      ) : clients.error ? (
        <p className="px-3 py-3 text-sm text-[var(--color-danger)]">{errorMessage(clients.error)}</p>
      ) : clients.data?.length === 0 ? (
        <p className="px-3 py-3 text-sm text-[var(--color-text-muted)]">
          This agency has no clients yet. You can still create the user; they won't see any client until one is assigned.
        </p>
      ) : (
        <>
          <ul className="max-h-52 overflow-y-auto py-1">
            {clients.data?.map((client) => (
              <li key={client.id}>
                <label className="flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-[var(--color-surface-muted)]">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-[var(--color-primary)]"
                    checked={selected.includes(client.id)}
                    onChange={() => toggle(client.id)}
                  />
                  <span className="min-w-0 flex-1 truncate text-sm text-[var(--color-text-primary)]">
                    {client.name || "Unnamed client"}
                    {!client.is_active && <span className="ml-1.5 text-xs text-[var(--color-text-muted)]">(inactive)</span>}
                  </span>
                  <span className="shrink-0 text-xs text-[var(--color-text-muted)]">
                    {client.locations} location{client.locations === 1 ? "" : "s"}
                  </span>
                </label>
              </li>
            ))}
          </ul>
          <div className="border-t border-[var(--color-border-light)] px-3 py-2 text-xs text-[var(--color-text-secondary)]">
            {selected.length === 0 ? "None selected: they won't see any client until one is assigned." : `${selected.length} selected`}
          </div>
        </>
      )}
    </div>
  );
}
