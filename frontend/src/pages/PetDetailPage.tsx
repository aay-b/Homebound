import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import PetDetail from './PetDetail';
import type { PetDetails } from './PetDetail';
import { getPet } from '../services/petService';

export default function PetDetailPage() {
    const { id } = useParams();
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

    return <PetDetail pet={pet} loading={loading} error={error} />;
}
