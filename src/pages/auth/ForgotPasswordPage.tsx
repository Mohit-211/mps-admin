import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, ArrowLeft, Loader2, Mail, MailCheck } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import { z } from "zod";

import { authApi } from "../../api/auth";
import { errorMessage } from "../../lib/api";

const schema = z.object({
  email: z.string().trim().min(1, "Enter your email address.").email("Enter a valid email address."),
});

type Values = z.infer<typeof schema>;

export function ForgotPasswordPage() {
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(schema) });

  const onSubmit = handleSubmit(async ({ email }) => {
    setFormError(null);
    try {
      // Same answer for every email (no account enumeration).
      await authApi.forgotPassword({ email });
      setSentTo(email);
    } catch (error) {
      setFormError(errorMessage(error, "Could not send the reset link. Please try again."));
    }
  });

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-background)] px-5 py-10">
      <div className="w-full max-w-[420px]">
        <Link
          to="/login"
          className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-primary)]"
        >
          <ArrowLeft size={16} />
          Back to sign in
        </Link>

        <div className="surface p-7 sm:p-8">
          {sentTo ? (
            <>
              <div className="mb-6 flex h-11 w-11 items-center justify-center rounded-lg bg-[var(--color-primary-light)] text-[var(--color-success)]">
                <MailCheck size={20} />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text-primary)]">
                Check your email
              </h1>
              <p className="mt-2 text-sm leading-6 text-[var(--color-text-secondary)]">
                If <span className="font-medium text-[var(--color-text-primary)]">{sentTo}</span> belongs
                to an administrator, we've sent a link to reset the password. The link is valid for 60
                minutes.
              </p>
              <Link
                to="/login"
                className="mt-7 flex h-11 w-full items-center justify-center rounded-md bg-[var(--color-primary)] px-4 text-sm font-semibold text-white hover:bg-[var(--color-primary-hover)]"
              >
                Back to sign in
              </Link>
            </>
          ) : (
            <>
              <div className="mb-6 flex h-11 w-11 items-center justify-center rounded-lg bg-[var(--color-primary-light)] text-[var(--color-primary)]">
                <Mail size={20} />
              </div>

              <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text-primary)]">
                Forgot your password?
              </h1>

              <p className="mt-2 text-sm leading-6 text-[var(--color-text-secondary)]">
                Enter your administrator email address and we'll send you a password reset link.
              </p>

              {formError && (
                <div
                  role="alert"
                  className="mt-5 flex items-start gap-2 rounded-md bg-[var(--color-secondary-light)] px-3 py-2.5 text-sm text-[var(--color-danger)]"
                >
                  <AlertCircle size={16} className="mt-0.5 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <form className="mt-7 space-y-5" onSubmit={onSubmit} noValidate>
                <div>
                  <label
                    htmlFor="reset-email"
                    className="mb-2 block text-sm font-medium text-[var(--color-text-primary)]"
                  >
                    Email address
                  </label>
                  <input
                    id="reset-email"
                    type="email"
                    autoComplete="email"
                    placeholder="admin@mypageseo.com"
                    aria-invalid={!!errors.email}
                    className="h-11 w-full rounded-md border border-[var(--color-border)] bg-white px-3 text-sm outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary-light)]"
                    {...register("email")}
                  />
                  {errors.email && (
                    <p className="mt-1.5 text-xs text-[var(--color-danger)]">{errors.email.message}</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-md bg-[var(--color-primary)] px-4 text-sm font-semibold text-white hover:bg-[var(--color-primary-hover)] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isSubmitting && <Loader2 size={17} className="animate-spin" />}
                  {isSubmitting ? "Sending…" : "Send reset link"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
