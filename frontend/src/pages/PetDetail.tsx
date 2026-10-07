import { Link } from "react-router-dom";

export type PetDetails = {
    pet_name: string;
    species: string;
    breed: string;
    age: string;
    description: string;
    health_info: string;
    allergies: string;
    photos: string[];
    shelter_name: string;
    available: boolean;
};

type PetDetailProps = {
    pet: PetDetails | null;
    loading?: boolean;
    error?: string;
    onStartApplication?: () => void;
};

export default function PetDetail({
    pet,
    loading = false,
    error = "",
    onStartApplication,
}: PetDetailProps) {
    const photos = pet?.photos.filter(Boolean) ?? [];

    return (
        <main className="min-h-screen bg-stone-50 px-6 py-10 text-stone-900">
            <div className="mx-auto max-w-6xl">
                <Link to="/" className="text-sm underline">Back to home</Link>

                {loading ? (
                    <p role="status" className="mt-8">Loading pet details...</p>
                ) : error ? (
                    <p role="alert" className="mt-8 text-red-700">{error}</p>
                ) : !pet ? (
                    <p className="mt-8">No pet selected.</p>
                ) : (
                    <div className="mt-8 grid gap-10 md:grid-cols-2">
                        <section aria-label="Pet photos">
                            {photos.length > 0 ? photos.map((photo, index) => (
                                <img
                                    key={`${photo}-${index}`}
                                    src={photo}
                                    alt={`${pet.pet_name}, photo ${index + 1}`}
                                    className="mb-4 max-h-[480px] w-full rounded-2xl bg-stone-200 object-contain"
                                />
                            )) : (
                                <div className="flex aspect-square items-center justify-center rounded-2xl bg-stone-200">
                                    No photos available
                                </div>
                            )}
                        </section>

                        <section aria-label="Pet information">
                            <p className="text-sm text-stone-600">{pet.shelter_name}</p>
                            <h1 className="mt-3 text-4xl font-bold">{pet.pet_name}</h1>
                            <p className="mt-3 text-lg text-stone-600">
                                {[pet.species, pet.breed, pet.age].filter(Boolean).join(" · ")}
                            </p>

                            <div className="my-8 space-y-6">
                                <div>
                                    <h2 className="text-lg font-semibold">About this pet</h2>
                                    <p className="mt-2 whitespace-pre-wrap text-stone-600">
                                        {pet.description || "No description provided."}
                                    </p>
                                </div>
                                <div>
                                    <h2 className="text-lg font-semibold">Health and care</h2>
                                    <p className="mt-2 whitespace-pre-wrap text-stone-600">
                                        {pet.health_info || "No health information provided."}
                                    </p>
                                </div>
                                <div>
                                    <h2 className="text-lg font-semibold">Allergies</h2>
                                    <p className="mt-2 whitespace-pre-wrap text-stone-600">
                                        {pet.allergies || "No allergy information provided."}
                                    </p>
                                </div>
                            </div>

                            {pet.available ? (
                                <>
                                    <button
                                        type="button"
                                        onClick={onStartApplication}
                                        disabled={!onStartApplication}
                                        className="rounded-full bg-stone-900 px-7 py-3 text-white disabled:opacity-50"
                                    >
                                        Start Application
                                    </button>
                                    {!onStartApplication && (
                                        <p className="mt-3 text-sm text-stone-600">
                                            Applications are not available from this page yet.
                                        </p>
                                    )}
                                </>
                            ) : (
                                <p className="rounded-xl bg-amber-50 p-4 text-amber-900">
                                    This pet is no longer available for adoption.
                                </p>
                            )}
                        </section>
                    </div>
                )}
            </div>
        </main>
    );
}
