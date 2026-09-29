import { BrowserRouter, Routes, Route } from "react-router-dom";

import ApplicationDashboard from "./pages/ApplicationDashboard";
import ApplicationView from "./pages/ApplicationView";

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

                <Route path="/applications/:userId" element={<ApplicationDashboard/>}/>
                <Route path="/applications/view/:userId" element={<ApplicationView/>}/>

            </Routes>
        </BrowserRouter>
    );
}