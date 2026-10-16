import type { Setting, SettingValue } from '../../api/masterSettings';

// Shared by the master settings components (kept out of the component files for fast refresh).

export const WARNING_LABELS = { cost: 'Changes the Google bill', history: 'Shifts ranking history' } as const;

export const isSecretValue = (v: Setting['value']): v is { set: boolean } =>
	typeof v === 'object' && v !== null && 'set' in v;

export function formatValue(value: SettingValue | { set: boolean } | undefined): string {
	if (value === undefined || value === null || value === '') return '—';
	if (isSecretValue(value)) return value.set ? 'Set' : 'Not set';
	if (typeof value === 'boolean') return value ? 'Yes' : 'No';
	return String(value);
}
