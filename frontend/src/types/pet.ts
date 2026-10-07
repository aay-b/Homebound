export type Pet = {
    id: string;
    pet_name: string;
    species: string;
    breed: string;
    age: string;
    description: string;
    health_info: string;
    allergies: string;
    photos: string[];
    photo_paths: string[];
    available: boolean;
    shelter_id: string;
    shelter_name: string;
};

export type PetInput = Omit<Pet, "id" | "shelter_name" | "available" | "photos">;

export type ManagedShelter = {
    id: string;
    shelter_name: string;
};
