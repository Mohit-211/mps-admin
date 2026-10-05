import {
	createSortedRowModel,
	rowSortingFeature,
	tableFeatures,
} from '@tanstack/react-table';

export const adminTableFeatures = tableFeatures({
	rowSortingFeature,
	sortedRowModel: createSortedRowModel(),
});

export type AdminTableFeatures = typeof adminTableFeatures;
