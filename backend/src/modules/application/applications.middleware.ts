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
                    photo_paths,
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

        const applicationsWithProgress = await Promise.all(
            data.map(async application => {

                const applicationResponses = (responses ?? []).filter(
                    response => response.application_id === application.id
                );

                const totalQuestions = applicationResponses.length;

                const answeredQuestions = applicationResponses.filter(
                    response =>
                        response.response &&
                        response.response.trim().length > 0
                ).length;

                const listing = application.listing as unknown as {
                    pet_name: string;
                    photo_paths: string[];
                    shelter: { shelter_name: string } | { shelter_name: string }[];
                };

                const shelter = Array.isArray(listing?.shelter)
                    ? listing.shelter[0]
                    : listing?.shelter;

                let petPhoto: string | null = null;

                if (listing?.photo_paths?.length) {
                    const { data: photoData, error: photoError } = await supabase.storage
                        .from("pet-photos")
                        .createSignedUrl(listing.photo_paths[0], 3600);

                    if (photoError) {
                        console.error("Unable to load pet photo:", photoError);
                    } else {
                        petPhoto = photoData.signedUrl;
                    }
                }

                return {
                    ...application,
                    listing: {
                        ...listing,
                        shelter: {
                            ...shelter,
                        },
                        pet_photo: petPhoto,
                    },
                    total_questions: totalQuestions,
                    answered_questions: answeredQuestions,
                };
            })
        );
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
            .update({ application_status: "Pending",
                      submitted_at: new Date().toISOString(),
             })
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
            .update({
                application_status: "Approved",
                decision_feedback: decisionFeedback
            })
            .eq("id", applicationId)
            .eq("application_status", "Pending")
            .select("id")
            .maybeSingle();

        if (lookupError) {
            return { error: lookupError };
        }

        if (!application) {
            const { data: application, error: lookupError } = await supabase
                .from("Applications")
                .select("application_status")
                .eq("id", applicationId)
                .single();

            if (lookupError) {
                return { error: lookupError };
            }

            return {
                error: new Error(`This application's status has already been changed to ${application.application_status}.`),
                status: 409
            };
        }

        return { error: null };
    }

    // CURRENTLY LACKING AUTHENTICATION
    static async denyApplication(supabase: SupabaseClient, applicationId: number, userId: string, decisionFeedback: string) {
            
        const { data: application, error: lookupError } = await supabase
            .from("Applications")
            .update({
                application_status: "Denied",
                decision_feedback: decisionFeedback
            })
            .eq("id", applicationId)
            .eq("application_status", "Pending")
            .select("id")
            .maybeSingle();

        if (lookupError) {
            return { error: lookupError };
        }

        if (!application) {
            const { data: application, error: lookupError } = await supabase
                .from("Applications")
                .select("application_status")
                .eq("id", applicationId)
                .single();

            if (lookupError) {
                return { error: lookupError };
            }

            return {
                error: new Error(`This application's status has already been changed to ${application.application_status}.`),
                status: 409
            };
        }
        return { error: null };
    }


    static async withdrawApplication(supabase: SupabaseClient, applicationId: number, userId: string) {
        const { data: application, error } = await supabase
            .from("Applications")
            .update({ application_status: "Withdrawn" })
            .eq("id", applicationId)
            .eq("applicant_uid", userId)
            .eq("application_status", "Pending")
            .select("id")
            .maybeSingle();

        if (error) {
            return { error };
        }

        if (!application) {
            const { data: currentApplication, error: lookupError } = await supabase
                .from("Applications")
                .select("application_status")
                .eq("id", applicationId)
                .eq("applicant_uid", userId)
                .single();

            if (lookupError) {
                return { error: lookupError };
            }

            return {
                error: new Error(`This application's status has already been changed to ${currentApplication.application_status}.`),
                status: 409
            };
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

        const applicationsWithUserInfo = await Promise.all(
            (data ?? []).map(async application => {
                const { data: authData, error: authError } =
                    await supabase.auth.admin.getUserById(application.applicant_uid);

                if (authError) {
                    console.error("Unable to get applicant auth info:", authError);
                }

                const { data: profile, error: profileError } = await supabase
                    .from("Profile")
                    .select("profilePicturePath")
                    .eq("userId", application.applicant_uid)
                    .maybeSingle();

                if (profileError) {
                    console.error("Unable to get applicant profile:", profileError);
                }

                let applicantProfilePicture: string | null = null;

                if (profile?.profilePicturePath) {
                    const { data: pictureData, error: pictureError } = await supabase.storage
                        .from("profile-pictures")
                        .createSignedUrl(profile.profilePicturePath, 3600);

                    if (pictureError) {
                        console.error("Unable to get applicant profile picture:", pictureError);
                    } else {
                        applicantProfilePicture = pictureData.signedUrl;
                    }
                }

                return {
                    ...application,
                    applicant_name: authData.user?.user_metadata.name ?? "Unknown User",
                    applicant_profile_picture: applicantProfilePicture,
                };
            })
        );

        return {
            data: applicationsWithUserInfo,
            error: null,
        };
    }


    static async markPetApplicationsSeen(supabase: SupabaseClient, listingId: number) {
        if (!listingId) {
            return {
                error: new Error("listingId is required"),
                data: null,
            };
        }

        const { data, error } = await supabase
            .from("Applications")
            .update( {staff_seen: true})
            .eq("listing_id", listingId)

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
        }
    }
};

export default Application;