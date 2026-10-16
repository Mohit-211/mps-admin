import { CheckCircle2, XCircle } from 'lucide-react';
import { useState } from 'react';

import { masterSettingsApi, type MasterSettings, type PaypalCheckResult } from '../../api/masterSettings';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Notice, Panel } from '../../components/ui/Panel';
import { errorMessage } from '../../lib/api';

// The PayPal card on the Billing tab: the current mode, which key sets are in the server's .env, and a dry run of the
// switch checks (real PayPal calls: one token and three reads — only on click).

const CHECK_LABELS: Record<PaypalCheckResult['checks'][number]['name'], string> = {
	subscriptions: 'No open subscriptions in the current mode',
	orders: 'No pending orders in the current mode',
	keys: 'Keys in the server .env',
	token: 'PayPal accepts the keys',
	product: 'Product exists',
	plan_USD: 'USD plan exists and is active',
	plan_CAD: 'CAD plan exists and is active',
};

export function PaypalChecks({ result }: { result: PaypalCheckResult }) {
	return (
		<ul className="space-y-1.5">
			{result.checks.map((c) => (
				<li key={c.name} className="flex items-start gap-2 text-sm">
					{c.ok ? (
						<CheckCircle2 size={16} className="mt-0.5 shrink-0 text-[#27855a]" />
					) : (
						<XCircle size={16} className="mt-0.5 shrink-0 text-[var(--color-danger)]" />
					)}
					<span className="text-[var(--color-text-primary)]">
						{CHECK_LABELS[c.name]}
						{c.detail && <span className="text-[var(--color-text-secondary)]"> — {c.detail}</span>}
					</span>
				</li>
			))}
		</ul>
	);
}

export function PaypalPanel({ paypal }: { paypal: MasterSettings['paypal'] }) {
	const [checking, setChecking] = useState<'sandbox' | 'live' | null>(null);
	const [result, setResult] = useState<PaypalCheckResult | null>(null);
	const [error, setError] = useState<string | null>(null);

	const check = async (mode: 'sandbox' | 'live') => {
		setChecking(mode);
		setError(null);
		try {
			setResult(await masterSettingsApi.paypalCheck(mode));
		} catch (err) {
			setError(errorMessage(err));
		} finally {
			setChecking(null);
		}
	};

	return (
		<Panel
			title="PayPal"
			description="Both key sets live in the server's .env. The mode below is a setting; switching is checked first and refused while the current mode has open subscriptions."
		>
			<div className="space-y-4 px-5 py-4">
				<div className="flex flex-wrap items-center gap-2 text-sm">
					<span className="text-[var(--color-text-secondary)]">Current mode:</span>
					<Badge tone={paypal.mode === 'live' ? 'green' : 'amber'}>{paypal.mode}</Badge>
					<span className="ml-2 text-[var(--color-text-secondary)]">Keys in .env:</span>
					<Badge tone={paypal.keys.sandbox ? 'green' : 'gray'}>sandbox {paypal.keys.sandbox ? '✓' : '✗'}</Badge>
					<Badge tone={paypal.keys.live ? 'green' : 'gray'}>live {paypal.keys.live ? '✓' : '✗'}</Badge>
				</div>
				<div className="flex flex-wrap gap-2">
					{(['sandbox', 'live'] as const).map((mode) => (
						<Button
							key={mode}
							variant="secondary"
							size="sm"
							loading={checking === mode}
							disabled={checking !== null}
							onClick={() => check(mode)}
						>
							Check {mode}
						</Button>
					))}
				</div>
				<p className="text-xs text-[var(--color-text-muted)]">
					A check calls PayPal (one token and three reads) and changes nothing.
				</p>
				{error && <Notice tone="red">{error}</Notice>}
				{result && (
					<div className="rounded-md border border-[var(--color-border-light)] p-3">
						<p className="mb-2 text-sm font-semibold text-[var(--color-text-primary)]">
							{result.ok ? `Ready to switch to ${result.mode}` : `Not ready to switch to ${result.mode}`}
						</p>
						<PaypalChecks result={result} />
					</div>
				)}
			</div>
		</Panel>
	);
}
