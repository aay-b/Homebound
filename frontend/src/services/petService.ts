import type { PetDetails } from '../pages/PetDetail';
import { supabase } from '../config/supabase';

const apiBaseUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';

export async function getPet(id: string, signal?: AbortSignal): Promise<PetDetails> {
    const response = await fetch(`${apiBaseUrl}/pets/${encodeURIComponent(id)}`, { signal });
    const data = await response.json() as { pet?: PetDetails; message?: string };

    if (!response.ok || !data.pet) {
        throw new Error(data.message ?? 'Unable to load pet details. Please try again.');
    }

    return data.pet;
}

export async function startPetApplication(listingId: string): Promise<string> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Please log in before starting an application.');

    const response = await fetch(`${apiBaseUrl}/pets/${encodeURIComponent(listingId)}/applications`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
    });
    const data = await response.json() as { applicationId?: string; message?: string };

    if (!response.ok || !data.applicationId) {
        throw new Error(data.message ?? 'Unable to start the application. Please try again.');
    }

    return data.applicationId;
}
