import { RotateCcw, Undo2 } from 'lucide-react';

import type { Setting, SettingValue } from '../../api/masterSettings';
import { Badge } from '../../components/ui/Badge';
import { checkboxClass, inputClass } from '../../components/ui/fieldStyles';
import { WARNING_LABELS, formatValue, isSecretValue } from './labels';

// One master setting: its input (from the backend's constraints), the default, and reset / undo.
// `draft` is undefined when unchanged, null when it will go back to the .env default.

export function SettingRow({
	setting,
	draft,
	error,
	onChange,
}: {
	setting: Setting;
	draft: SettingValue | undefined;
	error?: string;
	/** undefined = drop the draft (undo), null = reset to the .env default. */
	onChange: (value: SettingValue | undefined) => void;
}) {
	const { key, constraints } = setting;
	const id = `setting-${key}`;
	const resetting = draft === null;
	const current = draft === undefined || draft === null ? (resetting ? setting.default : setting.value) : draft;

	let input;
	if (setting.secret) {
		input = (
			<input
				id={id}
				type="password"
				autoComplete="new-password"
				className={inputClass}
				placeholder={isSecretValue(setting.value) && setting.value.set ? 'Set (hidden) — type to change' : 'Not set'}
				value={typeof draft === 'string' ? draft : ''}
				onChange={(e) => onChange(e.target.value === '' ? undefined : e.target.value)}
				aria-invalid={Boolean(error)}
				disabled={resetting}
			/>
		);
	} else if (constraints.type === 'boolean') {
		input = (
			<label className="flex h-10 items-center gap-2 text-sm text-[var(--color-text-primary)]">
				<input
					id={id}
					type="checkbox"
					className={checkboxClass}
					checked={Boolean(current)}
					onChange={(e) => onChange(e.target.checked === setting.value ? undefined : e.target.checked)}
					disabled={resetting}
				/>
				{current ? 'On' : 'Off'}
			</label>
		);
	} else if (constraints.allowed?.length) {
		input = (
			<select
				id={id}
				className={inputClass}
				value={String(current ?? '')}
				onChange={(e) => {
					const option = constraints.allowed?.find((a) => String(a) === e.target.value) ?? e.target.value;
					onChange(option === setting.value ? undefined : option);
				}}
				aria-invalid={Boolean(error)}
				disabled={resetting}
			>
				{constraints.allowed.map((a) => (
					<option key={String(a)} value={String(a)}>
						{String(a)}
					</option>
				))}
			</select>
		);
	} else if (constraints.type === 'number') {
		input = (
			<input
				id={id}
				type="number"
				inputMode="decimal"
				className={inputClass}
				min={constraints.min ?? undefined}
				max={constraints.max ?? undefined}
				step={constraints.integer ? 1 : 'any'}
				value={current === null || current === undefined ? '' : String(current)}
				onChange={(e) => {
					const raw = e.target.value;
					const next = raw === '' ? '' : Number(raw);
					onChange(next === setting.value ? undefined : next);
				}}
				aria-invalid={Boolean(error)}
				disabled={resetting}
			/>
		);
	} else {
		input = (
			<input
				id={id}
				type="text"
				className={inputClass}
				value={current === null || current === undefined ? '' : String(current)}
				onChange={(e) => onChange(e.target.value === setting.value ? undefined : e.target.value)}
				aria-invalid={Boolean(error)}
				disabled={resetting}
			/>
		);
	}

	const { min, max } = constraints;
	const range =
		min !== null && max !== null ? ` · ${min}–${max}` : min !== null ? ` · ≥ ${min}` : max !== null ? ` · ≤ ${max}` : '';

	return (
		<div className="grid gap-2 px-5 py-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] md:gap-6">
			<div className="min-w-0">
				<label htmlFor={id} className="block text-sm font-medium text-[var(--color-text-primary)]">
					{setting.label}
				</label>
				<div className="mt-0.5 font-mono text-[11px] text-[var(--color-text-muted)]">{key}</div>
				<div className="mt-1.5 flex flex-wrap gap-1.5">
					{setting.overridden && !resetting && <Badge tone="blue">Changed from .env</Badge>}
					{draft !== undefined && <Badge tone="purple">{resetting ? 'Will reset' : 'Unsaved'}</Badge>}
					{setting.warnings.map((w) => (
						<Badge key={w} tone="amber">
							{WARNING_LABELS[w]}
						</Badge>
					))}
				</div>
			</div>
			<div className="min-w-0">
				{input}
				{error ? (
					<p className="mt-1.5 text-xs text-[var(--color-danger)]">{error}</p>
				) : (
					<p className="mt-1.5 text-xs text-[var(--color-text-muted)]">
						{resetting ? 'Goes back to the .env default: ' : 'Default (.env): '}
						{formatValue(setting.default)}
						{range}
					</p>
				)}
				<div className="mt-1 flex gap-3">
					{draft !== undefined && (
						<button
							type="button"
							onClick={() => onChange(undefined)}
							className="inline-flex items-center gap-1 text-xs font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-primary)]"
						>
							<Undo2 size={12} /> Undo
						</button>
					)}
					{setting.overridden && draft === undefined && (
						<button
							type="button"
							onClick={() => onChange(null)}
							className="inline-flex items-center gap-1 text-xs font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-primary)]"
						>
							<RotateCcw size={12} /> Reset to default
						</button>
					)}
				</div>
			</div>
		</div>
	);
}
