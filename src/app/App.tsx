import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './providers/AuthProvider'
import { QueryProvider } from './providers/QueryProvider'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Toaster } from '@/components/ui/sonner'
import { Router } from './Router'

function App() {
  return (
    <QueryProvider>
      <BrowserRouter>
        <AuthProvider>
          <TooltipProvider>
            <Router />
            <Toaster position="top-right" richColors />
          </TooltipProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryProvider>
  )
}

export default App
