import { RouterProvider } from 'react-router-dom';
import router from './router';

import { AuthProvider } from './context/AuthContext';

/**
 * App is the single top-level component.
 * All routing logic lives in ./router/index.tsx.
 */
const App = () => (
  <AuthProvider>
    <RouterProvider router={router} />
  </AuthProvider>
);

export default App;
