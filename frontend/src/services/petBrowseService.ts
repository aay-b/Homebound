import type { PetSummary } from '../types/pet';

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export async function getPets(offset = 0): Promise<{ pets: PetSummary[]; nextOffset: number | null }> {
    const response = await fetch(`${apiUrl}/pets?offset=${offset}`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Unable to load pets. Please try again.');
    return data;
}
