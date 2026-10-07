import { randomUUID } from 'node:crypto';
import { Router, type RequestHandler } from 'express';
import type { SupabaseClient } from '@supabase/supabase-js';
import { idSchema, petSchema, photoSchema, validImage, validPhotoPath } from './pet.validation.js';

const columns = 'id, pet_name, species, breed, age, description, health_info, allergies, photo_paths, available, shelter_id, shelter:Shelters(shelter_name)';
const bucket = 'pet-photos';

type PetRow = {
    id: string | number;
    shelter_id: string | number;
    pet_name: string | null;
    photo_paths: string[];
    shelter?: { shelter_name: string } | null;
};

export function createPetManagementRouter(db: SupabaseClient, requireAuth: RequestHandler) {
    const router = Router();

    async function staffShelters(userId: string) {
        const { data, error } = await db.from('ShelterStaff')
            .select('shelter_id, shelter:Shelters(shelter_name)').eq('auth_user_id', userId);
        if (error) throw error;
        return (data ?? []).map(row => ({
            id: String(row.shelter_id),
            shelter_name: (row.shelter as unknown as { shelter_name: string })?.shelter_name || 'Shelter',
        }));
    }

    async function canManage(userId: string, shelterId: string) {
        return (await staffShelters(userId)).some(shelter => shelter.id === shelterId);
    }

    async function presentPet(row: PetRow) {
        let photos: string[] = [];
        if (row.photo_paths.length) {
            const { data, error } = await db.storage.from(bucket).createSignedUrls(row.photo_paths, 3600);
            if (error) throw error;
            photos = (data ?? []).map(photo => photo.signedUrl || '');
        }
        return {
            ...row, id: String(row.id), shelter_id: String(row.shelter_id),
            pet_name: row.pet_name || 'Unnamed pet',
            shelter_name: row.shelter?.shelter_name || 'Shelter', photos,
        };
    }

    async function validPhotos(paths: string[], shelterId: string) {
        if (paths.some(path => !validPhotoPath(path, shelterId))) return false;
        if (!paths.length) return true;
        const { data, error } = await db.storage.from(bucket).createSignedUrls(paths, 60);
        return !error && data?.length === paths.length && data.every(photo => !photo.error && photo.signedUrl);
    }

    router.get('/shelters', requireAuth, async (req, res) => {
        try {
            return res.json({ shelters: await staffShelters(req.user.id) });
        } catch (error) {
            console.error('Unable to load staff shelters:', error);
            return res.status(500).json({ message: 'Unable to load your shelters.' });
        }
    });

    router.get('/manage', requireAuth, async (req, res) => {
        try {
            const shelters = await staffShelters(req.user.id);
            if (!shelters.length) return res.status(403).json({ message: 'Only assigned shelter staff can manage listings.' });
            const { data, error } = await db.from('Listings').select(columns)
                .in('shelter_id', shelters.map(shelter => shelter.id)).order('created_at', { ascending: false });
            if (error) throw error;
            return res.json({ pets: await Promise.all((data ?? []).map(row => presentPet(row as unknown as PetRow))) });
        } catch (error) {
            console.error('Unable to load managed pets:', error);
            return res.status(500).json({ message: 'Unable to load your pet listings.' });
        }
    });

    router.post('/photos', requireAuth, async (req, res) => {
        try {
            const parsed = photoSchema.safeParse(req.body);
            if (!parsed.success) return res.status(400).json({ message: 'Choose a JPEG, PNG or WebP image up to 5 MB.' });
            const { shelter_id, content_type, data } = parsed.data;
            if (!await canManage(req.user.id, shelter_id)) return res.status(403).json({ message: 'You cannot upload photos for this shelter.' });
            const bytes = Buffer.from(data, 'base64');
            if (!validImage(bytes, content_type)) return res.status(400).json({ message: 'Invalid image. Choose a JPEG, PNG or WebP image up to 5 MB.' });
            const extension = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }[content_type];
            const path = `${shelter_id}/${req.user.id}/${randomUUID()}.${extension}`;
            const { error } = await db.storage.from(bucket).upload(path, bytes, { contentType: content_type, upsert: false });
            if (error) throw error;
            return res.status(201).json({ path });
        } catch (error) {
            console.error('Unable to upload pet photo:', error);
            return res.status(500).json({ message: 'Unable to upload the photo. Please try again.' });
        }
    });

    router.post('/', requireAuth, async (req, res) => {
        try {
            const parsed = petSchema.safeParse(req.body);
            if (!parsed.success) return res.status(400).json({ message: parsed.error.issues[0].message });
            const input = parsed.data;
            if (!await canManage(req.user.id, input.shelter_id)) return res.status(403).json({ message: 'You cannot create pets for this shelter.' });
            if (!await validPhotos(input.photo_paths, input.shelter_id)) return res.status(400).json({ message: 'A photo is missing or does not belong to this shelter.' });
            const { data, error } = await db.from('Listings').insert({ ...input, available: true }).select('id').single();
            if (error) throw error;
            return res.status(201).json({ pet: { id: String(data.id) } });
        } catch (error) {
            console.error('Unable to create pet:', error);
            return res.status(500).json({ message: 'Unable to create the pet listing. Please try again.' });
        }
    });

    router.get('/:id/edit', requireAuth, async (req, res) => {
        if (!idSchema.safeParse(req.params.id).success) return res.status(400).json({ message: 'Invalid pet ID.' });
        try {
            const { data, error } = await db.from('Listings').select(columns).eq('id', req.params.id).maybeSingle();
            if (error) throw error;
            if (!data) return res.status(404).json({ message: 'Pet listing not found.' });
            if (!await canManage(req.user.id, String(data.shelter_id))) return res.status(403).json({ message: 'You cannot edit pets from this shelter.' });
            return res.json({ pet: await presentPet(data as unknown as PetRow) });
        } catch (error) {
            console.error('Unable to load pet for editing:', error);
            return res.status(500).json({ message: 'Unable to load the pet for editing.' });
        }
    });

    router.put('/:id', requireAuth, async (req, res) => {
        if (!idSchema.safeParse(req.params.id).success) return res.status(400).json({ message: 'Invalid pet ID.' });
        try {
            const parsed = petSchema.safeParse(req.body);
            if (!parsed.success) return res.status(400).json({ message: parsed.error.issues[0].message });
            const input = parsed.data;
            const { data: pet, error: lookupError } = await db.from('Listings').select('shelter_id').eq('id', req.params.id).maybeSingle();
            if (lookupError) throw lookupError;
            if (!pet) return res.status(404).json({ message: 'Pet listing not found.' });
            if (String(pet.shelter_id) !== input.shelter_id || !await canManage(req.user.id, input.shelter_id)) {
                return res.status(403).json({ message: 'You cannot edit this listing or move it to another shelter.' });
            }
            if (!await validPhotos(input.photo_paths, input.shelter_id)) return res.status(400).json({ message: 'A photo is missing or does not belong to this shelter.' });
            const { data, error } = await db.from('Listings').update(input)
                .eq('id', req.params.id).eq('shelter_id', input.shelter_id).select('id').maybeSingle();
            if (error) throw error;
            if (!data) return res.status(404).json({ message: 'Pet listing not found.' });
            return res.json({ pet: { id: String(data.id) } });
        } catch (error) {
            console.error('Unable to update pet:', error);
            return res.status(500).json({ message: 'Unable to save the pet listing. Please try again.' });
        }
    });

    router.delete('/:id', requireAuth, async (req, res) => {
        if (!idSchema.safeParse(req.params.id).success) return res.status(400).json({ message: 'Invalid pet ID.' });
        try {
            const { data: pet, error: lookupError } = await db.from('Listings').select('shelter_id').eq('id', req.params.id).maybeSingle();
            if (lookupError) throw lookupError;
            if (!pet) return res.status(404).json({ message: 'Pet listing not found.' });
            if (!await canManage(req.user.id, String(pet.shelter_id))) return res.status(403).json({ message: 'You cannot remove pets from this shelter.' });
            // Keep the listing so existing adoption applications still reference it.
            const { data, error } = await db.from('Listings').update({ available: false })
                .eq('id', req.params.id).eq('shelter_id', pet.shelter_id).select('id').maybeSingle();
            if (error) throw error;
            if (!data) return res.status(404).json({ message: 'Pet listing not found.' });
            return res.json({ message: 'Pet listing removed.' });
        } catch (error) {
            console.error('Unable to remove pet:', error);
            return res.status(500).json({ message: 'Unable to remove the pet listing. Please try again.' });
        }
    });

    return router;
}
