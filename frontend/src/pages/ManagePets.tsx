import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PetLayout from '../components/PetLayout';
import PetCard from '../components/PetCard';
import { getManagedPets, removePet } from '../services/petManagementService';
import type { Pet } from '../types/pet';

export default function ManagePets() {
    const [pets, setPets] = useState<Pet[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [removing, setRemoving] = useState('');
    const [removeError, setRemoveError] = useState('');

    async function confirmRemoval(pet: Pet) {
        if (removing || !window.confirm(`Remove ${pet.pet_name} from available pets? Existing applications will be kept.`)) return;
        setRemoving(pet.id);
        setRemoveError('');
        try {
            await removePet(pet.id);
            setPets(current => current.map(item => item.id === pet.id ? { ...item, available: false } : item));
        } catch (error) {
            setRemoveError(error instanceof Error ? error.message : 'Unable to remove the pet listing.');
        } finally {
            setRemoving('');
        }
    }

    useEffect(() => {
        let active = true;
        getManagedPets()
            .then(data => { console.log("Managed pets:", data); if (active) setPets(data); })
            .catch(error => { if (active) setError(error.message); })
            .finally(() => { if (active) setLoading(false); });
        return () => { active = false; };
    }, []);

    return (
        <PetLayout>
            <h1 className="text-3xl font-bold">Manage Your Pet Listings</h1>
            {removeError && <p role="alert" className="mt-6 text-red-700">{removeError}</p>}
            {loading ? <p role="status" className="mt-6">Loading pets...</p> : error ? (
                <p role="alert" className="mt-6 text-red-700">{error}</p>
            ) : (
                <>
                    <Link to="/pets/new" className="my-6 inline-block rounded-full bg-stone-900 px-6 py-3 text-white">Add a pet</Link>
                    {pets.length === 0 && <p>Your shelter has no pet listings yet.</p>}
                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {pets.map(pet => (
                            <div key={pet.id} className="min-w-0">
                                <PetCard pet={pet} />
                                <div className="flex items-center gap-4">
                                    <Link to={`/pets/${pet.id}/applications`} className="relative inline-flex items-center rounded-lg bg-[#344336] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#2B382D]">
                                        View Applications ({pet.application_count})
                                        {pet.new_apps && <span className="pointer-events-none absolute right-0 top-0 h-4 w-4 translate-x-1/2 -translate-y-1/2 rounded-full bg-red-600"></span>}
                                    </Link>
                                    {pet.available && <button type="button" disabled={Boolean(removing)} onClick={() => confirmRemoval(pet)} className="text-left text-sm text-red-700 underline disabled:opacity-50">
                                        {removing === pet.id ? 'Removing...' : `Remove ${pet.pet_name}`}
                                    </button>}
                                    <Link to={`/pets/${pet.id}/edit`} className="text-sm underline">Edit {pet.pet_name}</Link>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </PetLayout>
    );
}
