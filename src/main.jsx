import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './lib/auth.jsx'
import { SitesProvider } from './lib/sites.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <SitesProvider>
          <App />
        </SitesProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
