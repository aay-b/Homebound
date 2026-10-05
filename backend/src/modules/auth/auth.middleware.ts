import { Request, Response, NextFunction } from "express";
import { supabase } from "@/config/supabase.js";

export async function requireAuth(
    request: Request,
    response: Response,
    next: NextFunction
) {
    const authorization = request.headers.authorization;

    if (!authorization?.startsWith("Bearer ")) {
        return response.status(401).json({
            message: "Authentication required",
        });
    }

    const accessToken = authorization.substring("Bearer ".length);

    const { data, error } = await supabase.auth.getUser(accessToken);

    if (error || !data.user) {
        return response.status(401).json({
            message: "Invalid or expired session",
        });
    }

    request.user = data.user;

    next();
}