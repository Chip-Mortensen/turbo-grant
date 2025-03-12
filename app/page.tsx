import { createClient } from "@/utils/supabase/server";
import Hero from "@/components/home/Hero";
import FeatureGrid from "@/components/home/FeatureGrid";
import ProcessFlow from "@/components/home/ProcessFlow";
import ROICalculator from "@/components/home/ROICalculator";
import { Card } from "@/components/ui/card";

export default async function Home() {
  return (
    <div className="container py-6">
      <Card className="overflow-hidden">
        <main className="bg-white">
          <Hero />
          <FeatureGrid />
          <ProcessFlow />
          <ROICalculator />
        </main>
      </Card>
    </div>
  );
}
