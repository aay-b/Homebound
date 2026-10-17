import { Router } from "express";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireAuth } from "../auth/auth.middleware.js";

export function createFavoritesRouter(supabase: SupabaseClient) {
    const router = Router();

    router.post("/:petId", requireAuth, async (req, res) => {
        const petId = req.params.petId;

        if (
            typeof petId !== "string" ||
            !/^[1-9]\d{0,18}$/.test(petId) ||
            BigInt(petId) > 9223372036854775807n
        ) {
            return res.status(400).json({ message: "Invalid pet ID." });
        }

        try {
            const { data: pet, error: petError } = await supabase
                .from("Listings")
                .select("id")
                .eq("id", petId)
                .maybeSingle();

            if (petError) throw petError;

            if (!pet) {
                return res.status(404).json({
                    message: "Pet listing not found.",
                });
            }

            const { data: favorite, error } = await supabase
                .from("Favorites")
                .insert({
                    user_id: req.user.id,
                    listing_id: petId,
                })
                .select("id, user_id, listing_id, created_at")
                .single();

            if (error) {
                if (error.code === "23505") {
                    return res.status(409).json({
                        message: "Pet is already in your favorites.",
                    });
                }

                throw error;
            }

            return res.status(201).json({
                message: "Pet added to favorites.",
                favorite,
            });
        } catch (error) {
            console.error("Unable to add favorite:", error);
            return res.status(500).json({
                message: "Unable to add pet to favorites.",
            });
        }
    });

    router.delete("/:petId", requireAuth, async (req, res) => {
        const petId = req.params.petId;

        if (
            typeof petId !== "string" ||
            !/^[1-9]\d{0,18}$/.test(petId) ||
            BigInt(petId) > 9223372036854775807n
        ) {
            return res.status(400).json({ message: "Invalid pet ID." });
        }

        try {
            const { error } = await supabase
                .from("Favorites")
                .delete()
                .eq("user_id", req.user.id)
                .eq("listing_id", petId);

            if (error) throw error;

            return res.status(200).json({
                message: "Pet removed from favorites.",
            });
        } catch (error) {
            console.error("Unable to remove favorite:", error);
            return res.status(500).json({
                message: "Unable to remove pet from favorites.",
            });
        }
    });

    router.get("/:petId", requireAuth, async (req, res) => {
        const petId = req.params.petId;

        if (
            typeof petId !== "string" ||
            !/^[1-9]\d{0,18}$/.test(petId) ||
            BigInt(petId) > 9223372036854775807n
        ) {
            return res.status(400).json({ message: "Invalid pet ID." });
        }

        try {
            const { data: favorite, error } = await supabase
                .from("Favorites")
                .select("id")
                .eq("user_id", req.user.id)
                .eq("listing_id", petId)
                .maybeSingle();

            if (error) throw error;

            return res.status(200).json({
                isFavorite: !!favorite,
            });
        } catch (error) {
            console.error("Unable to check favorite:", error);
            return res.status(500).json({
                message: "Unable to check favorite status.",
            });
        }
    });

    return router;
}