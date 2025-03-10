'use client';

import { useState, useEffect } from 'react';
import { Document, DocumentField } from '@/types/documents';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Save } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface QuestionViewProps {
  document: Document;
  onUpdateAnswers: (updatedFields: DocumentField[]) => Promise<void>;
}

export default function QuestionView({ document, onUpdateAnswers }: QuestionViewProps) {
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState<Record<number, boolean>>({});

  // Ensure document.fields exists and is an array
  const fields = Array.isArray(document.fields) ? document.fields : [];
  
  // Initialize answers when document changes or fields are loaded
  useEffect(() => {
    if (fields.length > 0) {
      setAnswers(
        fields.reduce((acc, field, index) => {
          acc[index] = field.answer || '';
          return acc;
        }, {} as Record<number, string>)
      );
      setTouched({});
    }
  }, [document, fields]);

  const handleAnswerChange = (index: number, value: string) => {
    setAnswers(prev => ({
      ...prev,
      [index]: value
    }));
    setTouched(prev => ({
      ...prev,
      [index]: true
    }));
    setError(null);
  };

  const saveAnswers = async () => {
    // Check if all fields are filled
    const emptyFields = fields.filter((_, index) => !answers[index]);
    if (emptyFields.length > 0) {
      setError('Please fill out all required fields');
      // Mark all fields as touched to show validation
      setTouched(
        fields.reduce((acc, _, index) => {
          acc[index] = true;
          return acc;
        }, {} as Record<number, boolean>)
      );
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const updatedFields = fields.map((field, index) => ({
        ...field,
        answer: answers[index] || ''
      }));
      
      await onUpdateAnswers(updatedFields);
    } catch (error) {
      console.error('Error saving answers:', error);
      setError('Failed to save answers. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const renderFieldInput = (field: DocumentField, index: number) => {
    const isEmpty = !answers[index] && touched[index];
    const inputClass = cn(
      isEmpty && "border-red-500 focus-visible:ring-red-500"
    );

    switch (field.type) {
      case 'textarea':
        return (
          <>
            <Textarea
              placeholder="Enter your answer..."
              value={answers[index] || ''}
              onChange={(e) => handleAnswerChange(index, e.target.value)}
              className={cn("min-h-[150px]", inputClass)}
            />
            {isEmpty && (
              <p className="text-sm text-red-500 mt-1">This field is required</p>
            )}
          </>
        );
      case 'select':
        return (
          <>
            <Input
              placeholder="Select an option..."
              value={answers[index] || ''}
              onChange={(e) => handleAnswerChange(index, e.target.value)}
              className={inputClass}
            />
            {isEmpty && (
              <p className="text-sm text-red-500 mt-1">This field is required</p>
            )}
          </>
        );
      case 'text':
      default:
        return (
          <>
            <Input
              placeholder="Enter your answer..."
              value={answers[index] || ''}
              onChange={(e) => handleAnswerChange(index, e.target.value)}
              className={inputClass}
            />
            {isEmpty && (
              <p className="text-sm text-red-500 mt-1">This field is required</p>
            )}
          </>
        );
    }
  };

  // If there are no fields, show a message
  if (fields.length === 0) {
    return (
      <div className="w-full">
        <Card className="w-full">
          <div className="w-full px-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{document.name}</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p>This document does not have any questions to answer.</p>
            </CardContent>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full">
      <Card className="w-full">
        <div className="w-full">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{document.name}</CardTitle>
              <Button 
                onClick={saveAnswers} 
                disabled={saving}
              >
                <Save className="mr-2 h-4 w-4" />
                Save Answers
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {error && (
                <Alert variant="destructive" className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 flex-shrink-0 mt-[1px]" />
                  <AlertDescription className="leading-4 pt-1">
                    {error}
                  </AlertDescription>
                </Alert>
              )}
              <div className="grid grid-cols-2 gap-6">
                {fields.map((field, index) => (
                  <div key={index} className="bg-gray-50 p-4 rounded-lg flex flex-col">
                    <h3 className="text-sm font-medium mb-2">{field.label}</h3>
                    <div className="flex-grow flex flex-col justify-end">
                      {renderFieldInput(field, index)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </div>
      </Card>
    </div>
  );
} 