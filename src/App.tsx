import { Route, Routes } from 'react-router-dom';

import { HomeRedirect } from './auth/HomeRedirect';
import { RedirectIfAuthenticated, RequireAuth } from './auth/RouteGuards';
import { AdminLayout } from './layouts/AdminLayout';

import { LoginPage } from './pages/auth/LoginPage';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/auth/ResetPasswordPage';

import { DashboardPage } from './pages/dashboard/DashboardPage';
import { UsersPage } from './pages/users/UsersPage';
import { UserDetailPage } from './pages/users/UserDetailPage';
import { StaffPage } from './pages/staff/StaffPage';

function App() {
	return (
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
	);
}

export default App;
