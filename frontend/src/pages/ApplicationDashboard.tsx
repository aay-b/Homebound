import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

function ApplicationDashboard() {

    type Application = {
        id: number;
        listing_id: number;
        listing: {
            pet_name: string;
            shelter: {
                shelter_name: string;
            };
        };
        application_status: string;
        commitment_question: boolean;
        created_at: string;
        submitted_at: string | null;
    };

    const navigate = useNavigate();
    const [applications, setApplications] = useState<Application[]>([]);

    useEffect(() => {
        async function fetchApplications() {
            const response = await fetch(
                "http://localhost:3000/api/applications/"
            );

            const result = await response.json();
            setApplications(result.data);
        }

        fetchApplications();
    }, []);

    function applyStatusColor(status: string) {
        switch (status) {
            case "In Progress":
                return "bg-blue-200 text-blue-800 border-blue-400";

            case "Pending":
                return "bg-yellow-200 text-yellow-800 border-yellow-400";

            case "Approved":
                return "bg-green-200 text-green-800 border-green-400";

            case "Denied":
                return "bg-red-200 text-red-800 border-red-400";

            case "Withdrawn":
                return "bg-stone-200 text-stone-800 border-stone-400";

            case "Passed":
                return "bg-stone-200 text-stone-800 border-stone-400";

            default:
                return "bg-stone-200 text-stone-800 border-stone-400";
        }
    }

    return (
        <main className="min-h-screen bg-[#F7F6F2] px-6 py-12 text-[#111111]">
            <div className="mx-auto max-w-5xl">

                <div className="mb-4 flex items-center justify-between">
                    <h1 className="text-3xl font-semibold">
                        My Applications
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
                                    className="flex items-center gap-6 rounded-2xl border border-[#757A5E] bg-white p-5"
                                >
                                    <div className="w-32 shrink-0">
                                        <div className="aspect-square rounded-xl bg-stone-200">
                                        </div>
                                    </div>

                                    <div className="flex flex-1 flex-col">
                                        <h2 className="text-xl font-semibold text-[#111111]">
                                            {application.listing.pet_name}
                                        </h2>

                                        <p className="text-sm text-[#5F6258]">
                                            {application.listing.shelter.shelter_name}
                                        </p>

                                        <button
                                            className="mt-auto w-fit rounded-lg border border-[#757A5E] px-4 py-2 text-sm font-medium text-[#111111] hover:bg-[#F1F1EC]"
                                            onClick={() => navigate("/NOTIMPLEMENTED")}
                                        >
                                            View Pet Listing
                                        </button>
                                    </div>

                                    <div className="flex w-36 shrink-0 flex-col items-center justify-center">
                                        <span
                                            className={`w-full rounded-full border px-4 py-2 text-center text-sm font-medium capitalize ${applyStatusColor(
                                                application.application_status
                                            )}`}
                                        >
                                            {application.application_status}
                                        </span>

                                        <p className="mt-2 text-center text-xs text-[#5F6258]">
                                            {application.submitted_at
                                                ? `Submitted ${new Date(application.submitted_at).toLocaleDateString()}`
                                                : `Started ${new Date(application.created_at).toLocaleDateString()}`}
                                        </p>
                                    </div>

                                    <div className="flex w-28 shrink-0 items-center justify-end">
                                        <button
                                            className="w-full rounded-xl bg-[#344336] px-5 py-3 font-medium text-white hover:bg-[#2B382D]"
                                            onClick={() =>
                                                navigate(`/applications/${application.id}`)
                                            }
                                        >
                                            {application.application_status === "In Progress"
                                                ? "Continue"
                                                : "View"}
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

export default ApplicationDashboard;