import { Router } from 'express';
import type { SupabaseClient } from '@supabase/supabase-js';
import { requireAuth } from '../auth/auth.middleware.js';

export function createPetRouter(supabase: SupabaseClient) {
    const router = Router();

    router.get('/', async (req, res) => {
        const offset = Number(req.query.offset ?? 0);
        if (!Number.isSafeInteger(offset) || offset < 0) return res.status(400).json({ message: 'Invalid page.' });
        const pageSize = 24;
        try {
            const { data, error } = await supabase.from('Listings')
                .select('id, pet_name, species, breed, age, photo_paths, available, shelter:Shelters(shelter_name)')
                .eq('available', true).order('created_at', { ascending: false }).order('id', { ascending: false })
                .range(offset, offset + pageSize);
            if (error) throw error;
            const rows = data ?? [];
            const pets = await Promise.all(rows.slice(0, pageSize).map(async row => {
                let photos: string[] = [];
                if (row.photo_paths.length) {
                    const { data: signed, error: photoError } = await supabase.storage.from('pet-photos')
                        .createSignedUrls(row.photo_paths.slice(0, 1), 3600);
                    if (photoError) throw photoError;
                    photos = (signed ?? []).map(photo => photo.signedUrl).filter((url): url is string => Boolean(url));
                }
                return {
                    id: String(row.id), pet_name: row.pet_name || 'Unnamed pet',
                    species: row.species, breed: row.breed, age: row.age, available: row.available,
                    shelter_name: (row.shelter as unknown as { shelter_name: string })?.shelter_name || 'Shelter', photos,
                };
            }));
            return res.json({ pets, nextOffset: rows.length > pageSize ? offset + pageSize : null });
        } catch (error) {
            console.error('Unable to browse pets:', error);
            return res.status(500).json({ message: 'Unable to load pets. Please try again.' });
        }
    });

    router.get('/:id', async (req, res) => {
        const id = req.params.id;
        if (typeof id !== 'string' || !/^[1-9]\d{0,18}$/.test(id) || BigInt(id) > 9223372036854775807n) {
            return res.status(400).json({ message: 'Invalid pet ID.' });
        }

        try {
            const { data: pet, error } = await supabase
                .from('Listings')
                .select('id, pet_name, shelter_id, species, breed, age, description, health_info, allergies, photo_paths, available')
                .eq('id', id)
                .maybeSingle();

            if (error) throw error;
            if (!pet) {
                return res.status(404).json({ message: 'Pet listing not found.' });
            }

            const { data: shelter, error: shelterError } = await supabase
                .from('Shelters')
                .select('shelter_name')
                .eq('id', pet.shelter_id)
                .maybeSingle();

            if (shelterError) throw shelterError;

            const { data: applications, error: applicationsError } = await supabase
                .from("Applications")
                .select("id, staff_seen")
                .eq("listing_id", id)
                .eq("application_status", "Pending");

            if (applicationsError) throw applicationsError;
            const applicationCount = applications?.length ?? 0;
            const newApps = (applications ?? []).some(
                application => application.staff_seen === false
            );

            let photos: string[] = [];
            if (pet.photo_paths.length > 0) {
                const { data, error: photoError } = await supabase.storage
                    .from('pet-photos')
                    .createSignedUrls(pet.photo_paths, 3600);

                if (photoError) throw photoError;
                photos = (data ?? []).map(photo => photo.signedUrl).filter((url): url is string => typeof url === 'string' && url.length > 0);
            }

            return res.json({
                pet: {
                    id: String(pet.id),
                    pet_name: pet.pet_name || 'Unnamed pet',
                    shelter_id: String(pet.shelter_id),
                    shelter_name: shelter?.shelter_name || 'Shelter',
                    species: pet.species,
                    breed: pet.breed,
                    age: pet.age,
                    description: pet.description,
                    health_info: pet.health_info,
                    allergies: pet.allergies,
                    photos,
                    available: pet.available,
                    application_count: applicationCount,
                    new_apps: newApps,
                },
            });
        } catch (error) {
            console.error('Unable to load pet details:', error);
            return res.status(500).json({ message: 'Unable to load pet details. Please try again.' });
        }
    });

    router.post('/:id/applications', requireAuth, async (req, res) => {
        const id = req.params.id;
        if (typeof id !== 'string' || !/^[1-9]\d{0,18}$/.test(id) || BigInt(id) > 9223372036854775807n) {
            return res.status(400).json({ message: 'Invalid pet ID.' });
        }

        try {
            const { data, error } = await supabase.rpc('start_pet_application', {
                p_listing_id: id,
                p_applicant_uid: req.user.id,
            });

            if (error) {
                if (error.code === 'PT404' || error.code === 'PT409') {
                    return res.status(Number(error.code.slice(2))).json({ message: error.message });
                }
                throw error;
            }

            return res.json({ applicationId: data });
        } catch (error) {
            console.error('Unable to start application:', error);
            return res.status(500).json({ message: 'Unable to start the application. Please try again.' });
        }
    });

    return router;
}
