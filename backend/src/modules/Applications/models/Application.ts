import type { SupabaseClient } from "@supabase/supabase-js";

class Application {
    
    static async getUserApplicationInfo(supabase: SupabaseClient, userId: number) {
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
                listing_id,
                listing:listing_id (
                    pet_name,
                    shelter:shelter_id (
                        shelter_name
                    )
                ),
                user_notes,
                application_status,
                decision_feedback,
                commitment_question,
                created_at,
                submitted_at
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


    static async getApplicationInfo(supabase: SupabaseClient, application_id: number) {
        if (!application_id) {
            return {
                error: new Error("userId is required"),
                data: null,
            };
        }

        const { data, error } = await supabase
            .from("Applications")
            .select(`
                id,
                listing_id,
                listing:listing_id (
                    pet_name,
                    shelter:shelter_id (
                        shelter_name
                    )
                ),
                user_notes,
                application_status,
                decision_feedback,
                commitment_question,
                created_at,
                submitted_at
            `)
            .eq("id", application_id)

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
                id,
                response,
                question_id(question)
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