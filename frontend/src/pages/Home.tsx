import { Link } from "react-router-dom";

export default function Home() {
    return (
        <main className="min-h-screen bg-stone-50 text-stone-900">
            <nav className="flex items-center justify-between border-b border-stone-200 bg-white px-8 py-5">
                <h1 className="text-2xl font-bold">Homebound</h1>

                <div className="flex items-center gap-6 text-sm font-medium">
                    <Link to="/">Home</Link>
                    <Link to="/pets">Find a Pet</Link>
                    <Link to="/messages">Messages</Link>
                    <Link to="/profile">Profile</Link>
                </div>
            </nav>

            <section className="mx-auto max-w-6xl px-8 py-20">
                <div className="max-w-2xl">
                    <p className="mb-4 text-sm font-medium uppercase tracking-wider text-stone-500">
                        Welcome to Homebound
                    </p>

                    <h2 className="text-5xl font-bold leading-tight">
                        Because every pet is going home.
                    </h2>

                    <p className="mt-6 text-lg leading-8 text-stone-600">
                        Find a companion, explore adoption opportunities, and
                        help give pets the loving homes they deserve.
                    </p>

                    <div className="mt-8 flex gap-4">
                        <Link
                            to="/pets"
                            className="rounded-lg bg-stone-900 px-6 py-3 font-medium text-white hover:bg-stone-700"
                        >
                            Explore Pets
                        </Link>

                        <Link
                            to="/profile"
                            className="rounded-lg border border-stone-300 bg-white px-6 py-3 font-medium hover:bg-stone-100"
                        >
                            My Profile
                        </Link>
                    </div>
                </div>
            </section>
        </main>
    );
}