'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { SendHorizontal, Loader2, CheckCircle2 } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// Define the structure for questions and answers
interface QuestionAnswer {
  id: string;
  documentName: string; // The document this question is related to
  question: string;
  criteria?: string; // Only required for chat questions
  answer: string;
  completed: boolean;
  answerType?: 'auto-extracted' | 'uncertainty-expressed' | 'manually-answered' | 'not-answered';
  questionType: 'options' | 'chat';
  options?: string[];
  updatedAt?: string;
}

// Define the structure for required documents
interface RequiredDocument {
  documentName: string;
  description: string;
  pageLimit: string;
  formatRequirements: string;
  isRequired: boolean;
  confidence: 'high' | 'medium' | 'low';
  justification: string; // Brief reason why this document is required
}

// Define the structure for application requirements
interface ApplicationRequirements {
  completed: boolean;
  updatedAt: string;
  questions?: QuestionAnswer[];
  currentQuestionIndex: number;
  progress?: number;
  totalQuestions?: number;
  completedQuestions?: number;
  requiredDocuments?: RequiredDocument[];
}

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ApplicationRequirementsChatProps {
  projectId: string;
  researchDescription: string;
  applicationRequirements: ApplicationRequirements;
  documentFilename?: string;
}

// Define interface for API response question
interface ApiQuestion {
  id?: string;
  documentName: string;
  question: string;
  criteria?: string;
  answer?: string;
  isComplete?: boolean;
  answerType?: 'auto-extracted' | 'uncertainty-expressed' | 'manually-answered';
  questionType: 'options' | 'chat';
  options?: string[];
}

export function ApplicationRequirementsChat({ 
  projectId, 
  researchDescription,
  applicationRequirements,
  documentFilename
}: ApplicationRequirementsChatProps) {
  // Validate research description
  if (!researchDescription?.trim()) {
    console.warn('Research description is required for ApplicationRequirementsChat component');
  }

  const supabase = createClient();
  const [userInput, setUserInput] = useState('');
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isRevising, setIsRevising] = useState(false);
  const [requirements, setRequirements] = useState<ApplicationRequirements>(
    applicationRequirements && applicationRequirements.questions && applicationRequirements.questions.length > 0 
    ? applicationRequirements 
    : {
      completed: false,
      updatedAt: new Date().toISOString(),
      questions: [],
      currentQuestionIndex: 0
    }
  );
  const [isInitialAnalysisComplete, setIsInitialAnalysisComplete] = useState(false);
  const [isOptionsPhase, setIsOptionsPhase] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  // Add a ref to track if analyzeAllQuestions has been called
  const hasAnalyzedRef = useRef(false);

  // Helper function to find next unanswered question
  const findNextUnansweredQuestion = (questions: QuestionAnswer[], currentIndex: number): number => {
    // Look for unanswered questions after current index
    for (let i = currentIndex + 1; i < questions.length; i++) {
      if (!questions[i].completed) return i;
    }
    // Look for unanswered questions from start
    for (let i = 0; i <= currentIndex; i++) {
      if (!questions[i].completed) return i;
    }
    return -1; // All questions answered
  };

  // Scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Initialize chat
  useEffect(() => {
    if (messages.length > 0) return;

    console.log('Initializing application requirements chat');
    console.log('Application requirements from props:', JSON.stringify(applicationRequirements));
    console.log('Has analyzed before:', hasAnalyzedRef.current);
    
    // Check if we already have application requirements saved
    const hasExistingRequirements = applicationRequirements && 
                                  Object.keys(applicationRequirements).length > 0;
    
    // Check if we need to analyze questions
    const hasExistingQuestions = hasExistingRequirements && 
                               applicationRequirements.questions && 
                               Array.isArray(applicationRequirements.questions);
                               
    // Only analyze if we have no existing requirements at all
    const shouldAnalyze = !hasExistingRequirements;
    
    console.log('Should analyze requirements:', shouldAnalyze);

    if (documentFilename) {
      console.log(`Using document: ${documentFilename} for application requirements`);
    }

    // Only analyze if needed and not already done
    if (shouldAnalyze && !hasAnalyzedRef.current) {
      console.log('⏳ Calling analyzeAllQuestions - first time');
      // Mark that we've initiated analysis to prevent duplicate calls
      hasAnalyzedRef.current = true;
      analyzeAllQuestions();
    } else if (shouldAnalyze) {
      console.log('🛑 Prevented duplicate call to analyzeAllQuestions');
    } else {
      // Initialize with existing requirements, even if there are no questions
      if (hasExistingRequirements) {
        // If there are no questions or empty questions array, just show the summary view
        if (!hasExistingQuestions || (applicationRequirements.questions && applicationRequirements.questions.length === 0)) {
          // Set the state as completed
          setRequirements({
            completed: true,
            updatedAt: new Date().toISOString(),
            currentQuestionIndex: 0,
            questions: applicationRequirements.questions || []
          });
          
          setIsInitialAnalysisComplete(true);
          return;
        }
        
      // For existing questions, check if we have options questions
        const optionsQuestions = applicationRequirements.questions?.filter(q => q.questionType === 'options') || [];
        const chatQuestions = applicationRequirements.questions?.filter(q => q.questionType === 'chat') || [];
      
      // Determine if we should start in options phase
      const hasOptionsQuestions = optionsQuestions.length > 0;
      const hasPendingOptionsQuestions = optionsQuestions.some(q => !q.completed);
      
      if (hasOptionsQuestions && hasPendingOptionsQuestions) {
        // Start in options phase with the first unanswered options question
        setIsOptionsPhase(true);
        
        // Find first unanswered options question
        const firstUnansweredOptionsIndex = optionsQuestions.findIndex(q => !q.completed);
        if (firstUnansweredOptionsIndex !== -1) {
          const questionId = optionsQuestions[firstUnansweredOptionsIndex].id;
            const questionIndex = applicationRequirements.questions?.findIndex(q => q.id === questionId) || 0;
          
          setRequirements(prev => ({ 
            ...prev, 
            currentQuestionIndex: questionIndex 
          }));
          
          setMessages([
            {
              role: 'assistant',
              content: 'Please answer the following options questions about your application requirements.'
            }
          ]);
        }
      } else if (hasOptionsQuestions && !hasPendingOptionsQuestions && chatQuestions.length > 0) {
        // All options questions are answered, move to chat phase
        setIsOptionsPhase(false);
        
        // Find first unanswered chat question
        const firstUnansweredChatIndex = chatQuestions.findIndex(q => !q.completed);
        
        if (firstUnansweredChatIndex !== -1) {
          const questionId = chatQuestions[firstUnansweredChatIndex].id;
            const questionIndex = applicationRequirements.questions?.findIndex(q => q.id === questionId) || 0;
          
          setRequirements(prev => ({ 
            ...prev, 
            currentQuestionIndex: questionIndex 
          }));
          
            const currentQuestion = applicationRequirements.questions?.[questionIndex];
          setMessages([
            {
              role: 'assistant',
              content: `Let's move on to more detailed questions:\n\n${currentQuestion?.question}`
            }
          ]);
        }
      } else if (chatQuestions.length > 0) {
        // No options questions, start with chat questions
        setIsOptionsPhase(false);
        
        // Find first unanswered chat question
        const firstUnansweredChatIndex = chatQuestions.findIndex(q => !q.completed);
        
        if (firstUnansweredChatIndex !== -1) {
          const questionId = chatQuestions[firstUnansweredChatIndex].id;
            const questionIndex = applicationRequirements.questions?.findIndex(q => q.id === questionId) || 0;
          
          setRequirements(prev => ({ 
            ...prev, 
            currentQuestionIndex: questionIndex 
          }));
          
            const currentQuestion = applicationRequirements.questions?.[questionIndex];
          setMessages([
            {
              role: 'assistant',
              content: `Let's answer the following question:\n\n${currentQuestion?.question}`
            }
          ]);
        } else {
          // All chat questions are complete
          setRequirements(prev => ({
            ...prev,
            completed: true
          }));
        }
        
        setIsInitialAnalysisComplete(true);
      }
    }
    }
  }, [messages.length, documentFilename, projectId, researchDescription]);

  // Analyze all questions at once
  const analyzeAllQuestions = async () => {
    console.log('🔍 analyzeAllQuestions function called at:', new Date().toISOString());
    try {
      setIsLoading(true);
      
      // Reset message display to show loading
      setMessages([
        {
          role: 'assistant',
          content: 'Analyzing your research to determine application requirements...'
        }
      ]);
      
      // Check if we have a research description from props
      if (!researchDescription || researchDescription.trim() === '') {
        setMessages([
          {
            role: 'assistant',
            content: 'Please provide a brief description of your research project to help me identify the application requirements.'
          }
        ]);
        return;
      }
      
      console.log(`Analyzing research for application requirements with document: ${documentFilename}`);
      console.log('Using research description:', researchDescription.substring(0, 100) + '...');
      
      // Call the API to get the application requirements
      console.log('Sending request to generate application requirements...');
      const response = await fetch('/api/application-requirements/generate-questions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          researchDescription,
          projectId,
          documentFilename,
        }),
      });
      
      if (!response.ok) {
        console.error('Error response from API:', response.status, response.statusText);
        const errorText = await response.text();
        console.error('Error response body:', errorText);
        throw new Error(`Failed to fetch application requirements: ${response.status} ${response.statusText}`);
      }
      
      console.log('Successfully received response from API');
      const data = await response.json();
      console.log('Generated questions count:', data.questions?.length || 0);
      console.log('Generated required documents count:', data.requiredDocuments?.length || 0);
      
      let generatedQuestions = data.questions || [];
      const requiredDocuments = data.requiredDocuments || [];
      
      // Check if we received any questions
      if (generatedQuestions.length === 0) {
        console.warn('No questions were generated by the API');
        // Instead of creating a default question, just keep empty array
        generatedQuestions = [];
      }
      
      // Ensure questions have proper structure
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      generatedQuestions = generatedQuestions.map((q: any) => ({
        id: crypto.randomUUID(),
        documentName: q.documentName || 'General Application', // Use document name from API or default
        question: q.question,
        questionType: q.questionType || 'chat', // Default to chat if not specified
        options: q.options || [],
        answer: q.answer || '',
        answerType: q.answer ? 'auto-extracted' : 'not-answered',
        criteria: q.questionType === 'chat' ? (q.criteria || 'Provide a complete and accurate answer.') : undefined,
        completed: !!q.answer,
        updatedAt: new Date().toISOString()
      }));
      
      // Sort questions - options questions first, then chat questions
      generatedQuestions.sort((a: QuestionAnswer, b: QuestionAnswer) => {
        if (a.questionType === 'options' && b.questionType !== 'options') {
          return -1;
        } else if (a.questionType !== 'options' && b.questionType === 'options') {
          return 1;
        }
        return 0;
      });
      
      // Check if we have any options questions
      let hasOptionsQuestions = generatedQuestions.some((q: QuestionAnswer) => q.questionType === 'options');
      setIsOptionsPhase(hasOptionsQuestions);
      
      // Get count of answered questions
      const answeredCount = generatedQuestions.filter((q: QuestionAnswer) => q.answer).length;
      const totalCount = generatedQuestions.length;
      
      // Update the application requirements state
      setRequirements({
        completed: false,
        questions: generatedQuestions,
        currentQuestionIndex: 0,
        updatedAt: new Date().toISOString(),
        requiredDocuments
      });
      
      // If there are no questions, mark as completed and show summary
      if (generatedQuestions.length === 0) {
        // Update requirements as completed
        const completedRequirements = {
          completed: true,
          questions: [],
          currentQuestionIndex: 0,
          updatedAt: new Date().toISOString(),
          requiredDocuments
        };
        
        setRequirements(completedRequirements);
        
        // Save to database
        await saveRequirements(completedRequirements);
        
        setIsInitialAnalysisComplete(true);
        return;
      }
      
      // Provide a summary message - without document summary
      let summaryMessage = '';
      
      if (answeredCount > 0) {
        summaryMessage = `I've analyzed your project and extracted some information. ${answeredCount} of ${totalCount} questions have already been answered based on the information provided.`;
      } else {
        summaryMessage = `I've analyzed your project and identified ${totalCount} questions about your application requirements.`;
      }
      
      if (hasOptionsQuestions) {
        summaryMessage += "\n\nLet's start with a few basic questions. Please select an option for each:";
      } else {
        // If no options questions, show the first chat question
        const firstQuestion = generatedQuestions[0];
        summaryMessage += `\n\nLet's start with the first question:\n\n${firstQuestion?.question}`;
      }
      
      setMessages([
        {
          role: 'assistant',
          content: summaryMessage
        }
      ]);
      
      // Save to database
      await saveRequirements({
        completed: false,
        questions: generatedQuestions,
        currentQuestionIndex: 0,
        updatedAt: new Date().toISOString(),
        requiredDocuments
      });
      
      setIsInitialAnalysisComplete(true);
      
    } catch (error) {
      console.error('Error analyzing questions:', error);
      setMessages([
        {
          role: 'assistant',
          content: 'I encountered an error while analyzing your project. Please try again or provide more details about your research.'
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Save requirements to database
  const saveRequirements = async (updatedRequirements: ApplicationRequirements) => {
    try {
      const { error } = await supabase
        .from('research_projects')
        .update({ application_requirements: updatedRequirements })
        .eq('id', projectId);

      if (error) console.error('Error saving application requirements:', error);
    } catch (error) {
      console.error('Error saving application requirements:', error);
    }
  };

  // Add this function to handle returning to the summary view without saving
  const handleReturnToSummaryWithoutSaving = () => {
    setIsRevising(false);
    setMessages([
      {
        role: 'assistant',
        content: 'All application requirement questions have been completed. You can review the answers or proceed with the application process.'
      }
    ]);
  };

  // Add this function to handle returning to the summary view
  const handleReturnToSummary = () => {
    setIsRevising(false);
    const isAllComplete = requirements.questions?.every(q => q.completed) ?? false;
    
    // Get the final state of required documents based on all question answers
    const updatedRequiredDocuments = [...(requirements.requiredDocuments || [])];
    
    // Loop through each question to update document requirements
    requirements.questions?.forEach(question => {
      // For options questions that determine document requirements
      if (question.questionType === 'options' && question.completed) {
        // Find the corresponding document
        const documentIndex = updatedRequiredDocuments.findIndex(
          doc => doc.documentName === question.documentName
        );
        
        // Update document status based on answer (if document exists)
        if (documentIndex !== -1 && question.answer) {
          updatedRequiredDocuments[documentIndex] = {
            ...updatedRequiredDocuments[documentIndex],
            isRequired: question.answer === "Yes",
            justification: question.answer === "Yes" 
              ? `User confirmed this document is required` 
              : (question.answer === "No" 
                ? `User indicated this document is not required` 
                : `User is unsure if this document is required`)
          };
        }
      }
    });
    
    const updatedRequirements = {
      ...requirements,
      requiredDocuments: updatedRequiredDocuments,
      completed: isAllComplete,
      updatedAt: new Date().toISOString()
    };
    
    setRequirements(updatedRequirements);
    
    // Save the updated state to the database
    saveRequirements(updatedRequirements);
    
    setMessages([
      {
        role: 'assistant',
        content: 'All application requirement questions have been completed. You can review the answers or proceed with the application process.'
      }
    ]);
  };

  // Modify handleSendMessage to handle revision mode and the new question flow
  const handleSendMessage = async () => {
    if (!userInput.trim() || isLoading) return;

    const userMessage: ChatMessage = { role: 'user', content: userInput };
    setMessages(prev => [...prev, userMessage]);
    setUserInput('');
    setIsLoading(true);

    try {
      const currentQuestionIndex = requirements.currentQuestionIndex || 0;
      const currentQuestion = requirements.questions?.[currentQuestionIndex];
      if (!currentQuestion) throw new Error('No current question found');

      // Skip API call for options questions - they should be handled locally
      if (currentQuestion.questionType === 'options') {
        console.log('Options questions should be handled by the options section');
        setIsLoading(false);
        return;
      }

      // Only call API for chat questions
      const response = await fetch('/api/application-requirements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: messages.concat(userMessage),
          researchDescription,
          currentQuestion: currentQuestion.id,
          projectId,
          criteria: currentQuestion.criteria,
          currentQuestionContext: currentQuestion.question,
          documentFilename,
          requiredDocuments: requirements.requiredDocuments || []
        }),
      });

      if (!response.ok) throw new Error('Failed to get response from API');

      const data = await response.json();
      
      const updatedQuestions = [...(requirements.questions || [])];

      // Get the current question being asked from the messages
      const assistantMessages = messages.filter(m => m.role === 'assistant');
      const lastAssistantMessage = assistantMessages[assistantMessages.length - 1];
      
      // Find the question that matches the last assistant message
      const questionIndex = requirements.questions?.findIndex(q => 
        lastAssistantMessage?.content.includes(q.question)
      );

      // If we can't find the question in the last message, keep the current index
      const currentIndex = questionIndex !== -1 ? questionIndex : currentQuestionIndex;

      // Log the question we think we're answering
      console.log('Current question being answered:', {
        questionFromMessage: questionIndex !== undefined && questionIndex !== -1 && requirements.questions && requirements.questions[questionIndex] 
          ? requirements.questions[questionIndex].question 
          : 'Not found in last message',
        currentQuestionIndex: currentQuestionIndex,
        lastAssistantMessage: lastAssistantMessage?.content,
        finalQuestionIndex: currentIndex,
        finalQuestion: currentIndex !== undefined && requirements.questions && requirements.questions[currentIndex] 
          ? requirements.questions[currentIndex].question 
          : 'Invalid question index'
      });

      // Safety check to ensure we have a valid question index
      if (currentIndex === undefined || currentIndex === -1 || !updatedQuestions[currentIndex]) {
        throw new Error('Could not determine which question to update');
      }

      const existingQuestion = updatedQuestions[currentIndex];
      
      // Only update if:
      // 1. We're in revision mode (always allow updates), OR
      // 2. The question is not already completed (prevent modifying completed answers)
      if (isRevising || !existingQuestion.completed) {
        if (data.isAnswerComplete) {
          updatedQuestions[currentIndex] = {
            ...existingQuestion,
            answer: data.finalAnswer || userMessage.content,
            answerType: data.isUncertaintyExpressed ? 'uncertainty-expressed' : 
              (isRevising ? 'manually-answered' : existingQuestion.answerType || 'manually-answered'),
            completed: true
          };
        } else if (!isRevising) {
          // Only clear the answer if we're not in revision mode and it's a follow-up question
          updatedQuestions[currentIndex] = {
            ...existingQuestion,
            answer: '',
            answerType: undefined,
            completed: false
          };
        }
      }

      // Check if all questions are now complete
      const isAllComplete = !updatedQuestions.some(q => !q.completed);
      
      const completedQuestions = updatedQuestions.filter(q => q.completed).length;
      const updatedRequirements: ApplicationRequirements = {
        ...requirements,
        questions: updatedQuestions,
        currentQuestionIndex: currentIndex,
        completed: isAllComplete,
        progress: (completedQuestions / updatedQuestions.length) * 100,
        totalQuestions: updatedQuestions.length,
        completedQuestions,
        updatedAt: new Date().toISOString()
      };
      
      setRequirements(updatedRequirements);
      await saveRequirements(updatedRequirements);

      if (data.isAnswerComplete) {
        if (isRevising) {
          // Only return to summary if we have a complete answer during revision
          if (data.finalAnswer) {
            handleReturnToSummary();
          } else {
            // If no final answer yet, continue the conversation
            setMessages(prev => [
              ...prev,
              { role: 'assistant', content: data.message || 'Please provide more details.' }
            ]);
          }
        } else if (!isAllComplete) {
          // Update document details if the question was about document requirements
          if (
            (existingQuestion.question.toLowerCase().includes('document') || 
             existingQuestion.question.toLowerCase().includes('format') || 
             existingQuestion.question.toLowerCase().includes('page limit') ||
             existingQuestion.question.toLowerCase().includes('requirement') ||
             existingQuestion.question.toLowerCase().includes('biosketch') ||
             existingQuestion.question.toLowerCase().includes('budget') ||
             existingQuestion.question.toLowerCase().includes('justification') ||
             existingQuestion.question.toLowerCase().includes('research plan') ||
             existingQuestion.question.toLowerCase().includes('specific aims')) &&
            requirements.requiredDocuments
          ) {
            const requiredDocuments = [...requirements.requiredDocuments];
            const answerLower = data.finalAnswer.toLowerCase();
            
            // Look for mentions of specific documents in the answer
            requiredDocuments.forEach((doc, index) => {
              const docNameLower = doc.documentName.toLowerCase();
              
              // If this document is mentioned in the answer
              if (answerLower.includes(docNameLower) || 
                  // Check for common variations/abbreviations
                  (docNameLower.includes('biosketch') && answerLower.includes('biographical sketch')) ||
                  (docNameLower.includes('research plan') && answerLower.includes('research strategy')) ||
                  (docNameLower.includes('budget justification') && answerLower.includes('budget'))) {
                
                // Update format requirements if mentioned
                if (answerLower.includes('format') || answerLower.includes('font') || 
                    answerLower.includes('margin') || answerLower.includes('spacing') || 
                    answerLower.includes('header') || answerLower.includes('footer')) {
                  
                  // Extract format requirements from the answer
                  const formatInfo = extractFormatInfo(answerLower, docNameLower);
                  if (formatInfo) {
                    requiredDocuments[index] = {
                      ...doc,
                      formatRequirements: formatInfo
                    };
                  }
                }
                
                // Update page limits if mentioned
                if (answerLower.includes('page') || answerLower.includes('length') || 
                    answerLower.includes('limit') || /\d+\s*pages?/.test(answerLower)) {
                  
                  // Extract page limit from the answer
                  const pageLimit = extractPageLimit(answerLower);
                  if (pageLimit) {
                    requiredDocuments[index] = {
                      ...doc,
                      pageLimit: pageLimit
                    };
                  }
                }
                
                // Update description with additional details if substantial new information is provided
                if (data.finalAnswer.length > 30 && !answerLower.includes("unknown") && !answerLower.includes("not sure")) {
                  requiredDocuments[index] = {
                    ...doc,
                    description: doc.description === 'Unknown' ? 
                      data.finalAnswer : 
                      `${doc.description} ${data.finalAnswer.length > 100 ? data.finalAnswer.substring(0, 100) + '...' : data.finalAnswer}`
                  };
                }
              }
            });
            
            // Check if we need to add any new documents mentioned in the answer
            const documentKeywords = [
              'appendix', 'attachment', 'supplement', 'cover letter', 'checklist', 
              'conflict of interest', 'coi', 'human subjects', 'vertebrate animals',
              'data sharing', 'resource sharing', 'authentication', 'support letter',
              'consortium', 'subcontract', 'facilities'
            ];
            
            documentKeywords.forEach(keyword => {
              if (answerLower.includes(keyword) && 
                  !requiredDocuments.some(doc => doc.documentName.toLowerCase().includes(keyword))) {
                
                // This keyword is mentioned but not yet in our documents list
                // Extract surrounding context to create document name and description
                const newDocName = extractDocumentName(keyword, answerLower);
                if (newDocName) {
                  requiredDocuments.push({
                    documentName: newDocName,
                    description: extractDescriptionForKeyword(keyword, data.finalAnswer),
                    pageLimit: extractPageLimit(answerLower) || 'Varies',
                    formatRequirements: extractFormatInfo(answerLower, keyword) || 'Standard format',
                    isRequired: true,
                    confidence: 'high',
                    justification: `Mentioned in answer about ${existingQuestion.question}`
                  });
                }
              }
            });
            
            // Update the requirements with the updated documents
            updatedRequirements.requiredDocuments = requiredDocuments;
          }
          
          // Only move to next question if the current one is complete
          const remainingChatQuestions = updatedQuestions
            .filter(q => q.questionType === 'chat' && !q.completed);
          
          if (remainingChatQuestions.length > 0) {
            // Find the index of the next unanswered chat question
            const nextChatQuestionIndex = updatedQuestions.findIndex(
              q => q.id === remainingChatQuestions[0].id
            );
            
            // Update to the next chat question
            setRequirements(prev => ({
              ...prev,
              currentQuestionIndex: nextChatQuestionIndex
            }));
            
            const nextQuestion = updatedQuestions[nextChatQuestionIndex];
            setMessages([
              {
                role: 'assistant',
                content: `Let's move on to the next question:\n\n${nextQuestion.question}`
              }
            ]);
          } else {
            // All chat questions are complete
            setRequirements(prev => ({
              ...prev,
              completed: true
            }));
          }
        } else {
          // For follow-up questions, keep the same question index
          setMessages(prev => [
            ...prev,
            {
              role: 'assistant',
              content: data.message || 'Please provide more details to complete this question.'
            }
          ]);
        }
      } else {
        // For follow-up questions, keep the same question index
        setMessages(prev => [
          ...prev,
          {
            role: 'assistant',
            content: data.message || 'Please provide more details to complete this question.'
          }
        ]);
      }
    } catch (error) {
      console.error('Error processing message:', error);
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: 'Sorry, there was an error processing your message. Please try again.'
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle key press (Enter to send)
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Function to render the completion status
  const renderCompletionStatus = () => {
    return (
      <div className="flex flex-col items-center space-y-4">
        <CheckCircle2 className="h-12 w-12 text-green-500" />
        <div className="text-center">
          <h3 className="text-2xl font-semibold mb-2">All Application Requirements Completed</h3>
          <p className="text-muted-foreground max-w-md">
            You've successfully completed all the application requirement questions. 
            This information will help you prepare all necessary documents for your funding application.
          </p>
        </div>
      </div>
    );
  };

  // Utility functions for extracting information from text
  const extractPageLimit = (text: string): string | null => {
    // Check for patterns like "X pages", "X-page", "limit of X pages"
    const pageLimitRegex = /(\d+)[\s-]*(page|pages)/i;
    const match = text.match(pageLimitRegex);
    if (match) {
      return `${match[1]} pages`;
    }
    return null;
  };

  const extractFormatInfo = (text: string, documentKeyword: string): string | null => {
    // Look for sentences containing format info near the document keyword
    const sentences = text.split(/[.!?]+/);
    
    for (const sentence of sentences) {
      if ((sentence.includes(documentKeyword) || 
           sentences.indexOf(sentence) > 0 && sentences[sentences.indexOf(sentence)-1].includes(documentKeyword)) && 
          (sentence.includes('format') || sentence.includes('font') || 
           sentence.includes('margin') || sentence.includes('spacing'))) {
        return sentence.trim();
      }
    }
    
    // Check for common format patterns
    const formatPatterns = [
      /(\d+)\s*pt\s*font/i,
      /font\s*size\s*(\d+)/i,
      /(\d+)\s*inch(es)?\s*margins?/i,
      /margins?\s*of\s*(\d+)\s*inch(es)?/i,
      /single\s*spaced/i,
      /double\s*spaced/i
    ];
    
    for (const pattern of formatPatterns) {
      const match = text.match(pattern);
      if (match) {
        return match[0];
      }
    }
    
    return null;
  };

  const extractDocumentName = (keyword: string, text: string): string | null => {
    // Find the sentence containing the keyword
    const sentences = text.split(/[.!?]+/);
    const relevantSentence = sentences.find(s => s.toLowerCase().includes(keyword));
    
    if (!relevantSentence) return null;
    
    // Capitalize the keyword for the document name
    const words = keyword.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    
    // Check if there's a more specific name in the sentence
    if (relevantSentence.toLowerCase().includes(`${keyword} form`)) {
      return `${words} Form`;
    }
    if (relevantSentence.toLowerCase().includes(`${keyword} documentation`)) {
      return `${words} Documentation`;
    }
    if (relevantSentence.toLowerCase().includes(`${keyword} plan`)) {
      return `${words} Plan`;
    }
    if (relevantSentence.toLowerCase().includes(`${keyword} letter`)) {
      return `${words} Letter`;
    }
    return null;
  };

  const extractDescriptionForKeyword = (keyword: string, answer: string): string => {
    // Implement the logic to extract a description for a keyword based on the answer
    // This is a placeholder and should be replaced with the actual implementation
    return `Description for ${keyword}`;
  };

  // Modify the render to show all options questions at once
  function OptionsQuestionsSection() {
    const optionsQuestions = requirements.questions?.filter(q => q.questionType === 'options') || [];
    const allOptionsCompleted = optionsQuestions.every(q => q.completed);
    
    // Process all answered questions to update documents status
    const processAndSaveAnswers = () => {
      // Get current required documents
      const updatedRequiredDocuments = [...(requirements.requiredDocuments || [])];
      
      // Loop through each options question to update document requirements
      optionsQuestions.forEach(question => {
        if (question.completed) {
          // Find the corresponding document
          const documentIndex = updatedRequiredDocuments.findIndex(
            doc => doc.documentName === question.documentName
          );
          
          // Update document status based on answer (if document exists)
          if (documentIndex !== -1) {
            updatedRequiredDocuments[documentIndex] = {
              ...updatedRequiredDocuments[documentIndex],
              isRequired: question.answer === "Yes",
              justification: question.answer === "Yes" 
                ? `User confirmed this document is required` 
                : (question.answer === "No" 
                    ? `User indicated this document is not required` 
                    : `User is unsure if this document is required`)
            };
          }
        }
      });
      
      // Update requirements with updated documents
      setRequirements(prev => ({
        ...prev,
        requiredDocuments: updatedRequiredDocuments
      }));
      
      // Continue to next phase
      completeOptionsPhase();
    };
    
    return (
      <div className="space-y-6">
        <div className="border rounded-lg p-6 bg-card">
          <div className="space-y-6">
            <div className="text-center mb-4">
              <h3 className="text-lg font-semibold">Please answer the following questions:</h3>
              <p className="text-sm text-muted-foreground">
                These simple questions will help us identify your application requirements.
              </p>
            </div>
            
            {optionsQuestions.map((question, index) => (
              <div key={question.id} className="border-b pb-4 last:border-0 last:pb-0">
                <h4 className="text-md font-medium mb-3">{question.question}</h4>
                {question.options && (
                  <div className="space-y-2">
                    {question.options.map((option, optionIndex) => (
                      <Button
                        key={optionIndex}
                        variant={question.answer === option ? "default" : "outline"}
                        className="w-full justify-start"
                        onClick={() => {
                          const updatedQuestions = [...(requirements.questions || [])];
                          const questionIndex = updatedQuestions.findIndex(q => q.id === question.id);
                          
                          if (questionIndex !== -1) {
                            updatedQuestions[questionIndex] = {
                              ...question,
                              answer: option,
                              answerType: 'manually-answered',
                              completed: true,
                              updatedAt: new Date().toISOString()
                            };
                            
                            // Get the updated required documents
                            const updatedRequiredDocuments = [...(requirements.requiredDocuments || [])];
                            
                            // Find the corresponding document for this question
                            const documentIndex = updatedRequiredDocuments.findIndex(
                              doc => doc.documentName === question.documentName
                            );
                            
                            // Update document requirement status based on the answer
                            if (documentIndex !== -1) {
                              updatedRequiredDocuments[documentIndex] = {
                                ...updatedRequiredDocuments[documentIndex],
                                isRequired: option === "Yes",
                                justification: option === "Yes" 
                                  ? `User confirmed this document is required` 
                                  : (option === "No" 
                                      ? `User indicated this document is not required` 
                                      : `User is unsure if this document is required`)
                              };
                            }
                            
                            setRequirements(prev => ({
                              ...prev,
                              questions: updatedQuestions,
                              requiredDocuments: updatedRequiredDocuments,
                              updatedAt: new Date().toISOString()
                            }));
                          }
                        }}
                      >
                        {option}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            ))}
            
            <div className="flex justify-end pt-4">
              <Button 
                onClick={processAndSaveAnswers}
                disabled={!allOptionsCompleted}
              >
                {isRevising ? "Save" : allOptionsCompleted ? "Continue to Next Step" : "Please Answer All Questions"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  function CurrentQuestion() {
    const currentQuestion = requirements.questions?.[requirements.currentQuestionIndex];

    if (!currentQuestion) {
      return null;
    }

    return (
      <div className="border rounded-lg p-6 bg-card">
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold">{currentQuestion.question}</h3>
            {currentQuestion.questionType === 'options' && currentQuestion.options && (
              <div className="mt-4 space-y-3">
                {currentQuestion.options.map((option, index) => (
                  <Button
                    key={index}
                    variant={currentQuestion.answer === option ? "default" : "outline"}
                    className="w-full justify-start"
                    onClick={() => handleOptionsAnswer(option)}
                  >
                    {option}
                  </Button>
                ))}
              </div>
            )}
          </div>
          
          {currentQuestion.questionType === 'chat' && (
            <>
              {currentQuestion.criteria && (
                <div className="bg-muted/50 rounded-md p-3 text-sm text-muted-foreground">
                  <span className="font-medium">Criteria: </span>
                  {currentQuestion.criteria}
                </div>
              )}
              <div className="border rounded-md">
                <div className="p-4 space-y-4 max-h-[300px] overflow-y-auto">
                  {messages.map((message, index) => (
                    <div
                      key={index}
                      className={cn("flex", {
                        "justify-end": message.role === "user",
                      })}
                    >
                      <div
                        className={cn(
                          "rounded-lg px-3 py-2 max-w-[80%]",
                          {
                            "bg-primary text-primary-foreground": message.role === "user",
                            "bg-muted": message.role === "assistant",
                          }
                        )}
                      >
                        {message.content}
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              </div>
              
              <div className="relative">
                <Textarea
                  placeholder="Type your answer..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  rows={3}
                  className="resize-none pr-12"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmit();
                    }
                  }}
                  disabled={isLoading}
                />
                <Button
                  size="sm"
                  variant="ghost"
                  className={cn(
                    "absolute right-1 top-1 h-8 w-8 p-0",
                    isLoading && "opacity-50 pointer-events-none"
                  )}
                  onClick={handleSubmit}
                  disabled={isLoading || input.trim().length === 0}
                >
                  <SendHorizontal className="h-4 w-4" />
                  <span className="sr-only">Send</span>
                </Button>
              </div>
            </>
          )}
          
          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={() => {
                if (isRevising) {
                  // If in revision mode, save changes and return to summary
                  handleReturnToSummary();
                } else {
                  // Skip the current question
                  const nextIndex = requirements.currentQuestionIndex + 1;
                  if (nextIndex < (requirements.questions?.length || 0)) {
                    setRequirements(prev => ({
                      ...prev,
                      currentQuestionIndex: nextIndex
                    }));
                    
                    const nextQuestion = requirements.questions?.[nextIndex];
                    setMessages([
                      {
                        role: 'assistant',
                        content: `Let's answer the next question:\n\n${nextQuestion?.question || 'No more questions.'}`
                      }
                    ]);
                  } else {
                    // All questions completed
                    setRequirements(prev => ({
                      ...prev,
                      completed: true
                    }));
                  }
                }
              }}
            >
              {isRevising ? "Save" : "Skip for now"}
            </Button>
            
            {(currentQuestion.questionType === 'options' && currentQuestion.answer) && (
              <Button 
                onClick={() => handleNextQuestion()}
              >
                Next
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Add a function to handle completion of options phase
  const completeOptionsPhase = () => {
    // Find the first chat question
    const chatQuestionIndex = requirements.questions?.findIndex(q => q.questionType === 'chat') || 0;
    
    if (chatQuestionIndex !== -1 && chatQuestionIndex < (requirements.questions?.length || 0)) {
      // Update to move to the chat phase
      setIsOptionsPhase(false);
      
      // Set the current question to the first chat question
      setRequirements(prev => ({
        ...prev,
        currentQuestionIndex: chatQuestionIndex
      }));
      
      // Get the chat question to display
      const chatQuestion = requirements.questions?.[chatQuestionIndex];
      
      // Update the messages to show the first chat question
      setMessages([
        {
          role: 'assistant',
          content: `Great! Let's continue with some additional questions.\n\n${chatQuestion?.question}`
        }
      ]);

      // When moving to the chat phase, save all changes
      saveRequirements({
        ...requirements,
        currentQuestionIndex: chatQuestionIndex,
        updatedAt: new Date().toISOString()
      });
    } else {
      // If no chat questions, complete the process
      if (isRevising) {
        // If in revision mode, save changes and return to summary
        handleReturnToSummary();
      } else {
        // Complete the process and save to database
        const updatedRequirements = {
          ...requirements,
          completed: true,
          updatedAt: new Date().toISOString()
        };
        
        // Set state and save to database
        setRequirements(updatedRequirements);
        saveRequirements(updatedRequirements);
      }
    }
  };

  // Update handleNextQuestion to check for the end of options phase
  const handleNextQuestion = () => {
    const nextIndex = requirements.currentQuestionIndex + 1;
    
    // Check if we're at the end of options questions
    if (isOptionsPhase) {
      const optionsQuestions = requirements.questions?.filter(q => q.questionType === 'options') || [];
      const currentOptionsIndex = optionsQuestions.findIndex(
        q => q.id === requirements.questions?.[requirements.currentQuestionIndex]?.id
      );
      
      if (currentOptionsIndex === optionsQuestions.length - 1) {
        // We've completed all options questions, move to chat questions
        completeOptionsPhase();
        return;
      }
    }
    
    // Normal next question flow
    if (nextIndex < (requirements.questions?.length || 0)) {
      // If in options phase, only move to next options question
      if (isOptionsPhase) {
        const optionsQuestions = requirements.questions?.filter(q => q.questionType === 'options') || [];
        const currentOptionsIndex = optionsQuestions.findIndex(
          q => q.id === requirements.questions?.[requirements.currentQuestionIndex]?.id
        );
        
        if (currentOptionsIndex < optionsQuestions.length - 1) {
          // Find the next options question in the full questions array
          const nextOptionsQuestionId = optionsQuestions[currentOptionsIndex + 1].id;
          const nextOptionsIndex = requirements.questions?.findIndex(q => q.id === nextOptionsQuestionId) || 0;
          
          setRequirements(prev => ({
            ...prev,
            currentQuestionIndex: nextOptionsIndex
          }));
        }
      } else {
        // In chat phase, move to the next question
        setRequirements(prev => ({
          ...prev,
          currentQuestionIndex: nextIndex
        }));
        
        const nextQuestion = requirements.questions?.[nextIndex];
        setMessages([
          {
            role: 'assistant',
            content: `Let's move on to the next question:\n\n${nextQuestion?.question || 'No more questions.'}`
          }
        ]);
      }
      
      // Clear the input field
      setInput('');
    } else {
      // All questions completed
      setRequirements(prev => ({
        ...prev,
        completed: true,
        updatedAt: new Date().toISOString()
      }));
      
      // Only save to database when all questions are completed
      saveRequirements({
        ...requirements,
        completed: true,
        updatedAt: new Date().toISOString()
      });
    }
  };

  // Add handleOptionsAnswer function
  const handleOptionsAnswer = (selectedOption: string) => {
    const currentQuestion = requirements.questions?.[requirements.currentQuestionIndex];
    
    if (!currentQuestion) {
      return;
    }
    
    // Update the answer in the requirements state
    const updatedQuestions = [...(requirements.questions || [])];
    updatedQuestions[requirements.currentQuestionIndex] = {
      ...currentQuestion,
      answer: selectedOption,
      answerType: 'manually-answered',
      completed: true,
      updatedAt: new Date().toISOString()
    };
    
    // Update required document status based on the answer
    // Only mark as required if the answer is "Yes"
    const updatedRequiredDocuments = [...(requirements.requiredDocuments || [])];
    
    // Find the corresponding document based on question's documentName
    const documentIndex = updatedRequiredDocuments.findIndex(
      doc => doc.documentName === currentQuestion.documentName
    );
    
    if (documentIndex !== -1) {
      // Update the document's isRequired field based on the answer
      updatedRequiredDocuments[documentIndex] = {
        ...updatedRequiredDocuments[documentIndex],
        isRequired: selectedOption === "Yes",
        // Update justification to reflect user's selection
        justification: selectedOption === "Yes" 
          ? `User confirmed this document is required` 
          : (selectedOption === "No" 
              ? `User indicated this document is not required` 
              : `User is unsure if this document is required`)
      };
    }
    
    setRequirements(prev => ({
      ...prev,
      questions: updatedQuestions,
      requiredDocuments: updatedRequiredDocuments,
      updatedAt: new Date().toISOString()
    }));
    
    // Don't save to database here - will be saved when Save button is clicked
  };

  // Add handleSubmit function for chat questions
  const handleSubmit = async () => {
    if (input.trim().length === 0 || isLoading) return;
    
    const currentQuestion = requirements.questions?.[requirements.currentQuestionIndex];
    
    if (!currentQuestion || currentQuestion.questionType !== 'chat') {
      return;
    }
    
    // Add user message
    const userMessage = input;
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setInput('');
    setIsLoading(true);
    
    try {
      // Process the answer and update the requirements
      const updatedQuestions = [...(requirements.questions || [])];
      updatedQuestions[requirements.currentQuestionIndex] = {
        ...currentQuestion,
        answer: userMessage,
        answerType: 'manually-answered',
        completed: true,
        updatedAt: new Date().toISOString()
      };
      
      setRequirements(prev => ({
        ...prev,
        questions: updatedQuestions,
        updatedAt: new Date().toISOString()
      }));
      
      // Don't save to database here - will be saved when Save button is clicked
      
      // Show confirmation message
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: `Thank you for your answer! Let's move on to the next question.` 
      }]);
      
      // Proceed to next question after a short delay
      setTimeout(() => {
        handleNextQuestion();
      }, 1500);
      
    } catch (error) {
      console.error('Error processing answer:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'I encountered an error processing your answer. Please try again.' 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  // Add the missing return statement with the component UI
  return (
    <div className="w-full mx-auto">
      <Card className="w-full">
        <CardContent className="p-6">
          <div className="flex flex-col space-y-4">
            <div className="flex items-center justify-between">
              {isRevising && (
                <Button
                  variant="outline"
                  onClick={handleReturnToSummaryWithoutSaving}
                >
                  Back to Summary
                </Button>
              )}
            </div>
            
            {requirements.completed && !isRevising ? (
              // Summary View - Show all completed questions and required documents
              <div className="flex flex-col items-center justify-center py-8 space-y-6">
                {renderCompletionStatus()}
                
                {requirements.requiredDocuments && requirements.requiredDocuments.length > 0 && (
                  <div className="w-full">
                    <h4 className="text-lg font-semibold mb-3">Required Documents</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                      {requirements.requiredDocuments
                        .filter((doc: RequiredDocument) => doc.isRequired)
                        .map((doc: RequiredDocument, index: number) => (
                          <div key={index} className="bg-muted/30 rounded-lg p-4 border">
                            <div className="flex items-start gap-2">
                              <div className={cn(
                                "w-2 h-2 rounded-full mt-1.5",
                                {
                                  'bg-green-500': doc.confidence === 'high',
                                  'bg-yellow-500': doc.confidence === 'medium',
                                  'bg-orange-500': doc.confidence === 'low'
                                }
                              )} />
                              <div>
                                <h5 className="font-medium text-sm">{doc.documentName}</h5>
                                <p className="text-xs text-muted-foreground mt-1">{doc.description}</p>
                                {doc.justification && (
                                  <p className="text-xs mt-1 italic">
                                    <span className="font-medium">Why required:</span> {doc.justification}
                                  </p>
                                )}
                                {doc.pageLimit !== 'Unknown' && (
                                  <p className="text-xs mt-1">
                                    <span className="font-medium">Page limit:</span> {doc.pageLimit}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                <div className="w-full space-y-6">
                  <h4 className="text-lg font-semibold">Application Requirements</h4>
                  
                  {/* Options Questions Section */}
                  {requirements.questions?.some(q => q.questionType === 'options') && (
                    <div className="space-y-4">
                      <h5 className="text-md font-medium">Multiple Choice Questions</h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {requirements.questions
                          ?.filter(q => q.questionType === 'options')
                          .map((q, index) => (
                            <div 
                              key={index} 
                              className="bg-muted/30 rounded-lg p-4 space-y-3 border transition-all hover:shadow-md hover:border-primary/50 cursor-pointer group"
                              onClick={() => {
                                setIsRevising(true);
                                setRequirements(prev => ({
                                  ...prev,
                                  currentQuestionIndex: requirements.questions?.findIndex(question => question.id === q.id) || 0
                                }));
                                
                                setMessages([
                                  {
                                    role: 'assistant',
                                    content: `Let's revise your answer for this question:\n\n${q.question}`
                                  }
                                ]);
                              }}
                            >
                              <div className="flex items-start gap-3">
                                <div className={cn(
                                  "w-2 h-2 rounded-full mt-2",
                                  {
                                    'bg-blue-500': q.answerType === 'auto-extracted',
                                    'bg-yellow-500': q.answerType === 'uncertainty-expressed',
                                    'bg-green-500': q.answerType === 'manually-answered'
                                  }
                                )} />
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-xs font-medium text-muted-foreground">{q.documentName}</span>
                                  </div>
                                  <h4 className="font-medium text-sm leading-tight mb-2 group-hover:text-primary transition-colors">{q.question}</h4>
                                  <div className="space-y-2">
                                    <div className="text-sm">
                                      <span className="font-medium text-muted-foreground">Answer: </span>
                                      <span className="text-foreground">{q.answer}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                      <div className="text-xs text-muted-foreground">
                                        <span className="font-medium">Source: </span>
                                        {q.answerType === 'auto-extracted' ? 'Auto-extracted' : 
                                        q.answerType === 'uncertainty-expressed' ? 'Uncertain/Undecided' : 
                                        'Manually answered'}
                                      </div>
                                      <div className="text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                                        Click to revise
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Chat Questions Section */}
                  {requirements.questions?.some(q => q.questionType === 'chat') && (
                    <div className="space-y-4">
                      <h5 className="text-md font-medium">Detailed Questions</h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {requirements.questions
                          ?.filter(q => q.questionType === 'chat')
                          .map((q, index) => (
                            <div 
                              key={index} 
                              className="bg-muted/30 rounded-lg p-4 space-y-3 border transition-all hover:shadow-md hover:border-primary/50 cursor-pointer group"
                              onClick={() => {
                                setIsRevising(true);
                                setRequirements(prev => ({
                                  ...prev,
                                  currentQuestionIndex: requirements.questions?.findIndex(question => question.id === q.id) || 0
                                }));
                                
                                setMessages([
                                  {
                                    role: 'assistant',
                                    content: `Let's revise your answer for this question:\n\n${q.question}`
                                  }
                                ]);
                              }}
                            >
                              <div className="flex items-start gap-3">
                                <div className={cn(
                                  "w-2 h-2 rounded-full mt-2",
                                  {
                                    'bg-blue-500': q.answerType === 'auto-extracted',
                                    'bg-yellow-500': q.answerType === 'uncertainty-expressed',
                                    'bg-green-500': q.answerType === 'manually-answered'
                                  }
                                )} />
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-xs font-medium text-muted-foreground">{q.documentName}</span>
                                  </div>
                                  <h4 className="font-medium text-sm leading-tight mb-2 group-hover:text-primary transition-colors">{q.question}</h4>
                                  <div className="space-y-2">
                                    <div className="text-sm">
                                      <span className="font-medium text-muted-foreground">Answer: </span>
                                      <span className="text-foreground">{q.answer}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                      <div className="text-xs text-muted-foreground">
                                        <span className="font-medium">Source: </span>
                                        {q.answerType === 'auto-extracted' ? 'Auto-extracted' : 
                                        q.answerType === 'uncertainty-expressed' ? 'Uncertain/Undecided' : 
                                        'Manually answered'}
                                      </div>
                                      <div className="text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                                        Click to revise
                                      </div>
                                    </div>
                                  </div>
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
              // Questions View - Show either all options questions or one chat question at a time
              <div className="space-y-6">
                {!isInitialAnalysisComplete && isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="flex flex-col items-center space-y-4">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      <p className="text-center text-muted-foreground">
                        Analyzing your research to determine application requirements...
                      </p>
                    </div>
                  </div>
                ) : (
                  // Show either all options questions or one chat question
                  isOptionsPhase ? <OptionsQuestionsSection /> : <CurrentQuestion />
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 