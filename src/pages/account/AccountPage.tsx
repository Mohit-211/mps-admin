import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { authApi, PERMISSION_LABELS } from "../../api/auth";
import { useAuth } from "../../auth/useAuth";
import { Button } from "../../components/ui/Button";
import { Field, FormError } from "../../components/ui/Field";
import { inputClass } from "../../components/ui/fieldStyles";
import { PageHeader } from "../../components/ui/PageHeader";
import { Detail, DetailList, Panel } from "../../components/ui/Panel";
import { ApiError, errorMessage } from "../../lib/api";
import { formatDateTime, formatRelative } from "../../lib/format";
import { PASSWORD_HINT, passwordRule } from "../../lib/password";

const schema = z
  .object({
    current_password: z.string().min(1, "Enter your current password."),
    new_password: passwordRule,
    confirm_password: z.string().min(1, "Confirm the new password."),
  })
  .refine((v) => v.new_password === v.confirm_password, { path: ["confirm_password"], message: "Passwords do not match." });

type Values = z.infer<typeof schema>;

export function AccountPage() {
  const { admin, replaceToken } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { current_password: "", new_password: "", confirm_password: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      const { token } = await authApi.changePassword(values);
      // The old token stops working: the next call would be a 401 without this.
      replaceToken(token);
      reset();
      toast.success("Password changed. Your other sessions were signed out.");
    } catch (error) {
      const reason = error instanceof ApiError ? error.reason : undefined;
      if (reason === "wrong_password") setError("current_password", { message: "This isn't your current password." });
      else if (reason === "passwords_do_not_match") setError("confirm_password", { message: "Passwords do not match." });
      else setFormError(errorMessage(error));
    }
  });

  if (!admin) return null;

  return (
    <div className="page-container">
      <PageHeader title="My account" description="Your admin console sign-in and what your role can do." />

      <div className="grid gap-5 xl:grid-cols-2">
        <Panel title="Profile">
          <DetailList>
            <Detail label="Name">{admin.name || "—"}</Detail>
            <Detail label="Email">{admin.email}</Detail>
            <Detail label="Role">{admin.role_name}</Detail>
            <Detail label="Last sign-in">
              {admin.last_login_at
                ? `${formatDateTime(admin.last_login_at)} (${formatRelative(admin.last_login_at)})`
                : "—"}
            </Detail>
            {admin.permissions.includes("citations.view") && (
              <Detail label="Citation locations">
                {admin.citation_scope === "assigned" ? `${admin.assigned_locations ?? 0} assigned to you` : "Every location"}
              </Detail>
            )}
            <Detail label="Access">
              <div className="flex flex-wrap gap-1.5">
                {admin.permissions.length === 0
                  ? "Nothing yet"
                  : admin.permissions.map((permission) => (
                      <span
                        key={permission}
                        className="rounded bg-[var(--color-surface-muted)] px-2 py-0.5 text-[11px] font-medium text-[var(--color-text-primary)]"
                      >
                        {PERMISSION_LABELS[permission] ?? permission}
                      </span>
                    ))}
              </div>
            </Detail>
          </DetailList>
          <p className="border-t border-[var(--color-border-light)] px-5 py-3 text-xs text-[var(--color-text-muted)]">
            Ask a super admin to change your name, email or role.
          </p>
        </Panel>

        <Panel title="Change password" description="Your other sessions are signed out; this one stays signed in.">
          <form className="space-y-4 px-5 py-5" onSubmit={onSubmit} noValidate>
            <FormError message={formError} />
            <Field label="Current password" htmlFor="current-password" error={errors.current_password?.message}>
              <input
                id="current-password"
                type="password"
                autoComplete="current-password"
                className={inputClass}
                aria-invalid={!!errors.current_password}
                {...register("current_password")}
              />
            </Field>
            <Field label="New password" htmlFor="new-password" error={errors.new_password?.message} hint={PASSWORD_HINT}>
              <input
                id="new-password"
                type="password"
                autoComplete="new-password"
                className={inputClass}
                aria-invalid={!!errors.new_password}
                {...register("new_password")}
              />
            </Field>
            <Field label="Confirm new password" htmlFor="confirm-password" error={errors.confirm_password?.message}>
              <input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                className={inputClass}
                aria-invalid={!!errors.confirm_password}
                {...register("confirm_password")}
              />
            </Field>
            <div className="flex justify-end">
              <Button type="submit" loading={isSubmitting}>
                Change password
              </Button>
            </div>
          </form>
        </Panel>
      </div>
    </div>
  );
}
