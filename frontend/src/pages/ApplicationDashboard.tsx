import {useEffect, useState } from "react";
import { useNavigate } from 'react-router-dom';

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
            const response = await fetch(`http://localhost:3000/api/applications/`);

            const result = await response.json();
            setApplications(result.data);
        }

    fetchApplications(); }, []);

    function applyStatusColor(status: string) {
        switch (status) {
            case "In Progress":
                return "bg-blue-100 text-blue-800 border-blue-300";

            case "Pending":
                return "bg-yellow-100 text-yellow-800 border-yellow-300";

            case "Approved":
                return "bg-green-100 text-green-800 border-green-300";

            case "Denied":
                return "bg-red-100 text-red-800 border-red-300";

            case "Withdrawn":
                return "bg-stone-100 text-stone-700 border-stone-300";

            case "Passed":
                return "bg-stone-100 text-stone-700 border-stone-300";

            default:
                return "bg-stone-100 text-stone-700 border-stone-300";
        }
    }

    return (
        <main className="min-h-screen bg-stone-50 px-6 py-12">
            <div className="mx-auto max-w-5xl">

                <div className="mb-4 flex items-center justify-between">
                    <h1 className="text-3xl font-semibold">
                        My Applications
                    </h1>

                    <button className="rounded-lg border px-4 py-2">
                        Filter
                    </button>
                </div>

                <section className="min-h-96 rounded-2xl border border-stone-300 p-6">
                    <div className="space-y-4">
                        {applications.map((application) => (
                        <div
                            key={application.id}
                            className="flex items-center gap-6 rounded-2xl border border-stone-300 bg-white p-5"
                        >
                            <div className="w-32 shrink-0">
                                <div className="aspect-square rounded-xl bg-stone-200">
                                </div>
                            </div>

                            <div className="flex-1">
                                <h2 className="text-xl font-semibold">
                                    {application.listing.pet_name}
                                </h2>

                                <p className="text-sm text-stone-500">
                                    {application.listing.shelter.shelter_name}
                                </p>

                                <button
                                    className="mt-auto w-fit rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium hover:bg-stone-100"
                                    onClick={() => navigate(`/NOTIMPLEMENTED`)}
                                >
                                    View Pet Listing
                                </button>
                            </div>

                             <div className="flex shrink-0 flex-col items-center justify-center">
                                <span
                                    className={`rounded-full border px-5 py-2 text-sm font-medium capitalize ${applyStatusColor(
                                        application.application_status
                                    )}`}
                                >
                                    {application.application_status}
                                </span>

                                <p className="mt-2 text-xs text-stone-500">
                                    {application.submitted_at
                                        ? `Submitted ${new Date(application.submitted_at).toLocaleDateString()}`
                                        : `Started ${new Date(application.created_at).toLocaleDateString()}`}
                                </p>
                            </div>

                            <div className="flex w-28 shrink-0 items-center justify-end">
                                <button 
                                    className="w-full rounded-xl bg-stone-900 px-5 py-3 font-medium text-white hover:bg-stone-700"
                                    onClick={() => navigate(`/applications/${application.id}`)}
                                >
                                    {application.application_status === "In Progress"
                                        ? "Continue"
                                        : "View"}
                                </button>
                            </div>
                        </div>
                        ))}
                    </div>
                </section>

            </div>
        </main>
    );
}
export default ApplicationDashboard;