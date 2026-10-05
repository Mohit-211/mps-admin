import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { adminsApi, type Role } from "../../api/admins";
import type { Admin } from "../../api/auth";
import { Button } from "../../components/ui/Button";
import { Field, FormError } from "../../components/ui/Field";
import { inputClass } from "../../components/ui/fieldStyles";
import { Modal } from "../../components/ui/Modal";
import { PasswordFields } from "../../components/ui/PasswordFields";
import { ApiError, errorMessage } from "../../lib/api";
import { passwordRule } from "../../lib/password";

const PERMISSION_LABELS: Record<string, string> = {
  "admins.manage": "Staff",
  "platform.read": "Customers (view)",
  "platform.write": "Customers (edit)",
  "billing.read": "Billing (view)",
  "billing.manage": "Billing (edit)",
  "support.read": "Support (view)",
  "support.manage": "Support (reply)",
  "citations.view": "Citations (view)",
  "citations.manage": "Citations (edit)",
  "content.manage": "Blog & FAQ",
  "audits.run": "Sales audit",
};

const schema = z
  .object({
    name: z.string().trim().min(1, "Enter a name.").max(200),
    email: z.string().trim().min(1, "Enter an email address.").email("Enter a valid email address."),
    role_id: z.string().min(1, "Choose a role."),
    access: z.enum(["link", "password"]),
    password: z.string().optional(),
    confirm_password: z.string().optional(),
  })
  .superRefine((values, ctx) => {
    if (values.access !== "password") return;
    const result = passwordRule.safeParse(values.password ?? "");
    if (!result.success) {
      ctx.addIssue({ code: "custom", path: ["password"], message: result.error.issues[0]?.message ?? "Invalid password." });
    }
    if ((values.password ?? "") !== (values.confirm_password ?? "")) {
      ctx.addIssue({ code: "custom", path: ["confirm_password"], message: "Passwords do not match." });
    }
  });

type Values = z.infer<typeof schema>;

type StaffFormDialogProps = {
  open: boolean;
  onClose: () => void;
  /** Edit this admin; omit to create. */
  admin?: Admin | null;
  currentAdminId: string | undefined;
  roles: Role[];
  onSaved: (admin: Admin) => void;
};

export function StaffFormDialog(props: StaffFormDialogProps) {
  // Mounted only while open, so the form starts from the right defaults each time.
  return props.open ? <StaffForm {...props} /> : null;
}

function StaffForm({ onClose, admin, currentAdminId, roles, onSaved }: StaffFormDialogProps) {
  const editing = !!admin;
  const self = editing && admin?.id === currentAdminId;
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    setError,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: admin?.name ?? "",
      email: admin?.email ?? "",
      role_id: admin?.role_id != null ? String(admin.role_id) : "",
      access: "link",
      password: "",
      confirm_password: "",
    },
  });

  const access = useWatch({ control, name: "access" });
  const roleId = useWatch({ control, name: "role_id" });
  const email = useWatch({ control, name: "email" }) ?? "";
  const selectedRole = roles.find((role) => String(role.role_id) === roleId);
  const assignable = roles.filter((role) => role.active || String(role.role_id) === roleId);

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      if (editing && admin) {
        const changes: { name?: string; email?: string; role_id?: number } = {};
        if (values.name !== (admin.name ?? "")) changes.name = values.name;
        if (values.email.toLowerCase() !== admin.email) changes.email = values.email;
        if (Number(values.role_id) !== admin.role_id) changes.role_id = Number(values.role_id);
        if (Object.keys(changes).length === 0) {
          onClose();
          return;
        }
        const updated = await adminsApi.update(admin.id, changes);
        toast.success("Staff member updated.");
        onSaved(updated);
      } else {
        const withPassword = values.access === "password";
        const created = await adminsApi.create({
          name: values.name,
          email: values.email,
          role_id: Number(values.role_id),
          ...(withPassword ? { password: values.password, confirm_password: values.confirm_password } : {}),
        });
        if (withPassword && !created.password_set) {
          // Only an older backend (before 2026-10-05) ignores the password.
          toast.warning("Staff member created, but the password wasn't saved", {
            description: created.password_link_sent
              ? `The server ignored the password, so ${created.email} was emailed a link to set one.`
              : "The server ignored the password, and the set-password email failed. Use “Resend set-password link”.",
            duration: 10000,
          });
        } else if (withPassword) {
          toast.success(`Staff member created. ${created.email} can sign in with the password you set.`);
        } else if (created.password_link_sent) {
          toast.success(`Staff member created. A link to set their password was emailed to ${created.email}.`);
        } else {
          toast.warning("Staff member created, but the set-password email couldn't be sent. Use “Resend set-password link”.");
        }
        onSaved(created);
      }
      onClose();
    } catch (error) {
      if (error instanceof ApiError && error.reason === "email_taken") {
        setError("email", { message: "A staff member with this email already exists." });
      } else if (error instanceof ApiError && error.reason === "passwords_do_not_match") {
        setError("confirm_password", { message: "Passwords do not match." });
      } else if (error instanceof ApiError && error.reason === "invalid_role") {
        setError("role_id", { message: "This role can't be assigned." });
      } else {
        setFormError(errorMessage(error));
      }
    }
  });

  const showWarning =
    editing && admin && !self && (email.trim().toLowerCase() !== admin.email || Number(roleId) !== admin.role_id);

  return (
    <Modal
      open
      onClose={isSubmitting ? () => undefined : onClose}
      title={editing ? "Edit staff member" : "Add staff member"}
      description={editing ? admin?.email : "Give someone on the MyPageSEO team access to this admin console."}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" form="staff-form" loading={isSubmitting}>
            {editing ? "Save changes" : "Add staff member"}
          </Button>
        </>
      }
    >
      <form id="staff-form" className="space-y-4" onSubmit={onSubmit} noValidate>
        <FormError message={formError} />

        <Field label="Full name" htmlFor="staff-name" error={errors.name?.message}>
          <input id="staff-name" className={inputClass} aria-invalid={!!errors.name} autoComplete="off" {...register("name")} />
        </Field>

        <Field label="Email address" htmlFor="staff-email" error={errors.email?.message}>
          <input
            id="staff-email"
            type="email"
            className={inputClass}
            aria-invalid={!!errors.email}
            autoComplete="off"
            {...register("email")}
          />
        </Field>

        <Field
          label="Role"
          htmlFor="staff-role"
          error={errors.role_id?.message}
          hint={self ? "You can't change your own role." : undefined}
        >
          <select
            id="staff-role"
            className={inputClass}
            aria-invalid={!!errors.role_id}
            disabled={self}
            {...register("role_id")}
          >
            <option value="">Choose a role…</option>
            {assignable.map((role) => (
              <option key={role.role_id} value={String(role.role_id)}>
                {role.name}
              </option>
            ))}
          </select>
        </Field>

        {selectedRole && (
          <div className="rounded-md bg-[var(--color-surface-muted)] px-3 py-2.5">
            <p className="mb-1.5 text-xs font-medium text-[var(--color-text-secondary)]">{selectedRole.name} can access</p>
            <div className="flex flex-wrap gap-1.5">
              {selectedRole.permissions.length === 0 ? (
                <span className="text-xs text-[var(--color-text-muted)]">Nothing yet</span>
              ) : (
                selectedRole.permissions.map((permission) => (
                  <span
                    key={permission}
                    className="rounded bg-white px-2 py-0.5 text-[11px] font-medium text-[var(--color-text-primary)] ring-1 ring-[var(--color-border)]"
                  >
                    {PERMISSION_LABELS[permission] ?? permission}
                  </span>
                ))
              )}
            </div>
          </div>
        )}

        {!editing && (
          <fieldset className="space-y-2">
            <legend className="mb-1.5 text-sm font-medium text-[var(--color-text-primary)]">Password</legend>
            {(
              [
                { value: "link", title: "Email a set-password link", body: "They choose their own password. The link is valid for 72 hours." },
                { value: "password", title: "Set a password now", body: "Share it with them securely. They can change it after signing in." },
              ] as const
            ).map((option) => (
              <label
                key={option.value}
                className={`flex cursor-pointer gap-3 rounded-md border px-3 py-2.5 ${
                  access === option.value
                    ? "border-[var(--color-primary)] bg-[var(--color-primary-light)]"
                    : "border-[var(--color-border)] hover:bg-[var(--color-surface-muted)]"
                }`}
              >
                <input type="radio" value={option.value} className="mt-1 accent-[var(--color-primary)]" {...register("access")} />
                <span>
                  <span className="block text-sm font-medium text-[var(--color-text-primary)]">{option.title}</span>
                  <span className="block text-xs text-[var(--color-text-secondary)]">{option.body}</span>
                </span>
              </label>
            ))}
          </fieldset>
        )}

        {!editing && access === "password" && (
          <PasswordFields
            idPrefix="staff"
            register={register}
            setValue={setValue}
            errors={errors}
            getPassword={() => getValues("password") ?? ""}
          />
        )}

        {showWarning && (
          <p className="rounded-md bg-[#fbf3df] px-3 py-2.5 text-xs text-[#8a5a12]">
            Changing the email or role signs this person out of every session.
          </p>
        )}
      </form>
    </Modal>
  );
}
