import { useState } from 'react';
import { Document, DocumentField as DocumentFieldType, AgencyType } from '@/types/documents';
import DocumentField from './DocumentField';
import SourceSelector from './SourceSelector';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface DocumentFormProps {
  initialDocument?: Document;
  onSubmit: (document: Partial<Document>) => Promise<void>;
  isLoading?: boolean;
}

interface SortableFieldProps {
  id: number;
  field: DocumentFieldType;
  onChange: (updatedField: DocumentFieldType) => void;
  onRemove: () => void;
}

function SortableField({ id, field, onChange, onRemove }: SortableFieldProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative flex items-center gap-2">
      <div
        {...attributes}
        {...listeners}
        className="flex-none cursor-move opacity-50 hover:opacity-100"
      >
        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
        </svg>
      </div>
      <div className="flex-1 relative">
        <DocumentField
          field={field}
          onChange={onChange}
        />
        <button
          type="button"
          onClick={onRemove}
          className="absolute -top-2 -right-2 text-red-600 hover:text-red-800 bg-white rounded-full p-1 shadow-sm border border-gray-200"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
    </div>
  );
}

export default function DocumentForm({ 
  initialDocument, 
  onSubmit,
  isLoading = false 
}: DocumentFormProps) {
  const [name, setName] = useState(initialDocument?.name ?? '');
  const [fields, setFields] = useState<DocumentFieldType[]>(
    initialDocument?.fields ?? []
  );
  const [sources, setSources] = useState(initialDocument?.sources ?? []);
  const [agency, setAgency] = useState<AgencyType>(initialDocument?.agency ?? 'NIH');
  const [grantTypes, setGrantTypes] = useState<string[]>(initialDocument?.grant_types ?? []);
  const [customProcessor, setCustomProcessor] = useState(initialDocument?.custom_processor ?? '');

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit({
      name,
      fields,
      sources,
      agency,
      grant_types: grantTypes,
      custom_processor: customProcessor || undefined,
    });
  };

  const handleFieldChange = (index: number, updatedField: DocumentFieldType) => {
    const newFields = [...fields];
    newFields[index] = updatedField;
    setFields(newFields);
  };

  const addField = () => {
    setFields([
      ...fields,
      {
        type: 'text',
        label: '',
        answer: ''
      },
    ]);
  };

  const removeField = (index: number) => {
    setFields(fields.filter((_, i) => i !== index));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      setFields((items) => {
        const oldIndex = items.findIndex((_, index) => index === active.id);
        const newIndex = items.findIndex((_, index) => index === over.id);
        
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const addGrantType = () => {
    setGrantTypes([...grantTypes, '']);
  };

  const updateGrantType = (index: number, value: string) => {
    const newGrantTypes = [...grantTypes];
    newGrantTypes[index] = value;
    setGrantTypes(newGrantTypes);
  };

  const removeGrantType = (index: number) => {
    setGrantTypes(grantTypes.filter((_, i) => i !== index));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700">
          Document Name
        </label>
        <input
          type="text"
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          required
        />
      </div>

      <div className="grid grid-cols-4 gap-6">
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Agency</h3>
          <div className="bg-gray-50 rounded-lg overflow-hidden shadow-sm">
            <div className="p-4">
              <Select value={agency} onValueChange={(value: AgencyType) => setAgency(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select agency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NIH">NIH</SelectItem>
                  <SelectItem value="NSF">NSF</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="col-span-2 space-y-4">
          <div>
            <h3 className="text-lg font-medium text-gray-900">Grant Types</h3>
            <p className="text-sm text-gray-500 mt-1">If no grant types are specified, this document will apply to all grants for the selected agency.</p>
          </div>
          <div className="space-y-4 bg-gray-50 rounded-lg overflow-hidden shadow-sm">
            <div className="p-4">
              {grantTypes.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No grant types added yet. Click "Add Grant Type" to create one.</p>
              ) : (
                <div className="space-y-4">
                  {grantTypes.map((grantType, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={grantType}
                        onChange={(e) => updateGrantType(index, e.target.value)}
                        placeholder="Enter grant type"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => removeGrantType(index)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="px-3 py-2 bg-white border-t border-gray-200 flex justify-end">
              <button
                type="button"
                onClick={addGrantType}
                className="inline-flex items-center px-2.5 py-1.5 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <svg className="h-4 w-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Grant Type
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Sources</h3>
          <div className="bg-gray-50 rounded-lg overflow-hidden shadow-sm">
            <div className="p-4">
              <SourceSelector
                selectedSources={sources}
                onChange={setSources}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Fields</h3>
        <div className="space-y-4 bg-gray-50 rounded-lg overflow-hidden shadow-sm">
          <div className="p-4">
            {fields.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No fields added yet. Click "Add Field" to create one.</p>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={fields.map((_, index) => index)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-4 pl-0">
                    {fields.map((field, index) => (
                      <SortableField
                        key={index}
                        id={index}
                        field={field}
                        onChange={(updatedField) => handleFieldChange(index, updatedField)}
                        onRemove={() => removeField(index)}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </div>
          <div className="px-3 py-2 bg-white border-t border-gray-200 flex justify-end">
            <button
              type="button"
              onClick={addField}
              className="inline-flex items-center px-2.5 py-1.5 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <svg className="h-4 w-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Field
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Custom Processor</h3>
          <p className="text-sm text-gray-500 mt-1">Optional: Specify a custom processor name for this document.</p>
        </div>
        <div className="bg-gray-50 rounded-lg overflow-hidden shadow-sm">
          <div className="p-4">
            <input
              type="text"
              value={customProcessor}
              onChange={(e) => setCustomProcessor(e.target.value)}
              placeholder="Enter custom processor name..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isLoading}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          {isLoading ? 'Saving...' : 'Save Document'}
        </button>
      </div>
    </form>
  );
} 