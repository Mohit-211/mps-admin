import { lazy, Suspense, type ComponentType } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';

import { HomeRedirect } from './auth/HomeRedirect';
import { RequirePermission } from './auth/RequirePermission';
import { RedirectIfAuthenticated, RequireAuth } from './auth/RouteGuards';
import { PageSpinner } from './components/ui/PageSpinner';
import { AdminLayout } from './layouts/AdminLayout';

// Each screen is its own chunk, loaded when first opened (keeps the first download small).
const page = <T extends Record<string, ComponentType>>(load: () => Promise<T>, name: keyof T) =>
	lazy(() => load().then((m) => ({ default: m[name] })));

const LoginPage = page(() => import('./pages/auth/LoginPage'), 'LoginPage');
const ForgotPasswordPage = page(() => import('./pages/auth/ForgotPasswordPage'), 'ForgotPasswordPage');
const ResetPasswordPage = page(() => import('./pages/auth/ResetPasswordPage'), 'ResetPasswordPage');
const AccountPage = page(() => import('./pages/account/AccountPage'), 'AccountPage');
const DashboardPage = page(() => import('./pages/dashboard/DashboardPage'), 'DashboardPage');
const UsersPage = page(() => import('./pages/users/UsersPage'), 'UsersPage');
const UserDetailPage = page(() => import('./pages/users/UserDetailPage'), 'UserDetailPage');
const OrganizationsPage = page(() => import('./pages/organizations/OrganizationsPage'), 'OrganizationsPage');
const OrganizationDetailPage = page(() => import('./pages/organizations/OrganizationDetailPage'), 'OrganizationDetailPage');
const ReportsPage = page(() => import('./pages/reports/ReportsPage'), 'ReportsPage');
const ReportDetailPage = page(() => import('./pages/reports/ReportDetailPage'), 'ReportDetailPage');
const BillingLayout = page(() => import('./pages/billing/BillingLayout'), 'BillingLayout');
const PlansPage = page(() => import('./pages/billing/PlansPage'), 'PlansPage');
const PlanDetailPage = page(() => import('./pages/billing/PlanDetailPage'), 'PlanDetailPage');
const SubscriptionsPage = page(() => import('./pages/billing/SubscriptionsPage'), 'SubscriptionsPage');
const SubscriptionDetailPage = page(() => import('./pages/billing/SubscriptionDetailPage'), 'SubscriptionDetailPage');
const InvoicesPage = page(() => import('./pages/billing/InvoicesPage'), 'InvoicesPage');
const TokenPacksPage = page(() => import('./pages/billing/TokenPacksPage'), 'TokenPacksPage');
const CouponsPage = page(() => import('./pages/billing/CouponsPage'), 'CouponsPage');
const AuditLogPage = page(() => import('./pages/billing/AuditLogPage'), 'AuditLogPage');
const SupportPage = page(() => import('./pages/support/SupportPage'), 'SupportPage');
const TicketPage = page(() => import('./pages/support/TicketPage'), 'TicketPage');
const CitationsLayout = page(() => import('./pages/citations/CitationsLayout'), 'CitationsLayout');
const LocationsIndexPage = page(() => import('./pages/citations/LocationsIndexPage'), 'LocationsIndexPage');
const LocationCitationsPage = page(() => import('./pages/citations/LocationCitationsPage'), 'LocationCitationsPage');
const WorkQueuePage = page(() => import('./pages/citations/WorkQueuePage'), 'WorkQueuePage');
const DirectoriesPage = page(() => import('./pages/citations/DirectoriesPage'), 'DirectoriesPage');
const CategoriesPage = page(() => import('./pages/citations/CategoriesPage'), 'CategoriesPage');
const SuggestionsPage = page(() => import('./pages/citations/SuggestionsPage'), 'SuggestionsPage');
const SalesAuditPage = page(() => import('./pages/sales-audit/SalesAuditPage'), 'SalesAuditPage');
const LeadsPage = page(() => import('./pages/leads/LeadsPage'), 'LeadsPage');
const LeadDetailPage = page(() => import('./pages/leads/LeadDetailPage'), 'LeadDetailPage');
const StaffPage = page(() => import('./pages/staff/StaffPage'), 'StaffPage');

function App() {
	return (
		<Suspense fallback={<PageSpinner fullScreen />}>
		<Routes>
			<Route element={<RedirectIfAuthenticated />}>
				<Route path="/login" element={<LoginPage />} />
				<Route path="/forgot-password" element={<ForgotPasswordPage />} />
			</Route>

			{/* Open to everyone: forgot-password links and new employees' set-password links. */}
			<Route path="/reset-password" element={<ResetPasswordPage />} />

			<Route element={<RequireAuth />}>
				<Route element={<AdminLayout />}>
					<Route index element={<HomeRedirect />} />
					<Route path="/account" element={<AccountPage />} />

					<Route element={<RequirePermission permission="platform.read" />}>
						<Route path="/dashboard" element={<DashboardPage />} />
						<Route path="/users" element={<UsersPage />} />
						<Route path="/users/:userId" element={<UserDetailPage />} />
						<Route path="/organizations" element={<OrganizationsPage />} />
						<Route path="/organizations/:organizationId" element={<OrganizationDetailPage />} />
						<Route path="/reports" element={<ReportsPage />} />
						<Route path="/reports/:reportId" element={<ReportDetailPage />} />
					</Route>

					<Route element={<RequirePermission permission="billing.read" />}>
						<Route path="/billing" element={<BillingLayout />}>
							<Route index element={<Navigate to="/billing/plans" replace />} />
							<Route path="plans" element={<PlansPage />} />
							<Route path="plans/:planId" element={<PlanDetailPage />} />
							<Route path="subscriptions" element={<SubscriptionsPage />} />
							<Route path="subscriptions/:subscriptionId" element={<SubscriptionDetailPage />} />
							<Route path="invoices" element={<InvoicesPage />} />
							<Route path="token-packs" element={<TokenPacksPage />} />
							<Route path="coupons" element={<CouponsPage />} />
							<Route path="audit" element={<AuditLogPage />} />
						</Route>
					</Route>

					<Route element={<RequirePermission permission="support.read" />}>
						<Route path="/support" element={<SupportPage />} />
						<Route path="/support/:ticketId" element={<TicketPage />} />
					</Route>

					<Route element={<RequirePermission permission="citations.view" />}>
						<Route path="/citations" element={<CitationsLayout />}>
							<Route index element={<Navigate to="/citations/locations" replace />} />
							<Route path="locations" element={<LocationsIndexPage />} />
							<Route path="locations/:locationId" element={<LocationCitationsPage />} />
							<Route path="queue" element={<WorkQueuePage />} />
							<Route path="directories" element={<DirectoriesPage />} />
							<Route path="categories" element={<CategoriesPage />} />
							<Route path="suggestions" element={<SuggestionsPage />} />
						</Route>
					</Route>

					<Route element={<RequirePermission permission="audits.run" />}>
						<Route path="/sales-audit" element={<SalesAuditPage />} />
					</Route>

					<Route element={<RequirePermission permission="leads.read" />}>
						<Route path="/leads" element={<LeadsPage />} />
						<Route path="/leads/:leadId" element={<LeadDetailPage />} />
					</Route>

					<Route element={<RequirePermission permission="admins.manage" />}>
						<Route path="/staff" element={<StaffPage />} />
					</Route>

					<Route path="*" element={<HomeRedirect />} />
				</Route>
			</Route>
		</Routes>
		</Suspense>
	);
}

export default App;
