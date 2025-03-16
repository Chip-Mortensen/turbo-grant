'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Search, FileText, Calendar, AlertCircle, Trash2, Check, Loader2 } from 'lucide-react';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';

interface VectorizedDocument {
  id: string;
  fileName: string;
  fileType: string;
  chunks: number;
  createdAt: string;
  userId: string;
}

export default function ManageVectors() {
  const [documents, setDocuments] = useState<VectorizedDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDocument, setSelectedDocument] = useState<VectorizedDocument | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingDocument, setDeletingDocument] = useState(false);
  const [deleteSuccess, setDeleteSuccess] = useState<string | null>(null);
  const [documentVectors, setDocumentVectors] = useState<any[]>([]);
  const [loadingVectors, setLoadingVectors] = useState(false);
  const [uniqueFileNames, setUniqueFileNames] = useState<string[]>([]);
  const [deleteAllDialogOpen, setDeleteAllDialogOpen] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [deletingAllDocuments, setDeletingAllDocuments] = useState(false);

  useEffect(() => {
    fetchDocuments();
  }, []);

  useEffect(() => {
    // Extract unique file names when documents change
    if (documents.length > 0) {
      const fileNames = Array.from(new Set(documents.map(doc => doc.fileName)));
      setUniqueFileNames(fileNames);
    }
  }, [documents]);

  const fetchDocuments = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/vectorize/documents');
      
      if (!response.ok) {
        throw new Error('Failed to fetch documents');
      }
      
      const data = await response.json();
      setDocuments(data);
    } catch (err) {
      console.error('Error fetching documents:', err);
      setError('Failed to load documents. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const filteredDocuments = documents.filter(doc => 
    doc.fileName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const handleDocumentClick = async (doc: VectorizedDocument) => {
    setSelectedDocument(doc);
    setLoadingVectors(true);
    setDocumentVectors([]);
    
    try {
      // Fetch all vectors for this document
      const response = await fetch(`/api/vectorize/documents/${doc.id}/vectors`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch document vectors');
      }
      
      const data = await response.json();
      
      // Sort vectors by chunkIndex if available
      const sortedVectors = [...(data.vectors || [])].sort((a, b) => {
        const aIndex = a.metadata?.chunkIndex ?? Number.MAX_SAFE_INTEGER;
        const bIndex = b.metadata?.chunkIndex ?? Number.MAX_SAFE_INTEGER;
        return aIndex - bIndex;
      });
      
      setDocumentVectors(sortedVectors);
    } catch (err) {
      console.error('Error fetching document vectors:', err);
    } finally {
      setLoadingVectors(false);
    }
  };

  const handleDeleteClick = () => {
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedDocument) return;
    
    setDeletingDocument(true);
    setError(null);
    setDeleteSuccess(null);
    
    try {
      const response = await fetch(`/api/vectorize/documents/${selectedDocument.id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete document');
      }
      
      // Remove the deleted document from the state
      setDocuments(prevDocs => prevDocs.filter(doc => doc.id !== selectedDocument.id));
      
      // Set success message
      setDeleteSuccess(`Successfully deleted "${selectedDocument.fileName}"`);
      
      // Clear selected document
      setSelectedDocument(null);
      
      // Close the dialog
      setDeleteDialogOpen(false);
    } catch (err) {
      console.error('Error deleting document:', err);
      setError(`Failed to delete document: ${(err as Error).message}`);
    } finally {
      setDeletingDocument(false);
    }
  };

  const handleDeleteAllClick = (fileName: string) => {
    setSelectedFileName(fileName);
    setDeleteAllDialogOpen(true);
  };

  const handleDeleteAllConfirm = async () => {
    if (!selectedFileName) return;
    
    setDeletingAllDocuments(true);
    setError(null);
    setDeleteSuccess(null);
    
    try {
      const response = await fetch(`/api/vectorize/documents/by-filename/${encodeURIComponent(selectedFileName)}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete vectorized documents');
      }
      
      const result = await response.json();
      
      // Remove the deleted documents from the state
      setDocuments(prevDocs => prevDocs.filter(doc => doc.fileName !== selectedFileName));
      
      // Set success message
      setDeleteSuccess(`Successfully deleted all vectors for "${selectedFileName}" (${result.deletedVectors} vectors)`);
      
      // Clear selected document if it was deleted
      if (selectedDocument?.fileName === selectedFileName) {
        setSelectedDocument(null);
      }
      
      // Close the dialog
      setDeleteAllDialogOpen(false);
    } catch (err) {
      console.error('Error deleting documents:', err);
      setError(`Failed to delete documents: ${(err as Error).message}`);
    } finally {
      setDeletingAllDocuments(false);
    }
  };

  return (
    <div className="w-full h-full flex flex-col">
      <div className="mb-4 flex justify-between items-center">
        <div className="relative flex-1 mr-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search vectorized documents..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        {uniqueFileNames.length > 0 && (
          <div className="flex-shrink-0">
            <select
              className="px-3 py-2 border rounded-md text-sm"
              onChange={(e) => e.target.value && handleDeleteAllClick(e.target.value)}
              value=""
            >
              <option value="" disabled>Delete by filename...</option>
              {uniqueFileNames.map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {deleteSuccess && (
        <Alert className="mb-4 bg-green-50 border-green-200">
          <Check className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">{deleteSuccess}</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-1 gap-4 overflow-hidden border rounded-md">
        <div className="w-2/5 overflow-y-auto border-r h-full">
          {loading ? (
            <div className="flex justify-center items-center h-32">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredDocuments.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {searchTerm ? 'No matching documents found' : 'No vectorized documents available'}
            </div>
          ) : (
            <div className="space-y-2 p-2">
              {filteredDocuments.map((doc) => (
                <div
                  key={doc.id}
                  className={`p-3 rounded-md cursor-pointer transition-colors ${
                    selectedDocument?.id === doc.id
                      ? 'bg-primary/10 border-l-4 border-primary'
                      : 'hover:bg-gray-100 border-l-4 border-transparent'
                  }`}
                  onClick={() => handleDocumentClick(doc)}
                >
                  <div className="font-heading font-semibold truncate">{doc.fileName}</div>
                  <div className="flex items-center text-sm text-gray-500 mt-1 space-x-3">
                    <span className="flex items-center">
                      <FileText className="h-3 w-3 mr-1" />
                      {doc.chunks} chunks
                    </span>
                    <span className="flex items-center">
                      <Calendar className="h-3 w-3 mr-1" />
                      {formatDate(doc.createdAt)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="w-3/5 overflow-y-auto p-4 h-full">
          {selectedDocument ? (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold text-lg">{selectedDocument.fileName}</h3>
                <Button 
                  variant="destructive" 
                  size="sm" 
                  onClick={handleDeleteClick}
                  className="flex items-center gap-1"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </Button>
              </div>
              
              <div className="mt-2">
                <h4 className="text-sm font-medium mb-2">Document Vectors</h4>
                {loadingVectors ? (
                  <div className="flex justify-center items-center h-32">
                    <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                  </div>
                ) : documentVectors.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No vectors found for this document
                  </div>
                ) : (
                  <div className="border rounded-md overflow-hidden">
                    <div className="bg-gray-50 px-4 py-2 text-xs font-medium text-gray-500 border-b">
                      <div className="grid grid-cols-12 gap-2">
                        <div className="col-span-1">#</div>
                        <div className="col-span-2">Pages</div>
                        <div className="col-span-9">Text</div>
                      </div>
                    </div>
                    <div className="divide-y max-h-[500px] overflow-y-auto">
                      {documentVectors.map((vector, index) => (
                        <div key={vector.id} className="px-4 py-3 text-sm hover:bg-gray-50">
                          <div className="grid grid-cols-12 gap-2">
                            <div className="col-span-1 text-gray-500">{index + 1}</div>
                            <div className="col-span-2 text-gray-600">
                              {vector.metadata?.pageNumbers ? 
                                Array.isArray(vector.metadata.pageNumbers) ? 
                                  vector.metadata.pageNumbers.join(', ') : 
                                  vector.metadata.pageNumbers
                                : 
                                vector.metadata?.pageNumber || '-'}
                            </div>
                            <div className="col-span-9 text-gray-700 break-words">
                              {vector.metadata?.text ? (
                                <div className="max-h-20 overflow-y-auto text-xs">
                                  {vector.metadata.text}
                                </div>
                              ) : (
                                <span className="text-gray-400 italic">No text available</span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <FileText className="h-12 w-12 mb-2 text-gray-300" />
              <p>Select a document to view vectors</p>
            </div>
          )}
        </div>
      </div>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Vectorized Document</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this document? This will remove all vectors
              associated with this document from your vector database.
            </DialogDescription>
          </DialogHeader>
          
          {selectedDocument && (
            <div className="py-4">
              <p className="font-medium">{selectedDocument.fileName}</p>
              <p className="text-sm text-gray-500">
                {selectedDocument.chunks} vector chunks will be permanently deleted.
              </p>
            </div>
          )}
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deletingDocument}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={deletingDocument}
              className="flex items-center gap-2"
            >
              {deletingDocument ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  Delete
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteAllDialogOpen} onOpenChange={setDeleteAllDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete All Vectors for File</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete all vectors for documents with the filename "{selectedFileName}"?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          {selectedFileName && (
            <div className="py-4">
              <p className="font-medium">{selectedFileName}</p>
              <p className="text-sm text-gray-500">
                This will delete all vectors for all documents with this filename.
              </p>
            </div>
          )}
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteAllDialogOpen(false)}
              disabled={deletingAllDocuments}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteAllConfirm}
              disabled={deletingAllDocuments}
              className="flex items-center gap-2"
            >
              {deletingAllDocuments ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  Delete All
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 