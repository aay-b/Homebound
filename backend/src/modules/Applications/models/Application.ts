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


    static async saveChanges(supabase: SupabaseClient, applicationId: number, responses: { id: number; response: string }[], commitment: boolean, userNotes: String) {
        
        const { data: application, error: lookupError } = await supabase
            .from("Applications")
            .select("application_status")
            .eq("id", applicationId)
            .single();

        if (lookupError) {
            return { error: lookupError };
        }

        if (application.application_status !== "In Progress") {
            return {
                error: new Error("This application's status has changed, and can no longer be edited")
            };
        }

        for (const item of responses) {
            const { data, error } = await supabase
                .from("ApplicationResponses")
                .update({ response: item.response })
                .eq("id", item.id)
                .eq("application_id", applicationId)

            if (error) {
                return { error };
            }
        }

        const { data, error } = await supabase
            .from("Applications")
            .update({ commitment_question: commitment,
                      user_notes: userNotes
             })
            .eq("id", applicationId)

        if (error) {
            return { error };
        }

        return { error: null };
    }

    static async submitApplication(supabase: SupabaseClient, applicationId: number) {
            
        const { data: application, error: lookupError } = await supabase
            .from("Applications")
            .select("application_status")
            .eq("id", applicationId)
            .single();

        if (lookupError) {
            return { error: lookupError };
        }

        if (application.application_status !== "In Progress") {
            return {
                error: new Error("This application's status has already been changed.")
            };
        }

        const { data, error } = await supabase
            .from("Applications")
            .update({ application_status: "Pending" })
            .eq("id", applicationId)

        if (error) {
            return { error };
        }

        return { error: null };
    }


    static async approveApplication(supabase: SupabaseClient, applicationId: number, decisionFeedback: string) {
            
        const { data: application, error: lookupError } = await supabase
            .from("Applications")
            .select("application_status")
            .eq("id", applicationId)
            .single();

        if (lookupError) {
            return { error: lookupError };
        }

        if (application.application_status !== "Pending") {
            return {
                error: new Error("This application's status has already been changed.")
            };
        }

        const { data, error } = await supabase
            .from("Applications")
            .update({ application_status: "Approved",
                      decision_feedback: decisionFeedback})
            .eq("id", applicationId)

        if (error) {
            return { error };
        }

        return { error: null };
    }


    static async denyApplication(supabase: SupabaseClient, applicationId: number, decisionFeedback: string) {
            
        const { data: application, error: lookupError } = await supabase
            .from("Applications")
            .select("application_status")
            .eq("id", applicationId)
            .single();

        if (lookupError) {
            return { error: lookupError };
        }

        if (application.application_status !== "Pending") {
            return {
                error: new Error("This application's status has already been changed.")
            };
        }

        const { data, error } = await supabase
            .from("Applications")
            .update({ application_status: "Denied",
                      decision_feedback: decisionFeedback})
            .eq("id", applicationId)

        if (error) {
            return { error };
        }

        return { error: null };
    }


    static async getPetApplicationInfo(supabase: SupabaseClient, listingId: number) {
        if (!listingId) {
            return {
                error: new Error("listingId is required"),
                data: null,
            };
        }

        const { data, error } = await supabase
            .from("Applications")
            .select(`
                id,
                applicant_id
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
            .eq("listing_id", listingId)
            .eq("application_status", "Pending")
            .order("submitted_at", { ascending: false });

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