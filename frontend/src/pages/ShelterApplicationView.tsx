import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

function ApplicationView() {

    type Response = {
        id: number;
        response: string;
        question_id: {
            question: string;
        };
    };

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
        decision_feedback: string;
        user_notes: string
        commitment_question: boolean;
        created_at: string;
        submitted_at: string | null;
    };

    const { applicationId } = useParams();

    const [application, setApplication] = useState<Application>();
    const [responses, setResponses] = useState<Response[]>([]);
    const [applicationLoading, setApplicationLoading] = useState(true);
    const [responsesLoading, setResponsesLoading] = useState(true);

    const navigate = useNavigate();

    useEffect(() => {
        async function fetchApplication() {
            if (!applicationId) {
                setApplicationLoading(false);
                return;
            }

            const response = await fetch(
                `http://localhost:3000/api/applications/${applicationId}`
            );

            const result = await response.json();
            setApplication(result.data[0]);
            setApplicationLoading(false);
        }

        fetchApplication();
    }, [applicationId]);

    useEffect(() => {
        async function fetchResponses() {
            if (!applicationId) {
                setResponsesLoading(false);
                return;
            }

            const response = await fetch(
                `http://localhost:3000/api/applications/view/${applicationId}`
            );

            const result = await response.json();
            setResponses(result.data);
            setResponsesLoading(false);
        }

        fetchResponses();
    }, [applicationId]);


    async function approveApplication() {
        if (!applicationId || !application) return;

        try {
            const response = await fetch(
                `http://localhost:3000/api/applications/${applicationId}/approve`,
                {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        decisionFeedback: "NOT IMPLEMENTED"
                    }),
                }
            );

            if (!response.ok) {
                throw new Error("Failed to approve application");
            }

            alert("Application approved successfully!");
            navigate(`/jacob/shelter/listings/${application.listing_id}/applications`, { replace: true });

        } catch (error) {
            console.error("Approval error:", error);
            alert("Unable to approve application.");
        }
    }


    async function denyApplication() {
        if (!applicationId || !application) return;

        try {
            const response = await fetch(
                `http://localhost:3000/api/applications/${applicationId}/deny`,
                {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        decisionFeedback: "NOT IMPLEMENTED"
                    }),
                }
            );

            if (!response.ok) {
                throw new Error("Failed to deny application");
            }

            alert("Application denied successfully!");
            navigate(`/jacob/shelter/listings/${application.listing_id}/applications`, { replace: true });

        } catch (error) {
            console.error("Denial error:", error);
            alert("Unable to deny application.");
        }
    }

    return (
        <main className="min-h-screen bg-[#F7F6F2] px-6 py-12 text-[#111111]">
            {applicationLoading || responsesLoading ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                    <div className="rounded-2xl bg-white px-10 py-8 text-center shadow-xl">
                        <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-[#D6D8D0] border-t-[#344336]">
                        </div>

                        <p className="text-lg font-medium text-[#111111]">
                            Loading application...
                        </p>

                        <p className="mt-1 text-sm text-[#5F6258]">
                            Please wait while the application information is retrieved.
                        </p>
                    </div>
                </div>
            ) :
                <div className="mx-auto max-w-5xl">
                    <button className="mb-5 flex items-center gap-2 rounded-lg bg-[#ACABA4] px-3 py-2 text-sm font-medium text-white transition hover:bg-[#666B52]"
                     onClick={() => navigate("/jacob/shelter/listings/1/applications") }>
                        <span className="text-lg leading-none">
                            ←
                        </span>
                        Back
                    </button>
                    <div className="mb-4 flex items-start justify-between">
                        <div>
                            <h1 className="text-3xl font-semibold">
                                Application for {application?.listing.pet_name}
                            </h1>

                            <p className="mt-1 text-sm text-[#5F6258]">
                                {application?.listing.shelter.shelter_name}
                            </p>
                        </div>
                    </div>

                    <section className="min-h-96 rounded-2xl bg-[#ECEBE4] p-6">

                        <div className="space-y-4">
                            {responses.map((response) => (
                                <div
                                    key={response.id}
                                    className="rounded-2xl border border-[#757A5E] bg-white p-5"
                                >
                                    <p className="font-semibold text-[#111111]">
                                        Q: {response.question_id.question}
                                    </p>

                                    <p className="mt-3 text-[#5F6258]">
                                        {response.response}
                                    </p>
                                </div>
                            ))}
                        </div>
                        <div className="mt-6">
                            <p className="text-center text-sm text-[#5F6258]">
                                Please enter any other notes that may affect your ability to adopt or care for this pet:
                            </p>
                        
                            <div className="mt-3 min-h-24 w-full whitespace-pre-wrap rounded-xl border border-[#757A5E] bg-white p-4 text-[#5F6258]">
                                {application?.user_notes}
                            </div>

                        </div>
                        <div className="mt-10 rounded-2xl border border-green-300 bg-green-50 p-5">
                            <div className="flex items-center gap-3">
                                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded border-2 border-green-700 bg-green-700 text-white">
                                    ✓
                                </div>

                                <p className="font-semibold text-green-900">
                                    The applicant has agreed to the following care commitment:
                                </p>
                            </div>

                            <p className="mt-4 text-[#111111]">
                                I understand that adopting a pet is a long-term responsibility, and I commit to providing appropriate food, shelter, veterinary care, attention, and a safe living environment for this pet. I also understand that this responsibility may require ongoing time, patience, and financial commitment throughout the pet’s life.
                            </p>
                        </div>
                        <div className="mt-4 flex items-center justify-between">
                            <div className="flex gap-3">
                                <button
                                    className="rounded-xl border border-[#344336] bg-white px-6 py-3 font-medium text-[#344336] hover:bg-[#ECEBE4] disabled:cursor-not-allowed disabled:opacity-40"
                                    onClick={approveApplication}
                                >
                                    Approve
                                </button>
                                <button
                                    className="rounded-xl bg-[#344336] px-6 py-3 font-medium text-white hover:bg-[#2B382D] disabled:cursor-not-allowed disabled:bg-[#A9ADA4]"
                                    onClick={denyApplication}
                                >
                                    Reject
                                </button>
                            </div>
                        </div>
                    </section>

                </div>
            }
        </main>
    );
}

export default ApplicationView;