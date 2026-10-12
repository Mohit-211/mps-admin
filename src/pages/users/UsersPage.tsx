import type { ColumnDef } from '@tanstack/react-table';
import { X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

import {
	ROLE_LABELS,
	userStatus,
	usersApi,
	type MemberRole,
	type OrgType,
	type UserListQuery,
	type UserRow,
} from '../../api/users';
import { DataTable } from '../../components/table/DataTable';
import { TableToolbar } from '../../components/table/TableToolbar';
import { type AdminTableFeatures } from '../../components/table/tableConfig';
import { ActionMenu } from '../../components/ui/ActionMenu';
import { compactInputClass } from '../../components/ui/fieldStyles';
import { Pagination } from '../../components/ui/Pagination';
import { ErrorState } from '../../components/ui/States';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Tabs } from '../../components/ui/Tabs';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { useQuery } from '../../hooks/useQuery';
import { formatDate, formatRelative } from '../../lib/format';
import { CreateUserDialog } from './CreateUserDialog';
import { useUserActions } from './useUserActions';

// docs/ADMIN_PANEL.md §5.1: one table, tabs map to the type / role filters.
type View = 'all' | 'business' | 'agency' | 'members' | 'client_users';

const VIEWS: { value: View; label: string; query: Pick<UserListQuery, 'type' | 'role'> }[] = [
	{ value: 'all', label: 'All users', query: {} },
	{ value: 'business', label: 'Business owners', query: { type: 'business', role: 'owner' } },
	{ value: 'agency', label: 'Agency owners', query: { type: 'agency', role: 'owner' } },
	{ value: 'members', label: 'Team members', query: { role: 'member' } },
	{ value: 'client_users', label: 'Client users', query: { role: 'client_user' } },
];

const LIMIT = 20;

export function UsersPage() {
	const navigate = useNavigate();
	const [params, setParams] = useSearchParams();
	const view = (VIEWS.find((v) => v.value === params.get('view'))?.value ?? 'all') as View;
	const status = (params.get('status') ?? '') as '' | NonNullable<UserListQuery['status']>;
	const memberType = (params.get('type') ?? '') as '' | OrgType;
	const organizationId = params.get('organization_id') ?? '';
	const organizationName = params.get('org_name') ?? '';
	const page = Math.max(1, Number(params.get('page')) || 1);

	const [search, setSearch] = useState(params.get('q') ?? '');
	const q = useDebouncedValue(search.trim(), 350);
	const [createOpen, setCreateOpen] = useState(false);

	const update = (changes: Record<string, string | null>, resetPage = true) => {
		setParams(
			(current) => {
				const next = new URLSearchParams(current);
				for (const [key, value] of Object.entries(changes)) {
					if (value) next.set(key, value);
					else next.delete(key);
				}
				if (resetPage) next.delete('page');
				return next;
			},
			{ replace: true },
		);
	};

	// keep ?q= in sync with the debounced search box
	useEffect(() => {
		if ((params.get('q') ?? '') !== q) update({ q: q || null });
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [q]);

	const query: UserListQuery = {
		...VIEWS.find((v) => v.value === view)!.query,
		...(view === 'members' && memberType ? { type: memberType } : {}),
		q: q || undefined,
		status: status || undefined,
		organization_id: organizationId || undefined,
		page,
		limit: LIMIT,
	};
	const users = useQuery(`users:${JSON.stringify(query)}`, (signal) => usersApi.list(query, signal));

	const actions = useUserActions({
		onChanged: (detail) => {
			if (!users.data) return;
			users.setData({
				...users.data,
				users: users.data.users.map((u) => (u.id === detail.id ? { ...u, ...detail } : u)),
			});
		},
		onDeleted: () => users.reload(),
		onMembershipRemoved: () => users.reload(),
	});

	const columns = useMemo<ColumnDef<AdminTableFeatures, UserRow, unknown>[]>(
		() => [
			{
				id: 'user',
				header: 'User',
				cell: ({ row }) => (
					<div className="min-w-0">
						<div className="truncate font-semibold text-[var(--color-text-primary)]">
							{row.original.name || '—'}
						</div>
						<div className="truncate text-xs text-[var(--color-text-muted)]">
							{row.original.email}
						</div>
					</div>
				),
			},
			{
				id: 'organization',
				header: 'Organization',
				cell: ({ row }) => {
					const org = row.original.organization;
					if (!org) return <span className="text-[var(--color-text-muted)]">No organization</span>;
					const more = row.original.organizations - 1;
					return (
						<div className="min-w-0">
							<Link
								to={`/organizations/${org.id}`}
								onClick={(e) => e.stopPropagation()}
								className="block truncate font-medium text-[var(--color-text-primary)] hover:text-[var(--color-primary)]"
							>
								{org.name}
							</Link>
							<div className="text-xs text-[var(--color-text-muted)]">
								<span className="capitalize">{org.type}</span> ·{' '}
								{ROLE_LABELS[org.role as MemberRole] ?? org.role}
								{more > 0 && ` · +${more} more`}
							</div>
						</div>
					);
				},
			},
			{
				id: 'status',
				header: 'Status',
				cell: ({ row }) => <StatusBadge status={userStatus(row.original)} />,
			},
			{
				id: 'last_login',
				header: 'Last sign-in',
				cell: ({ row }) => (
					<span title={row.original.last_login_at ?? undefined}>
						{formatRelative(row.original.last_login_at)}
					</span>
				),
			},
			{
				id: 'joined',
				header: 'Joined',
				cell: ({ row }) => formatDate(row.original.created_at),
			},
			{
				id: 'actions',
				header: '',
				cell: ({ row }) => (
					<div className="flex justify-end">
						<ActionMenu
							label={`Actions for ${row.original.email}`}
							items={actions.itemsFor(
								row.original,
								// with organization_id set, the row's organization is that membership
								organizationId &&
									row.original.organization?.id === organizationId &&
									row.original.organization.role !== 'owner'
									? { id: organizationId, name: row.original.organization.name }
									: null,
							)}
						/>
					</div>
				),
			},
		],
		[actions, organizationId],
	);

	const selectClass = `${compactInputClass} w-auto pr-8 text-xs sm:text-sm`;

	return (
		<div className="page-container">
			<div className="page-header">
				<div>
					<h1 className="page-header__title">Users</h1>
					<p className="page-header__description">
						Customer logins: Business and Agency account holders and their teams.
					</p>
				</div>
			</div>

			<div className="surface overflow-hidden">
				<Tabs
					tabs={VIEWS.map(({ value, label }) => ({ value, label }))}
					value={view}
					onChange={(v) => update({ view: v === 'all' ? null : v, type: null })}
				/>
				<TableToolbar
					searchPlaceholder="Search by name or email…"
					searchValue={search}
					onSearchChange={setSearch}
					actionLabel={actions.canWrite ? 'Add user' : undefined}
					onAction={() => setCreateOpen(true)}
					filters={
						<div className="flex flex-wrap items-center gap-2">
							<select
								aria-label="Status"
								className={selectClass}
								value={status}
								onChange={(e) => update({ status: e.target.value || null })}
							>
								<option value="">Any status</option>
								<option value="active">Active</option>
								<option value="unverified">Unverified</option>
								<option value="disabled">Disabled</option>
							</select>
							{view === 'members' && (
								<select
									aria-label="Organization type"
									className={selectClass}
									value={memberType}
									onChange={(e) => update({ type: e.target.value || null })}
								>
									<option value="">Businesses and agencies</option>
									<option value="business">Businesses</option>
									<option value="agency">Agencies</option>
								</select>
							)}
							{organizationId && (
								<span className="inline-flex h-9 items-center gap-1.5 rounded-md bg-[var(--color-primary-light)] pl-3 pr-1.5 text-xs font-medium text-[var(--color-primary)]">
									{organizationName || 'One organization'}
									<button
										type="button"
										onClick={() => update({ organization_id: null, org_name: null })}
										className="flex h-6 w-6 items-center justify-center rounded hover:bg-white"
										aria-label="Clear organization filter"
									>
										<X size={13} />
									</button>
								</span>
							)}
						</div>
					}
				/>

				{users.error ? (
					<ErrorState error={users.error} onRetry={users.reload} />
				) : (
					<>
						<DataTable
							bare
							data={users.data?.users ?? []}
							columns={columns}
							loading={users.loading}
							enableSorting={false}
							onRowClick={(u) => navigate(`/users/${u.id}`)}
							emptyMessage={
								q || status || organizationId
									? 'No users match these filters.'
									: 'No users yet.'
							}
						/>
						{users.data && users.data.total > 0 && (
							<div className="border-t border-[var(--color-border-light)] px-3">
								<Pagination
									page={page}
									limit={LIMIT}
									total={users.data.total}
									onPageChange={(p) => update({ page: p > 1 ? String(p) : null }, false)}
								/>
							</div>
						)}
					</>
				)}
			</div>

			{actions.dialogs}

			<CreateUserDialog
				open={createOpen}
				onClose={() => setCreateOpen(false)}
				organization={
					organizationId ? { id: organizationId, name: organizationName || 'Selected organization' } : null
				}
				onCreated={(user) => {
					users.reload();
					navigate(`/users/${user.id}`);
				}}
			/>
		</div>
	);
}
