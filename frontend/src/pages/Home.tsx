import { Link } from "react-router-dom";
import homeboundLogo from "../assets/images/Homebound-logo.jpeg";

export default function Home() {
    return (
        <main className="min-h-screen bg-stone-50 text-stone-900">
            <nav className="sticky top-0 z-50 border-b border-stone-200 bg-white/95 px-6 py-4 backdrop-blur md:px-10">
                <div className="mx-auto flex max-w-7xl items-center justify-between">
                    <Link
                        to="/"
                        className="text-xl font-bold tracking-[0.15em]"
                    >
                        HOMEBOUND
                    </Link>

                    <div className="hidden items-center gap-8 text-sm font-medium md:flex">
                        <Link
                            to="/"
                            className="transition hover:text-stone-500"
                        >
                            Home
                        </Link>

                        <Link
                            to="/pets"
                            className="transition hover:text-stone-500"
                        >
                            Find a Pet
                        </Link>

                        <Link
                            to="/messages"
                            className="transition hover:text-stone-500"
                        >
                            Messages
                        </Link>

                        <Link
                            to="/applications"
                            className="transition hover:text-stone-500"
                        >
                            Applications
                        </Link>

                        <Link
                            to="/favorites"
                            className="transition hover:text-stone-500"
                        >
                            My Favorite Pets
                        </Link>

                        <Link
                            to="/profile"
                            className="rounded-full border border-stone-300 px-5 py-2.5 transition hover:bg-stone-100"
                        >
                            My Profile
                        </Link>
                    </div>
                </div>
            </nav>

            <section className="overflow-hidden">
                <div className="mx-auto grid max-w-7xl items-center gap-12 px-6 py-16 md:grid-cols-2 md:px-10 md:py-24">
                    <div>
                        <p className="mb-5 text-sm font-semibold uppercase tracking-[0.25em] text-stone-500">
                            Find your new best friend
                        </p>

                        <h1 className="text-5xl font-bold leading-[1.05] tracking-tight md:text-7xl">
                            Every pet deserves
                            <span className="block text-stone-500">
                                to find their home.
                            </span>
                        </h1>

                        <p className="mt-7 max-w-xl text-lg leading-8 text-stone-600">
                            Homebound brings people and pets together.
                            Explore adoption opportunities and take the
                            first step toward giving a pet a forever home.
                        </p>

                        <div className="mt-9 flex flex-wrap gap-4">
                            <Link
                                to="/pets"
                                className="rounded-full bg-stone-900 px-7 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-stone-700"
                            >
                                Find a Pet →
                            </Link>

                            <Link
                                to="/profile"
                                className="rounded-full border border-stone-300 bg-white px-7 py-3.5 text-sm font-semibold transition hover:bg-stone-100"
                            >
                                Create Your Profile
                            </Link>
                        </div>

                        <div className="mt-10 flex items-center gap-8 border-t border-stone-200 pt-7">
                            <div>
                                <p className="text-2xl font-bold">100%</p>
                                <p className="text-sm text-stone-500">
                                    Pet focused
                                </p>
                            </div>

                            <div className="h-10 w-px bg-stone-200" />

                            <div>
                                <p className="text-2xl font-bold">1 goal</p>
                                <p className="text-sm text-stone-500">
                                    Every pet home
                                </p>
                            </div>

                            <div className="h-10 w-px bg-stone-200" />

                            <div>
                                <p className="text-2xl font-bold">∞</p>
                                <p className="text-sm text-stone-500">
                                    New beginnings
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="relative">
                        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-stone-200/70 blur-3xl" />
                        <div className="absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-stone-300/50 blur-3xl" />

                        <div className="relative overflow-hidden rounded-[2.5rem] bg-stone-200 shadow-2xl">
                            <div className="flex h-[500px] items-center justify-center bg-gradient-to-br from-stone-200 via-stone-100 to-stone-300">
                                <div className="text-center">
                                    <img
                                        src={homeboundLogo}
                                        alt="Homebound Logo"
                                        className="mx-auto mb-6 h-32 w-auto object-contain"
                                    />

                                    <p className="text-lg font-semibold text-stone-700">
                                        Your next chapter starts here.
                                    </p>

                                    <p className="mt-2 text-sm text-stone-500">
                                        Discover pets waiting for a home.
                                    </p>
                                </div>
                            </div>

                            <div className="absolute bottom-5 left-5 right-5 rounded-2xl bg-white/95 p-5 shadow-lg backdrop-blur">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-xs font-semibold uppercase tracking-wider text-stone-400">
                                            Homebound
                                        </p>

                                        <p className="mt-1 font-semibold">
                                            Because every pet is going home.
                                        </p>
                                    </div>

                                    
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="border-y border-stone-200 bg-white">
                <div className="mx-auto max-w-7xl px-6 py-20 md:px-10">
                    <div className="max-w-2xl">
                        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-stone-400">
                            Simple by design
                        </p>

                        <h2 className="mt-3 text-3xl font-bold md:text-4xl">
                            Finding a companion should feel easy.
                        </h2>

                        <p className="mt-4 leading-7 text-stone-500">
                            Homebound makes the adoption journey simple,
                            personal, and focused on what matters most —
                            finding the right home for every pet.
                        </p>
                    </div>

                    <div className="mt-12 grid gap-6 md:grid-cols-3">
                        <div className="rounded-3xl bg-stone-50 p-8">
                            <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-stone-900 text-xl text-white">
                                01
                            </div>

                            <h3 className="text-xl font-bold">
                                Explore
                            </h3>

                            <p className="mt-3 leading-7 text-stone-500">
                                Browse pets looking for loving homes and
                                discover the personalities that might be
                                the perfect match for you.
                            </p>
                        </div>

                        <div className="rounded-3xl bg-stone-50 p-8">
                            <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-stone-900 text-xl text-white">
                                02
                            </div>

                            <h3 className="text-xl font-bold">
                                Connect
                            </h3>

                            <p className="mt-3 leading-7 text-stone-500">
                                Learn more about pets and connect with the
                                people and organisations helping them find
                                their next home.
                            </p>
                        </div>

                        <div className="rounded-3xl bg-stone-50 p-8">
                            <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-stone-900 text-xl text-white">
                                03
                            </div>

                            <h3 className="text-xl font-bold">
                                Go Home
                            </h3>

                            <p className="mt-3 leading-7 text-stone-500">
                                Take the next step toward adoption and give
                                a pet the safe, loving, forever home they
                                deserve.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            <section className="mx-auto max-w-7xl px-6 py-20 md:px-10">
                <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
                    <div>
                        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-stone-400">
                            Find your match
                        </p>

                        <h2 className="mt-3 text-3xl font-bold md:text-4xl">
                            There is a home for every pet.
                        </h2>
                    </div>

                    <Link
                        to="/pets"
                        className="text-sm font-semibold underline underline-offset-4 hover:text-stone-500"
                    >
                        Browse all pets →
                    </Link>
                </div>

                <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="group rounded-3xl bg-stone-100 p-7 transition hover:-translate-y-1 hover:shadow-lg">
                        <div className="text-5xl">🐶</div>

                        <h3 className="mt-6 text-xl font-bold">
                            Dogs
                        </h3>

                        <p className="mt-2 text-sm leading-6 text-stone-500">
                            Loyal companions looking for their people.
                        </p>
                    </div>

                    <div className="group rounded-3xl bg-stone-100 p-7 transition hover:-translate-y-1 hover:shadow-lg">
                        <div className="text-5xl">🐱</div>

                        <h3 className="mt-6 text-xl font-bold">
                            Cats
                        </h3>

                        <p className="mt-2 text-sm leading-6 text-stone-500">
                            Curious personalities waiting to be discovered.
                        </p>
                    </div>

                    <div className="group rounded-3xl bg-stone-100 p-7 transition hover:-translate-y-1 hover:shadow-lg">
                        <div className="text-5xl">🐰</div>

                        <h3 className="mt-6 text-xl font-bold">
                            Small Pets
                        </h3>

                        <p className="mt-2 text-sm leading-6 text-stone-500">
                            Little companions with plenty of love to give.
                        </p>
                    </div>

                    <div className="group rounded-3xl bg-stone-100 p-7 transition hover:-translate-y-1 hover:shadow-lg">
                        <div className="text-5xl">🐾</div>

                        <h3 className="mt-6 text-xl font-bold">
                            More Pets
                        </h3>

                        <p className="mt-2 text-sm leading-6 text-stone-500">
                            Every kind of pet you could imagine.
                        </p>
                    </div>
                </div>
            </section>

            <section className="px-6 pb-16 md:px-10">
                <div className="mx-auto max-w-7xl overflow-hidden rounded-[2rem] bg-stone-900 px-8 py-16 text-white md:px-16">
                    <div className="flex flex-col items-start justify-between gap-10 md:flex-row md:items-center">
                        <div className="max-w-2xl">
                            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-stone-400">
                                Ready when you are
                            </p>

                            <h2 className="mt-4 text-3xl font-bold md:text-5xl">
                                Someone out there is waiting to meet you.
                            </h2>

                        </div>

                        <Link
                            to="/pets"
                            className="shrink-0 rounded-full bg-white px-7 py-3.5 text-sm font-semibold text-stone-900 transition hover:bg-stone-200"
                        >
                            Explore Pets →
                        </Link>
                    </div>
                </div>
            </section>

            <footer className="border-t border-stone-200 bg-white px-6 py-8 md:px-10">
                <div className="mx-auto flex max-w-7xl flex-col justify-between gap-4 text-sm text-stone-500 md:flex-row md:items-center">
                    <div className="flex items-center gap-3">
                        <img
                            src={homeboundLogo}
                            alt="Homebound"
                            className="h-10 w-auto object-contain"
                        />

                        <span>
                            Because every pet is going home.
                        </span>
                    </div>

                    <p>
                        © {new Date().getFullYear()} Homebound
                    </p>
                </div>
            </footer>
        </main>
    );
}