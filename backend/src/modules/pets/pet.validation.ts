import { z } from 'zod';

export const idSchema = z.string().regex(/^[1-9]\d{0,18}$/, 'Invalid ID').refine(value => /^[1-9]\d{0,18}$/.test(value) && BigInt(value) <= 9223372036854775807n, 'Invalid ID');

export const petSchema = z.object({
    pet_name: z.string().trim().min(1, 'Pet name is required').max(100),
    species: z.string().trim().min(1, 'Species is required').max(50),
    breed: z.string().trim().max(100).default(''),
    age: z.string().trim().max(100).default(''),
    description: z.string().trim().max(5000).default(''),
    health_info: z.string().trim().max(5000).default(''),
    allergies: z.string().trim().max(2000).default(''),
    shelter_id: idSchema,
    photo_paths: z.array(z.string().max(300)).max(4, 'Choose up to 4 photos').default([]),
});

export const photoSchema = z.object({
    shelter_id: idSchema,
    content_type: z.enum(['image/jpeg', 'image/png', 'image/webp']),
    data: z.string().min(1).max(7_000_000).regex(/^[A-Za-z0-9+/]+={0,2}$/),
});

export function validImage(bytes: Buffer, type: string) {
    if (bytes.length === 0 || bytes.length > 5 * 1024 * 1024) return false;
    if (type === 'image/jpeg') return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    if (type === 'image/png') return bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    return bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP';
}

// Uploaded files are scoped to one shelter. Never accept URLs or arbitrary storage paths.
export function validPhotoPath(path: string, shelterId: string) {
    return new RegExp(`^${shelterId}/[0-9a-f-]{36}/[0-9a-f-]{36}\\.(jpg|png|webp)$`).test(path);
}
