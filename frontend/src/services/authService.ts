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