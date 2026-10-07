import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

type StartApplicationProps = {
    listingId: string;
    petName: string;
    available: boolean;
    startApplication: (listingId: string) => Promise<string>;
    onBack: () => void;
};

export default function StartApplication({
    listingId,
    petName,
    available,
    startApplication,
    onBack,
}: StartApplicationProps) {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const requestInProgress = useRef(false);

    async function handleStart() {
        if (!available || requestInProgress.current) return;

        requestInProgress.current = true;
        setLoading(true);
        setError("");

        try {
            const applicationId = await startApplication(listingId);
            if (!/^[1-9]\d*$/.test(applicationId)) {
                throw new Error("Unable to open the application. Please try again.");
            }
            navigate(`/applications/${applicationId}`);
        } catch (error) {
            setError(error instanceof Error ? error.message : "Unable to start the application.");
        } finally {
            requestInProgress.current = false;
            setLoading(false);
        }
    }

    return (
        <main className="min-h-screen bg-stone-50 px-6 py-10 text-stone-900">
            <div className="mx-auto max-w-xl rounded-2xl border border-stone-200 bg-white p-8">
                <button type="button" onClick={onBack} disabled={loading} className="text-sm underline disabled:opacity-50">
                    Back to pet details
                </button>
                <h1 className="mt-6 text-3xl font-bold">Adoption application</h1>
                <p className="mt-4 text-stone-600">Start an application to adopt {petName}.</p>

                {error && <p role="alert" className="mt-4 text-red-700">{error}</p>}

                {available ? (
                    <button
                        type="button"
                        onClick={handleStart}
                        disabled={loading}
                        className="mt-6 rounded-full bg-stone-900 px-6 py-3 text-white disabled:opacity-50"
                    >
                        {loading ? "Opening application..." : "Continue to application"}
                    </button>
                ) : (
                    <p className="mt-6 text-amber-800">This pet is no longer available for adoption.</p>
                )}
            </div>
        </main>
    );
}
