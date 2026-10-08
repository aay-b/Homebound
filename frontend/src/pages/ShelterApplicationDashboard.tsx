import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../config/supabase";

function ShelterApplicationDashboard() {

    type Pet = {
        id: string;
        pet_name: string;
        shelter_name: string;
        species: string;
        breed: string;
        age: string;
        photos: string[];
        available: boolean;
    };

    type Application = {
        id: number;
        applicant_uid: string;
        applicant_name: string;
        listing_id: number;
        listing: {
            pet_name: string;
        };
        created_at: string;
        submitted_at: string;
        applicant_profile_picture: string | null;
    };

    const navigate = useNavigate();
    const { listingId } = useParams();
    const [applications, setApplications] = useState<Application[]>([]);
    const [pet, setPet] = useState<Pet | null>(null);
    const [applicationsLoading, setApplicationsLoading] = useState(true);

    useEffect(() => {
        async function fetchDashboard() {
            if (!listingId) return;
            try {
                const { data: { session } } = await supabase.auth.getSession();
                const [applicationsResponse, petResponse] = await Promise.all([
                    fetch(`http://localhost:3000/api/applications/shelter/${listingId}`, {
                        headers: {
                            Authorization: `Bearer ${session?.access_token}`,
                        },
                    }),
                    fetch(`http://localhost:3000/api/pets/${listingId}`)
                ]);
                const applicationsResult = await applicationsResponse.json();
                const petResult = await petResponse.json();

                if (!applicationsResponse.ok) {
                    console.error("Unable to fetch applications:", applicationsResult);
                } else {
                    setApplications(applicationsResult.data ?? []);
                }

                if (!petResponse.ok) {
                    console.error("Unable to fetch pet:", petResult);
                } else {
                    setPet(petResult.pet);
                }
            } catch (error) {
                console.error("Unable to load shelter application dashboard:", error);
            } finally {
                setApplicationsLoading(false);
            }
        }

        fetchDashboard();
    }, [listingId]);


    useEffect(() => {
        async function markSeen() {
            if (!listingId) return;
            try {
                const { data: { session } } = await supabase.auth.getSession();
                const response = await fetch(`http://localhost:3000/api/applications/shelter/${listingId}/mark`,
                    {
                        method: "PATCH",
                        headers: {
                            Authorization: `Bearer ${session?.access_token}`,
                        },
                    }
                );

                const result = await response.json();

                if (!response.ok) {
                    console.error("Unable to mark applications as seen:", result);
                }
            } catch (error) {
                console.error("Unable to mark applications as seen:", error);
            }
        }

        markSeen();
    }, [listingId]);


    return (
        <main className="min-h-screen bg-[#F7F6F2] px-6 py-12 text-[#111111]">
            {applicationsLoading ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                    <div className="rounded-2xl bg-white px-10 py-8 text-center shadow-xl">
                        <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-[#D6D8D0] border-t-[#344336]">
                        </div>

                        <p className="text-lg font-medium text-[#111111]">
                            Fetching submitted applications...
                        </p>

                        <p className="mt-1 text-sm text-[#5F6258]">
                            Please wait while the applications are being retrieved.
                        </p>
                    </div>
                </div>
            ) :
                <div className="mx-auto max-w-5xl">

                    <button className="mb-5 flex items-center gap-2 rounded-lg bg-[#ACABA4] px-3 py-2 text-sm font-medium text-white transition hover:bg-[#666B52]"
                     onClick={() => navigate(`/pets/manage`)}>
                        <span className="text-lg leading-none">
                            ←
                        </span>
                        Back
                    </button>

                    <div className="mb-5 flex items-center justify-between rounded-2xl bg-white p-5">
                        <div className="flex items-center gap-5">
                            <div className="h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-stone-200">
                                {pet?.photos[0] && <img src={pet.photos[0]} alt={pet.pet_name} className="h-full w-full object-cover" />}
                            </div>

                            <div>
                                <h1 className="text-3xl font-semibold">
                                    Applications for {pet?.pet_name ?? "Pet"}
                                </h1>

                                <p className="mt-1 text-sm text-[#5F6258]">
                                    {[pet?.species, pet?.breed, pet?.age].filter(Boolean).join(" · ")}
                                </p>

                                <p className="mt-1 text-sm text-[#5F6258]">
                                    {pet?.shelter_name}
                                </p>
                            </div>
                        </div>
                    </div>

                    <section className="min-h-96 rounded-2xl bg-[#ECEBE4] p-6">
                        {applications.length === 0 ? (
                            <div className="flex min-h-80 items-center justify-center">
                                <p className="text-lg text-[#5F6258]">
                                    No Applications
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {applications.map((application) => (
                                    <div
                                        key={application.id}
                                        className="flex min-h-40 items-stretch gap-6 rounded-2xl border border-[#757A5E] bg-white p-5"
                                    >
                                        <div className="w-32 shrink-0">
                                            <div className="aspect-square overflow-hidden rounded-xl bg-stone-200">
                                                {application.applicant_profile_picture ? (
                                                    <img src={application.applicant_profile_picture} alt={application.applicant_name} className="h-full w-full object-cover" />
                                                ) : (
                                                    <div className="flex h-full w-full items-center justify-center text-3xl font-semibold text-stone-500">
                                                        {application.applicant_name.charAt(0).toUpperCase()}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex flex-1 flex-col">
                                            <div>
                                                <h2 className="text-xl font-semibold text-[#111111]">
                                                    {application.applicant_name}
                                                </h2>

                                                <button
                                                    className="mt-1 w-fit rounded-lg border border-[#757A5E] px-4 py-2 text-sm font-medium text-[#111111] hover:bg-[#F1F1EC]"
                                                    onClick={() => navigate("/NOTIMPLEMENTED")}
                                                >
                                                    View User Application History
                                                </button>
                                            </div>

                                            <p className="mt-auto text-sm text-[#5F6258]">
                                                Application ID: {application.id}
                                            </p>
                                        </div>

                                        <div className="flex w-36 shrink-0 flex-col items-center justify-center">
                                            <p className="mt-2 text-center text-xs text-[#5F6258]">
                                                {`Submitted ${new Date(application.submitted_at).toLocaleDateString()}`}
                                            </p>
                                        </div>

                                        <div className="flex w-28 shrink-0 items-center justify-end">
                                            <button
                                                className="w-full rounded-xl bg-[#344336] px-5 py-3 font-medium text-white hover:bg-[#2B382D]"
                                                onClick={() =>
                                                    navigate(`${application.id}`)
                                                }
                                            >
                                                View
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>

                </div>
            }
        </main>
    );
}

export default ShelterApplicationDashboard;