import { BrowserRouter, Routes, Route } from "react-router-dom";

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

                {/* <Route path="/URL ADD-ON" element={<PAGE FUNCTION IMPORTED/>}/> */}

            </Routes>
        </BrowserRouter>
    );
}