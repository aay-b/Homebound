import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

function ShelterApplicationDashboard() {

    type Application = {
        id: number;
        listing_id: number;
        listing: {
            pet_name: string;
        };
        created_at: string;
        submitted_at: string;
    };

    const navigate = useNavigate();
    const [applications, setApplications] = useState<Application[]>([]);

    useEffect(() => {
        async function fetchApplications() {
            const listingId = 1;
            const response = await fetch(
                `http://localhost:3000/api/shelter/applications/${listingId}`
            );
            const result = await response.json();
            setApplications(result.data);
        }

        fetchApplications();
    }, []);

    return (
        <main className="min-h-screen bg-[#F7F6F2] px-6 py-12 text-[#111111]">
            <div className="mx-auto max-w-5xl">

                <div className="mb-4 flex items-center justify-between">
                    <h1 className="text-3xl font-semibold">
                        Applications for ANIMAL NAME
                    </h1>

                    <button className="rounded-lg border border-[#757A5E] px-4 py-2 text-[#111111] hover:bg-[#ECEBE4]">
                        Filter
                    </button>
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
                                        <div className="aspect-square rounded-xl bg-stone-200">
                                        </div>
                                    </div>

                                    <div className="flex flex-1 flex-col">
                                        <div>
                                            <h2 className="text-xl font-semibold text-[#111111]">
                                                USER NAME
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
        </main>
    );
}

export default ShelterApplicationDashboard;