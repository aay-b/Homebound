import type { SupabaseClient } from "@supabase/supabase-js";

class Application {

    static async createApplication(supabase: SupabaseClient, listingId: number, userId: string) {
        if (!userId) {
            return {
                error: new Error("userId is required"),
                data: null,
            };
        }
        if (!listingId) {
            return {
                error: new Error("listingId is required"),
                data: null,
            };
        }

        const { data: questions, error: questionsError } = await supabase
            .from("AdoptionQuestions")
            .select(`
                id,
                question,
                display_order
            `)
            .eq("listing_id", listingId)
            .order("display_order", { ascending: true });

        if (questionsError) {
            return {
                error: questionsError,
                data: null,
            };
        }

        const { data: application, error: applicationError } = await supabase
            .from("Applications")
            .insert({
                applicant_id: userId,
                listing_id: listingId,
                application_status: "In Progress",
                commitment_question: false,
            })
            .select()
            .single();

        if (applicationError) {
            return {
                error: applicationError,
                data: null,
            };
        }
        
        const responses = (questions ?? []).map(question => ({
            application_id: application.id,
            question_id: question.id,
            response: "",
        }));

        if (responses.length > 0) {
            const { error: responsesError } = await supabase
                .from("ApplicationResponses")
                .insert(responses);

            if (responsesError) {
                await supabase
                    .from("Applications")
                    .delete()
                    .eq("id", application.id);
                return {
                    error: responsesError,
                    data: null,
                };
            }
        }

        return {
            data: application,
            error: null,
        };
    }

    
    static async getUserApplicationInfo(supabase: SupabaseClient, userId: string) {
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
            .eq("applicant_uid", userId)
            .order("created_at", { ascending: false });

        if (error) {
            return {
                error,
                data: null,
            };
        }

        if (!data || data.length === 0) {
            return {
                data: [],
                error: null,
            };
        }

        const applicationIds = data.map(
            application => application.id
        );

        const { data: responses, error: responsesError } = await supabase
            .from("ApplicationResponses")
            .select("application_id, response")
            .in("application_id", applicationIds);

        if (responsesError) {
            return {
                error: responsesError,
                data: null,
            };
        }

        const applicationsWithProgress = data.map(application => {

            const applicationResponses = (responses ?? []).filter(
                response => response.application_id === application.id
            );

            const totalQuestions = applicationResponses.length;

            const answeredQuestions = applicationResponses.filter(
                response =>
                    response.response &&
                    response.response.trim().length > 0
            ).length;

            return {
                ...application,
                total_questions: totalQuestions,
                answered_questions: answeredQuestions,
            };
        });

        return {
            data: applicationsWithProgress,
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


    static async getApplicationResponses(supabase: SupabaseClient, applicationId: number, userId: string) {
        if (!applicationId) {
            return {
                error: new Error("applicationId is required"),
                data: null,
            };
        }

        const { data: application, error: applicationError } = await supabase
            .from("Applications")
            .select("id")
            .eq("id", applicationId)
            .maybeSingle();

        if (applicationError) {
            return {
                error: applicationError,
                data: null,
            };
        }

        if (!application) {
            return {
                error: new Error("You are not authorized to view this application"),
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


    static async saveChanges(supabase: SupabaseClient, applicationId: number, userId: string, responses: { id: number; response: string }[], commitment: boolean, userNotes: String) {
        
        const { data: application, error: lookupError } = await supabase
            .from("Applications")
            .select("application_status")
            .eq("id", applicationId)
            .eq("applicant_uid", userId)
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

    static async submitApplication(supabase: SupabaseClient, applicationId: number, userId: string) {
            
        const { data: application, error: lookupError } = await supabase
            .from("Applications")
            .select("application_status")
            .eq("id", applicationId)
            .eq("applicant_uid", userId)
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

    // CURRENTLY LACKING AUTHENTICATION
    static async approveApplication(supabase: SupabaseClient, applicationId: number, userId: string, decisionFeedback: string) {
            
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
                error: new Error(`This application's status has already been changed to ${application.application_status}.`),
                status: 409
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

    // CURRENTLY LACKING AUTHENTICATION
    static async denyApplication(supabase: SupabaseClient, applicationId: number, userId: string, decisionFeedback: string) {
            
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
                error: new Error(`This application's status has already been changed to ${application.application_status}.`),
                status: 409
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


    static async withdrawApplication(supabase: SupabaseClient, applicationId: number, userId: string) {
            
        const { data: application, error: lookupError } = await supabase
            .from("Applications")
            .select("application_status")
            .eq("id", applicationId)
            .eq("applicant_uid", userId)
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
            .update({ application_status: "Withdrawn" })
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
                applicant_uid,
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

        const applicationsWithNames = await Promise.all(
            (data ?? []).map(async (application) => {
                const { data: authData, error: authError } =
                    await supabase.auth.admin.getUserById(
                        application.applicant_uid
                    );

                if (authError) {
                    console.error(
                        "Unable to retrieve applicant:",
                        application.applicant_uid,
                        authError
                    );
                }

                return {
                    ...application,
                    applicant_name: authData.user?.user_metadata.name,
                };
            })
        );

        return {
            data: applicationsWithNames,
            error: null,
        };
    }
}

export default Application;