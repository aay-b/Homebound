import { Router } from "express";
import { supabase } from "../../config/supabase.js";
import { requireAuth } from "@/modules/auth/auth.middleware.js";
import Application from "./applications.middleware.js";

export const applicationRouter = Router();

// Get info for all of a user's applications
applicationRouter.get("/", requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
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
        console.error("GET / error:", err);
    }

    return res.status(500).json({
        success: false,
        message: "Internal server error",
    });
});

// CURRENTLY LACKING AUTHENTICATION
// Get info for all applications for a specific pet listing
applicationRouter.get("/shelter/:listingId", async (req, res) => {
    try {
        const listingId = Number(req.params.listingId);
        const { data, error } = await Application.getPetApplicationInfo(supabase, listingId);

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
        console.error("GET / error:", err);
    }

    return res.status(500).json({
        success: false,
        message: "Internal server error",
    });
});

// CURRENTLY LACKING AUTHENTICATION
// Get a single application by application ID
applicationRouter.get("/:applicationId", async (req, res) => {
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

// CURRENTLY LACKS AUTHORIZATION
// Get the responses for a specific application
applicationRouter.get("/view/:applicationId", requireAuth, async (req, res) => {
    try {
        const applicationId = Number(req.params.applicationId);
        const userId = req.user.id;
        const { data, error } = await Application.getApplicationResponses(supabase, applicationId, userId);

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


// Saves a person's responses within an application
applicationRouter.patch("/:applicationId/save", requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        const applicationId = Number(req.params.applicationId);
        
        const { responses, commitment_question, user_notes } = req.body;

        if (!applicationId) {
            return res.status(400).json({
                success: false,
                message: "Invalid application ID"
            });
        }

        const { error } = await Application.saveChanges(
            supabase,
            applicationId,
            userId,
            responses,
            commitment_question,
            user_notes
        );

        if (error) {
            console.error("Save error:", error);

            return res.status(400).json({
                success: false,
                message: error.message
            });
        }

        return res.json({
            success: true,
            message: "Application saved successfully"
        });

    } catch (error) {
        console.error("Save application error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
});


// Submits a specific application
applicationRouter.patch("/:applicationId/submit", requireAuth, async (req, res) => {
    try {
        const applicationId = Number(req.params.applicationId);
        const userId = req.user.id;

        if (!applicationId) {
            return res.status(400).json({
                success: false,
                message: "Invalid application ID"
            });
        }

        const { error } = await Application.submitApplication(
            supabase,
            applicationId,
            userId,
        );

        if (error) {
            console.error("Save error:", error);

            return res.status(400).json({
                success: false,
                message: error.message
            });
        }

        return res.json({
            success: true,
            message: "Application submitted successfully"
        });

    } catch (error) {
        console.error("Application submission error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
});


// Approves a specific application
applicationRouter.patch("/:applicationId/approve", requireAuth, async (req, res) => {
    try {
        const applicationId = Number(req.params.applicationId);
        const userId = req.user.id;
        const { decisionFeedback } = req.body;

        if (!applicationId) {
            return res.status(400).json({
                success: false,
                message: "Invalid application ID"
            });
        }

        const { error } = await Application.approveApplication(
            supabase,
            applicationId,
            userId,
            decisionFeedback
        );

        if (error) {
            console.error("Approval error:", error);

            return res.status(400).json({
                success: false,
                message: error.message
            });
        }

        return res.json({
            success: true,
            message: "Application approved successfully"
        });

    } catch (error) {
        console.error("Application approval error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
});


// Denies a specific application
applicationRouter.patch("/:applicationId/deny", requireAuth, async (req, res) => {
    try {
        const applicationId = Number(req.params.applicationId);
        const userId = req.user.id;
        const { decisionFeedback } = req.body;

        if (!applicationId) {
            return res.status(400).json({
                success: false,
                message: "Invalid application ID"
            });
        }

        const { error } = await Application.denyApplication(
            supabase,
            applicationId,
            userId,
            decisionFeedback
        );

        if (error) {
            console.error("Save error:", error);

            return res.status(409).json({
                success: false,
                message: error.message
            });
        }

        return res.json({
            success: true,
            message: "Application denied successfully"
        });

    } catch (error) {
        console.error("Application denial error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
});


// Withdraws a specific application
applicationRouter.patch("/:applicationId/withdraw", requireAuth, async (req, res) => {
    try {
        const applicationId = Number(req.params.applicationId);
        if (!applicationId) {
            return res.status(400).json({
                success: false,
                message: "Invalid application ID"
            });
        }
        const userId = req.user.id;

        const { error } = await Application.withdrawApplication(supabase, applicationId, userId);

        if (error) {
            console.error("Withdrawal error:", error);

            return res.status(400).json({
                success: false,
                message: error.message
            });
        }

        return res.json({
            success: true,
            message: "Application withdrawn successfully"
        });

    } catch (error) {
        console.error("Application withdrawal error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
});