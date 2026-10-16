import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { masterSettingsApi, type PendingChange } from '../../api/masterSettings';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Field, FormError } from '../../components/ui/Field';
import { inputClass } from '../../components/ui/fieldStyles';
import { Modal } from '../../components/ui/Modal';
import { ApiError, errorMessage } from '../../lib/api';
import { WARNING_LABELS } from './labels';

// The second step of a save: the 6-digit code emailed to the owner's address. Closing the dialog keeps the change
// pending (the page offers it again); Cancel discards it.

const remaining = (expiresAt: string, now: number) => Math.max(0, Math.floor((new Date(expiresAt).getTime() - now) / 1000));

export function CodeDialog({
	change,
	sentTo,
	sentVia,
	onClose,
	onApplied,
	onDiscarded,
}: {
	change: PendingChange;
	sentTo: string | null;
	sentVia?: 'current_settings' | 'new_smtp_settings';
	onClose: () => void;
	onApplied: () => void;
	/** The change is gone (cancelled, expired or locked): the page reloads. */
	onDiscarded: () => void;
}) {
	const [code, setCode] = useState('');
	const [error, setError] = useState<string | null>(null);
	const [dead, setDead] = useState(false);
	const [busy, setBusy] = useState<'confirm' | 'resend' | 'cancel' | null>(null);
	const [expiresAt, setExpiresAt] = useState(change.expires_at);
	const [now, setNow] = useState(() => Date.now());

	useEffect(() => {
		const timer = setInterval(() => setNow(Date.now()), 1000);
		return () => clearInterval(timer);
	}, []);

	const left = remaining(expiresAt, now);
	const expired = left === 0;

	const confirm = async () => {
		setBusy('confirm');
		setError(null);
		try {
			await masterSettingsApi.confirm(change.change_id, code);
			toast.success('Master settings saved. Every server picks them up within 30 seconds.');
			onApplied();
		} catch (err) {
			if (err instanceof ApiError && err.reason === 'invalid_code') {
				setError(`Wrong code. ${String(err.data?.attempts_left ?? '')} tries left.`);
			} else if (err instanceof ApiError && ['expired', 'too_many_attempts', 'change_not_found'].includes(err.reason ?? '')) {
				setDead(true);
				setError(`${err.message} Close this and save again.`);
			} else {
				setError(errorMessage(err));
			}
		} finally {
			setBusy(null);
		}
	};

	const resend = async () => {
		setBusy('resend');
		setError(null);
		try {
			const result = await masterSettingsApi.resend(change.change_id);
			setExpiresAt(result.expires_at);
			setCode('');
			toast.success(`A new code was sent to ${result.code_sent_to}.`);
		} catch (err) {
			setError(errorMessage(err));
		} finally {
			setBusy(null);
		}
	};

	const cancel = async () => {
		setBusy('cancel');
		try {
			await masterSettingsApi.cancel(change.change_id);
			toast.success('The change was discarded.');
		} catch {
			// Already gone (expired or applied elsewhere): nothing to cancel.
		} finally {
			setBusy(null);
			onDiscarded();
		}
	};

	return (
		<Modal
			open
			onClose={onClose}
			size="lg"
			title="Confirm with the emailed code"
			description={
				<>
					A 6-digit code was sent to <strong>{sentTo ?? 'the owner'}</strong>
					{sentVia === 'new_smtp_settings' && ' through the new SMTP settings (if it arrives, they work)'}. Nothing
					changes until it is entered.
				</>
			}
			footer={
				<>
					<Button variant="ghost" onClick={cancel} loading={busy === 'cancel'} disabled={busy !== null && busy !== 'cancel'}>
						Discard change
					</Button>
					<Button variant="secondary" onClick={resend} loading={busy === 'resend'} disabled={dead || expired || busy !== null}>
						Send a new code
					</Button>
					<Button
						onClick={confirm}
						loading={busy === 'confirm'}
						disabled={dead || expired || !/^\d{6}$/.test(code) || busy !== null}
					>
						Confirm and save
					</Button>
				</>
			}
		>
			<div className="space-y-4">
				<div className="overflow-hidden rounded-md border border-[var(--color-border-light)]">
					<table className="w-full text-sm">
						<thead className="bg-[var(--color-surface-muted)] text-left text-xs text-[var(--color-text-muted)]">
							<tr>
								<th className="px-3 py-2 font-medium">Setting</th>
								<th className="px-3 py-2 font-medium">Now</th>
								<th className="px-3 py-2 font-medium">New</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-[var(--color-border-light)]">
							{change.changes.map((c) => (
								<tr key={c.key}>
									<td className="px-3 py-2">
										<div className="font-medium text-[var(--color-text-primary)]">{c.label}</div>
										<div className="font-mono text-[11px] text-[var(--color-text-muted)]">{c.key}</div>
										{c.warnings.length > 0 && (
											<div className="mt-1 flex flex-wrap gap-1">
												{c.warnings.map((w) => (
													<Badge key={w} tone="amber">
														{WARNING_LABELS[w]}
													</Badge>
												))}
											</div>
										)}
									</td>
									<td className="px-3 py-2 text-[var(--color-text-secondary)]">{String(c.old ?? '—')}</td>
									<td className="px-3 py-2 font-medium text-[var(--color-text-primary)]">
										{String(c.new ?? '—')}
										{c.reset && <span className="ml-1 text-xs text-[var(--color-text-muted)]">(.env default)</span>}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>

				<Field
					label="Code"
					htmlFor="master-settings-code"
					hint={expired ? 'The code has expired. Send a new one.' : `Expires in ${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`}
				>
					<input
						id="master-settings-code"
						inputMode="numeric"
						autoComplete="one-time-code"
						maxLength={6}
						autoFocus
						className={`${inputClass} font-mono text-lg tracking-[0.4em]`}
						value={code}
						onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
						onKeyDown={(e) => {
							if (e.key === 'Enter' && /^\d{6}$/.test(code) && !dead && !expired) void confirm();
						}}
						disabled={dead}
					/>
				</Field>
				<FormError message={error} />
			</div>
		</Modal>
	);
}
