import { createBrowserRouter } from 'react-router-dom';
import LoginPage from '../pages/LoginPage';

import ProtectedRoute from '../components/auth/ProtectedRoute';
import DashboardPage from '../pages/DashboardPage';

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
  {
    element: <ProtectedRoute />,
    children: [
      {
        path: '/dashboard',
        element: <DashboardPage />,
      },
    ],
  },
]);

export default router;
