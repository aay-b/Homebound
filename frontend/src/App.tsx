import { BrowserRouter, Route, Routes } from 'react-router-dom'
import ProtectedRoute from '@/components/ProtectedRoute'
import { AuthProvider } from '@/contexts/AuthContext'
import Home from '@/pages/Home'
import Login from '@/pages/Login'
import { MessagesPage } from '@/pages/MessagesPage'
import Profile from '@/pages/Profile'
import Register from '@/pages/Register'

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<Login />} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/messages" element={<ProtectedRoute><MessagesPage /></ProtectedRoute>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
