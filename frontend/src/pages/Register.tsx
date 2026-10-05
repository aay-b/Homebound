import homeboundLogo from "../assets/images/Homebound-logo.jpeg";
import { useState } from "react";
import { registerUser } from "../services/authService";
import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";

export default function Register() {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const navigate = useNavigate();
    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError("");
        setSuccess("");
        const result = await registerUser(name, email, password);
        if (!result.response.ok) {
            const firstError =
                Object.values(result.data.errors ?? {}).flat()[0];

            setError(firstError ?? result.data.message);
            return;
        }
        setSuccess("Registration information is valid");
        navigate("/login");
};

    return (
        <main className="min-h-screen bg-stone-50 px-6 py-8 text-stone-900">
            <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl overflow-hidden rounded-3xl bg-white shadow-xl">
                <section className="hidden w-1/2 items-center justify-center bg-stone-900 p-12 text-white md:flex">
                <div className="flex max-w-md flex-col items-center text-center">
                    <img
                        src={homeboundLogo}
                        alt="Homebound Logo"
                        className="h-52 w-auto"/>
                    <p className="mt-12 text-lg leading-8 text-stone-300">
                        Create an account and start discovering pets waiting for their forever home.
                    </p>
                </div>
                </section>

                <section className="flex w-full flex-col justify-center p-8 md:w-1/2 md:p-12">
                    <div className="mx-auto w-full max-w-md">
                        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-stone-500">
                            Welcome to Homebound
                        </p>
                        <h2 className="text-3xl font-bold">
                            Create your account
                        </h2>
                        <p className="mt-3 text-stone-500">
                            Join Homebound and start your adoption journey.
                        </p>

                        {error && (
                            <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
                            {error}
                            </p>
                        )}

                        {success && (
                            <p className="mt-4 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-700">
                                {success}
                            </p>
                        )}

                        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
                            <div>
                                <label
                                    htmlFor="name"
                                    className="mb-2 block text-sm font-medium text-stone-700">
                                    Full name
                                </label>
                                <input
                                    id="name"
                                    type="text"
                                    placeholder="Enter your full name"
                                    value={name}
                                    onChange={(event) => setName(event.target.value)}
                                    className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm outline-none transition placeholder:text-stone-400 focus:border-stone-500 focus:bg-white focus:ring-2 focus:ring-stone-200"/>
                            </div>
                            <div>
                                <label
                                    htmlFor="email"
                                    className="mb-2 block text-sm font-medium text-stone-700">
                                    Email address
                                </label>
                                <input
                                    id="email"
                                    type="email"
                                    placeholder="you@example.com"
                                    value={email}
                                    onChange={(event) => setEmail(event.target.value)}
                                    className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm outline-none transition placeholder:text-stone-400 focus:border-stone-500 focus:bg-white focus:ring-2 focus:ring-stone-200"/>
                            </div>
                            <div>
                                <label
                                    htmlFor="password"
                                    className="mb-2 block text-sm font-medium text-stone-700">
                                    Password
                                </label>
                                <input
                                    id="password"
                                    type="password"
                                    placeholder="Enter a strong password"
                                    value={password}
                                    onChange={(event) => setPassword(event.target.value)}
                                    className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm outline-none transition placeholder:text-stone-400 focus:border-stone-500 focus:bg-white focus:ring-2 focus:ring-stone-200"/>
                            </div>
                            <button
                                type="submit"
                                className="mt-3 w-full rounded-xl bg-stone-900 px-4 py-3.5 text-sm font-semibold text-white transition hover:bg-stone-800 active:scale-[0.99] cursor-pointer">
                                Create Account
                            </button>
                            <div className="mt-6 text-center text-sm text-stone-600">
                                Already have an account?{" "}
                                <Link
                                    to="/login"
                                    className="font-medium text-stone-900 underline hover:text-stone-600"
                                >
                                    Sign in
                                </Link>
                            </div>
                        </form>
                    </div>
                </section>

            </div>
        </main>
    )
}
