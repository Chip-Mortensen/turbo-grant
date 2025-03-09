import { DocumentField as DocumentFieldType, DocumentFieldType as FieldType } from '@/types/documents';

interface DocumentFieldProps {
  field: DocumentFieldType;
  onChange: (updatedField: DocumentFieldType) => void;
}

const fieldTypeOptions: { value: FieldType; label: string }[] = [
  { value: 'text', label: 'Text' },
  { value: 'textarea', label: 'Area' },
  { value: 'select', label: 'Select' }
];

export default function DocumentField({ field, onChange }: DocumentFieldProps) {
  const handleChange = (key: keyof DocumentFieldType, value: string) => {
    onChange({
      ...field,
      [key]: value,
      answer: '' // Always keep answer empty
    });
  };

  return (
    <div className="flex gap-4 p-4 border border-gray-200 rounded-md items-start">
      <div className="flex-none">
        <div className="inline-flex rounded-md shadow-sm" role="group">
          {fieldTypeOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => handleChange('type', option.value)}
              className={`
                px-3 py-1.5 text-sm font-medium
                ${option.value === field.type
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
                }
                border border-gray-300
                ${option.value === 'text' ? 'rounded-l-md' : ''}
                ${option.value === 'select' ? 'rounded-r-md' : ''}
                ${option.value !== 'text' ? '-ml-px' : ''}
                focus:z-10 focus:outline-none focus:ring-1 focus:ring-indigo-500
              `}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1">
        <input
          type="text"
          value={field.label}
          onChange={(e) => handleChange('label', e.target.value)}
          placeholder="Enter field label"
          className="w-full px-3 py-1.5 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
        />
      </div>
    </div>
  );
} 