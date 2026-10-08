
import { createRoot } from 'react-dom/client'
import { BrowserRouter as Router } from 'react-router';
import App from './App.tsx'
import '@briggs-walker/briggsdesignsystem/dist/style.css';
import './index.css'
import { I18nextProvider } from 'react-i18next';
import i18n from './i18n/index';

createRoot(document.getElementById('root')!).render(
  <I18nextProvider i18n={i18n}>
    <Router>
      <App />
    </Router>
  </I18nextProvider>
)
