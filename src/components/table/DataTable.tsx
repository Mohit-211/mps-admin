import {
	flexRender,
	useTable,
	type ColumnDef,
	type RowData,
	type SortingState,
} from '@tanstack/react-table';
import { ChevronDown, ChevronUp, ChevronsUpDown } from 'lucide-react';
import { useState } from 'react';

import { adminTableFeatures, type AdminTableFeatures } from './tableConfig';

type DataTableProps<TData extends RowData> = {
	data: TData[];
	columns: ColumnDef<AdminTableFeatures, TData, unknown>[];
	emptyMessage?: string;
	loading?: boolean;
	/** Client-side sorting; turn off for server-paginated lists (it would only sort one page). */
	enableSorting?: boolean;
	onRowClick?: (row: TData) => void;
	/** Render without the outer card (when the table sits inside another surface). */
	bare?: boolean;
};

export function DataTable<TData extends RowData>({
	data,
	columns,
	emptyMessage = 'No records found.',
	loading = false,
	enableSorting = true,
	onRowClick,
	bare = false,
}: DataTableProps<TData>) {
	const [sorting, setSorting] = useState<SortingState>([]);

	const table = useTable({
		features: adminTableFeatures,
		data,
		columns,
		state: {
			sorting,
		},
		onSortingChange: setSorting,
		enableSorting,
	});

	const rows = table.getRowModel().rows;

	return (
		<div className={bare ? 'relative' : 'surface relative overflow-hidden'}>
			{loading && rows.length > 0 && (
				<div className="absolute inset-x-0 top-0 z-10 h-0.5 animate-pulse bg-[var(--color-primary)]" />
			)}
			<div className="table-scroll">
				<table className="w-full min-w-[820px] border-collapse">
					<thead className="bg-[var(--color-surface-muted)]">
						{table.getHeaderGroups().map((headerGroup) => (
							<tr key={headerGroup.id}>
								{headerGroup.headers.map((header) => {
									if (header.isPlaceholder) {
										return <th key={header.id} />;
									}

									const canSort = header.column.getCanSort();
									const sorted = header.column.getIsSorted();

									return (
										<th
											key={header.id}
											className="border-b border-[var(--color-border)] px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--color-text-muted)]"
										>
											<button
												type="button"
												disabled={!canSort}
												onClick={
													canSort
														? header.column.getToggleSortingHandler()
														: undefined
												}
												className={[
													'inline-flex items-center gap-1.5',
													canSort
														? 'cursor-pointer hover:text-[var(--color-text-primary)]'
														: 'cursor-default',
												].join(' ')}
											>
												{flexRender(
													header.column.columnDef
														.header,
													header.getContext(),
												)}

												{canSort &&
													(sorted === 'asc' ? (
														<ChevronUp size={14} />
													) : sorted === 'desc' ? (
														<ChevronDown
															size={14}
														/>
													) : (
														<ChevronsUpDown
															size={13}
														/>
													))}
											</button>
										</th>
									);
								})}
							</tr>
						))}
					</thead>

					<tbody>
						{rows.length === 0 && loading ? (
							Array.from({ length: 5 }, (_, i) => (
								<tr key={`skeleton-${i}`} className="border-b border-[var(--color-border-light)] last:border-b-0">
									{columns.map((_column, j) => (
										<td key={j} className="px-4 py-4">
											<div className="h-3.5 w-3/4 animate-pulse rounded bg-[var(--color-surface-muted)]" />
										</td>
									))}
								</tr>
							))
						) : rows.length === 0 ? (
							<tr>
								<td
									colSpan={columns.length}
									className="px-4 py-12 text-center text-sm text-[var(--color-text-muted)]"
								>
									{emptyMessage}
								</td>
							</tr>
						) : (
							rows.map((row) => (
								<tr
									key={row.id}
									onClick={onRowClick ? () => onRowClick(row.original) : undefined}
									className={[
										'border-b border-[var(--color-border-light)] last:border-b-0 hover:bg-[var(--color-background)]',
										onRowClick ? 'cursor-pointer' : '',
									].join(' ')}
								>
									{row.getAllCells().map((cell) => (
										<td
											key={cell.id}
											className="px-4 py-3.5 text-sm text-[var(--color-text-secondary)]"
										>
											{flexRender(
												cell.column.columnDef.cell,
												cell.getContext(),
											)}
										</td>
									))}
								</tr>
							))
						)}
					</tbody>
				</table>
			</div>

			<div className="flex items-center justify-between border-t border-[var(--color-border-light)] px-4 py-3">
				<p className="text-xs text-[var(--color-text-muted)]">
					Showing {rows.length} of {data.length} records
				</p>
			</div>
		</div>
	);
}
