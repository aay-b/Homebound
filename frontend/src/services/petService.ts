import type { PetDetails } from '../pages/PetDetail';

const apiBaseUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';

export async function getPet(id: string, signal?: AbortSignal): Promise<PetDetails> {
    const response = await fetch(`${apiBaseUrl}/pets/${encodeURIComponent(id)}`, { signal });
    const data = await response.json() as { pet?: PetDetails; message?: string };

    if (!response.ok || !data.pet) {
        throw new Error(data.message ?? 'Unable to load pet details. Please try again.');
    }

    return data.pet;
}
