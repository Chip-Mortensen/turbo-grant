import { DocumentSourceType } from '@/types/documents';

interface SourceSelectorProps {
  selectedSources: DocumentSourceType[];
  onChange: (sources: DocumentSourceType[]) => void;
}

const ALL_SOURCES: DocumentSourceType[] = [
  'research_description',
  'scientific_figure',
  'chalk_talk',
  'foa'
];

export default function SourceSelector({ selectedSources, onChange }: SourceSelectorProps) {
  const handleToggle = (source: DocumentSourceType) => {
    const newSources = selectedSources.includes(source)
      ? selectedSources.filter(s => s !== source)
      : [...selectedSources, source];
    onChange(newSources);
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        Sources
      </label>
      <div className="space-y-2">
        {ALL_SOURCES.map((source) => (
          <label key={source} className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={selectedSources.includes(source)}
              onChange={() => handleToggle(source)}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
            <span className="text-sm text-gray-700">
              {source.split('_').map(word => 
                word.charAt(0).toUpperCase() + word.slice(1)
              ).join(' ')}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
} 