import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import EquipmentList from "@/components/projects/equipment/equipment-list";
import { BackButton } from "@/components/ui/back-button";
import EquipmentAnalysisTrigger from "@/components/projects/equipment/equipment-analysis-trigger";

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
      <BackButton href={`/projects/${projectId}`} />
      
      {/* Client component that triggers equipment analysis */}
      <EquipmentAnalysisTrigger projectId={projectId} />
      
      <EquipmentList projectId={projectId} />
    </div>
  );
} 