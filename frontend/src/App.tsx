import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { MessagesPage } from '@/pages/MessagesPage'

export function App() {
  return (
    <BrowserRouter>
      {/* Add application pages here as their routes are implemented. */}
      <Routes>
        <Route
          path="/"
          element={
            <main className="grid min-h-screen place-items-center bg-stone-50 text-stone-900">
              <h1 className="text-3xl font-bold">Homebound</h1>
            </main>
          }
        />
        <Route path="/messages" element={<MessagesPage />} />
        <Route path="/messages/:demoUserId" element={<MessagesPage />} />
      </Routes>
    </BrowserRouter>
  )
}
