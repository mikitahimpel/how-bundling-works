import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { init } from '@plausible-analytics/tracker'
import './index.css'
import App from './app'

init({
  domain: 'mikitahimpel.github.io/how-bundling-works',
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
