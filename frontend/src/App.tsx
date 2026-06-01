import { RouterProvider } from 'react-router-dom';
import router from './router';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';

/**
 * App is the single top-level component.
 * ThemeProvider wraps AuthProvider so every child (including login page) can call useTheme().
 * All routing logic lives in ./router/index.tsx.
 */
const App = () => (
  <ThemeProvider>
    <AuthProvider>
      <ToastProvider>
        <RouterProvider router={router} />
      </ToastProvider>
    </AuthProvider>
  </ThemeProvider>
);

export default App;
