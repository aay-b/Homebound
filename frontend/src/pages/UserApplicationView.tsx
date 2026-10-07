import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../config/supabase";

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

    const [commitment, setCommitment] = useState(false);
    const [application, setApplication] = useState<Application>();
    const [responses, setResponses] = useState<Response[]>([]);
    const [unsavedChanges, setUnsavedChanges] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [userNotes, setUserNotes] = useState("")
    const [applicationLoading, setApplicationLoading] = useState(true);
    const [responsesLoading, setResponsesLoading] = useState(true);
    const [submitPopup, setSubmitPopup] = useState(false);

    const navigate = useNavigate();

    useEffect(() => {
        async function fetchApplication() {
            if (!applicationId) {
                setApplicationLoading(false);
                return;
            }
            const { data: { session }, } = await supabase.auth.getSession();
            const response = await fetch(
                `http://localhost:3000/api/applications/${applicationId}`, {
                    headers: {
                        Authorization: `Bearer ${session?.access_token}`,
                    },
                }
            );

            const result = await response.json();
            if (!response.ok) {
                console.error("Failed to fetch application:", result);
                setApplicationLoading(false);
                return;
            }
            setApplication(result.data[0]);
            setCommitment(result.data[0].commitment_question)
            setUserNotes(result.data[0].user_notes);
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
            const { data: { session }, } = await supabase.auth.getSession();
            const response = await fetch(
                `http://localhost:3000/api/applications/view/${applicationId}`, {
                    headers: {
                        Authorization: `Bearer ${session?.access_token}`,
                    },
                }
            );

            const result = await response.json();
            setResponses(result.data ?? []);
            setResponsesLoading(false);
        }

        fetchResponses();
    }, [applicationId]);

    const missingResponses = !responses.every((response) => response.response.trim().length > 0);

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

        setIsSaving(true);
        try {
            const { data: { session }, } = await supabase.auth.getSession();
            const response = await fetch(
                `http://localhost:3000/api/applications/${applicationId}/save`,
                {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${session?.access_token}`,
                    },
                    body: JSON.stringify({
                        responses: responses.map((response) => ({
                            id: response.id,
                            response: response.response
                        })),
                        commitment_question: commitment,
                        user_notes: userNotes
                    })
                }
            );

            if (!response.ok) {
                throw new Error("Failed to save application");
            }

            setUnsavedChanges(false);
            setIsSaving(false);
            return true;

        } catch (error) {
            console.error("Save error:", error);
            alert("Unable to save your changes.");
            setIsSaving(false);
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
            const { data: { session }, } = await supabase.auth.getSession();
            const response = await fetch(
                `http://localhost:3000/api/applications/${applicationId}/submit`,
                {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${session?.access_token}`,
                    },
                }
            );

            if (!response.ok) {
                throw new Error("Failed to submit application");
            }

            setSubmitPopup(false);
            alert("Application submitted successfully!");
            navigate("/applications", { replace: true });

        } catch (error) {
            console.error("Submission error:", error);
            alert("Unable to submit your application.");
        }
    }

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

    function applyFeedbackStyle(status: string) {
        switch (status) {
            case "Approved":
                return "border-green-400 bg-green-50 text-green-900";

            case "Denied":
                return "border-red-400 bg-red-50 text-red-900";

            default:
                return "border-[#757A5E] bg-[#F7F6F2] text-[#111111]";
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
                     onClick={() => navigate("/applications")}>
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

                        {application ? (
                            <div
                                className={`rounded-lg border px-4 py-2 text-sm font-medium ${applyStatusColor(
                                    application.application_status
                                )}`}
                            >
                                <span className="font-normal opacity-75">
                                    Status:
                                </span>{" "}
                                {application.application_status}
                            </div>
                        ) : null}
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
                                            disabled={isSaving}
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
                            <p className="text-center text-sm text-[#5F6258]">
                                Please enter any other notes that may affect your ability to adopt or care for this pet:
                            </p>

                            {application?.application_status === "In Progress" ? (
                                <textarea
                                    value={userNotes}
                                    onChange={(event) => {
                                        setUserNotes(event.target.value);
                                        setUnsavedChanges(true);
                                    }}
                                    disabled={isSaving}
                                    rows={6}
                                    className="mt-3 w-full resize-y rounded-xl border border-[#757A5E] bg-white p-4 text-[#111111] outline-none focus:border-[#344336] focus:ring-1 focus:ring-[#344336]"
                                    placeholder="Enter any additional information here..."
                                />
                            ) : (
                                <div className="mt-3 min-h-24 w-full whitespace-pre-wrap rounded-xl border border-[#757A5E] bg-white p-4 text-[#5F6258]">
                                    {application?.user_notes}
                                </div>
                            )}
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
                                    disabled={application?.application_status !== "In Progress" || isSaving}
                                    className="
                                        h-6 w-6 shrink-0 cursor-pointer
                                        accent-[#344336]
                                        transition-all duration-300
                                        disabled:cursor-not-allowed
                                        disabled:opacity-50
                                    "
                                />

                                <span className="text-[#111111] italic">
                                    I understand that adopting a pet is a long-term responsibility, and I commit to providing appropriate food, shelter, attention, and a safe living environment for this pet.
                                    I promise to offer this pet a happy home and a good life.
                                </span>
                            </label>
                        </div>
                        {application?.application_status === "Approved" || application?.application_status === "Denied" ? (
                            <div className="mt-16">
                                <p className="text-center text-sm text-[#5F6258]">
                                    Shelter staff have given this feedback regarding your application:
                                </p>

                                <div
                                    className={`mt-3 w-full rounded-xl border-2 p-4 shadow-sm ${applyFeedbackStyle(
                                        application.application_status
                                    )}`}
                                >
                                    {application.decision_feedback}
                                </div>
                            </div>
                        ) : null}
                        {application?.application_status === "In Progress" ? (
                            <div className="mt-4 flex items-center justify-between">
                                <div className="flex flex-col">
                                    {missingResponses == true ? (
                                        <p className="mt-1 text-sm text-[#F7502F]">
                                            {"*All answers must be filled out before submission*"}
                                        </p>
                                    ) : null}
                                    {commitment == false ? (
                                        <p className="mt-1 text-sm text-[#F7502F]">
                                            {"*The care commitment must be accepted*"}
                                        </p>
                                    ) : null}
                                </div>
                                <div className="flex gap-3">
                                    <button
                                        className="rounded-xl border border-[#344336] bg-white px-6 py-3 font-medium text-[#344336] hover:bg-[#ECEBE4] disabled:cursor-not-allowed disabled:opacity-40"
                                        onClick={saveChanges}
                                        disabled={!unsavedChanges || isSaving}
                                    >
                                        Save Changes
                                    </button>
                                    <button
                                        className="rounded-xl bg-[#344336] px-6 py-3 font-medium text-white hover:bg-[#2B382D] disabled:cursor-not-allowed disabled:bg-[#A9ADA4]"
                                        onClick={() => setSubmitPopup(true)}
                                        disabled={!commitment || missingResponses || isSaving}
                                    >
                                        Submit Application
                                    </button>
                                </div>
                            </div>
                        ) : null }
                    </section>

                </div>
            }
            {submitPopup === true ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                    <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
                        <h2 className="text-xl font-semibold text-[#111111]">
                            Submit Application?
                        </h2>

                        <p className="mt-3 text-sm leading-6 text-[#5F6258]">
                            Are you sure you want to submit this application? This action cannot be undone, and your application will be sent to shelter staff.
                        </p>

                        <div className="mt-6 flex justify-end gap-3">
                            <button
                                className="rounded-xl border border-[#757A5E] px-5 py-2.5 font-medium text-[#111111] hover:bg-[#ECEBE4]"
                                onClick={() => setSubmitPopup(false)}
                            >
                                Cancel
                            </button>

                            <button
                                className="rounded-xl bg-red-700 px-5 py-2.5 font-medium text-white hover:bg-red-800"
                                onClick={submitApplication}
                            >
                                Submit
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}
            {isSaving === true ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                    <div className="rounded-2xl bg-white px-10 py-8 text-center shadow-xl">
                        <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-[#D6D8D0] border-t-[#344336]">
                        </div>
                        <p className="text-lg font-medium text-[#111111]">
                            {submitPopup === true ? 
                            `Submitting your application...`
                            :
                            `Saving changes...`}
                        </p>
                    </div>
                </div>
            ) : null}
        </main>
    );
}

export default ApplicationView;