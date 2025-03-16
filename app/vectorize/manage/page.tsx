import { Metadata } from 'next';
import ManageVectors from '@/components/vectorize/manage-vectors';

export const metadata: Metadata = {
  title: 'Manage Vectorized Documents',
  description: 'View and manage your vectorized documents',
};

export default function ManageVectorsPage() {
  return (
    <div className="container py-6 space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Manage Vectorized Documents</h1>
        <p className="text-muted-foreground">
          View and delete your vectorized documents stored in Pinecone.
        </p>
      </div>
      
      <div className="h-[calc(100vh-200px)]">
        <ManageVectors />
      </div>
    </div>
  );
} 