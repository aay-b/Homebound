import { supabase } from "../config/supabase";

export async function registerUser(
    name: string,
    email: string,
    password: string
) {
    const response = await fetch("http://localhost:3000/api/auth/register", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            name,
            email,
            password,
        }),
    });

    const data = await response.json();

    return {
        response,
        data,
    };
}

export async function loginUser(
    email: string,
    password: string
) {
    const response = await fetch("http://localhost:3000/api/auth/login", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            email,
            password,
        }),
    });

    const data = await response.json();

    return {
        response,
        data,
    };
}


export async function saveProfile(
    name: string,
    phone: string,
    address: string,
    profilePicturePath?: string
) {
    const {
        data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
        return {
            response: new Response(null, { status: 401 }),
            data: {
                message: "You must be logged in",
            },
        };
    }

    const response = await fetch("http://localhost:3000/api/profile", {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
            name,
            phone,
            address,
            profilePicturePath,
        }),
    });

    const data = await response.json();

    return {
        response,
        data,
    };
}

export async function getProfile() {
    const {
        data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
        return {
            response: new Response(null, { status: 401 }),
            data: {
                message: "You must be logged in",
            },
        };
    }

    const response = await fetch("http://localhost:3000/api/profile", {
        method: "GET",
        headers: {
            Authorization: `Bearer ${session.access_token}`,
        },
    });

    const data = await response.json();

    return {
        response,
        data,
    };
}

export async function uploadProfilePicture(file: File) {
    const {
        data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
        return {
            success: false,
            message: "You must be logged in",
        };
    }

    const userId = session.user.id;

    const fileExtension = file.name.split(".").pop();
    const filePath = `${userId}/profile-picture.${fileExtension}`;

    const { error } = await supabase.storage
        .from("profile-pictures")
        .upload(filePath, file, {
            upsert: true,
            contentType: file.type,
        });

    if (error) {
        console.error("Profile picture upload error:", error);

        return {
            success: false,
            message: "Unable to upload profile picture",
        };
    }

    return {
        success: true,
        path: filePath,
    };
}