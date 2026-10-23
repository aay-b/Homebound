import type { PetSummary } from '../types/pet';

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export async function getPets(offset = 0, search = ''): Promise<{ pets: PetSummary[]; nextOffset: number | null }> {
    const params = new URLSearchParams({ offset: String(offset) });
    if (search.trim()) params.set('q', search.trim());
    const response = await fetch(`${apiUrl}/pets?${params}`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Unable to load pets. Please try again.');
    return data;
}
