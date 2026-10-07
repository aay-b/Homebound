import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function PetLayout({ children }: { children: ReactNode }) {
    const { user } = useAuth();
    return (
        <div className="min-h-screen bg-stone-50 text-stone-900">
            <header className="border-b border-stone-200 bg-white">
                <nav className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-5" aria-label="Main navigation">
                    <Link to="/" className="text-xl font-bold tracking-widest">HOMEBOUND</Link>
                    <div className="flex flex-wrap gap-5 text-sm">
                        <Link to="/">Home</Link>
                        <Link to="/pets">Find a Pet</Link>
                        {user && <Link to="/pets/manage">Manage Listings</Link>}
                        {user && <Link to="/applications">My Applications</Link>}
                        <Link to={user ? "/profile" : "/login"}>{user ? "My Profile" : "Log in"}</Link>
                    </div>
                </nav>
            </header>
            <main className="mx-auto max-w-6xl px-6 py-10">{children}</main>
        </div>
    );
}
