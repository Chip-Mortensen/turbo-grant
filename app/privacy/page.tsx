export const metadata = {
  title: "Privacy Policy | Turbo Grant",
  description: "Privacy Policy for Turbo Grant",
};

export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Privacy Policy</h1>
      
      <div className="prose prose-sm">
        <p className="text-muted-foreground mb-4">
          Last updated: {new Date().toLocaleDateString()}
        </p>
        
        <section className="mb-6">
          <h2 className="text-xl font-semibold mb-3">1. Introduction</h2>
          <p>
            At Turbo Grant, we take your privacy seriously. This Privacy Policy explains how we collect,
            use, disclose, and safeguard your information when you use our service.
          </p>
        </section>
        
        <section className="mb-6">
          <h2 className="text-xl font-semibold mb-3">2. Information We Collect</h2>
          <p>
            This is a placeholder for the Privacy Policy content. This section will be updated with
            detailed information about data collection, usage, storage, and protection practices.
          </p>
        </section>
        
        <section className="mb-6">
          <h2 className="text-xl font-semibold mb-3">3. How We Use Your Information</h2>
          <p>
            This is a placeholder section that will detail how collected information is used to
            provide and improve our services.
          </p>
        </section>
        
        <section className="mb-6">
          <h2 className="text-xl font-semibold mb-3">4. Contact Us</h2>
          <p>
            If you have questions or concerns about this Privacy Policy, please contact us at:
            privacy@turbogrant.example.com
          </p>
        </section>
      </div>
    </div>
  );
} 