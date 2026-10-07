import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import PetDetail from './PetDetail';
import type { PetDetails } from './PetDetail';
import { getPet, startPetApplication } from '../services/petService';
import StartApplication from './StartApplication';
import { useAuth } from '../contexts/AuthContext';

export default function PetDetailPage({ applying = false }: { applying?: boolean }) {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user, loading: authLoading } = useAuth();
    const [pet, setPet] = useState<PetDetails | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const controller = new AbortController();
        setPet(null);
        setError('');
        setLoading(true);

        async function loadPet() {
            try {
                if (!id || !/^[1-9]\d{0,18}$/.test(id)) {
                    throw new Error('Invalid pet ID.');
                }

                const details = await getPet(id, controller.signal);
                if (!controller.signal.aborted) setPet(details);
            } catch (error) {
                if (!controller.signal.aborted) {
                    setError(error instanceof Error ? error.message : 'Unable to load pet details.');
                }
            } finally {
                if (!controller.signal.aborted) setLoading(false);
            }
        }

        void loadPet();
        return () => controller.abort();
    }, [id]);

    if (applying && !loading && !error && pet && id) {
        if (authLoading) return <p role="status" className="p-8">Loading...</p>;
        if (!user) {
            return (
                <main className="min-h-screen bg-stone-50 p-8 text-stone-900">
                    <Link to={`/pets/${id}`} className="underline">Back to pet details</Link>
                    <h1 className="mt-6 text-2xl font-bold">Log in to start an application</h1>
                    <Link to="/login" state={{ returnTo: `/pets/${id}/apply` }} className="mt-6 inline-block underline">
                        Log in
                    </Link>
                </main>
            );
        }
        return (
            <StartApplication
                key={id}
                listingId={id}
                petName={pet.pet_name}
                available={pet.available}
                startApplication={startPetApplication}
                onBack={() => navigate(`/pets/${id}`)}
            />
        );
    }

    return (
        <PetDetail
            pet={pet}
            loading={loading}
            error={error}
            onStartApplication={() => navigate(`/pets/${id}/apply`)}
        />
    );
}
