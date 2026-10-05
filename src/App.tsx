import { lazy, Suspense, type ComponentType } from 'react';
import { Route, Routes } from 'react-router-dom';

import { HomeRedirect } from './auth/HomeRedirect';
import { RedirectIfAuthenticated, RequireAuth } from './auth/RouteGuards';
import { PageSpinner } from './components/ui/PageSpinner';
import { AdminLayout } from './layouts/AdminLayout';

// Each screen is its own chunk, loaded when first opened (keeps the first download small).
const page = <T extends Record<string, ComponentType>>(load: () => Promise<T>, name: keyof T) =>
	lazy(() => load().then((m) => ({ default: m[name] })));

const LoginPage = page(() => import('./pages/auth/LoginPage'), 'LoginPage');
const ForgotPasswordPage = page(() => import('./pages/auth/ForgotPasswordPage'), 'ForgotPasswordPage');
const ResetPasswordPage = page(() => import('./pages/auth/ResetPasswordPage'), 'ResetPasswordPage');
const DashboardPage = page(() => import('./pages/dashboard/DashboardPage'), 'DashboardPage');
const UsersPage = page(() => import('./pages/users/UsersPage'), 'UsersPage');
const UserDetailPage = page(() => import('./pages/users/UserDetailPage'), 'UserDetailPage');
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
					<Route path="/dashboard" element={<DashboardPage />} />
					<Route path="/users" element={<UsersPage />} />
					<Route path="/users/:userId" element={<UserDetailPage />} />
					<Route path="/staff" element={<StaffPage />} />

					<Route path="*" element={<HomeRedirect />} />
				</Route>
			</Route>
		</Routes>
		</Suspense>
	);
}

export default App;
