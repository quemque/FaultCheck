import { Navigate, Route, Routes } from 'react-router'
import { Header } from './components/Header'
import { MetricsPage } from './pages/MetricsPage'
import { AnalyticsPage } from './pages/AnalyticsPage'

export default function App() {
   return (
      <>
         <Header />
         <Routes>
            <Route path="/" element={<AnalyticsPage />} />
            <Route path="/metrics" element={<MetricsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
         </Routes>
      </>
   )
}
