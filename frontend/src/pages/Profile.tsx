import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function Profile() {
    const { user } = useAuth();

    return (
        <main className="min-h-screen bg-stone-50 text-stone-900">
            <nav className="flex items-center justify-between border-b border-stone-200 bg-white px-8 py-5">
                <Link to="/" className="text-2xl font-bold">
                    Homebound
                </Link>

                <Link
                    to="/"
                    className="text-sm font-medium text-stone-600 hover:text-stone-900"
                >
                    Back to Home
                </Link>
            </nav>

            <section className="mx-auto max-w-3xl px-6 py-12">
                <div className="mb-8">
                    <p className="text-sm font-medium uppercase tracking-wider text-stone-500">
                        My Account
                    </p>

                    <h1 className="mt-2 text-4xl font-bold">
                        Profile
                    </h1>

                    <p className="mt-3 text-stone-600">
                        Manage your personal information.
                    </p>
                </div>

                <div className="rounded-2xl bg-white p-8 shadow-sm">
                    <div className="space-y-6">
                        <div>
                            <label className="mb-2 block text-sm font-medium">
                                Name
                            </label>

                            <input
                                type="text"
                                className="w-full rounded-lg border border-stone-300 px-4 py-3 outline-none focus:border-stone-500"
                                placeholder="Enter your name"
                            />
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-medium">
                                Email
                            </label>

                            <input
                                type="email"
                                value={user?.email ?? ""}
                                readOnly
                                className="w-full rounded-lg border border-stone-200 bg-stone-100 px-4 py-3 text-stone-600"
                            />
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-medium">
                                Phone number
                            </label>

                            <input
                                type="tel"
                                className="w-full rounded-lg border border-stone-300 px-4 py-3 outline-none focus:border-stone-500"
                                placeholder="Enter your phone number"
                            />
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-medium">
                                Address
                            </label>

                            <textarea
                                rows={3}
                                className="w-full rounded-lg border border-stone-300 px-4 py-3 outline-none focus:border-stone-500"
                                placeholder="Enter your address"
                            />
                        </div>

                        <button
                            type="button"
                            className="w-full rounded-lg bg-stone-900 px-4 py-3 font-medium text-white hover:bg-stone-700"
                        >
                            Save Changes
                        </button>
                    </div>
                </div>
            </section>
        </main>
    );
}