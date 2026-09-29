import {useEffect, useState } from "react";

function ApplicationView() {

    const [responses, setResponses] = useState([]);

    useEffect(() => {
        async function fetchResponses() {
            const response = await fetch("http://localhost:3000/api/applications/view/1");

            const result = await response.json();
            setResponses(result.data);
        }

    fetchResponses(); }, []);

    return (
        <div>
            <h1>Application View</h1>
            <pre>
                {JSON.stringify(responses, null, 2)}
            </pre>
        </div>
    );
}
export default ApplicationView;