import { useState } from "react";
import { loginUser } from "../services/authService";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../config/supabase";
import { Link } from "react-router-dom";
import { useLocation, useNavigate } from "react-router-dom";

export default function Login() {
    const { setUser } = useAuth();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const navigate = useNavigate();
    const location = useLocation();

    const handleSubmit = async (
        event: React.FormEvent<HTMLFormElement>
    ) => {
        event.preventDefault();

        setError("");
        setSuccess("");

        const result = await loginUser(email, password);

        if (!result.response.ok) {
            const firstError =
                Object.values(result.data.errors ?? {}).flat()[0];

            setError(firstError ?? result.data.message);
            return;
        }

        await supabase.auth.setSession({
            access_token: result.data.session.access_token,
            refresh_token: result.data.session.refresh_token,
        });

        setUser(result.data.user);
        setSuccess("Login successful!");
        const returnTo = location.state?.returnTo;
        navigate(typeof returnTo === "string" && /^\/pets\/[1-9]\d{0,18}\/apply$/.test(returnTo)
            ? returnTo
            : "/profile");
    };

    return (
        <main className="grid min-h-screen place-items-center bg-stone-50 text-stone-900 px-6">
            <div className="w-full max-w-md">
                <div className="mb-8 text-center">
                    <h1 className="text-3xl font-bold">Welcome back</h1>
                    <p className="mt-2 text-stone-600">
                        Log in to your Homebound account
                    </p>
                </div>

                <form
                    onSubmit={handleSubmit}
                    className="space-y-5 rounded-2xl bg-white p-8 shadow-sm"
                >
                    {error && (
                        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
                            {error}
                        </p>
                    )}

                    {success && (
                        <p className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">
                            {success}
                        </p>
                    )}
                    
                    <div>
                        <label
                            htmlFor="email"
                            className="mb-2 block text-sm font-medium"
                        >
                            Email
                        </label>

                        <input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                            className="w-full rounded-lg border border-stone-300 px-4 py-3 outline-none focus:border-stone-500"
                            placeholder="you@example.com"
                        />
                    </div>

                    <div>
                        <label
                            htmlFor="password"
                            className="mb-2 block text-sm font-medium"
                        >
                            Password
                        </label>

                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(event) =>
                                setPassword(event.target.value)
                            }
                            className="w-full rounded-lg border border-stone-300 px-4 py-3 outline-none focus:border-stone-500"
                            placeholder="Enter your password"
                        />
                    </div>

                    <button
                        type="submit"
                        className="w-full rounded-lg bg-stone-900 px-4 py-3 font-medium text-white transition hover:bg-stone-700"
                    >
                        Log in
                    </button>
                    <div className="mt-6 text-center text-sm text-stone-600">
                        Don't have an account?{" "}
                        <Link
                            to="/register"
                            className="font-medium text-stone-900 underline hover:text-stone-600"
                        >
                            Sign up
                        </Link>
                    </div>
                </form>
            </div>
        </main>
    );
}
