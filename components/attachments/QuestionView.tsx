'use client';

import { useState, useEffect } from 'react';
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
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

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
    }
  }, [document, fields]);
  
  // Ensure current index is valid when fields change
  useEffect(() => {
    if (currentQuestionIndex >= fields.length && fields.length > 0) {
      setCurrentQuestionIndex(fields.length - 1);
    }
  }, [fields, currentQuestionIndex]);

  const currentField = fields[currentQuestionIndex];
  const totalQuestions = fields.length;
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
      const updatedFields = fields.map((field, index) => ({
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
    if (!currentField) return null;
    
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

  // If there are no fields, show a message
  if (fields.length === 0) {
    return (
      <Card className="w-full max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle>{document.name}</CardTitle>
          <CardDescription>No questions available</CardDescription>
        </CardHeader>
        <CardContent>
          <p>This document does not have any questions to answer.</p>
        </CardContent>
      </Card>
    );
  }

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
          {currentField ? (
            <>
              <h3 className="text-lg font-medium mb-1">{currentField.label}</h3>
              <div className="mt-4">
                {renderFieldInput()}
              </div>
            </>
          ) : (
            <p>Question not available. Please try refreshing the page.</p>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <div>
          <Button 
            variant="outline" 
            onClick={goToPrevious} 
            disabled={isFirstQuestion || !currentField}
            className="mr-2"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Previous
          </Button>
          <Button 
            variant="outline" 
            onClick={goToNext} 
            disabled={isLastQuestion || !currentField}
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
            disabled={saving || !currentField}
          >
            <Save className="mr-2 h-4 w-4" />
            Save Answers
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
} 