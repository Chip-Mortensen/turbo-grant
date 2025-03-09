"use client";

import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ComponentPropsWithoutRef } from "react";

interface BackButtonProps extends Omit<ComponentPropsWithoutRef<typeof Button>, 'asChild'> {
  href: string;
  label?: string;
}

/**
 * A button component for navigating back to previous pages.
 * This component follows the original implementation pattern to ensure consistency.
 * The structure maintains the correct clickable area confined to the button's boundaries.
 */
export const BackButton = ({
  href,
  label = "Back to Project", 
  variant = "outline", 
  className = "gap-2",
  ...props
}: BackButtonProps) => {
  return (
    <Link href={href} style={{ display: 'inline-block', width: 'fit-content' }}>
      <Button variant={variant} className={className} {...props}>
        <ArrowLeft className="h-4 w-4" />
        {label}
      </Button>
    </Link>
  );
}; 