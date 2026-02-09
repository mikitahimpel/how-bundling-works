import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import Plausible from '@plausible-analytics/tracker'
import './index.css'
import App from './app'

Plausible({
  domain: 'mikitahimpel.github.io/how-bundling-works',
}).enableAutoPageviews()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
