import { BrowserRouter, Routes, Route } from "react-router-dom";
import Register from "./pages/Register";
import Login from "./pages/Login";
import { AuthProvider } from "./contexts/AuthContext";
import Home from "./pages/Home";
import Profile from "./pages/Profile";
import ProtectedRoute from "./components/ProtectedRoute";

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

                <Route path="/applications" element={<UserApplicationDashboard/>}/>
                <Route path="/applications/:applicationId" element={<UserApplicationView/>}/>
                <Route path="/jacob/shelter/listings/:listingId/applications" element={<ShelterApplicationDashboard/>}/>
                <Route path="/jacob/shelter/listings/:listingId/applications/:applicationId" element={<ShelterApplicationView/>}/>

            </Routes>
        </BrowserRouter>
        </AuthProvider>
    );
}