import type { SupabaseClient } from "@supabase/supabase-js";

class Application {
    
    static async getUserApplications(supabase: SupabaseClient, userId: string) {
        if (!userId) {
            return {
                error: new Error("userId is required"),
                data: null,
            };
        }

        const { data, error } = await supabase
            .from("Applications")
            .select(`
                id,
                applicant_id,
                listing_id,
                user_notes,
                application_status,
                decision_feedback,
                created_at
            `)
            .eq("applicant_id", userId)
            .order("created_at", { ascending: false });

        console.log("Supabase data:", data);
        console.log("Supabase error:", error);

        if (error) {
            return {
                error,
                data: null,
            };
        }

        return {
            data,
            error: null,
        };
    }

    static async getApplicationResponses(supabase: SupabaseClient, applicationId: string) {
        if (!applicationId) {
            return {
                error: new Error("applicationId is required"),
                data: null,
            };
        }

        const { data, error } = await supabase
            .from("ApplicationResponses")
            .select(`
                response,
                question_id(question, display_order)
            `)
            .eq("application_id", applicationId)
            .order("display_order",  { foreignTable: 'question_id', ascending: true });
            
        console.log("Supabase data:", data);
        console.log("Supabase error:", error);

        if (error) {
            return {
                error,
                data: null,
            };
        }

        return {
            data,
            error: null,
        };
    }
}

export default Application;