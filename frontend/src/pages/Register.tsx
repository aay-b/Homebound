import homeboundLogo from "../assets/images/Homebound-logo.jpeg";

export default function Register() {
    return (
        <main className="min-h-screen bg-stone-50 px-6 py-8 text-stone-900">
            <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl overflow-hidden rounded-3xl bg-white shadow-xl">
                <section className="hidden w-1/2 flex-col justify-between bg-stone-900 p-12 text-white md:flex">
                <div>
                    <img
                        src={homeboundLogo}
                        alt="Homebound Logo"
                        className="h-56 w-auto"/>
                    <div className="mt-24 max-w-md">
                        <p className="mt-6 text-lg leading-8 text-stone-300">
                            Create an account and start discovering pets waiting for their forever home.
                        </p>
                    </div>
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

                        <form className="mt-8 space-y-5">
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
                                    className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm outline-none transition placeholder:text-stone-400 focus:border-stone-500 focus:bg-white focus:ring-2 focus:ring-stone-200"/>
                            </div>
                            <button
                                type="submit"
                                className="mt-3 w-full rounded-xl bg-stone-900 px-4 py-3.5 text-sm font-semibold text-white transition hover:bg-stone-800 active:scale-[0.99] cursor-pointer">
                                Create Account
                            </button>
                        </form>
                    </div>
                </section>

            </div>
        </main>
    )
}