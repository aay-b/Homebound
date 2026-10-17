import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../config/supabase";

type FavoritePet = {
    id: number;
    pet_name: string;
    species: string;
    breed: string;
    age: string;
    photos: string[];
    shelter_name: string;
    available: boolean;
};

type Favorite = {
    id: number;
    listing_id: number;
    Listings: FavoritePet | FavoritePet[] | null;
};

export default function Favorites() {
    const [favorites, setFavorites] = useState<Favorite[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        const loadFavorites = async () => {
            try {
                const { data } = await supabase.auth.getSession();
                const accessToken = data.session?.access_token;

                if (!accessToken) {
                    setError("Please log in to view your favorites.");
                    return;
                }

                const response = await fetch(
                    "http://localhost:3000/api/favorites",
                    {
                        headers: {
                            Authorization: `Bearer ${accessToken}`,
                        },
                    }
                );

                const result = await response.json();

                if (!response.ok) {
                    setError(result.message || "Unable to load favorites.");
                    return;
                }

                setFavorites(result.favorites ?? []);
            } catch {
                setError("Unable to load favorites.");
            } finally {
                setLoading(false);
            }
        };

        loadFavorites();
    }, []);

    if (loading) {
        return (
            <main className="min-h-screen bg-stone-50 px-6 py-10 text-stone-900">
                <div className="mx-auto max-w-6xl">
                    <p>Loading favorites...</p>
                </div>
            </main>
        );
    }

    if (error) {
        return (
            <main className="min-h-screen bg-stone-50 px-6 py-10 text-stone-900">
                <div className="mx-auto max-w-6xl">
                    <p className="text-red-700">{error}</p>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-stone-50 px-6 py-10 text-stone-900">
            <div className="mx-auto max-w-6xl">
                <Link to="/" className="text-sm underline">
                    Back to home
                </Link>

                <h1 className="mt-6 text-4xl font-bold">
                    My Favorites
                </h1>

                {favorites.length === 0 ? (
                    <p className="mt-8 text-stone-600">
                        You haven't added any pets to your favorites yet.
                    </p>
                ) : (
                    <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {favorites.map((favorite) => {
                            const pet = Array.isArray(favorite.Listings)
                                ? favorite.Listings[0]
                                : favorite.Listings;

                            if (!pet) return null;

                            return (
                                <Link
                                    key={favorite.id}
                                    to={`/pets/${pet.id}`}
                                    className="overflow-hidden rounded-2xl bg-white shadow-sm transition hover:shadow-md"
                                >
                                    {pet.photos?.[0] ? (
                                        <img
                                            src={pet.photos[0]}
                                            alt={pet.pet_name}
                                            className="h-64 w-full object-cover"
                                        />
                                    ) : (
                                        <div className="flex h-64 items-center justify-center bg-stone-200">
                                            No photo available
                                        </div>
                                    )}

                                    <div className="p-5">
                                        <h2 className="text-xl font-semibold">
                                            {pet.pet_name}
                                        </h2>

                                        <p className="mt-2 text-stone-600">
                                            {[pet.species, pet.breed, pet.age]
                                                .filter(Boolean)
                                                .join(" · ")}
                                        </p>

                                        <p className="mt-3 text-sm text-stone-500">
                                            {pet.shelter_name}
                                        </p>

                                        <p className="mt-4 text-sm font-medium">
                                            {pet.available
                                                ? "Available for adoption"
                                                : "No longer available"}
                                        </p>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                )}
            </div>
        </main>
    );
}