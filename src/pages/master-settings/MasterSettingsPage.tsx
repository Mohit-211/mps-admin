import { KeyRound, Save } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import {
	masterSettingsApi,
	type PaypalCheckResult,
	type PendingChange,
	type ProposeResult,
	type SettingSection,
	type SettingValue,
} from '../../api/masterSettings';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { PageHeader } from '../../components/ui/PageHeader';
import { Notice, Panel } from '../../components/ui/Panel';
import { PageSpinner } from '../../components/ui/PageSpinner';
import { ErrorState } from '../../components/ui/States';
import { Tabs } from '../../components/ui/Tabs';
import { useQuery } from '../../hooks/useQuery';
import { useUrlState } from '../../hooks/useUrlState';
import { ApiError, errorMessage } from '../../lib/api';
import { CodeDialog } from './CodeDialog';
import { PaypalChecks, PaypalPanel } from './PaypalPanel';
import { WARNING_LABELS } from './labels';
import { SettingRow } from './SettingRow';

// Master settings (Phase 24, super admin only): platform configuration changed at runtime. Keys and secrets stay in
// the server's .env (the SMTP password is the exception, write-only here). A save emails a 6-digit code to the owner;
// nothing changes until it is confirmed. Every server process picks a change up within 30 seconds.

const SECTION_LABELS: Record<SettingSection, string> = {
	general: 'General',
	ai: 'AI',
	email: 'Email (SMTP)',
	ranking: 'Ranking & data',
	audits: 'Audits',
	reports: 'Reports',
	security: 'Security',
	billing: 'Billing & PayPal',
};

type Draft = Record<string, SettingValue>;
type Dialog = { change: PendingChange; sentVia?: ProposeResult['sent_via'] };

export function MasterSettingsPage() {
	const query = useQuery('master-settings', (signal) => masterSettingsApi.get(signal));
	// The tab is in the URL (?tab=ranking), so a section can be linked to and survives a reload.
	const { get, update } = useUrlState();
	const tab = get('tab');
	const section: SettingSection = tab in SECTION_LABELS ? (tab as SettingSection) : 'general';
	const setSection = (s: SettingSection) => update({ tab: s === 'general' ? null : s }, false);
	const [draft, setDraft] = useState<Draft>({});
	const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
	const [formError, setFormError] = useState<string | null>(null);
	const [paypalError, setPaypalError] = useState<PaypalCheckResult | null>(null);
	const [warnOpen, setWarnOpen] = useState(false);
	const [saving, setSaving] = useState(false);
	const [dialog, setDialog] = useState<Dialog | null>(null);

	const settingsByKey = useMemo(
		() => new Map((query.data?.sections ?? []).flatMap((s) => s.settings.map((x) => [x.key, { ...x, section: s.section }]))),
		[query.data],
	);
	const changedKeys = Object.keys(draft);
	const warned = changedKeys
		.map((k) => settingsByKey.get(k))
		.filter((s): s is NonNullable<typeof s> => Boolean(s && s.warnings.length));
	const unsavedIn = (s: SettingSection) => changedKeys.filter((k) => settingsByKey.get(k)?.section === s).length;

	const setValue = (key: string, value: SettingValue | undefined) => {
		setDraft((d) => {
			const next = { ...d };
			if (value === undefined) delete next[key];
			else next[key] = value;
			return next;
		});
		setFieldErrors((e) => {
			if (!e[key]) return e;
			const next = { ...e };
			delete next[key];
			return next;
		});
	};

	const discard = () => {
		setDraft({});
		setFieldErrors({});
		setFormError(null);
		setPaypalError(null);
	};

	const save = async () => {
		setWarnOpen(false);
		setSaving(true);
		setFormError(null);
		setPaypalError(null);
		setFieldErrors({});
		try {
			const result = await masterSettingsApi.propose(draft);
			setDialog({ change: result, sentVia: result.sent_via });
		} catch (err) {
			if (err instanceof ApiError && err.reason === 'invalid_settings') {
				const errors = (err.data?.errors ?? []) as { key: string; message: string }[];
				setFieldErrors(Object.fromEntries(errors.map((e) => [e.key, e.message.replace(/^"[A-Z0-9_]+" /, '')])));
				const first = errors.map((e) => settingsByKey.get(e.key)?.section).find(Boolean);
				if (first) setSection(first);
				setFormError('Some settings are not valid: see the highlighted fields.');
			} else if (err instanceof ApiError && err.reason === 'smtp_check_failed') {
				setFormError(`The SMTP server refused these settings: ${String(err.data?.detail ?? err.message)}`);
			} else if (err instanceof ApiError && (err.reason === 'paypal_switch_blocked' || err.reason === 'paypal_check_failed')) {
				setFormError(err.message);
				setPaypalError((err.data?.paypal as PaypalCheckResult) ?? null);
			} else {
				setFormError(errorMessage(err));
			}
		} finally {
			setSaving(false);
		}
	};

	const requestSave = () => (warned.length ? setWarnOpen(true) : void save());

	if (query.loading && !query.data) return <PageSpinner />;
	if (query.error && !query.data)
		return (
			<div className="page-container">
				<div className="surface">
					<ErrorState error={query.error} onRetry={query.reload} />
				</div>
			</div>
		);
	if (!query.data) return null;

	const data = query.data;
	const current = data.sections.find((s) => s.section === section) ?? data.sections[0];

	return (
		<div className="page-container pb-28">
			<PageHeader
				title="Master settings"
				description="Platform configuration, changed without editing .env or restarting. Keys and secrets stay in the server's .env. Every save is confirmed with a code emailed to the owner."
			/>

			<div className="space-y-4">
				{!data.code_sent_to && (
					<Notice tone="red">
						MASTER_SETTINGS_OTP_EMAIL is not set on the server, so no confirmation code can be sent and nothing can be saved here.
					</Notice>
				)}
				{data.pending && !dialog && (
					<Notice tone="blue">
						<div className="flex flex-wrap items-center justify-between gap-2">
							<span>
								A change of {data.pending.changes.length} setting{data.pending.changes.length === 1 ? '' : 's'} is waiting
								for its code.
							</span>
							<Button size="sm" variant="secondary" onClick={() => setDialog({ change: data.pending as PendingChange })}>
								<KeyRound size={14} /> Enter code
							</Button>
						</div>
					</Notice>
				)}

				<section className="surface overflow-hidden">
					<Tabs
						tabs={data.sections.map((s) => {
							const n = unsavedIn(s.section);
							return { value: s.section, label: `${SECTION_LABELS[s.section]}${n ? ` (${n})` : ''}` };
						})}
						value={current.section}
						onChange={setSection}
					/>
					<div className="divide-y divide-[var(--color-border-light)]">
						{current.settings.map((s) => (
							<SettingRow
								key={s.key}
								setting={s}
								draft={Object.prototype.hasOwnProperty.call(draft, s.key) ? draft[s.key] : undefined}
								error={fieldErrors[s.key]}
								onChange={(v) => setValue(s.key, v)}
							/>
						))}
					</div>
				</section>

				{current.section === 'billing' && <PaypalPanel paypal={data.paypal} />}
			</div>

			{(changedKeys.length > 0 || formError) && (
				<div className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--color-border)] bg-white/95 px-4 py-3 shadow-lg backdrop-blur">
					<div className="mx-auto flex max-w-5xl flex-col gap-3">
						{formError && <Notice tone="red">{formError}</Notice>}
						{paypalError && (
							<Panel title={`PayPal ${paypalError.mode} checks`}>
								<div className="px-5 py-3">
									<PaypalChecks result={paypalError} />
								</div>
							</Panel>
						)}
						<div className="flex flex-wrap items-center justify-between gap-2">
							<span className="text-sm text-[var(--color-text-secondary)]">
								{changedKeys.length} unsaved change{changedKeys.length === 1 ? '' : 's'}
							</span>
							<div className="flex gap-2">
								<Button variant="secondary" onClick={discard} disabled={saving}>
									Discard
								</Button>
								<Button onClick={requestSave} loading={saving} disabled={!changedKeys.length || !data.code_sent_to}>
									<Save size={15} /> Save and email code
								</Button>
							</div>
						</div>
					</div>
				</div>
			)}

			<ConfirmDialog
				open={warnOpen}
				onClose={() => setWarnOpen(false)}
				title="These changes cost money or shift history"
				confirmLabel="Continue"
				onConfirm={save}
				description="Check them before the code is emailed."
			>
				<ul className="space-y-2 text-sm">
					{warned.map((s) => (
						<li key={s.key}>
							<span className="font-medium text-[var(--color-text-primary)]">{s.label}</span>
							<span className="text-[var(--color-text-secondary)]"> — {s.warnings.map((w) => WARNING_LABELS[w]).join('; ')}</span>
						</li>
					))}
				</ul>
				{warned.some((s) => s.warnings.includes('history')) && (
					<p className="mt-3 text-xs text-[var(--color-text-muted)]">
						A change that shifts ranking history should be noted in the backend's DECISIONS.md changelog.
					</p>
				)}
			</ConfirmDialog>

			{dialog && (
				<CodeDialog
					change={dialog.change}
					sentTo={data.code_sent_to}
					sentVia={dialog.sentVia}
					onClose={() => {
						setDialog(null);
						query.reload();
					}}
					onApplied={() => {
						setDialog(null);
						discard();
						query.reload();
					}}
					onDiscarded={() => {
						setDialog(null);
						query.reload();
						toast.message('No settings were changed.');
					}}
				/>
			)}
		</div>
	);
}
