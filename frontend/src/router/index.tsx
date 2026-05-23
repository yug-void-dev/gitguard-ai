import { createBrowserRouter } from 'react-router-dom';

// Pages
import LoginPage from '../pages/LoginPage';
import DashboardPage from '../pages/DashboardPage';
import HistoryPage from '../pages/HistoryPage';
import ReviewsPage from '../pages/ReviewsPage';
import SettingsPage from '../pages/SettingsPage';
import ReviewDetailPage from '../pages/ReviewDetailPage';
import RepositoriesPage from '../pages/RepositoriesPage';
import NotFoundPage from '../pages/NotFoundPage';

// Layouts
import DashboardLayout from '../layouts/DashboardLayout';

// Auth guard
import ProtectedRoute from '../components/auth/ProtectedRoute';

// Route constants
import { ROUTES, ROUTE_PATTERNS } from '../constants/routes';

/**
 * Application router.
 *
 * Structure:
 *   /               → LoginPage          (public)
 *   /dashboard      → DashboardLayout > DashboardPage   (protected)
 *   /repositories   → DashboardLayout > RepositoriesPage
 *   /reviews        → DashboardLayout > ReviewsPage
 *   /history        → DashboardLayout > HistoryPage
 *   /history/:id    → DashboardLayout > ReviewDetailPage
 *   /settings       → DashboardLayout > SettingsPage
 *   *               → NotFoundPage
 */
const router = createBrowserRouter([
  // ── Public routes ──────────────────────────────────────────────────────────
  {
    path: ROUTES.LOGIN,
    element: <LoginPage />,
  },

  // ── Protected routes (auth guard + dashboard shell) ───────────────────────
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <DashboardLayout />,
        children: [
          {
            path: ROUTES.DASHBOARD,
            element: <DashboardPage />,
          },
          {
            path: ROUTES.REPOSITORIES,
            element: <RepositoriesPage />,
          },
          {
            path: ROUTES.REVIEWS,
            element: <ReviewsPage />,
          },
          {
            path: ROUTES.HISTORY,
            element: <HistoryPage />,
          },
          {
            path: ROUTE_PATTERNS.REVIEW_DETAIL,
            element: <ReviewDetailPage />,
          },
          {
            path: ROUTES.SETTINGS,
            element: <SettingsPage />,
          },
        ],
      },
    ],
  },

  // ── 404 ───────────────────────────────────────────────────────────────────
  {
    path: ROUTES.NOT_FOUND,
    element: <NotFoundPage />,
  },
]);

export default router;
