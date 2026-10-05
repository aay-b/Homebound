import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

function UserApplicationDashboard() {

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
    const [applicationsLoading, setApplicationsLoading] = useState(true);
    const [withdrawId, setWithdrawId] = useState<number | null>(null);

    useEffect(() => {
        async function fetchApplications() {
            const response = await fetch(
                "http://localhost:3000/api/applications/"
            );

            const result = await response.json();
            setApplications(result.data);
            setApplicationsLoading(false);
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

    async function withdrawApplication(applicationId: number) {
        if (!applicationId) return;

        try {
            const response = await fetch(
                `http://localhost:3000/api/applications/${applicationId}/withdraw`,
                {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json"
                    },
                }
            );

            const result = await response.json();
            if (!response.ok) {
                throw new Error(
                    result.message || "Failed to withdraw application"
                );
            }

            setApplications(current =>
                current.map(application =>
                    application.id === applicationId
                        ? { ...application, application_status: "Withdrawn" }
                        : application
                )
            );

            setWithdrawId(null);
            alert("Application withdrawn successfully!");
            
        } catch (error) {
            console.error("Withdrawal error:", error);
            if (error instanceof Error) {
                alert(error.message);
            } else {
                alert("Unable to withdraw application.");
            }
            setWithdrawId(null);
        }
    }

    return (
        <main className="min-h-screen bg-[#F7F6F2] px-6 py-12 text-[#111111]">
            {applicationsLoading ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                    <div className="rounded-2xl bg-white px-10 py-8 text-center shadow-xl">
                        <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-[#D6D8D0] border-t-[#344336]">
                        </div>

                        <p className="text-lg font-medium text-[#111111]">
                            Fetching your applications...
                        </p>

                        <p className="mt-1 text-sm text-[#5F6258]">
                            Please wait while your applications are being retrieved.
                        </p>
                    </div>
                </div>
            ) :
            
                <div className="mx-auto max-w-5xl">
                    <button className="mb-5 flex items-center gap-2 rounded-lg bg-[#ACABA4] px-3 py-2 text-sm font-medium text-white transition hover:bg-[#666B52]"
                     onClick={() => navigate("/home") }>
                        <span className="text-lg leading-none">
                            ←
                        </span>
                        Back
                    </button>

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
                                                <span className="block">
                                                    {application.submitted_at
                                                        ? `Submitted ${new Date(application.submitted_at).toLocaleDateString()}`
                                                        : `Started ${new Date(application.created_at).toLocaleDateString()}`}
                                                </span>

                                                <span className="block">
                                                    {new Date(
                                                        application.submitted_at ?? application.created_at
                                                    ).toLocaleTimeString([], {
                                                        hour: "numeric",
                                                        minute: "2-digit"
                                                    })}
                                                </span>
                                            </p>

                                            <div className="mt-6 flex h-5 items-center justify-center">
                                                {application.application_status === "Pending" ? (
                                                    <button
                                                        className="text-xs text-[#777777] hover:text-[#444444] hover:underline"
                                                        onClick={() => setWithdrawId(application.id)}
                                                    >
                                                        Withdraw
                                                    </button>
                                                ) : null}
                                            </div>
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
            }
            {withdrawId !== null ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                    <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
                        <h2 className="text-xl font-semibold text-[#111111]">
                            Withdraw Application?
                        </h2>

                        <p className="mt-3 text-sm leading-6 text-[#5F6258]">
                            Are you sure you want to withdraw this application? This action cannot be undone.
                        </p>

                        <div className="mt-6 flex justify-end gap-3">
                            <button
                                className="rounded-xl border border-[#757A5E] px-5 py-2.5 font-medium text-[#111111] hover:bg-[#ECEBE4]"
                                onClick={() => setWithdrawId(null)}
                            >
                                Cancel
                            </button>

                            <button
                                className="rounded-xl bg-red-700 px-5 py-2.5 font-medium text-white hover:bg-red-800"
                                onClick={() => {withdrawApplication(withdrawId) }}
                            >
                                Withdraw
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}
        </main>
    );
}

export default UserApplicationDashboard;