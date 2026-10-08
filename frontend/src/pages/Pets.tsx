import { useEffect, useRef, useState } from 'react';
import PetLayout from '../components/PetLayout';
import PetCard from '../components/PetCard';
import { getPets } from '../services/petBrowseService';
import type { PetSummary } from '../types/pet';

export default function Pets() {
    const [pets, setPets] = useState<PetSummary[]>([]);
    const [nextOffset, setNextOffset] = useState<number | null>(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const loadingMore = useRef(false);

    useEffect(() => {
        let active = true;
        getPets().then(data => {
            if (active) { setPets(data.pets); setNextOffset(data.nextOffset); }
        }).catch(error => { if (active) setError(error.message); })
            .finally(() => { if (active) setLoading(false); });
        return () => { active = false; };
    }, []);

    async function loadMore() {
        if (loadingMore.current || nextOffset === null) return;
        loadingMore.current = true;
        setLoading(true);
        setError('');
        try {
            const data = await getPets(nextOffset);
            setPets(current => [...current, ...data.pets.filter(pet => !current.some(item => item.id === pet.id))]);
            setNextOffset(data.nextOffset);
        } catch (error) {
            setError(error instanceof Error ? error.message : 'Unable to load pets. Please try again.');
        } finally {
            loadingMore.current = false;
            setLoading(false);
        }
    }

    return (
        <PetLayout>
            <h1 className="text-3xl font-bold">Find a Pet</h1>
            <p className="mt-3 mb-8 text-stone-600">Meet the pets looking for a home. Select a pet to learn more.</p>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {pets.map(pet => <PetCard key={pet.id} pet={pet} />)}
            </div>
            {loading && <p role="status" className="mt-6">Loading pets...</p>}
            {error && <p role="alert" className="mt-6 text-red-700">{error}</p>}
            {!loading && !error && pets.length === 0 && <p>No pets are available right now. Please check back soon.</p>}
            {!loading && nextOffset !== null && <button onClick={loadMore} className="mt-6 rounded-full bg-stone-900 px-6 py-3 text-white">
                {error ? 'Try again' : 'Load more pets'}
            </button>}
        </PetLayout>
    );
}
