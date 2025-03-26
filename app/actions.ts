"use server";

import { encodedRedirect } from "@/utils/utils";
import { createClient } from "@/utils/supabase/server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getPineconeClient } from '@/lib/vectorization/pinecone';

export const signUpAction = async (formData: FormData) => {
  const email = formData.get("email")?.toString();
  const password = formData.get("password")?.toString();
  const first_name = formData.get("first_name")?.toString();
  const last_name = formData.get("last_name")?.toString();
  const role = formData.get("role")?.toString();
  const supabase = await createClient();
  const origin = (await headers()).get("origin");

  if (!email || !password || !first_name || !last_name || !role) {
    return encodedRedirect(
      "error",
      "/sign-up",
      "All fields are required",
    );
  }

  if (password.length < 6) {
    return encodedRedirect(
      "error",
      "/sign-up",
      "Password must be at least 6 characters long",
    );
  }

  // Sign up the user
  const { error, data } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/callback?next=verification`,
      data: {
        first_name,
        last_name,
        role
      }
    },
  });

  if (error) {
    console.error(error.code + " " + error.message);
    return encodedRedirect("error", "/sign-up", error.message);
  }

  // Update the user profile with the additional fields
  if (data.user) {
    const { error: profileError } = await supabase
      .from('users')
      .update({
        first_name,
        last_name,
        role
      })
      .eq('id', data.user.id);

    if (profileError) {
      console.error('Error updating user profile:', profileError);
      // Continue with sign-up even if profile update fails
    }
  }

  return encodedRedirect(
    "success",
    "/sign-up",
    "Thanks for signing up! Please check your email for a verification link.",
  );
};

export const signInAction = async (formData: FormData) => {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const supabase = await createClient();

  const { error, data } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return encodedRedirect("error", "/sign-in", error.message);
  }

  // Check if email is verified
  if (!data.user.email_confirmed_at) {
    await supabase.auth.signOut();
    return encodedRedirect(
      "error",
      "/sign-in",
      "Please verify your email before signing in.",
    );
  }

  // Check if user has selected an organization
  const { data: profile } = await supabase
    .from('users')
    .select('institution_id')
    .eq('id', data.user.id)
    .single();

  if (!profile?.institution_id) {
    return redirect("/organizations/select");
  }

  return redirect("/projects");
};

export const forgotPasswordAction = async (formData: FormData) => {
  const email = formData.get("email")?.toString();
  const supabase = await createClient();
  const origin = (await headers()).get("origin");

  if (!email) {
    return encodedRedirect("error", "/forgot-password", "Email is required");
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?redirect_to=/reset-password`,
  });

  if (error) {
    console.error(error.message);
    return encodedRedirect(
      "error",
      "/forgot-password",
      "Could not reset password",
    );
  }

  return encodedRedirect(
    "success",
    "/forgot-password",
    "Check your email for a link to reset your password.",
  );
};

export const resetPasswordAction = async (formData: FormData) => {
  const supabase = await createClient();

  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  if (!password || !confirmPassword) {
    return encodedRedirect(
      "error",
      "/reset-password",
      "Password and confirm password are required",
    );
  }

  if (password !== confirmPassword) {
    return encodedRedirect(
      "error",
      "/reset-password",
      "Passwords do not match",
    );
  }

  const { error } = await supabase.auth.updateUser({
    password: password,
  });

  if (error) {
    return encodedRedirect(
      "error",
      "/reset-password",
      "Password update failed",
    );
  }

  // After successful password reset, redirect to sign-in
  return encodedRedirect(
    "success",
    "/sign-in",
    "Password updated successfully. Please sign in with your new password.",
  );
};

export const signOutAction = async () => {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return redirect("/sign-in");
};

export async function createProject(formData: FormData) {
  const supabase = await createClient()
  
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Not authenticated" }
  }

  const title = formData.get("title")?.toString()

  if (!title) {
    return { error: "Title is required" }
  }

  const { data, error } = await supabase
    .from("research_projects")
    .insert([{ title, user_id: user.id }])
    .select()
    .single()

  if (error) {
    return { error: error.message }
  }

  return { success: true, projectId: data.id }
}

export async function deleteDescription(descriptionId: string) {
  try {
    console.log('Starting deletion process for description:', descriptionId);
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { error: "Not authenticated" };
    }

    // Get the description to find the file path and Pinecone IDs
    const { data: description } = await supabase
      .from("research_descriptions")
      .select("*")
      .eq("id", descriptionId)
      .single();

    if (!description) {
      return { error: "Description not found" };
    }

    // Delete the file from storage first
    const { error: storageError } = await supabase.storage
      .from("research-descriptions")
      .remove([description.file_path]);

    if (storageError) {
      console.error('Error deleting storage file:', storageError);
      return { error: storageError.message };
    }

    // Delete vectors from Pinecone if they exist
    if (description.pinecone_ids && description.pinecone_ids.length > 0) {
      try {
        const pinecone = await getPineconeClient();
        const index = pinecone.index(process.env.PINECONE_INDEX_NAME!);
        
        await index.deleteMany(description.pinecone_ids);
        console.log('Deleted vectors from Pinecone:', description.pinecone_ids);
      } catch (pineconeError) {
        console.error('Error deleting from Pinecone:', pineconeError);
        // Continue with other deletions even if Pinecone fails
      }
    }

    // Delete any associated processing queue items
    const { error: queueError } = await supabase
      .from('processing_queue')
      .delete()
      .eq('content_type', 'research_description')
      .eq('content_id', descriptionId);

    if (queueError) {
      console.error('Error deleting queue items:', queueError);
      // Continue with profile deletion even if queue deletion fails
    }

    // Finally, delete the database record
    const { error: dbError } = await supabase
      .from("research_descriptions")
      .delete()
      .eq("id", descriptionId);

    if (dbError) {
      console.error('Error deleting description record:', dbError);
      return { error: dbError.message };
    }

    console.log('Successfully deleted description and associated data');
    return { success: true };
  } catch (error) {
    console.error('Unexpected error during deletion:', error);
    return { error: 'Internal server error' };
  }
}

export async function getDescriptionUrl(descriptionId: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Not authenticated" }
  }

  // Get the description to find the file path
  const { data: description } = await supabase
    .from("research_descriptions")
    .select("*")
    .eq("id", descriptionId)
    .single()

  if (!description) {
    return { error: "Description not found" }
  }

  // Get a signed URL for the file
  const { data, error } = await supabase.storage
    .from("research-descriptions")
    .createSignedUrl(description.file_path, 60) // URL valid for 60 seconds

  if (error) {
    return { error: error.message }
  }

  if (!data) {
    return { error: "Could not generate download URL" }
  }

  return { url: data.signedUrl }
}

export async function getFigureUrl(figureId: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Not authenticated" }
  }

  // Get the figure to find the file path
  const { data: figure } = await supabase
    .from("scientific_figures")
    .select("*")
    .eq("id", figureId)
    .single()

  if (!figure) {
    return { error: "Figure not found" }
  }

  // Get a signed URL for the file
  const { data, error } = await supabase.storage
    .from("scientific-figures")
    .createSignedUrl(figure.image_path, 60) // URL valid for 60 seconds

  if (error) {
    return { error: error.message }
  }

  if (!data) {
    return { error: "Could not generate view URL" }
  }

  return { url: data.signedUrl }
}

export async function deleteFigure(figureId: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Not authenticated" }
  }

  // Get the figure to find the file path
  const { data: figure } = await supabase
    .from("scientific_figures")
    .select("*")
    .eq("id", figureId)
    .single()

  if (!figure) {
    return { error: "Figure not found" }
  }

  // Delete the file from storage
  const { error: storageError } = await supabase.storage
    .from("scientific-figures")
    .remove([figure.image_path])

  if (storageError) {
    return { error: storageError.message }
  }

  // Delete vector from Pinecone if it exists
  if (figure.pinecone_id) {
    try {
      const pinecone = await getPineconeClient();
      const index = pinecone.index(process.env.PINECONE_INDEX_NAME!);
      
      await index.deleteOne(figure.pinecone_id);
      console.log('Deleted vector from Pinecone:', figure.pinecone_id);
    } catch (pineconeError) {
      console.error('Error deleting from Pinecone:', pineconeError);
      // Continue with other deletions even if Pinecone fails
    }
  }

  // Delete any associated processing queue items
  const { error: queueError } = await supabase
    .from('processing_queue')
    .delete()
    .eq('content_type', 'scientific_figure')
    .eq('content_id', figureId);

  if (queueError) {
    console.error('Error deleting queue items:', queueError);
    // Continue with figure deletion even if queue deletion fails
  }

  // Delete the database record
  const { error: dbError } = await supabase
    .from("scientific_figures")
    .delete()
    .eq("id", figureId)

  if (dbError) {
    return { error: dbError.message }
  }

  return { success: true }
}

export async function updateFigureOrder(updates: { id: string; order_index: number }[]) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Not authenticated" }
  }

  // Update each figure's order_index
  for (const update of updates) {
    const { error } = await supabase
      .from("scientific_figures")
      .update({ order_index: update.order_index })
      .eq("id", update.id)

    if (error) {
      return { error: error.message }
    }
  }

  return { success: true }
}

export async function updateProfileAction(formData: FormData) {
  const supabase = await createClient();
  
  const id = formData.get("id") as string;
  const first_name = formData.get("first_name") as string;
  const last_name = formData.get("last_name") as string;
  const role = formData.get("role") as string;
  const institution_id = formData.get("institution_id") as string;
  const era_commons_id = formData.get("era_commons_id") as string;
  const orcid = formData.get("orcid") as string;
  const phone = formData.get("phone") as string;

  // Prepare the update data
  const updateData: any = {
    first_name,
    last_name,
    phone,
    era_commons_id,
    orcid,
    updated_at: new Date().toISOString(),
  };

  // Only add optional fields if they have values
  if (role) updateData.role = role;
  if (institution_id) updateData.institution_id = institution_id;

  const { error } = await supabase
    .from('users')
    .update(updateData)
    .eq('id', id);

  if (error) {
    console.error('Error updating profile:', error);
    return encodedRedirect("error", "/profile", "Failed to update profile: " + error.message);
  }

  return encodedRedirect("success", "/profile", "Profile updated successfully");
}

export async function createOrganization(formData: FormData) {
  const supabase = await createClient()
  
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Not authenticated" }
  }

  const name = formData.get("name")?.toString()
  const uei = formData.get("uei")?.toString()
  const sam_status = formData.get("sam_status") === "on"
  const era_commons_code = formData.get("era_commons_code")?.toString() || null
  const nsf_id = formData.get("nsf_id")?.toString() || null
  const organization_type = formData.get("organization_type")?.toString() || null

  if (!name) {
    return { error: "Organization name is required" }
  }

  if (uei && uei.length !== 12) {
    return { error: "UEI must be 12 characters if provided" }
  }

  if (!organization_type) {
    return { error: "Organization type is required" }
  }

  const { error } = await supabase
    .from("organizations")
    .insert([{ 
      name, 
      uei, 
      sam_status, 
      era_commons_code, 
      nsf_id, 
      organization_type,
      created_by: user.id 
    }])

  if (error) {
    return { error: error.message }
  }

  return { success: true }
}

export async function deleteChalkTalk(chalkTalkId: string) {
  try {
    console.log('Starting deletion process for chalk talk:', chalkTalkId);
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { error: "Not authenticated" };
    }

    // Get the chalk talk to find the file path and Pinecone IDs
    const { data: chalkTalk } = await supabase
      .from("chalk_talks")
      .select("*")
      .eq("id", chalkTalkId)
      .single();

    if (!chalkTalk) {
      return { error: "Chalk talk not found" };
    }

    // Delete the file from storage first
    const { error: storageError } = await supabase.storage
      .from("chalk-talks")
      .remove([chalkTalk.media_path]);

    if (storageError) {
      console.error('Error deleting storage file:', storageError);
      return { error: storageError.message };
    }

    // Delete vectors from Pinecone if they exist
    if (chalkTalk.pinecone_ids && chalkTalk.pinecone_ids.length > 0) {
      try {
        const pinecone = await getPineconeClient();
        const index = pinecone.index(process.env.PINECONE_INDEX_NAME!);
        
        await index.deleteMany(chalkTalk.pinecone_ids);
        console.log('Deleted vectors from Pinecone:', chalkTalk.pinecone_ids);
      } catch (pineconeError) {
        console.error('Error deleting from Pinecone:', pineconeError);
        // Continue with other deletions even if Pinecone fails
      }
    }

    // Delete any associated processing queue items
    const { error: queueError } = await supabase
      .from('processing_queue')
      .delete()
      .eq('content_type', 'chalk_talk')
      .eq('content_id', chalkTalkId);

    if (queueError) {
      console.error('Error deleting queue items:', queueError);
      // Continue with chalk talk deletion even if queue deletion fails
    }

    // Finally, delete the database record
    const { error: dbError } = await supabase
      .from("chalk_talks")
      .delete()
      .eq("id", chalkTalkId);

    if (dbError) {
      console.error('Error deleting chalk talk record:', dbError);
      return { error: dbError.message };
    }

    console.log('Successfully deleted chalk talk and associated data');
    return { success: true };
  } catch (error) {
    console.error('Unexpected error during deletion:', error);
    return { error: 'Internal server error' };
  }
}

interface AttachmentDocument {
  document: {
    id: string;
    name: string;
  };
  attachmentFilePath?: string;
}

interface DeletionResults {
  researchDescriptions: string[];
  scientificFigures: string[];
  chalkTalks: string[];
  completedDocuments: string[];
  errors: string[];
}

export async function deleteProject(projectId: string): Promise<{ success?: boolean; error?: any; deletionResults: DeletionResults }> {
  const deletionResults: DeletionResults = {
    researchDescriptions: [],
    scientificFigures: [],
    chalkTalks: [],
    completedDocuments: [],
    errors: []
  };

  try {
    console.log('Starting deletion process for project:', projectId);
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { error: "Not authenticated", deletionResults };
    }

    // 1. Get all associated records and project data
    const { data: project, error: projectError } = await supabase
      .from('research_projects')
      .select(`
        id,
        title,
        research_descriptions (id, file_path, pinecone_ids),
        scientific_figures (id, image_path, pinecone_id),
        chalk_talks (id, media_path, pinecone_ids),
        completed_documents (id, file_path, file_url)
      `)
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      console.error('Error fetching project:', projectError);
      return { error: projectError || new Error('Project not found'), deletionResults };
    }

    // Convert research_descriptions to array if it's not already
    const researchDescriptions = Array.isArray(project.research_descriptions) 
      ? project.research_descriptions 
      : project.research_descriptions 
        ? [project.research_descriptions]
        : [];

    // Convert scientific_figures to array if it's not already
    const scientificFigures = Array.isArray(project.scientific_figures)
      ? project.scientific_figures
      : project.scientific_figures
        ? [project.scientific_figures]
        : [];

    // Convert chalk_talks to array if it's not already
    const chalkTalks = Array.isArray(project.chalk_talks)
      ? project.chalk_talks
      : project.chalk_talks
        ? [project.chalk_talks]
        : [];

    // Convert completed_documents to array if it's not already
    const completedDocuments = Array.isArray(project.completed_documents)
      ? project.completed_documents
      : project.completed_documents
        ? [project.completed_documents]
        : [];

    // 2. Delete all storage files
    const storagePromises = [
      // Research descriptions
      ...researchDescriptions
        .map(async d => {
          try {
            if (!d?.file_path) return;
            const { error } = await supabase.storage
              .from('research-descriptions')
              .remove([d.file_path]);
            
            if (error) throw error;
            deletionResults.researchDescriptions.push(d.file_path);
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            deletionResults.errors.push(`Failed to delete research description: ${message}`);
          }
        }),
      
      // Scientific figures
      ...scientificFigures
        .map(async f => {
          try {
            if (!f?.image_path) return;
            const { error } = await supabase.storage
              .from('scientific-figures')
              .remove([f.image_path]);
            
            if (error) throw error;
            deletionResults.scientificFigures.push(f.image_path);
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            deletionResults.errors.push(`Failed to delete scientific figure: ${message}`);
          }
        }),
      
      // Chalk talks
      ...chalkTalks
        .map(async t => {
          try {
            if (!t?.media_path) return;
            const { error } = await supabase.storage
              .from('chalk-talks')
              .remove([t.media_path]);
            
            if (error) throw error;
            deletionResults.chalkTalks.push(t.media_path);
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            deletionResults.errors.push(`Failed to delete chalk talk: ${message}`);
          }
        }),
      
      // Completed documents
      ...completedDocuments
        .map(async d => {
          try {
            if (!d?.file_path) return;
            const { error } = await supabase.storage
              .from('completed-documents')
              .remove([d.file_path]);
            
            if (error) throw error;
            deletionResults.completedDocuments.push(d.file_path);
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            deletionResults.errors.push(`Failed to delete completed document: ${message}`);
          }
        })
    ];

    // 3. Delete all Pinecone vectors
    let pineconePromises: Promise<any>[] = [];
    try {
      const pineconeClient = await getPineconeClient();
      const index = pineconeClient.index(process.env.PINECONE_INDEX_NAME!);
      
      pineconePromises = [
        // Research descriptions (multiple vectors per description)
        ...researchDescriptions
          .filter(d => d?.pinecone_ids?.length)
          .map(async d => {
            try {
              if (!d.pinecone_ids?.length) return;
              await index.deleteMany(d.pinecone_ids);
            } catch (error) {
              const message = error instanceof Error ? error.message : 'Unknown error';
              deletionResults.errors.push(`Failed to delete research description vectors: ${message}`);
            }
          }),
        
        // Scientific figures (one vector per figure)
        ...scientificFigures
          .filter(f => f?.pinecone_id)
          .map(async f => {
            try {
              if (!f.pinecone_id) return;
              await index.deleteOne(f.pinecone_id);
            } catch (error) {
              const message = error instanceof Error ? error.message : 'Unknown error';
              deletionResults.errors.push(`Failed to delete scientific figure vector: ${message}`);
            }
          }),
        
        // Chalk talks (multiple vectors per talk)
        ...chalkTalks
          .filter(t => t?.pinecone_ids?.length)
          .map(async t => {
            try {
              if (!t.pinecone_ids?.length) return;
              await index.deleteMany(t.pinecone_ids);
            } catch (error) {
              const message = error instanceof Error ? error.message : 'Unknown error';
              deletionResults.errors.push(`Failed to delete chalk talk vectors: ${message}`);
            }
          })
      ];
    } catch (pineconeError) {
      console.error('Error initializing Pinecone client:', pineconeError);
      const message = pineconeError instanceof Error ? pineconeError.message : 'Unknown error';
      deletionResults.errors.push(`Failed to initialize Pinecone client: ${message}`);
    }

    // 4. Wait for all deletions to complete
    await Promise.all([...storagePromises, ...pineconePromises]);

    // 5. Delete the project (this will CASCADE to all related records)
    const { error } = await supabase
      .from('research_projects')
      .delete()
      .eq('id', projectId);

    if (error) {
      console.error('Error deleting project:', error);
      return { error, deletionResults };
    }

    return { success: true, deletionResults };
  } catch (error) {
    console.error('Error in deleteProject:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { 
      error,
      deletionResults: {
        researchDescriptions: [],
        scientificFigures: [],
        chalkTalks: [],
        completedDocuments: [],
        errors: [message]
      }
    };
  }
}
