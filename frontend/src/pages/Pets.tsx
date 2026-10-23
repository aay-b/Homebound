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
    const [searchInput, setSearchInput] = useState('');
    const [search, setSearch] = useState('');
    const [attempt, setAttempt] = useState(0);
    const loadingMore = useRef(false);
    const requestId = useRef(0);

    useEffect(() => {
        let active = true;
        const id = ++requestId.current;
        loadingMore.current = false;
        setPets([]);
        setNextOffset(0);
        setLoading(true);
        setError('');
        getPets(0, search).then(data => {
            if (active && id === requestId.current) { setPets(data.pets); setNextOffset(data.nextOffset); }
        }).catch(error => { if (active && id === requestId.current) setError(error.message); })
            .finally(() => { if (active && id === requestId.current) setLoading(false); });
        return () => {
            active = false;
            if (id === requestId.current) requestId.current += 1;
        };
    }, [search, attempt]);

    async function loadMore() {
        if (loading || loadingMore.current || nextOffset === null) return;
        const id = requestId.current;
        loadingMore.current = true;
        setLoading(true);
        setError('');
        try {
            const data = await getPets(nextOffset, search);
            if (id !== requestId.current) return;
            setPets(current => [...current, ...data.pets.filter(pet => !current.some(item => item.id === pet.id))]);
            setNextOffset(data.nextOffset);
        } catch (error) {
            if (id === requestId.current) setError(error instanceof Error ? error.message : 'Unable to load pets. Please try again.');
        } finally {
            if (id === requestId.current) {
                loadingMore.current = false;
                setLoading(false);
            }
        }
    }

    return (
        <PetLayout>
            <h1 className="text-3xl font-bold">Find a pet</h1>
            <p className="mt-3 mb-8 text-stone-600">Meet the pets looking for a home. Select a pet to learn more.</p>
            <form role="search" className="mb-8" onSubmit={event => {
                event.preventDefault();
                requestId.current += 1;
                setSearch(searchInput.trim());
                setAttempt(value => value + 1);
            }}>
                <label htmlFor="pet-search" className="mb-2 block font-medium">Search pets</label>
                <div className="flex flex-wrap gap-3">
                    <input id="pet-search" type="search" maxLength={200} value={searchInput}
                        onChange={event => setSearchInput(event.target.value)}
                        placeholder="Search by name or description"
                        className="min-w-0 flex-1 rounded-xl border border-stone-300 bg-white px-4 py-3" />
                    <button type="submit" className="rounded-full bg-stone-900 px-6 py-3 text-white">Search</button>
                </div>
            </form>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {pets.map(pet => <PetCard key={pet.id} pet={pet} />)}
            </div>
            {loading && <p role="status" className="mt-6">Loading pets...</p>}
            {error && <p role="alert" className="mt-6 text-red-700">{error}</p>}
            {!loading && !error && pets.length === 0 && <p>{search ? 'No pets found.' : 'No pets are available right now. Please check back soon.'}</p>}
            {!loading && nextOffset !== null && <button onClick={loadMore} className="mt-6 rounded-full bg-stone-900 px-6 py-3 text-white">
                {error ? 'Try again' : 'Load more pets'}
            </button>}
        </PetLayout>
    );
}
