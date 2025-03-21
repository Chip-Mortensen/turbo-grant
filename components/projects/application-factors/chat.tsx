'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { SendHorizontal, Loader2, CheckCircle2 } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { cn } from '@/lib/utils';
import { organizationTypeLabels } from '@/types/enum-types';
import { useRouter } from 'next/navigation';

// Define the structure for questions and answers
interface QuestionAnswer {
  id: string;
  question: string;
  criteria: string;
  answer: string;
  completed: boolean;
  answerType?: 'auto-extracted' | 'uncertainty-expressed' | 'manually-answered';
}

// Define the structure for application factors
interface ApplicationFactors {
  completed?: boolean;
  updatedAt?: string;
  questions?: QuestionAnswer[];
  currentQuestionIndex?: number;
  progress?: number;
  totalQuestions?: number;
  completedQuestions?: number;
  recommendedGrants?: {
    agencyType: string;
    organizationType: string;
    recommendedGrants: Array<{
      code: string;
    }>;
  };
  recommendationsUpdatedAt?: string;
}

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ApplicationFactorsChatProps {
  projectId: string;
  researchDescription: string;
  applicationFactors: ApplicationFactors;
}

// Predefined questions
const PREDEFINED_QUESTIONS: Omit<QuestionAnswer, 'answer' | 'completed'>[] = [
  {
    id: 'agency_alignment',
    question: 'Which funding agency do you believe your research aligns with better - NIH (biomedical/health focus) or NSF (fundamental science/engineering) or both?',
    criteria: 'An acceptable answer should indicate NIH, NSF, or Both in some way. Uncertainty for which agency is acceptable as well.'
  },
  {
    id: 'specific_institute',
    question: 'Is your research targeted toward a specific institute, center, or directorate within NIH or NSF? If so, please specify. For example, a specific NIH Institute like National Institute of Mental Health or NSF Directorate for Mathematical and Physical Sciences.',
    criteria: 'A complete answer should name specific institutes/centers/directorates. Please ignore the relevance to the research. If the user mentions any institutes/centers/directorates, that is sufficient. Uncertainty is acceptable as well.'
  },
  {
    id: 'grant_type',
    question: 'Do you have some types of grant mechanisms in mind that would be most suitable for your research? For example, R01, R03, CAREER?',
    criteria: 'A complete answer should specify one or more grant mechanism(s). Uncertainty is acceptable as well.'
  },
  {
    id: 'applicant_characteristics',
    question: 'Please describe your organization type and any special characteristics that might be relevant for funding.',
    criteria: `A complete answer should specify an organization type that aligns closely from the following options:\n${Object.values(organizationTypeLabels).join(', ')}. Uncertainty is acceptable as well.`
  },
  {
    id: 'project_management',
    question: 'How is your project structured in terms of leadership and collaboration? (Please include specifics like Single PI, Multiple PIs, Institutional Collaborations, International Partnerships etc.)',
    criteria: 'A complete answer should include the specifics like Single PI, Multiple PIs, Institutional Collaborations, International Partnerships (not all of these apply). Uncertainty is acceptable as well.'
  },
  {
    id: 'ethical_compliance',
    question: 'Does your research involve any of the following: human subjects, animal research, or other special ethical or regulatory considerations?',
    criteria: 'A complete answer should specify if the research includes human subjects, animal research, or other special ethical or regulatory considerations. Uncertainty is acceptable as well.'
  },
  {
    id: 'research_location',
    question: 'Where will your research be conducted? Are there any special geographical considerations (international sites, specific environments like polar regions, etc.)?',
    criteria: 'A complete answer should list the research locations, specify any special environmental requirements if any. Uncertainty is acceptable as well.'
  }
];

export function ApplicationFactorsChat({ 
  projectId, 
  researchDescription,
  applicationFactors 
}: ApplicationFactorsChatProps) {
  // Validate research description
  if (!researchDescription?.trim()) {
    console.warn('Research description is required for ApplicationFactorsChat component');
  }

  const supabase = createClient();
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isRevising, setIsRevising] = useState(false);
  const [factors, setFactors] = useState<ApplicationFactors>(
    applicationFactors.questions ? applicationFactors : {
      completed: false,
      updatedAt: new Date().toISOString(),
      questions: PREDEFINED_QUESTIONS.map(q => ({
        ...q,
        answer: '',
        completed: false
      })),
      currentQuestionIndex: 0
    }
  );
  const [isInitialAnalysisComplete, setIsInitialAnalysisComplete] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
    if (!factors.questions?.length || messages.length > 0) return;

    const shouldAnalyze = !applicationFactors.questions && researchDescription?.trim() && !isInitialAnalysisComplete;

    if (shouldAnalyze) {
      analyzeAllQuestions();
    } else {
      // For existing questions, find the first unanswered one
      const firstUnansweredIndex = findNextUnansweredQuestion(factors.questions || [], -1);
      
      if (firstUnansweredIndex !== -1) {
        const currentQuestion = factors.questions?.[firstUnansweredIndex];
        setMessages([{ role: 'assistant', content: currentQuestion?.question || 'No question available' }]);
        setFactors(prev => ({ ...prev, currentQuestionIndex: firstUnansweredIndex }));
      } else {
        setFactors(prev => ({ ...prev, completed: true }));
        setMessages([
          {
            role: 'assistant',
            content: 'All funding factor questions have been completed. You can review the answers or edit them if needed.'
          }
        ]);
      }
    }
  }, [factors.questions, messages.length, researchDescription, isInitialAnalysisComplete, applicationFactors.questions]);

  // Analyze all questions at once
  const analyzeAllQuestions = async () => {
    if (!researchDescription?.trim() || !factors.questions) return;
    
    setIsLoading(true);
    
    setMessages([
      { role: 'assistant', content: 'I\'m analyzing your research description to see which funding factor questions I can answer automatically...' }
    ]);
    
    try {
      const response = await fetch('/api/application-factors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          researchDescription,
          projectId,
          analyzeAll: true,
          questions: factors.questions
        }),
      });

      if (!response.ok) throw new Error('Failed to analyze questions');

      const data = await response.json();
      
      const updatedQuestions = [...factors.questions];
      let autoExtractedCount = 0;
      let uncertaintyCount = 0;
      
      data.results.forEach((result: any) => {
        const questionIndex = updatedQuestions.findIndex(q => q.id === result.questionId);
        if (questionIndex === -1) return;
        
        if (result.isAnswerComplete && result.finalAnswer) {
          updatedQuestions[questionIndex] = {
            ...updatedQuestions[questionIndex],
            answer: result.finalAnswer,
            answerType: result.isUncertaintyExpressed ? 'uncertainty-expressed' : 'auto-extracted',
            completed: true
          };
          
          result.isUncertaintyExpressed ? uncertaintyCount++ : autoExtractedCount++;
        }
      });
      
      const completedQuestions = updatedQuestions.filter(q => q.completed).length;
      const firstUnansweredIndex = findNextUnansweredQuestion(updatedQuestions, -1);
      const isAllComplete = firstUnansweredIndex === -1;

      const updatedFactors: ApplicationFactors = {
        ...factors,
        questions: updatedQuestions,
        currentQuestionIndex: isAllComplete ? 0 : firstUnansweredIndex,
        completed: isAllComplete,
        progress: (completedQuestions / updatedQuestions.length) * 100,
        totalQuestions: updatedQuestions.length,
        completedQuestions,
        updatedAt: new Date().toISOString()
      };
      
      let summaryMessage = 'I\'ve analyzed your research description and ';
      if (autoExtractedCount > 0 || uncertaintyCount > 0) {
        if (autoExtractedCount > 0 && uncertaintyCount > 0) {
          summaryMessage += `found direct answers for ${autoExtractedCount} questions and noted uncertainty for ${uncertaintyCount} questions. `;
        } else if (autoExtractedCount > 0) {
          summaryMessage += `found direct answers for ${autoExtractedCount} questions. `;
        } else {
          summaryMessage += `noted uncertainty for ${uncertaintyCount} questions. `;
        }
      } else {
        summaryMessage = 'I\'ve analyzed your research description but couldn\'t find direct answers to any of the funding factor questions. ';
      }

      // Set the final messages and state in one go
      if (isAllComplete) {
        setMessages([
          {
            role: 'assistant',
            content: summaryMessage + 'All questions have been answered. You can review the answers. I\'m also analyzing your responses to recommend suitable grant types for your research.'
          }
        ]);
      } else {
        const nextQuestion = updatedQuestions[firstUnansweredIndex];
        setMessages([
          {
            role: 'assistant',
            content: summaryMessage + (autoExtractedCount > 0 || uncertaintyCount > 0 ? 'For the remaining questions, I\'ll need more specific information from you.' : 'Let\'s go through them one by one.') + '\n\n' + nextQuestion.question
          }
        ]);
      }
      
      setFactors(updatedFactors);
      await saveFactors(updatedFactors);
      setIsInitialAnalysisComplete(true);
    } catch (error) {
      console.error('Error analyzing all questions:', error);
      const firstUnansweredIndex = findNextUnansweredQuestion(factors.questions || [], -1);
      const currentQuestion = factors.questions?.[firstUnansweredIndex];
      
      setMessages([
        {
          role: 'assistant',
          content: `Sorry, there was an error analyzing your research description. Let's proceed with the questions one by one.\n\n${currentQuestion?.question || ''}`
        }
      ]);
      setIsInitialAnalysisComplete(true);
    } finally {
      setIsLoading(false);
    }
  };

  // Save factors to database
  const saveFactors = async (updatedFactors: ApplicationFactors) => {
    try {
      // Get the previous version to check for changes
      const { data } = await supabase
        .from('research_projects')
        .select('application_factors')
        .eq('id', projectId)
        .single();
      
      const previousFactors = data?.application_factors as ApplicationFactors | undefined;
      
      // Check if we're updating an already completed set of factors
      // or if specific important questions have been modified
      const shouldRegenerateRecommendations = 
        // If all questions are completed
        updatedFactors.completed || 
        // OR if the factors were previously completed and we're revising
        (previousFactors?.completed && isRevising) ||
        // OR if any crucial questions have been modified
        (previousFactors?.questions && updatedFactors.questions && haveCrucialQuestionsChanged(
          previousFactors.questions, 
          updatedFactors.questions
        ));
      
      // Update the database
      const { error } = await supabase
        .from('research_projects')
        .update({ application_factors: updatedFactors })
        .eq('id', projectId);

      if (error) console.error('Error saving application factors:', error);
      
      // Trigger grant recommendations if needed
      if (shouldRegenerateRecommendations) {
        fetchGrantRecommendations();
      }
    } catch (error) {
      console.error('Error saving application factors:', error);
    }
  };
  
  // Check if crucial questions that affect grant recommendations have changed
  const haveCrucialQuestionsChanged = (
    prevQuestions: QuestionAnswer[], 
    currentQuestions: QuestionAnswer[]
  ): boolean => {
    // Crucial question IDs that directly affect grant recommendations
    const crucialQuestionIds = ['agency_alignment', 'applicant_characteristics', 'specific_institute', 'grant_type'];
    
    // Check if any crucial questions have different answers
    return crucialQuestionIds.some(id => {
      const prevQuestion = prevQuestions.find(q => q.id === id);
      const currentQuestion = currentQuestions.find(q => q.id === id);
      
      // Check if both exist and have completed answers, but the answers differ
      return prevQuestion?.completed && currentQuestion?.completed && 
             prevQuestion.answer !== currentQuestion.answer;
    });
  };

  // Function to fetch grant recommendations
  const fetchGrantRecommendations = async () => {
    try {
      console.log('Fetching grant recommendations...');
      const response = await fetch('/api/application-factors/grant-recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId }),
      });

      if (!response.ok) {
        const data = await response.json();
        console.error('Error fetching grant recommendations:', data.error);
        return;
      }

      const data = await response.json();
      console.log('Grant recommendations received:', data);
      
      // Once we receive the recommendations, update our local state
      if (data.success && data.recommendations) {
        // Ensure the recommendations match our expected format
        const recommendedGrants = data.recommendations.recommendedGrants?.map((g: {code: string}) => ({
          code: g.code || '',
        })) || [];

        const updatedFactors = {
          ...factors,
          recommendedGrants: {
            agencyType: data.recommendations.agencyType || '',
            organizationType: data.recommendations.organizationType || '',
            recommendedGrants,
          },
          recommendationsUpdatedAt: new Date().toISOString()
        };
        
        // Log the final state update
        console.log('Updating application factors with recommendations:', {
          agencyType: updatedFactors.recommendedGrants?.agencyType,
          organizationType: updatedFactors.recommendedGrants?.organizationType,
          recommendedGrants: updatedFactors.recommendedGrants?.recommendedGrants.map((g: {code: string}) => g.code),
          totalRecommendations: updatedFactors.recommendedGrants?.recommendedGrants.length
        });
        
        setFactors(updatedFactors);
      }
    } catch (error) {
      console.error('Error fetching grant recommendations:', error);
    }
  };

  // Add this function to handle returning to the summary view
  const handleReturnToSummary = () => {
    setIsRevising(false);
    const isAllComplete = factors.questions?.every(q => q.completed) ?? false;
    const updatedFactors = {
      ...factors,
      completed: isAllComplete
    };
    
    setFactors(updatedFactors);
    saveFactors(updatedFactors);
    
    setMessages([
      {
        role: 'assistant',
        content: 'All funding factor questions have been completed. You can review the answers. I\'m also analyzing your responses to recommend suitable grant types for your research.'
      }
    ]);
  };

  // Modify handleSendMessage to handle revision mode
  const handleSendMessage = async () => {
    if (!userInput.trim() || isLoading) return;

    const userMessage: ChatMessage = { role: 'user', content: userInput };
    setMessages(prev => [...prev, userMessage]);
    setUserInput('');
    setIsLoading(true);

    try {
      const currentQuestionIndex = factors.currentQuestionIndex || 0;
      const currentQuestion = factors.questions?.[currentQuestionIndex];
      if (!currentQuestion) throw new Error('No current question found');

      const response = await fetch('/api/application-factors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: messages.concat(userMessage),
          researchDescription,
          currentQuestion: currentQuestion.id,
          projectId,
          criteria: currentQuestion.criteria,
          currentQuestionContext: currentQuestion.question
        }),
      });

      if (!response.ok) throw new Error('Failed to get response from API');

      const data = await response.json();
      
      const updatedQuestions = [...(factors.questions || [])];

      // Get the current question being asked from the messages
      const assistantMessages = messages.filter(m => m.role === 'assistant');
      const lastAssistantMessage = assistantMessages[assistantMessages.length - 1];
      
      // Find the question that matches the last assistant message
      const questionIndex = factors.questions?.findIndex(q => 
        lastAssistantMessage?.content.includes(q.question)
      );

      // If we can't find the question in the last message, keep the current index
      const currentIndex = questionIndex !== -1 ? questionIndex : currentQuestionIndex;

      // Log the question we think we're answering
      console.log('Current question being answered:', {
        questionFromMessage: questionIndex !== undefined && questionIndex !== -1 && factors.questions && factors.questions[questionIndex] 
          ? factors.questions[questionIndex].question 
          : 'Not found in last message',
        currentQuestionIndex: currentQuestionIndex,
        lastAssistantMessage: lastAssistantMessage?.content,
        finalQuestionIndex: currentIndex,
        finalQuestion: currentIndex !== undefined && factors.questions && factors.questions[currentIndex] 
          ? factors.questions[currentIndex].question 
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

      const isAllComplete = !updatedQuestions.some(q => !q.completed);
      
      const completedQuestions = updatedQuestions.filter(q => q.completed).length;
      const updatedFactors: ApplicationFactors = {
        ...factors,
        questions: updatedQuestions,
        currentQuestionIndex: currentIndex,
        completed: isAllComplete,
        progress: (completedQuestions / updatedQuestions.length) * 100,
        totalQuestions: updatedQuestions.length,
        completedQuestions,
        updatedAt: new Date().toISOString()
      };
      
      setFactors(updatedFactors);
      await saveFactors(updatedFactors);

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
          // Only move to next question if the current one is complete
          const nextQuestionIndex = findNextUnansweredQuestion(updatedQuestions, currentIndex);
          const nextQuestion = updatedQuestions[nextQuestionIndex];
          
          // Update the current question index
          setFactors(prev => ({
            ...prev,
            currentQuestionIndex: nextQuestionIndex
          }));
          
          setMessages(prev => [
            ...prev,
            { role: 'assistant', content: `Thank you. ${nextQuestion.question}` }
          ]);
        } else {
          setMessages(prev => [
            ...prev,
            {
              role: 'assistant',
              content: 'Thank you! All questions have been completed. You can now review your answers. I\'m also analyzing your responses to recommend suitable grant types for your research.'
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

  // Render completion status
  const renderCompletionStatus = () => {
    if (!factors.questions) return null;
    
    const completedCount = factors.questions.filter(q => q.completed).length;
    const autoAnsweredCount = factors.questions.filter(q => q.completed && q.answerType === 'auto-extracted').length;
    const uncertaintyCount = factors.questions.filter(q => q.completed && q.answerType === 'uncertainty-expressed').length;
    const manuallyAnsweredCount = completedCount - autoAnsweredCount - uncertaintyCount;
    const totalCount = factors.questions.length;
    
    return (
      <div className="space-y-2 mb-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="flex-1 bg-muted rounded-full h-2">
            <div 
              className="bg-primary h-2 rounded-full" 
              style={{ width: `${(completedCount / totalCount) * 100}%` }}
            />
          </div>
          <span>{completedCount}/{totalCount} funding factors completed</span>
        </div>
        {completedCount > 0 && (
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {autoAnsweredCount > 0 && (
              <span className="flex items-center">
                <div className="w-2 h-2 rounded-full bg-blue-500 mr-1" />
                {autoAnsweredCount} auto-extracted
              </span>
            )}
            {manuallyAnsweredCount > 0 && (
              <span className="flex items-center">
                <div className="w-2 h-2 rounded-full bg-green-500 mr-1" />
                {manuallyAnsweredCount} manually answered
              </span>
            )}
            {uncertaintyCount > 0 && (
              <span className="flex items-center">
                <div className="w-2 h-2 rounded-full bg-yellow-500 mr-1" />
                {uncertaintyCount} uncertain/undecided
              </span>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <Card className="w-full">
      <CardContent className="p-6">
        {renderCompletionStatus()}
        
        {factors.completed && !isRevising ? (
          <div className="flex flex-col items-center justify-center py-8 space-y-6">
            <div className="flex flex-col items-center space-y-4">
              <CheckCircle2 className="h-12 w-12 text-green-500" />
              <div className="text-center">
                <h3 className="text-2xl font-semibold mb-2">All Funding Factors Completed</h3>
                <p className="text-muted-foreground max-w-md">
                  You've successfully completed all the funding factor questions. 
                  This information will help match your research with the most appropriate funding opportunities.
                </p>
              </div>
            </div>

            <div className="w-full max-w-3xl space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {factors.questions?.map((q, index) => (
                  <div 
                    key={index} 
                    className="bg-muted/30 rounded-lg p-4 space-y-3 border transition-all hover:shadow-md hover:border-primary/50 cursor-pointer group"
                    onClick={() => {
                      setIsRevising(true);
                      setFactors(prev => ({
                        ...prev,
                        currentQuestionIndex: index
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
          </div>
        ) : (
          <>
            <div className="h-[400px] overflow-y-auto mb-4 space-y-4 p-4 border rounded-md">
              {messages.filter(m => m.role !== 'system').map((message, index) => {
                const isQuestion = message.role === 'assistant' && 
                  factors.questions?.some(q => q.question === message.content);
                const questionCriteria = isQuestion ? 
                  factors.questions?.find(q => q.question === message.content)?.criteria : null;
                
                return (
                  <div 
                    key={index}
                    className={cn(
                      "flex gap-3",
                      message.role === 'user' ? "justify-end" : "justify-start"
                    )}
                  >
                    {message.role === 'assistant' && (
                      <Avatar>
                        <AvatarFallback>TG</AvatarFallback>
                      </Avatar>
                    )}
                    <div className="flex flex-col gap-2 max-w-[80%]">
                      <div 
                        className={cn(
                          "rounded-lg px-4 py-2",
                          message.role === 'user' 
                            ? "bg-primary text-primary-foreground" 
                            : "bg-muted"
                        )}
                      >
                        {message.content}
                      </div>
                      {questionCriteria && (
                        <div className="text-sm text-muted-foreground px-4">
                          <span className="font-medium">Criteria for a complete answer:</span><br/>
                          {questionCriteria}
                        </div>
                      )}
                    </div>
                    {message.role === 'user' && (
                      <Avatar>
                        <AvatarFallback>U</AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                );
              })}
              {isLoading && (
                <div className="flex justify-start gap-3">
                  <Avatar>
                    <AvatarFallback>TG</AvatarFallback>
                  </Avatar>
                  <div className="rounded-lg px-4 py-2 bg-muted flex items-center">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="ml-2">Thinking...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
            
            <div className="flex gap-2">
              <Textarea
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Type your response..."
                className="flex-1 resize-none"
                rows={2}
                disabled={isLoading}
              />
              <Button 
                onClick={handleSendMessage} 
                disabled={!userInput.trim() || isLoading}
                className="self-end"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <SendHorizontal className="h-4 w-4" />
                )}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
} 