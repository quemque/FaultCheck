import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

const elem = document.getElementById('root')!
const app = (
   <StrictMode>
      <App />
   </StrictMode>
)

;(import.meta.hot.data.root ??= createRoot(elem)).render(app)
