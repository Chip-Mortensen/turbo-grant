import { Document } from '@/types/documents';
import Link from 'next/link';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface DocumentListProps {
  documents: Document[];
  onDelete: (id: string) => Promise<void>;
}

export default function DocumentList({ documents, onDelete }: DocumentListProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Agency</TableHead>
          <TableHead>Fields</TableHead>
          <TableHead>Optional</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {documents.map((document) => (
          <TableRow key={document.id}>
            <TableCell className="font-medium">{document.name}</TableCell>
            <TableCell>{document.agency}</TableCell>
            <TableCell>{document.fields.length} fields</TableCell>
            <TableCell>{document.optional ? 'Yes' : 'No'}</TableCell>
            <TableCell>
              <div className="flex items-center gap-2">
                <Link
                  href={`/documents/${document.id}`}
                  className="text-primary hover:text-primary/80"
                >
                  Edit
                </Link>
                <button
                  onClick={() => onDelete(document.id)}
                  className="text-destructive hover:text-destructive/80"
                >
                  Delete
                </button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
} 