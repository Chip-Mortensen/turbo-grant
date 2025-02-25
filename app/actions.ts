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
    return redirect("/select-organization");
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
    return encodedRedirect("error", "/dashboard/profile", "Failed to update profile: " + error.message);
  }

  return encodedRedirect("success", "/dashboard/profile", "Profile updated successfully");
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

  if (!uei || uei.length !== 12) {
    return { error: "Valid UEI (12 characters) is required" }
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
