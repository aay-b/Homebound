import { BrowserRouter, Route, Routes } from 'react-router-dom'
import ProtectedRoute from '@/components/ProtectedRoute'
import { AuthProvider } from '@/contexts/AuthContext'
import Home from '@/pages/Home'
import Login from '@/pages/Login'
import { MessagesPage } from '@/pages/MessagesPage'
import Profile from '@/pages/Profile'
import Register from '@/pages/Register'
import PetDetailPage from '@/pages/PetDetailPage'
import PetForm from '@/pages/PetForm'
import ManagePets from '@/pages/ManagePets'

import UserApplicationDashboard from "./pages/UserApplicationDashboard";
import UserApplicationView from "./pages/UserApplicationView";
import ShelterApplicationDashboard from "./pages/ShelterApplicationDashboard";
import ShelterApplicationView from "./pages/ShelterApplicationView";


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
                <Route path="/pets/:id" element={<PetDetailPage />} />
                <Route path="/pets/manage" element={<ProtectedRoute><ManagePets /></ProtectedRoute>} />
                <Route path="/pets/new" element={<ProtectedRoute><PetForm /></ProtectedRoute>} />
                <Route path="/pets/:id/apply" element={<PetDetailPage applying />} />

                <Route path="/applications" element={<UserApplicationDashboard/>}/>
                <Route path="/applications/:applicationId" element={<UserApplicationView/>}/>
                <Route path="/jacob/shelter/listings/:listingId/applications" element={<ShelterApplicationDashboard/>}/>
                <Route path="/jacob/shelter/listings/:listingId/applications/:applicationId" element={<ShelterApplicationView/>}/>

            </Routes>
        </BrowserRouter>
        </AuthProvider>
    );
}
