import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { ChangeEvent, useEffect, useState } from "react";
import { getProfile, saveProfile, uploadProfilePicture } from "../services/authService";
import { supabase } from "../config/supabase";

export default function Profile() {
    const { user } = useAuth();
    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");
    const [address, setAddress] = useState("");
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [loading, setLoading] = useState(true);
    const [profilePicture, setProfilePicture] = useState<File | null>(null);
    const [profilePicturePath, setProfilePicturePath] = useState<string | undefined>();
    const [profilePictureUrl, setProfilePictureUrl] = useState<string | null>(null);

    function handlePictureChange(event: ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0];

        if (file) {
            setProfilePicture(file);
        }
    }   

    useEffect(() => {
    const loadProfile = async () => {
        const result = await getProfile();

            if (result.response.ok) {
                setName(result.data.profile.name);
                setPhone(result.data.profile.phone ?? "");
                setAddress(result.data.profile.address ?? "");

                const picturePath = result.data.profile.profilePicturePath;

                if (picturePath) {
                    const { data } = await supabase.storage
                        .from("profile-pictures")
                        .createSignedUrl(picturePath, 60 * 60);

                    if (data?.signedUrl) {
                        setProfilePictureUrl(data.signedUrl);
                    }
                }
            }

            setLoading(false);
        };

        loadProfile();
    }, []);

    const handleSave = async () => {
        setError("");
        setSuccess("");

        let picturePath = profilePicturePath;

        if (profilePicture) {
            const uploadResult = await uploadProfilePicture(profilePicture);

            if (!uploadResult.success) {
                setError(uploadResult.message);
                return;
            }

            picturePath = uploadResult.path;
        }


        const result = await saveProfile(name, phone, address, picturePath);

        if (!result.response.ok) {
            const firstError =
                Object.values(result.data.errors ?? {}).flat()[0];

            setError(firstError ?? result.data.message);
            return;
        }

        setSuccess("Profile saved successfully!");
    };

    if (loading) {
    return (
            <main className="min-h-screen bg-stone-50 text-stone-900">
                <div className="flex min-h-screen items-center justify-center">
                    <p className="text-stone-600">Loading profile...</p>
                </div>
            </main>
        );
    }   

    return (
        <main className="min-h-screen bg-stone-50 text-stone-900">
            <nav className="flex items-center justify-between border-b border-stone-200 bg-white px-8 py-5">
                <Link to="/" className="text-2xl font-bold">
                    Homebound
                </Link>

                <Link
                    to="/"
                    className="text-sm font-medium text-stone-600 hover:text-stone-900"
                >
                    Back to Home
                </Link>
            </nav>

            <section className="mx-auto max-w-3xl px-6 py-12">
                <div className="mb-8">
                    <p className="text-sm font-medium uppercase tracking-wider text-stone-500">
                        My Account
                    </p>

                    <h1 className="mt-2 text-4xl font-bold">
                        Profile
                    </h1>

                    <p className="mt-3 text-stone-600">
                        Manage your personal information.
                    </p>
                </div>

                <div className="rounded-2xl bg-white p-8 shadow-sm">
                    <div className="space-y-6">

                        <div className="flex items-center justify-between border-b border-stone-200 pb-6">
                            <div>
                                <p className="text-sm font-medium">
                                    Profile picture
                                </p>
                                <p className="mt-1 text-sm text-stone-500">
                                    Choose a picture for your profile
                                </p>
                            </div>

                            <div className="relative h-24 w-24">
                                {profilePictureUrl ? (
                                    <img
                                        src={profilePictureUrl}
                                        alt="Profile"
                                        className="h-24 w-24 rounded-full object-cover"
                                    />
                                ) : (
                                    <div className="flex h-24 w-24 items-center justify-center rounded-full bg-stone-200 text-sm text-stone-500">
                                        No photo
                                    </div>
                                )}

                                <label
                                    htmlFor="profile-picture"
                                    className="absolute bottom-0 right-0 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border-2 border-white bg-stone-900 text-white shadow-md transition hover:bg-stone-700"
                                    title="Change profile picture"
                                >
                                    📷
                                </label>

                                <input
                                    id="profile-picture"
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp"
                                    onChange={handlePictureChange}
                                    className="hidden"
                                />
                            </div>
                        </div>


                        <div>
                            <label className="mb-2 block text-sm font-medium">
                                Name
                            </label>

                            <input
                                type="text"
                                value={name}
                                onChange={(event) => setName(event.target.value)}
                                className="w-full rounded-lg border border-stone-300 px-4 py-3 outline-none focus:border-stone-500"
                                placeholder="Enter your name"
                            />
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-medium">
                                Email
                            </label>

                            <input
                                type="email"
                                value={user?.email ?? ""}
                                readOnly
                                className="w-full rounded-lg border border-stone-200 bg-stone-100 px-4 py-3 text-stone-600"
                            />
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-medium">
                                Phone number
                            </label>

                            <input
                                type="tel"
                                value={phone}
                                onChange={(event) => setPhone(event.target.value)}
                                className="w-full rounded-lg border border-stone-300 px-4 py-3 outline-none focus:border-stone-500"
                                placeholder="Enter your phone number"
                            />
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-medium">
                                Address
                            </label>

                            <textarea
                                rows={3}
                                value={address}
                                onChange={(event) => setAddress(event.target.value)}
                                className="w-full rounded-lg border border-stone-300 px-4 py-3 outline-none focus:border-stone-500"
                                placeholder="Enter your address"
                            />
                        </div>

                        {error && (
                            <p className="text-sm text-red-600">
                                {error}
                            </p>
                        )}

                        {success && (
                            <p className="text-sm text-green-600">
                                {success}
                            </p>
                        )}

                        <button
                            type="button"
                            onClick={handleSave}
                            className="w-full rounded-lg bg-stone-900 px-4 py-3 font-medium text-white hover:bg-stone-700"
                        >
                            Save Changes
                        </button>
                    </div>
                </div>
            </section>
        </main>
    );
}