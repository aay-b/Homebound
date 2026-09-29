import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

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

    return (
        <main className="min-h-screen bg-stone-50 px-6 py-12">
            <div className="mx-auto max-w-5xl">

                <div className="mb-4 flex items-center justify-between">
                    <h1 className="text-3xl font-semibold">
                        Application for {application?.listing.pet_name}
                    </h1>
                </div>

                <section className="min-h-96 rounded-2xl border border-stone-300 p-6">
                    <div className="space-y-4">
                        {responses.map((response) => (
                            <div
                                key={response.id}
                                className="rounded-2xl border border-stone-300 bg-white p-5"
                            >
                                <p className="font-semibold">
                                    Q: {response.question_id.question}
                                </p>

                                <p className="mt-2 text-stone-700">
                                    A: {response.response}
                                </p>
                            </div>
                        ))}
                    </div>
                    <div className="mt-6">
                        <label className="flex items-start gap-3 rounded-2xl border border-stone-300 bg-white p-5">
                            <input
                                type="checkbox"
                                checked={commitment}
                                onChange={(event) => setCommitment(event.target.checked)}
                                className="mt-1"
                            />

                            <span>
                                Will you commit to taking proper care of this pet?
                            </span>
                        </label>
                    </div>

                    <div className="mt-4 flex justify-end">
                        <button
                            className="rounded-xl bg-stone-900 px-6 py-3 font-medium text-white hover:bg-stone-700 disabled:cursor-not-allowed disabled:bg-stone-300"
                            disabled={!commitment}
                        >
                            Submit Application
                        </button>
                    </div>
                </section>

            </div>
        </main>
    );
}

export default ApplicationView;