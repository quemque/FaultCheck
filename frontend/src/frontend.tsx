import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { BrowserRouter } from 'react-router'

const elem = document.getElementById('root')!
const app = (
   <StrictMode>
      <BrowserRouter>
         <App />
      </BrowserRouter>
   </StrictMode>
)

;(import.meta.hot.data.root ??= createRoot(elem)).render(app)
