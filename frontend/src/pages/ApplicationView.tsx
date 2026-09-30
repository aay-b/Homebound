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
        commitment_question: boolean;
        created_at: string;
        submitted_at: string | null;
    };

    const { applicationId } = useParams();

    const [commitment, setCommitment] = useState(false);
    const [application, setApplication] = useState<Application>();
    const [responses, setResponses] = useState<Response[]>([]);
    const [unsavedChanges, setUnsavedChanges] = useState(false);

    const navigate = useNavigate();

    useEffect(() => {
        async function fetchApplication() {
            if (!applicationId) {
                return;
            }

            const response = await fetch(
                `http://localhost:3000/api/applications/${applicationId}`
            );

            const result = await response.json();
            setApplication(result.data[0]);
            setCommitment(result.data[0].commitment_question)
        }

        fetchApplication();
    }, [applicationId]);

    useEffect(() => {
        async function fetchResponses() {
            if (!applicationId) {
                return;
            }

            const response = await fetch(
                `http://localhost:3000/api/applications/view/${applicationId}`
            );

            const result = await response.json();
            setResponses(result.data);
        }

        fetchResponses();
    }, [applicationId]);

    function updateResponse(responseId: number, newAnswer: string) {
        setResponses(current =>
            current.map(response =>
                response.id === responseId
                    ? { ...response, response: newAnswer }
                    : response
            )
        );
        setUnsavedChanges(true);
    }

    async function saveChanges(): Promise<boolean> {
        if (!applicationId) return false;

        try {
            const response = await fetch(
                `http://localhost:3000/api/applications/${applicationId}/save`,
                {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        responses: responses.map((response) => ({
                            id: response.id,
                            response: response.response
                        })),
                        commitment_question: commitment
                    })
                }
            );

            if (!response.ok) {
                throw new Error("Failed to save application");
            }

            alert("Application saved successfully!");
            setUnsavedChanges(false);
            return true;

        } catch (error) {
            console.error("Save error:", error);
            alert("Unable to save your changes.");
            return false;
        }
    }

    async function submitApplication() {
        if (!applicationId) return;

        const saved = await saveChanges();
        if (!saved) {
            alert("Unable to save your application. Please try again.");
            return;
        }

        try {
            const response = await fetch(
                `http://localhost:3000/api/applications/${applicationId}/submit`,
                {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json"
                    },
                }
            );

            if (!response.ok) {
                throw new Error("Failed to submit application");
            }

            alert("Application submitted successfully!");
            navigate("/applications", { replace: true });

        } catch (error) {
            console.error("Submission error:", error);
            alert("Unable to submit your application.");
        }
    }

    return (
        <main className="min-h-screen bg-[#F7F6F2] px-6 py-12 text-[#111111]">
            <div className="mx-auto max-w-5xl">

                <div className="mb-4">
                    <h1 className="text-3xl font-semibold">
                        Application for {application?.listing.pet_name}
                    </h1>

                    <p className="mt-1 text-sm text-[#5F6258]">
                        {application?.listing.shelter.shelter_name}
                    </p>
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

                                {application?.application_status === "In Progress" ? (
                                    <textarea
                                        value={response.response}
                                        onChange={(event) =>
                                            updateResponse(response.id, event.target.value)
                                        }
                                        rows={3}
                                        className="mt-3 w-full resize-y rounded-lg border border-[#757A5E] bg-[#F7F6F2] p-3 text-[#111111] outline-none focus:border-[#344336] focus:ring-1 focus:ring-[#344336]"
                                    />
                                ) : (
                                    <p className="mt-3 text-[#5F6258]">
                                        {response.response}
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>

                    <div className="mt-6">
                        <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-[#757A5E] bg-white p-5">
                            <input
                                type="checkbox"
                                checked={commitment}
                                onChange={(event) => {
                                    setCommitment(event.target.checked);
                                    setUnsavedChanges(true);
                                }}
                                disabled={application?.application_status !== "In Progress"}
                                className="
                                    h-6 w-6 shrink-0 cursor-pointer
                                    accent-[#344336]
                                    transition-all duration-300
                                    disabled:cursor-not-allowed
                                    disabled:opacity-50
                                "
                            />

                            <span className="text-[#111111]">
                                Will you commit to taking proper care of this pet?
                            </span>
                        </label>
                    </div>

                    {application?.application_status === "In Progress" ? (
                        <div className="mt-4 flex justify-end gap-3">
                            <button
                                className="rounded-xl border border-[#344336] bg-white px-6 py-3 font-medium text-[#344336] hover:bg-[#ECEBE4] disabled:cursor-not-allowed disabled:opacity-40"
                                onClick={saveChanges}
                                disabled={!unsavedChanges}
                            >
                                Save Changes
                            </button>
                            <button
                                className="rounded-xl bg-[#344336] px-6 py-3 font-medium text-white hover:bg-[#2B382D] disabled:cursor-not-allowed disabled:bg-[#A9ADA4]"
                                onClick={submitApplication}
                                disabled={!commitment}
                            >
                                Submit Application
                            </button>
                        </div>
                    ) : null }
                </section>

            </div>
        </main>
    );
}

export default ApplicationView;