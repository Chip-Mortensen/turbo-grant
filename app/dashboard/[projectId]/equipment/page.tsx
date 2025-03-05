import { Button } from "@/components/ui/button";
import { ArrowLeft, Wrench } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import EquipmentExtractor from "@/components/equipment/equipment-extractor";

interface PageProps {
  params: Promise<{ projectId: string }>
}

export const metadata: Metadata = {
  title: "Equipment | Turbo Grant",
  description: "Manage your project equipment",
};

export default async function EquipmentPage({ params }: PageProps) {
  const { projectId } = await params;
  
  return (
    <div className="container py-6 space-y-6">
      <Link href={`/dashboard/${projectId}`} passHref>
        <Button variant="outline" className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Project
        </Button>
      </Link>
      
      <EquipmentExtractor projectId={projectId} />
    </div>
  );
} 