import { application, Router } from "express";

import { supabase } from "../../../config/supabase.js";
import Application from "../models/Application.js";

const router = Router();

// Get all of a user's applications info
router.get("/applications", async (req, res) => {
    try {
        const userId = 1;
        const { data, error } = await Application.getUserApplicationInfo(supabase, userId);

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


// Get a single application by application ID
router.get("/applications/:applicationId", async (req, res) => {
    try {
        const applicationId = Number(req.params.applicationId);
        const { data, error } = await Application.getApplicationInfo(supabase, applicationId);

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


// Get the responses for a specific application
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