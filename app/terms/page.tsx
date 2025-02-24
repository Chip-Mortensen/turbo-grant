export const metadata = {
  title: "Terms of Use | Turbo Grant",
  description: "Terms of Use for Turbo Grant",
};

export default function TermsPage() {
  return (
    <div className="max-w-3xl mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Terms of Use</h1>
      
      <div className="prose prose-sm">
        <p className="text-muted-foreground mb-4">
          Last updated: {new Date().toLocaleDateString()}
        </p>
        
        <section className="mb-6">
          <h2 className="text-xl font-semibold mb-3">1. Introduction</h2>
          <p>
            Welcome to Turbo Grant. These Terms of Use govern your use of our website and services.
            By accessing or using Turbo Grant, you agree to be bound by these terms.
          </p>
        </section>
        
        <section className="mb-6">
          <h2 className="text-xl font-semibold mb-3">2. Placeholder Section</h2>
          <p>
            This is a placeholder for the Terms of Use content. This section will be updated with
            detailed information about user agreements, acceptable use policies, and other legal terms.
          </p>
        </section>
        
        <section className="mb-6">
          <h2 className="text-xl font-semibold mb-3">3. Contact Information</h2>
          <p>
            If you have any questions about these Terms of Use, please contact us at:
            support@turbogrant.example.com
          </p>
        </section>
      </div>
    </div>
  );
} 