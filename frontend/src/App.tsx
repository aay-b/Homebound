import { BrowserRouter, Routes, Route } from "react-router-dom";

<<<<<<< HEAD
import ApplicationDashboard from "./pages/ApplicationDashboard";
import ApplicationView from "./pages/ApplicationView";

=======
>>>>>>> main
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

<<<<<<< HEAD
                <Route path="/applications/:userId" element={<ApplicationDashboard/>}/>
                <Route path="/applications/view/:userId" element={<ApplicationView/>}/>
=======
                {/* <Route path="/URL ADD-ON" element={<PAGE FUNCTION IMPORTED/>}/> */}
>>>>>>> main

            </Routes>
        </BrowserRouter>
    );
}