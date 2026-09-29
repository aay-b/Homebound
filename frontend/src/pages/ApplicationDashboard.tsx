import {useEffect, useState } from "react";
import { useNavigate } from 'react-router-dom';

function ApplicationDashboard() {

    const navigate = useNavigate();
    const [applications, setApplications] = useState([]);

    const view_application = () => {
        navigate('/applications/view/1')
    }

    useEffect(() => {
        async function fetchApplications() {
            const response = await fetch("http://localhost:3000/api/applications/1");

            const result = await response.json();
            setApplications(result.data);
        }

    fetchApplications(); }, []);

    return (
        <div>
            <h1>Application Dashboard</h1>
            <pre>
                {JSON.stringify(applications, null, 2)}
            </pre>
        
            <button type="button" onClick={view_application}>
                View Application
            </button>
        </div>
    );
}
export default ApplicationDashboard;