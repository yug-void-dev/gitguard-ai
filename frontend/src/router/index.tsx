import { createBrowserRouter } from 'react-router-dom';
import LoginPage from '../pages/LoginPage';

/**
 * Application router.
 * Add new routes here as the app grows.
 *
 * Pattern:
 *   Public routes  → no layout wrapper
 *   Protected routes → wrap with <AuthLayout> or similar
 */
const router = createBrowserRouter([
  {
    path: '/',
    element: <LoginPage />,
  },
  // Future routes:
  // { path: '/dashboard', element: <ProtectedRoute><DashboardPage /></ProtectedRoute> },
]);

export default router;
