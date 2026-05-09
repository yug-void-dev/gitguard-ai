import { RouterProvider } from 'react-router-dom';
import router from './router';

/**
 * App is the single top-level component.
 * All routing logic lives in ./router/index.tsx.
 */
const App = () => <RouterProvider router={router} />;

export default App;
