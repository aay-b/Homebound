import { Router } from "express";
import { z } from "zod";
import { prisma } from "@/config/prisma.js";
import { supabase } from "@/config/supabase.js";
import { requireAuth } from "@/modules/auth/auth.middleware.js";

export const profileRouter = Router();

const profileSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    phone: z
        .string()
        .regex(
            /^[0-9+\-() ]{7,20}$/,
            "Please enter a valid phone number"
        )
        .optional()
        .or(z.literal("")),
    address: z.string().optional(),
    profilePicturePath: z.string().optional(),
});

profileRouter.get("/", requireAuth, async (request, response) => {
    const profile = await prisma.profile.findUnique({
        where: {
            userId: request.user.id,
        },
    });

    return response.status(200).json({
        // A new Auth account can open Profile before saving any optional details.
        profile: profile ?? {
            name: typeof request.user.user_metadata.name === "string" ? request.user.user_metadata.name : "",
            phone: "",
            address: "",
            profilePicturePath: undefined,
        },
    });
});

profileRouter.put("/", requireAuth, async (request, response) => {
    const result = profileSchema.safeParse(request.body);

    if (!result.success) {
        return response.status(400).json({
            message: "Invalid profile information",
            errors: result.error.flatten().fieldErrors,
        });
    }

    const { name, phone, address, profilePicturePath } = result.data;

    // Names are editable and non-unique. Update only the linked account and keep its role unchanged.
    await prisma.user.updateMany({
        where: { authUserId: request.user.id },
        data: { name },
    });

    const { error: authError } = await supabase.auth.admin.updateUserById(request.user.id, {
        user_metadata: { ...request.user.user_metadata, name },
    });

    if (authError) {
        console.error("Supabase profile name update error:", authError);
        return response.status(500).json({ message: "Unable to update the display name" });
    }

    const profile = await prisma.profile.upsert({
        where: {
            userId: request.user.id,
        },
        update: {
            name,
            phone,
            address,
            profilePicturePath
        },
        create: {
            userId: request.user.id,
            name,
            phone,
            address,
            profilePicturePath
        },
    });

    return response.status(200).json({
        message: "Profile saved successfully",
        profile,
        user: { id: request.user.id, name, email: request.user.email },
    });
});
