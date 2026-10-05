import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { usersApi, type UserDetail } from "../../api/users";
import { Button } from "../../components/ui/Button";
import { Field, FormError } from "../../components/ui/Field";
import { inputClass } from "../../components/ui/fieldStyles";
import { Modal } from "../../components/ui/Modal";
import { ApiError, errorMessage } from "../../lib/api";

const schema = z.object({
  name: z.string().trim().min(1, "Enter a name.").max(100),
  email: z.string().trim().min(1, "Enter an email address.").email("Enter a valid email address.").max(200),
  mobile: z.string().trim().max(30, "Use at most 30 characters."),
});

type Values = z.infer<typeof schema>;

type EditUserDialogProps = {
  user: UserDetail | null;
  onClose: () => void;
  onSaved: (user: UserDetail) => void;
};

export function EditUserDialog(props: EditUserDialogProps) {
  return props.user ? <EditUserForm {...props} user={props.user} /> : null;
}

function EditUserForm({ user, onClose, onSaved }: EditUserDialogProps & { user: UserDetail }) {
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    control,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { name: user.name ?? "", email: user.email, mobile: user.mobile ?? "" },
  });
  const email = useWatch({ control, name: "email" }) ?? "";
  const emailChanged = email.trim().toLowerCase() !== user.email;

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    // send only what changed (the backend needs at least one field)
    const changes: { name?: string; email?: string; mobile?: string | null } = {};
    if (values.name !== (user.name ?? "")) changes.name = values.name;
    if (values.email.toLowerCase() !== user.email) changes.email = values.email;
    if (values.mobile !== (user.mobile ?? "")) changes.mobile = values.mobile || null;
    if (Object.keys(changes).length === 0) {
      onClose();
      return;
    }
    try {
      const updated = await usersApi.update(user.id, changes);
      toast.success(changes.email ? `Saved. ${updated.email} was signed out and signs in with the new email.` : "User updated.");
      onSaved(updated);
      onClose();
    } catch (error) {
      if (error instanceof ApiError && error.reason === "email_taken") {
        setError("email", { message: "Another account already uses this email." });
      } else if (error instanceof ApiError && error.status === 404 && !error.reason) {
        setFormError("The server doesn't support editing users yet.");
      } else {
        setFormError(errorMessage(error));
      }
    }
  });

  return (
    <Modal
      open
      onClose={isSubmitting ? () => undefined : onClose}
      title="Edit user"
      description={user.email}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" form="edit-user-form" loading={isSubmitting}>
            Save changes
          </Button>
        </>
      }
    >
      <form id="edit-user-form" className="space-y-4" onSubmit={onSubmit} noValidate>
        <FormError message={formError} />
        <Field label="Full name" htmlFor="edit-user-name" error={errors.name?.message}>
          <input id="edit-user-name" className={inputClass} aria-invalid={!!errors.name} {...register("name")} />
        </Field>
        <Field
          label="Email address"
          htmlFor="edit-user-email"
          error={errors.email?.message}
          hint={emailChanged ? undefined : "Changing it keeps the account verified."}
        >
          <input id="edit-user-email" type="email" className={inputClass} aria-invalid={!!errors.email} {...register("email")} />
        </Field>
        {emailChanged && (
          <p className="rounded-md bg-[#fbf3df] px-3 py-2.5 text-xs text-[#8a5a12]">
            The user is signed out of every session and must sign in with the new email. It stays verified, so make
            sure it's correct.
          </p>
        )}
        <Field label="Mobile" htmlFor="edit-user-mobile" error={errors.mobile?.message}>
          <input id="edit-user-mobile" type="tel" className={inputClass} aria-invalid={!!errors.mobile} {...register("mobile")} />
        </Field>
      </form>
    </Modal>
  );
}
