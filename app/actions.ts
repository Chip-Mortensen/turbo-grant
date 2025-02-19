"use server";

import { encodedRedirect } from "@/utils/utils";
import { createClient } from "@/utils/supabase/server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

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

  // Delete the file from storage
  const { error: storageError } = await supabase.storage
    .from("written-descriptions")
    .remove([description.file_path])

  if (storageError) {
    return { error: storageError.message }
  }

  // Delete the database record
  const { error: dbError } = await supabase
    .from("written_descriptions")
    .delete()
    .eq("id", descriptionId)

  if (dbError) {
    return { error: dbError.message }
  }

  return { success: true }
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
