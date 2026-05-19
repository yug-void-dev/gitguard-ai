import { createBrowserRouter } from 'react-router-dom';
import LoginPage from '../pages/LoginPage';
import LandingPage from '../pages/LandingPage';
import HistoryPage from '../pages/HistoryPage';
import RepositoriesPage from '../pages/RepositoriesPage';
import NotFoundPage from '../pages/NotFoundPage';

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
    element: <LandingPage />,
  },
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        path: '/dashboard',
        element: <DashboardPage />,
      },
      {
        path: '/history',
        element: <HistoryPage />,
      },
      {
        path: '/repositories',
        element: <RepositoriesPage />,
      },
    ],
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
]);

export default router;
