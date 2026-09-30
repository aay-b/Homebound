import { BrowserRouter, Routes, Route } from "react-router-dom";

import UserApplicationDashboard from "./pages/UserApplicationDashboard";
import UserApplicationView from "./pages/UserApplicationView";
import ShelterApplicationDashboard from "./pages/ShelterApplicationDashboard";
import ShelterApplicationView from "./pages/ShelterApplicationView";


export function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/"
                    element={
                        <main className="grid min-h-screen place-items-center bg-stone-50 text-stone-900">
                            <h1 className="text-3xl font-bold">Homebound</h1>
                        </main>
                    }
                />

                <Route path="/applications" element={<UserApplicationDashboard/>}/>
                <Route path="/applications/:applicationId" element={<UserApplicationView/>}/>
                <Route path="/jacob/shelter/listings/:listingId/applications" element={<ShelterApplicationDashboard/>}/>
                <Route path="/jacob/shelter/listings/:listingId/applications/:applicationId" element={<ShelterApplicationView/>}/>

            </Routes>
        </BrowserRouter>
    );
}