import { supabase } from "../config/supabase";
import type { ManagedShelter, Pet, PetInput } from "../types/pet";

const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

export async function request<T>(path: string, options: RequestInit = {}, authenticated = false): Promise<T> {
    const headers = new Headers(options.headers);
    if (options.body) headers.set("Content-Type", "application/json");

    if (authenticated) {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error("Please log in to continue.");
        headers.set("Authorization", `Bearer ${session.access_token}`);
    }

    const response = await fetch(`${apiUrl}${path}`, { ...options, headers });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Unable to complete the request. Please try again.");
    return data as T;
}

export async function getManagedShelters() {
    const data = await request<{ shelters: ManagedShelter[] }>("/pets/shelters", {}, true);
    return data.shelters;
}

export async function getManagedPets() {
    const data = await request<{ pets: Pet[] }>('/pets/manage', {}, true);
    return data.pets;
}

// #14: create a new listing.
export async function createPet(input: PetInput) {
    const data = await request<{ pet: { id: string } }>("/pets", {
        method: "POST",
        body: JSON.stringify(input),
    }, true);
    return data.pet;
}

export async function uploadPetPhoto(file: File, shelterId: string) {
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024) {
        throw new Error("Choose a JPEG, PNG or WebP photo up to 5 MB.");
    }
    const data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).split(",")[1]);
        reader.onerror = () => reject(new Error("Unable to read the photo."));
        reader.readAsDataURL(file);
    });
    return request<{ path: string }>("/pets/photos", {
        method: "POST", body: JSON.stringify({ shelter_id: shelterId, content_type: file.type, data }),
    }, true);
}
