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
    const [applicationsLoading, setApplicationsLoading] = useState(true);

    useEffect(() => {
        async function fetchApplications() {
            const listingId = 1;
            const response = await fetch(
                `http://localhost:3000/api/shelter/applications/${listingId}`
            );
            const result = await response.json();
            setApplications(result.data);
            setApplicationsLoading(false);
        }

        fetchApplications();
    }, []);

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
                     onClick={() => navigate("/jacob/shelter/listings/1") }>
                        <span className="text-lg leading-none">
                            ←
                        </span>
                        Back
                    </button>

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
            }
        </main>
    );
}

export default ShelterApplicationDashboard;