'use client';

import { useState } from 'react';
import { Document, DocumentField } from '@/types/documents';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { ArrowLeft, ArrowRight, Save, CheckCircle } from 'lucide-react';

interface QuestionViewProps {
  document: Document;
  onUpdateAnswers: (updatedFields: DocumentField[]) => Promise<void>;
}

export default function QuestionView({ document, onUpdateAnswers }: QuestionViewProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>(
    document.fields.reduce((acc, field, index) => {
      acc[index] = field.answer || '';
      return acc;
    }, {} as Record<number, string>)
  );
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const currentField = document.fields[currentQuestionIndex];
  const totalQuestions = document.fields.length;
  const isFirstQuestion = currentQuestionIndex === 0;
  const isLastQuestion = currentQuestionIndex === totalQuestions - 1;

  const handleAnswerChange = (value: string) => {
    setAnswers(prev => ({
      ...prev,
      [currentQuestionIndex]: value
    }));
    setSaveSuccess(false);
  };

  const goToPrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const goToNext = () => {
    if (currentQuestionIndex < totalQuestions - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const saveAnswers = async () => {
    setSaving(true);
    try {
      // Create a copy of the document fields with updated answers
      const updatedFields = document.fields.map((field, index) => ({
        ...field,
        answer: answers[index] || ''
      }));
      
      await onUpdateAnswers(updatedFields);
      setSaveSuccess(true);
    } catch (error) {
      console.error('Error saving answers:', error);
    } finally {
      setSaving(false);
    }
  };

  const renderFieldInput = () => {
    switch (currentField.type) {
      case 'textarea':
        return (
          <Textarea
            placeholder="Enter your answer..."
            value={answers[currentQuestionIndex] || ''}
            onChange={(e) => handleAnswerChange(e.target.value)}
            className="min-h-[150px]"
          />
        );
      case 'select':
        // In practice, you'd need to define options for selects
        return (
          <Input
            placeholder="Select an option..."
            value={answers[currentQuestionIndex] || ''}
            onChange={(e) => handleAnswerChange(e.target.value)}
          />
        );
      case 'text':
      default:
        return (
          <Input
            placeholder="Enter your answer..."
            value={answers[currentQuestionIndex] || ''}
            onChange={(e) => handleAnswerChange(e.target.value)}
          />
        );
    }
  };

  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle>{document.name}</CardTitle>
        <CardDescription>
          Question {currentQuestionIndex + 1} of {totalQuestions}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-medium mb-1">{currentField.label}</h3>
          <div className="mt-4">
            {renderFieldInput()}
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <div>
          <Button 
            variant="outline" 
            onClick={goToPrevious} 
            disabled={isFirstQuestion}
            className="mr-2"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Previous
          </Button>
          <Button 
            variant="outline" 
            onClick={goToNext} 
            disabled={isLastQuestion}
          >
            Next
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center">
          {saveSuccess && (
            <span className="text-green-600 flex items-center mr-3">
              <CheckCircle className="h-4 w-4 mr-1" />
              Saved
            </span>
          )}
          <Button 
            onClick={saveAnswers} 
            disabled={saving}
          >
            <Save className="mr-2 h-4 w-4" />
            Save Answers
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
} 