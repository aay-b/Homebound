import { z } from 'zod';

export const petSearchSchema = z.object({
    q: z.string().trim().max(200, 'Search must be 200 characters or fewer.').default(''),
});

// Escape regex characters and quote the value for PostgREST's filter grammar.
export function petSearchFilter(term: string) {
    const literal = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return ['pet_name', 'description', 'species', 'breed', 'age']
        .map(field => `${field}.imatch.${JSON.stringify(literal)}`).join(',');
}
