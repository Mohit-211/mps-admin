import type { ColumnDef } from '@tanstack/react-table';
import { KeyRound, LockKeyhole, MapPin, Pencil, RotateCcw, UserMinus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

import { adminsApi } from '../../api/admins';
import type { Admin } from '../../api/auth';
import { useAuth } from '../../auth/useAuth';
import { DataTable } from '../../components/table/DataTable';
import { TableToolbar } from '../../components/table/TableToolbar';
import { type AdminTableFeatures } from '../../components/table/tableConfig';
import { ActionMenu } from '../../components/ui/ActionMenu';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { ErrorState } from '../../components/ui/States';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Tabs } from '../../components/ui/Tabs';
import { useQuery } from '../../hooks/useQuery';
import { errorMessage } from '../../lib/api';
import { formatDate, formatRelative, initialsOf } from '../../lib/format';
import { AssignedLocationsDialog } from './AssignedLocationsDialog';
import { SetPasswordDialog } from './SetPasswordDialog';
import { StaffFormDialog } from './StaffFormDialog';

type View = 'active' | 'inactive';

function staffStatus(admin: Admin) {
	if (!admin.is_active) return 'inactive' as const;
	if (!admin.password_set) return 'invited' as const;
	return 'active' as const;
}

export function StaffPage() {
	const { admin: me } = useAuth();
	const [view, setView] = useState<View>('active');
	const [search, setSearch] = useState('');
	const [formOpen, setFormOpen] = useState(false);
	const [editing, setEditing] = useState<Admin | null>(null);
	const [passwordFor, setPasswordFor] = useState<Admin | null>(null);
	const [locationsFor, setLocationsFor] = useState<Admin | null>(null);
	const [confirm, setConfirm] = useState<{ kind: 'remove' | 'restore'; admin: Admin } | null>(null);

	const staff = useQuery(`staff:${view}`, (signal) => adminsApi.list(view === 'active', signal));
	const roles = useQuery('roles', (signal) => adminsApi.roles(signal));

	const filtered = useMemo(() => {
		const query = search.trim().toLowerCase();
		const list = staff.data ?? [];
		if (!query) return list;
		return list.filter((a) =>
			[a.name, a.email, a.role_name].join(' ').toLowerCase().includes(query),
		);
	}, [staff.data, search]);

	const replaceRow = (updated: Admin) => {
		if (!staff.data) return;
		const stillInView = updated.is_active === (view === 'active');
		staff.setData(
			stillInView
				? staff.data.map((a) => (a.id === updated.id ? updated : a))
				: staff.data.filter((a) => a.id !== updated.id),
		);
	};

	const resendLink = async (admin: Admin) => {
		try {
			const result = await adminsApi.resendPasswordLink(admin.id);
			const what = result.purpose === 'set_password' ? 'set-password' : 'password reset';
			if (result.password_link_sent) toast.success(`A ${what} link was emailed to ${admin.email}.`);
			else toast.error(`The ${what} email couldn't be sent. Try again later.`);
		} catch (error) {
			toast.error(errorMessage(error));
		}
	};

	const columns = useMemo<ColumnDef<AdminTableFeatures, Admin, unknown>[]>(
		() => [
			{
				accessorKey: 'name',
				header: 'Staff member',
				cell: ({ row }) => {
					const a = row.original;
					return (
						<div className="flex items-center gap-3">
							<div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary-light)] text-[11px] font-bold text-[var(--color-primary)]">
								{initialsOf(a.name || a.email)}
							</div>
							<div className="min-w-0">
								<div className="truncate font-semibold text-[var(--color-text-primary)]">
									{a.name || '—'}
									{a.id === me?.id && (
										<span className="ml-2 text-xs font-normal text-[var(--color-text-muted)]">
											(you)
										</span>
									)}
								</div>
								<div className="truncate text-xs text-[var(--color-text-muted)]">
									{a.email}
								</div>
							</div>
						</div>
					);
				},
			},
			{
				accessorKey: 'role_name',
				header: 'Role',
				cell: ({ row }) => (
					<span className="font-medium text-[var(--color-text-primary)]">
						{row.original.role_name ?? '—'}
					</span>
				),
			},
			{
				id: 'status',
				accessorFn: (a) => staffStatus(a),
				header: 'Status',
				cell: ({ row }) => <StatusBadge status={staffStatus(row.original)} />,
			},
			{
				id: 'citation_scope',
				header: 'Citation locations',
				cell: ({ row }) => {
					const a = row.original;
					if (!a.permissions.includes('citations.view')) return <span className="text-[var(--color-text-muted)]">—</span>;
					// super admin / admin always see every location; assignments limit the others (Phase 21)
					if (a.permissions.includes('platform.read')) return <span className="text-[var(--color-text-muted)]">All (role)</span>;
					return a.citation_scope === 'assigned' ? (
						<Link
							to={`/citations/locations?assigned_admin_id=${a.id}`}
							className="font-medium text-[var(--color-primary)] hover:underline"
						>
							{a.assigned_locations ?? 0} assigned
						</Link>
					) : (
						<span>All</span>
					);
				},
			},
			{
				accessorKey: 'last_login_at',
				header: 'Last sign-in',
				cell: ({ row }) => (
					<span title={row.original.last_login_at ?? undefined}>
						{formatRelative(row.original.last_login_at)}
					</span>
				),
			},
			{
				accessorKey: 'created_at',
				header: 'Added',
				cell: ({ row }) => formatDate(row.original.created_at),
			},
			{
				id: 'actions',
				header: '',
				enableSorting: false,
				cell: ({ row }) => {
					const a = row.original;
					const self = a.id === me?.id;
					return (
						<div className="flex justify-end">
							<ActionMenu
								label={`Actions for ${a.email}`}
								items={[
									{
										label: 'Edit',
										icon: Pencil,
										onSelect: () => {
											setEditing(a);
											setFormOpen(true);
										},
										hidden: !a.is_active,
									},
									{
										label: 'Citation locations',
										icon: MapPin,
										onSelect: () => setLocationsFor(a),
										hidden: !a.is_active || !a.permissions.includes('citations.view') || a.permissions.includes('platform.read'),
									},
									{
										label: 'Set password',
										icon: LockKeyhole,
										onSelect: () => setPasswordFor(a),
										// your own password: Settings → change password
										hidden: !a.is_active || self,
									},
									{
										label: a.password_set ? 'Send password reset link' : 'Resend set-password link',
										icon: KeyRound,
										onSelect: () => resendLink(a),
										hidden: !a.is_active,
									},
									{
										label: 'Remove access',
										icon: UserMinus,
										danger: true,
										disabled: self,
										title: self ? "You can't remove your own account." : undefined,
										onSelect: () => setConfirm({ kind: 'remove', admin: a }),
										hidden: !a.is_active,
									},
									{
										label: 'Restore access',
										icon: RotateCcw,
										onSelect: () => setConfirm({ kind: 'restore', admin: a }),
										hidden: a.is_active,
									},
								]}
							/>
						</div>
					);
				},
			},
		],
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[me?.id],
	);

	return (
		<div className="page-container">
			<div className="page-header">
				<div>
					<h1 className="page-header__title">Staff</h1>
					<p className="page-header__description">
						The MyPageSEO team: admins, editors and sales representatives who can
						sign in to this console.
					</p>
				</div>
			</div>

			<div className="surface overflow-hidden">
				<Tabs
					tabs={[
						{ value: 'active', label: 'Active' },
						{ value: 'inactive', label: 'Removed' },
					]}
					value={view}
					onChange={(v) => setView(v)}
				/>
				<TableToolbar
					searchPlaceholder="Search by name, email or role…"
					searchValue={search}
					onSearchChange={setSearch}
					actionLabel="Add staff member"
					onAction={() => {
						setEditing(null);
						setFormOpen(true);
					}}
				/>

				{staff.error ? (
					<ErrorState error={staff.error} onRetry={staff.reload} />
				) : (
					<DataTable
						bare
						data={filtered}
						columns={columns}
						loading={staff.loading}
						emptyMessage={
							search
								? 'No staff members match your search.'
								: view === 'active'
									? 'No active staff members.'
									: 'No removed staff members.'
						}
					/>
				)}
			</div>

			<StaffFormDialog
				open={formOpen}
				onClose={() => setFormOpen(false)}
				admin={editing}
				currentAdminId={me?.id}
				roles={roles.data ?? []}
				onSaved={(saved) => {
					if (editing) replaceRow(saved);
					else if (view === 'active') staff.reload();
				}}
			/>

			<AssignedLocationsDialog admin={locationsFor} onClose={() => setLocationsFor(null)} onSaved={staff.reload} />

			<SetPasswordDialog
				admin={passwordFor}
				onClose={() => setPasswordFor(null)}
				onSaved={replaceRow}
			/>

			<ConfirmDialog
				open={confirm?.kind === 'remove'}
				onClose={() => setConfirm(null)}
				title="Remove staff access?"
				description={
					<>
						<strong>{confirm?.admin.name || confirm?.admin.email}</strong> is signed out
						right away and can't sign in again. Their name stays on audit entries and
						ticket replies. You can restore access later from the Removed tab.
					</>
				}
				confirmLabel="Remove access"
				danger
				onConfirm={async () => {
					if (!confirm) return;
					const updated = await adminsApi.update(confirm.admin.id, { is_active: false });
					replaceRow(updated);
					toast.success(`${updated.name || updated.email} no longer has access.`);
				}}
			/>

			<ConfirmDialog
				open={confirm?.kind === 'restore'}
				onClose={() => setConfirm(null)}
				title="Restore staff access?"
				description={
					<>
						<strong>{confirm?.admin.name || confirm?.admin.email}</strong> will be able to
						sign in again with their existing password and role.
					</>
				}
				confirmLabel="Restore access"
				onConfirm={async () => {
					if (!confirm) return;
					const updated = await adminsApi.update(confirm.admin.id, { is_active: true });
					replaceRow(updated);
					toast.success(`${updated.name || updated.email} can sign in again.`);
				}}
			/>
		</div>
	);
}
