"use server";

import { encodedRedirect } from "@/utils/utils";
import { createClient } from "@/utils/supabase/server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getPineconeClient } from '@/lib/vectorization/pinecone';

export const signUpAction = async (formData: FormData) => {
  const email = formData.get("email")?.toString();
  const password = formData.get("password")?.toString();
  const supabase = await createClient();
  const origin = (await headers()).get("origin");

  if (!email || !password) {
    return encodedRedirect(
      "error",
      "/sign-up",
      "Email and password are required",
    );
  }

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/callback?next=verification`,
    },
  });

  if (error) {
    console.error(error.code + " " + error.message);
    return encodedRedirect("error", "/sign-up", error.message);
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

  return redirect("/dashboard");
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

  const { error } = await supabase
    .from("research_projects")
    .insert([{ title, user_id: user.id }])

  if (error) {
    return { error: error.message }
  }

  return { success: true }
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
      .from("written_descriptions")
      .select("*")
      .eq("id", descriptionId)
      .single();

    if (!description) {
      return { error: "Description not found" };
    }

    // Delete the file from storage first
    const { error: storageError } = await supabase.storage
      .from("written-descriptions")
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
      .eq('content_type', 'description')
      .eq('content_id', descriptionId);

    if (queueError) {
      console.error('Error deleting queue items:', queueError);
      // Continue with profile deletion even if queue deletion fails
    }

    // Finally, delete the database record
    const { error: dbError } = await supabase
      .from("written_descriptions")
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
    .from("written_descriptions")
    .select("*")
    .eq("id", descriptionId)
    .single()

  if (!description) {
    return { error: "Description not found" }
  }

  // Get a signed URL for the file
  const { data, error } = await supabase.storage
    .from("written-descriptions")
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
    .from("scientific_figures")
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
    .from("scientific_figures")
    .remove([figure.image_path])

  if (storageError) {
    return { error: storageError.message }
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

export async function deleteResearcher(id: string) {
  try {
    console.log('Starting deletion process for researcher:', id);
    const supabase = await createClient();

    // Get user for authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { error: "Not authenticated" };
    }

    // First, check if researcher exists and get their data
    const { data: researcher, error: fetchError } = await supabase
      .from('researcher_profiles')
      .select('pinecone_id, project_id')
      .eq('id', id)
      .single();

    if (fetchError) {
      console.error('Error fetching researcher:', fetchError);
      return { error: 'Failed to fetch researcher' };
    }

    if (!researcher) {
      return { error: 'Researcher not found' };
    }

    // Delete vectors from Pinecone if they exist
    if (researcher.pinecone_id) {
      try {
        const pinecone = await getPineconeClient();
        const index = pinecone.index(process.env.PINECONE_INDEX_NAME!);
        
        // The pinecone_id field contains comma-separated IDs
        const vectorIds = researcher.pinecone_id.split(',');
        await index.deleteMany(vectorIds);
        
        console.log('Deleted vectors from Pinecone:', vectorIds);
      } catch (pineconeError) {
        console.error('Error deleting from Pinecone:', pineconeError);
        // Continue with other deletions even if Pinecone fails
      }
    }

    // Delete any associated processing queue items
    const { error: queueError } = await supabase
      .from('processing_queue')
      .delete()
      .eq('content_type', 'researcher')
      .eq('content_id', id);

    if (queueError) {
      console.error('Error deleting queue items:', queueError);
      // Continue with profile deletion even if queue deletion fails
    }

    // Finally, delete the researcher profile
    const { error: deleteError } = await supabase
      .from('researcher_profiles')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Error deleting researcher profile:', deleteError);
      return { error: 'Failed to delete researcher profile' };
    }

    console.log('Successfully deleted researcher and associated data');
    return { success: true };
  } catch (error) {
    console.error('Unexpected error during deletion:', error);
    return { error: 'Internal server error' };
  }
}
