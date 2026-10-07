import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import PetLayout from "../components/PetLayout";
import { getManagedShelters, createPet, uploadPetPhoto } from "../services/petManagementService";
import type { ManagedShelter, PetInput } from "../types/pet";

const emptyPet: PetInput = {
    pet_name: "", species: "", breed: "", age: "", description: "",
    health_info: "", allergies: "", shelter_id: "", photo_paths: [],
};
const fieldClass = "mt-2 w-full rounded-xl border border-stone-300 bg-white p-3 outline-none focus:border-stone-700 focus:ring-1 focus:ring-stone-700";

export default function PetForm() {
    const navigate = useNavigate();
    const [form, setForm] = useState<PetInput>({ ...emptyPet });
    const [shelters, setShelters] = useState<ManagedShelter[]>([]);
    const [previews, setPreviews] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [ready, setReady] = useState(false);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState("");
    const objectUrls = useRef<string[]>([]);

    useEffect(() => () => objectUrls.current.forEach(url => URL.revokeObjectURL(url)), []);
    useEffect(() => {
        let active = true;
        setLoading(true);
        setReady(false);
        setError("");
        async function load() {
            const allowed = await getManagedShelters();
            if (!allowed.length) throw new Error("Only assigned shelter staff can create or edit pet listings.");
            if (!active) return;
            setShelters(allowed);
            setForm({ ...emptyPet, shelter_id: allowed[0].id });
            setPreviews([]);
            setReady(true);
        }
        load().catch(error => { if (active) setError(error.message); })
            .finally(() => { if (active) setLoading(false); });
        return () => { active = false; };
    }, []);

    function change(field: Exclude<keyof PetInput, "photo_paths">, value: string) {
        setForm(current => ({ ...current, [field]: value }));
    }

    function removePhoto(index: number) {
        const preview = previews[index];
        if (objectUrls.current.includes(preview)) {
            URL.revokeObjectURL(preview);
            objectUrls.current = objectUrls.current.filter(url => url !== preview);
        }
        setForm(current => ({
            ...current,
            photo_paths: current.photo_paths.filter((_, photoIndex) => photoIndex !== index),
        }));
        setPreviews(current => current.filter((_, photoIndex) => photoIndex !== index));
    }

    // Upload photos before saving their paths with the listing.
    async function selectPhotos(event: ChangeEvent<HTMLInputElement>) {
        const files = Array.from(event.target.files || []);
        event.target.value = "";
        if (form.photo_paths.length + files.length > 4) { setError("You can add up to 4 photos."); return; }
        if (files.some(file => !["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024)) {
            setError("Choose JPEG, PNG or WebP photos, each up to 5 MB."); return;
        }
        setUploading(true);
        setError("");
        try {
            for (const file of files) {
                const result = await uploadPetPhoto(file, form.shelter_id);
                const url = URL.createObjectURL(file);
                objectUrls.current.push(url);
                setForm(current => ({ ...current, photo_paths: [...current.photo_paths, result.path] }));
                setPreviews(current => [...current, url]);
            }
        } catch (error) { setError(error instanceof Error ? error.message : "Unable to upload photo."); }
        finally { setUploading(false); }
    }

    async function submit(event: FormEvent) {
        event.preventDefault();
        if (saving || uploading) return;
        setError("");
        if (!form.pet_name.trim() || !form.species.trim()) { setError("Pet name and species are required."); return; }
        setSaving(true);
        try {
            const pet = await createPet(form);
            navigate(`/pets/${pet.id}`);
        } catch (error) { setError(error instanceof Error ? error.message : "Unable to save pet."); }
        finally { setSaving(false); }
    }

    return (
        <PetLayout>
            <div className="mx-auto max-w-3xl">
                <Link to="/pets/manage" className="text-sm underline">← Back</Link>
                <h1 className="mt-6 text-3xl font-bold">Add a pet</h1>
                <p className="mt-3 text-stone-600">Share the details that help this pet find the right home. Fields marked * are required.</p>
                {loading && <p className="mt-6" role="status">Loading form...</p>}
                {error && <p role="alert" className="my-5 rounded-xl bg-red-50 p-4 text-red-800">{error}</p>}
                {ready && <form onSubmit={submit} className="mt-8 rounded-2xl border border-stone-200 bg-white p-6 md:p-8">
                    <fieldset disabled={saving || uploading} className="space-y-6 disabled:opacity-70">
                        <div>
                            <label htmlFor="shelter" className="font-medium">Shelter *</label>
                            <select id="shelter" value={form.shelter_id} disabled={form.photo_paths.length > 0} onChange={event => change("shelter_id", event.target.value)} className={fieldClass}>
                                {shelters.map(shelter => <option key={shelter.id} value={shelter.id}>{shelter.shelter_name}</option>)}
                            </select>
                        </div>
                        <div className="grid gap-6 sm:grid-cols-2">
                            <div>
                                <label htmlFor="pet_name" className="font-medium">Pet name *</label>
                                <input
                                    id="pet_name"
                                    value={form.pet_name}
                                    onChange={event => change("pet_name", event.target.value)}
                                    maxLength={100}
                                    required
                                    className={fieldClass}
                                />
                            </div>
                            <div>
                                <label htmlFor="species" className="font-medium">Species (e.g. Dog) *</label>
                                <input
                                    id="species"
                                    value={form.species}
                                    onChange={event => change("species", event.target.value)}
                                    maxLength={50}
                                    required
                                    className={fieldClass}
                                />
                            </div>
                            <div>
                                <label htmlFor="breed" className="font-medium">Breed</label>
                                <input
                                    id="breed"
                                    value={form.breed}
                                    onChange={event => change("breed", event.target.value)}
                                    maxLength={100}
                                    className={fieldClass}
                                />
                            </div>
                            <div>
                                <label htmlFor="age" className="font-medium">Age (e.g. 2 years)</label>
                                <input
                                    id="age"
                                    value={form.age}
                                    onChange={event => change("age", event.target.value)}
                                    maxLength={100}
                                    className={fieldClass}
                                />
                            </div>
                        </div>
                        <div>
                            <label htmlFor="description" className="font-medium">About this pet</label>
                            <textarea
                                id="description"
                                value={form.description}
                                onChange={event => change("description", event.target.value)}
                                maxLength={5000}
                                rows={4}
                                className={fieldClass}
                            />
                        </div>
                        <div>
                            <label htmlFor="health_info" className="font-medium">Health and care information</label>
                            <textarea
                                id="health_info"
                                value={form.health_info}
                                onChange={event => change("health_info", event.target.value)}
                                maxLength={5000}
                                rows={4}
                                className={fieldClass}
                            />
                        </div>
                        <div>
                            <label htmlFor="allergies" className="font-medium">Allergies</label>
                            <textarea
                                id="allergies"
                                value={form.allergies}
                                onChange={event => change("allergies", event.target.value)}
                                maxLength={2000}
                                rows={4}
                                className={fieldClass}
                            />
                        </div>
                        <div>
                            <label htmlFor="photos" className="font-medium">Photos</label>
                            <p id="photo-help" className="mt-2 text-sm text-stone-600">Up to 4 photos. JPEG, PNG or WebP, up to 5 MB each. The first photo appears on the pet card.</p>
                            <input id="photos" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={selectPhotos} aria-describedby="photo-help" className="mt-3 block w-full text-sm" />
                            <div className="mt-4 grid grid-cols-2 gap-4">
                                {form.photo_paths.map((path, index) => <div key={path}>
                                    {previews[index] ? <img src={previews[index]} alt={`Pet photo ${index + 1}`} className="aspect-square w-full rounded-xl object-cover" /> : <p>Photo unavailable</p>}
                                    <button
                                        type="button"
                                        onClick={() => removePhoto(index)}
                                        className="mt-2 text-sm text-red-700 underline"
                                    >
                                        Remove photo {index + 1}
                                    </button>
                                </div>)}
                            </div>
                        </div>
                        <div className="flex items-center gap-5">
                            <button type="submit" className="rounded-full bg-stone-900 px-7 py-3 text-white">{saving ? "Saving..." : "Create listing"}</button>
                            <Link to="/pets/manage" className="underline">Cancel</Link>
                        </div>
                    </fieldset>
                    {uploading && <p className="mt-4" role="status">Uploading photos...</p>}
                </form>}
            </div>
        </PetLayout>
    );
}
