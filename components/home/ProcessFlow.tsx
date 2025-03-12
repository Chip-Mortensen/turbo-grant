'use client';

import { useRef, useState, useEffect } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { FileText, Search, Sparkles, Send } from 'lucide-react';

const steps = [
  {
    name: 'Input Research Concept',
    description: 'Start with your research idea, no matter how early-stage it might be.',
    Icon: FileText
  },
  {
    name: 'Select Funding Opportunity',
    description: 'Find the perfect funding opportunity matched to your research goals.',
    Icon: Search
  },
  {
    name: 'AI-Assisted Development',
    description: 'Our AI helps structure and refine your proposal for maximum impact.',
    Icon: Sparkles
  },
  {
    name: 'Review and Submit',
    description: 'Polish your application with our validation tools before submission.',
    Icon: Send
  },
];

export default function ProcessFlow() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hasCompleted, setHasCompleted] = useState(false);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start 65%", "end center"]
  });

  // Track when animation completes
  useEffect(() => {
    const unsubscribe = scrollYProgress.on('change', (value) => {
      if (value >= 1 && !hasCompleted) {
        setHasCompleted(true);
      }
    });
    return () => unsubscribe();
  }, [scrollYProgress, hasCompleted]);

  // Create transforms for the progress line
  const progressWidth = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);

  return (
    <div ref={containerRef} className="relative py-16 sm:py-24 bg-gray-50">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mx-auto max-w-2xl lg:text-center"
        >
          <h2 className="text-base font-semibold leading-7 text-gray-600">How It Works</h2>
          <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Four steps to grant success
          </p>
          <p className="mt-6 text-lg leading-8 text-gray-500">
            Our streamlined process guides you from initial concept to final submission
          </p>
        </motion.div>

        {/* Steps */}
        <div className="relative mt-16 max-w-7xl mx-auto">
          {/* Background line */}
          <div className="absolute top-6 left-0 w-full h-0.5 bg-gray-200 md:top-8" />
          
          {/* Animated progress line */}
          <motion.div 
            className="absolute top-6 left-0 h-0.5 bg-primary md:top-8"
            style={{ width: hasCompleted ? "100%" : progressWidth }}
          />

          {/* Steps */}
          <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
            {steps.map((step, index) => {
              const start = index / steps.length;
              const end = (index + 1) / steps.length;
              
              const circleOpacity = useTransform(
                scrollYProgress,
                [start, end],
                [0.3, 1]
              );
              
              const contentOpacity = useTransform(
                scrollYProgress,
                [start, Math.min(end, 0.99)],
                [0, 1]
              );
              
              const contentY = useTransform(
                scrollYProgress,
                [start, Math.min(end, 0.99)],
                [20, 0]
              );
              
              const backgroundColor = useTransform(
                scrollYProgress,
                [start, end],
                ['#fff', 'rgb(var(--primary))']
              );
              
              const textColor = useTransform(
                scrollYProgress,
                [start, end],
                ['rgb(var(--primary))', '#fff']
              );

              return (
                <div key={step.name} className="relative flex flex-col items-center">
                  {/* Number circle - fixed position */}
                  <motion.div
                    style={{
                      backgroundColor: hasCompleted ? 'rgb(var(--primary))' : backgroundColor,
                      opacity: hasCompleted ? 1 : circleOpacity
                    }}
                    className="relative z-10 flex h-12 w-12 items-center justify-center rounded-full border-2 border-primary transition-colors md:h-16 md:w-16"
                  >
                    <motion.span
                      style={{
                        color: hasCompleted ? '#fff' : textColor
                      }}
                      className="text-xl font-semibold font-heading md:text-2xl"
                    >
                      {index + 1}
                    </motion.span>
                  </motion.div>

                  {/* Content - animated */}
                  <motion.div
                    style={{
                      opacity: hasCompleted ? 1 : contentOpacity,
                      y: hasCompleted ? 0 : contentY
                    }}
                    className="mt-6 text-center"
                  >
                    <div className="flex items-center justify-center gap-2">
                      <step.Icon className="h-5 w-5 text-primary" />
                      <h3 className="text-lg font-semibold text-gray-900">{step.name}</h3>
                    </div>
                    <p className="mt-2 text-sm text-gray-500">{step.description}</p>
                  </motion.div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
} 