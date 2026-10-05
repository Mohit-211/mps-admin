import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, ArrowLeft, Loader2, LockKeyhole } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { z } from "zod";

import { authApi } from "../../api/auth";
import { useAuth } from "../../auth/useAuth";
import { ApiError, errorMessage } from "../../lib/api";

// Same rules as the backend's passwordRule: 8–128 chars, a letter and a digit.
const schema = z
  .object({
    password: z
      .string()
      .min(8, "Use at least 8 characters.")
      .max(128, "Use at most 128 characters.")
      .regex(/[A-Za-z]/, "Include at least one letter.")
      .regex(/\d/, "Include at least one digit."),
    confirm_password: z.string().min(1, "Confirm your new password."),
  })
  .refine((v) => v.password === v.confirm_password, {
    path: ["confirm_password"],
    message: "Passwords do not match.",
  });

type Values = z.infer<typeof schema>;

const LINK_PROBLEMS: Record<string, string> = {
  link_invalid: "This link is not valid. It may have been used already. Request a new one.",
  link_expired: "This link has expired. Request a new one.",
};

// One page for both forgot-password links and a new employee's set-password link.
export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const navigate = useNavigate();
  const { logout, status } = useAuth();
  const [linkProblem, setLinkProblem] = useState<string | null>(token ? null : LINK_PROBLEMS.link_invalid);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(schema) });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await authApi.resetPassword({ token, ...values });
      // A reset ends every earlier session of that admin.
      if (status !== "anonymous") logout();
      toast.success("Password set. Please sign in.");
      navigate("/login", { replace: true });
    } catch (error) {
      if (error instanceof ApiError && error.reason && LINK_PROBLEMS[error.reason]) {
        setLinkProblem(LINK_PROBLEMS[error.reason]);
      } else if (error instanceof ApiError && error.reason === "passwords_do_not_match") {
        setFormError("Passwords do not match.");
      } else {
        setFormError(errorMessage(error, "Could not set the password. Please try again."));
      }
    }
  });

  const inputClass =
    "h-11 w-full rounded-md border border-[var(--color-border)] bg-white px-3 text-sm outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary-light)]";

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
          <div className="mb-6 flex h-11 w-11 items-center justify-center rounded-lg bg-[var(--color-primary-light)] text-[var(--color-primary)]">
            <LockKeyhole size={20} />
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text-primary)]">
            Set a new password
          </h1>

          {linkProblem ? (
            <>
              <div
                role="alert"
                className="mt-5 flex items-start gap-2 rounded-md bg-[var(--color-secondary-light)] px-3 py-2.5 text-sm text-[var(--color-danger)]"
              >
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                <span>{linkProblem}</span>
              </div>
              <Link
                to="/forgot-password"
                className="mt-6 flex h-11 w-full items-center justify-center rounded-md bg-[var(--color-primary)] px-4 text-sm font-semibold text-white hover:bg-[var(--color-primary-hover)]"
              >
                Request a new link
              </Link>
            </>
          ) : (
            <>
              <p className="mt-2 text-sm leading-6 text-[var(--color-text-secondary)]">
                Choose a password for your MyPageSEO administrator account: at least 8 characters,
                with a letter and a digit.
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
                    htmlFor="new-password"
                    className="mb-2 block text-sm font-medium text-[var(--color-text-primary)]"
                  >
                    New password
                  </label>
                  <input
                    id="new-password"
                    type="password"
                    autoComplete="new-password"
                    placeholder="Enter new password"
                    aria-invalid={!!errors.password}
                    className={inputClass}
                    {...register("password")}
                  />
                  {errors.password && (
                    <p className="mt-1.5 text-xs text-[var(--color-danger)]">{errors.password.message}</p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="confirm-password"
                    className="mb-2 block text-sm font-medium text-[var(--color-text-primary)]"
                  >
                    Confirm password
                  </label>
                  <input
                    id="confirm-password"
                    type="password"
                    autoComplete="new-password"
                    placeholder="Confirm new password"
                    aria-invalid={!!errors.confirm_password}
                    className={inputClass}
                    {...register("confirm_password")}
                  />
                  {errors.confirm_password && (
                    <p className="mt-1.5 text-xs text-[var(--color-danger)]">
                      {errors.confirm_password.message}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-md bg-[var(--color-primary)] px-4 text-sm font-semibold text-white hover:bg-[var(--color-primary-hover)] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isSubmitting && <Loader2 size={17} className="animate-spin" />}
                  {isSubmitting ? "Saving…" : "Set password"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
