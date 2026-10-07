import { Link } from "react-router-dom";
import type { PetSummary } from "../types/pet";

export default function PetCard({ pet }: { pet: PetSummary }) {
    return (
        <Link to={`/pets/${pet.id}`} className="overflow-hidden rounded-2xl border border-stone-200 bg-white transition hover:shadow-md focus-visible:outline-2 focus-visible:outline-stone-700">
            {pet.photos[0] ? (
                <img src={pet.photos[0]} alt={pet.pet_name} className="aspect-[4/3] w-full object-cover" loading="lazy" />
            ) : (
                <div className="flex aspect-[4/3] items-center justify-center bg-stone-200 text-stone-600">No photo yet</div>
            )}
            <div className="p-5">
                <h2 className="text-xl font-semibold">{pet.pet_name}</h2>
                <p className="mt-2 text-stone-600">{[pet.species, pet.breed, pet.age].filter(Boolean).join(" · ")}</p>
                <p className="mt-3 text-sm text-stone-500">{pet.shelter_name}</p>
                {!pet.available && <p className="mt-3 text-sm font-medium text-amber-800">No longer available</p>}
            </div>
        </Link>
    );
}
