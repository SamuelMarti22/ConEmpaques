import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './apps/App.tsx'
import AuthProvider from './authContext/AuthProvider.tsx'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
)
