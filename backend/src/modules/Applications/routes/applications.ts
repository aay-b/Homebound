import { Router } from "express";

import { supabase } from "../../../config/supabase.js";
import Application from "../models/Application.js";

const router = Router();

// Get all of a user's applications
router.get("/applications/:userId", async (req, res) => {
    try {
        const userId = req.params.userId;
        const { data, error } = await Application.getUserApplications(supabase, userId);

        if (error) {
            return res.status(500).json({
                success: false,
                message: "Failed to fetch applications",
            });
        }

        return res.json({
            success: true,
            data,
            count: data?.length ?? 0,
        });
    } catch (err) {
        console.error("GET /applications error:", err);
    }

    return res.status(500).json({
        success: false,
        message: "Internal server error",
    });
});


// Get the current responses for a specific application
router.get("/applications/view/:applicationId", async (req, res) => {
    try {
        const userId = req.params.applicationId;
        const { data, error } = await Application.getApplicationResponses(supabase, userId);

        if (error) {
            return res.status(500).json({
                success: false,
                message: "Failed to fetch applications",
            });
        }

        return res.json({
            success: true,
            data,
            count: data?.length ?? 0,
        });
    } catch (err) {
        console.error("GET /view/applications error:", err);
    }

    return res.status(500).json({
        success: false,
        message: "Internal server error",
    });
});

export default router;