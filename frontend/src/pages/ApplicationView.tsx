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
        application_status: string;
        created_at: string;
        submitted_at: string | null;
    };

    const { applicationId } = useParams();

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
            setApplication(result.data);
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
                        Application for PET NAME
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
                </section>

            </div>
        </main>
    );
}

export default ApplicationView;