import { Router } from "express";
import { z } from "zod";
import { prisma } from "@/config/prisma.js";
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

    if (!profile) {
        return response.status(404).json({
            message: "Profile not found",
        });
    }

    return response.status(200).json({
        profile,
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
    });
});