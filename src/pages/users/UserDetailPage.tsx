import { ArrowLeft, Ban, LogOut, MailCheck, Pencil, Trash2, UserCheck } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { ROLE_LABELS, userStatus, usersApi } from '../../api/users';
import { ActionMenu } from '../../components/ui/ActionMenu';
import { Button } from '../../components/ui/Button';
import { ErrorState } from '../../components/ui/States';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { useQuery } from '../../hooks/useQuery';
import { formatDate, formatDateTime, formatRelative, initialsOf } from '../../lib/format';
import { EditUserDialog } from './EditUserDialog';
import { useUserActions } from './useUserActions';

const USER_TYPE_LABELS: Record<string, string> = {
	BUSINESS: 'Business',
	AGENCY: 'Agency',
	EMPLOYEE: 'Team member',
	CLIENT: 'Client',
};

function Card({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
	return (
		<section className="surface overflow-hidden">
			<div className="flex items-center justify-between gap-3 border-b border-[var(--color-border-light)] px-5 py-3.5">
				<h2 className="text-sm font-semibold text-[var(--color-text-primary)]">{title}</h2>
				{action}
			</div>
			{children}
		</section>
	);
}

function Detail({ label, children }: { label: string; children: ReactNode }) {
	return (
		<div className="flex flex-col gap-0.5 py-2.5 sm:flex-row sm:gap-4">
			<dt className="w-40 shrink-0 text-xs font-medium text-[var(--color-text-muted)] sm:pt-0.5">{label}</dt>
			<dd className="min-w-0 break-words text-sm text-[var(--color-text-primary)]">{children}</dd>
		</div>
	);
}

export function UserDetailPage() {
	const { userId = '' } = useParams();
	const navigate = useNavigate();
	const user = useQuery(`user:${userId}`, (signal) => usersApi.get(userId, signal));
	const [editing, setEditing] = useState(false);
	const actions = useUserActions({
		onChanged: (detail) => user.setData(detail),
		onDeleted: () => navigate('/users', { replace: true }),
		onMembershipRemoved: () => user.reload(),
	});

	const back = (
		<button
			type="button"
			onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/users'))}
			className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-primary)]"
		>
			<ArrowLeft size={16} />
			Users
		</button>
	);

	if (user.error) {
		return (
			<div className="page-container">
				{back}
				<div className="surface">
					<ErrorState error={user.error} onRetry={user.reload} />
				</div>
			</div>
		);
	}

	const u = user.data;
	if (!u) {
		return (
			<div className="page-container">
				{back}
				<div className="surface space-y-3 p-6">
					<div className="h-6 w-56 animate-pulse rounded bg-[var(--color-surface-muted)]" />
					<div className="h-4 w-72 animate-pulse rounded bg-[var(--color-surface-muted)]" />
				</div>
			</div>
		);
	}

	const items = actions.itemsFor(u);
	const status = userStatus(u);

	return (
		<div className="page-container">
			{back}

			<div className="surface mb-5 flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
				<div className="flex min-w-0 items-center gap-4">
					<div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)] text-sm font-bold text-white">
						{initialsOf(u.name || u.email)}
					</div>
					<div className="min-w-0">
						<div className="flex flex-wrap items-center gap-2">
							<h1 className="truncate text-xl font-semibold text-[var(--color-text-primary)]">
								{u.name || u.email}
							</h1>
							<StatusBadge status={status} />
						</div>
						<p className="truncate text-sm text-[var(--color-text-secondary)]">{u.email}</p>
					</div>
				</div>

				{actions.canWrite && (
					<div className="flex flex-wrap items-center gap-2">
						<Button variant="secondary" size="sm" onClick={() => setEditing(true)}>
							<Pencil size={15} /> Edit
						</Button>
						{u.disabled ? (
							<Button variant="secondary" size="sm" onClick={() => items.find((i) => i.label === 'Enable sign-in')?.onSelect()}>
								<UserCheck size={15} /> Enable sign-in
							</Button>
						) : (
							<Button variant="secondary" size="sm" onClick={() => items.find((i) => i.label === 'Disable sign-in')?.onSelect()}>
								<Ban size={15} /> Disable sign-in
							</Button>
						)}
						{status === 'unverified' && (
							<Button variant="secondary" size="sm" onClick={() => items.find((i) => i.label === 'Mark email verified')?.onSelect()}>
								<MailCheck size={15} /> Mark verified
							</Button>
						)}
						<Button variant="secondary" size="sm" onClick={() => items.find((i) => i.label === 'Sign out everywhere')?.onSelect()}>
							<LogOut size={15} /> Sign out everywhere
						</Button>
						<Button variant="ghost" size="sm" className="text-[var(--color-danger)]" onClick={() => items.find((i) => i.label === 'Delete user')?.onSelect()}>
							<Trash2 size={15} /> Delete
						</Button>
						<ActionMenu label="More actions" items={items.filter((i) => i.label === 'Resend verification email')} />
					</div>
				)}
			</div>

			<div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
				<Card title="Account">
					<dl className="divide-y divide-[var(--color-border-light)] px-5 py-1">
						<Detail label="Name">{u.name || '—'}</Detail>
						<Detail label="Email">{u.email}</Detail>
						<Detail label="Mobile">{u.mobile || '—'}</Detail>
						<Detail label="Account type">{(u.user_type && USER_TYPE_LABELS[u.user_type]) || u.user_type || '—'}</Detail>
						<Detail label="Email verified">{u.email_verified_at ? formatDateTime(u.email_verified_at) : 'Not verified'}</Detail>
						<Detail label="Joined">{formatDate(u.created_at)}</Detail>
						<Detail label="Last sign-in">
							{u.last_login_at ? `${formatDateTime(u.last_login_at)} (${formatRelative(u.last_login_at)})` : 'Never'}
						</Detail>
						<Detail label="User ID">
							<code className="text-xs text-[var(--color-text-secondary)]">{u.id}</code>
						</Detail>
					</dl>
				</Card>

				<Card title={`Organizations (${u.memberships.length})`}>
					{u.memberships.length === 0 ? (
						<p className="px-5 py-6 text-sm text-[var(--color-text-muted)]">Not a member of any organization.</p>
					) : (
						<ul className="divide-y divide-[var(--color-border-light)]">
							{u.memberships.map((m) => (
								<li key={m.organization_id} className="flex items-center justify-between gap-3 px-5 py-3">
									<div className="min-w-0">
										<div className="truncate text-sm font-semibold text-[var(--color-text-primary)]">
											{m.organization ?? 'Deleted organization'}
										</div>
										<div className="text-xs text-[var(--color-text-secondary)]">
											<span className="capitalize">{m.type ?? '—'}</span> · {ROLE_LABELS[m.role] ?? m.role}
											{m.status !== 'active' && ` · ${m.status}`}
										</div>
									</div>
									<div className="flex shrink-0 items-center gap-3">
										<Link
											to={`/users?organization_id=${m.organization_id}&org_name=${encodeURIComponent(m.organization ?? '')}`}
											className="text-xs font-semibold text-[var(--color-primary)] hover:underline"
										>
											View team
										</Link>
										{actions.canWrite && m.role !== 'owner' && m.status === 'active' && (
											<button
												type="button"
												onClick={() =>
													actions.removeFrom(u, {
														id: m.organization_id,
														name: m.organization ?? 'this organization',
													})
												}
												className="text-xs font-semibold text-[var(--color-danger)] hover:underline"
											>
												Remove
											</button>
										)}
									</div>
								</li>
							))}
						</ul>
					)}
				</Card>

				<Card title="Recent sign-ins">
					{u.recent_logins.length === 0 ? (
						<p className="px-5 py-6 text-sm text-[var(--color-text-muted)]">No sign-ins recorded.</p>
					) : (
						<div className="table-scroll">
							<table className="w-full text-sm">
								<thead className="bg-[var(--color-surface-muted)] text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--color-text-muted)]">
									<tr>
										<th className="px-5 py-2.5">Signed in</th>
										<th className="px-5 py-2.5">Signed out</th>
										<th className="px-5 py-2.5">IP address</th>
									</tr>
								</thead>
								<tbody>
									{u.recent_logins.map((l, i) => (
										<tr key={i} className="border-t border-[var(--color-border-light)] text-[var(--color-text-secondary)]">
											<td className="whitespace-nowrap px-5 py-2.5">{formatDateTime(l.at)}</td>
											<td className="whitespace-nowrap px-5 py-2.5">{formatDateTime(l.logged_out_at)}</td>
											<td className="whitespace-nowrap px-5 py-2.5 font-mono text-xs">{l.ip ?? '—'}</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					)}
				</Card>

				<Card title="Google connections">
					{u.google_connections.length === 0 ? (
						<p className="px-5 py-6 text-sm text-[var(--color-text-muted)]">No Google Business Profile account connected.</p>
					) : (
						<ul className="divide-y divide-[var(--color-border-light)]">
							{u.google_connections.map((c) => (
								<li key={c.google_email} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
									<span className="truncate text-[var(--color-text-primary)]">{c.google_email}</span>
									<span className="shrink-0 text-xs capitalize text-[var(--color-text-secondary)]">
										{c.status.replace(/_/g, ' ')}
									</span>
								</li>
							))}
						</ul>
					)}
				</Card>
			</div>

			{actions.dialogs}

			<EditUserDialog
				user={editing ? u : null}
				onClose={() => setEditing(false)}
				onSaved={(updated) => user.setData(updated)}
			/>
		</div>
	);
}
