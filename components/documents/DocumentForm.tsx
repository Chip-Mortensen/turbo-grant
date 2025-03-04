import { useState } from 'react';
import { Document, DocumentField as DocumentFieldType, AgencyType } from '@/types/documents';
import DocumentField from './DocumentField';
import SourceSelector from './SourceSelector';
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

      <div>
        <label htmlFor="agency" className="block text-sm font-medium text-gray-700">
          Agency
        </label>
        <select
          id="agency"
          value={agency}
          onChange={(e) => setAgency(e.target.value as AgencyType)}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          required
        >
          <option value="NIH">NIH</option>
          <option value="NSF">NSF</option>
        </select>
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900">Grant Types</h3>
          <button
            type="button"
            onClick={addGrantType}
            className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
          >
            Add Grant Type
          </button>
        </div>
        <div className="space-y-4 bg-gray-50 p-4 rounded-lg">
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
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900">Fields</h3>
          <button
            type="button"
            onClick={addField}
            className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
          >
            Add Field
          </button>
        </div>
        <div className="space-y-4 bg-gray-50 p-4 rounded-lg">
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
      </div>

      <SourceSelector
        selectedSources={sources}
        onChange={setSources}
      />

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