'use client';

import { useState, ChangeEvent, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { DollarSign, Clock, FileText, Percent, Info } from 'lucide-react';
import { Slider } from '@/components/ui/slider';

export default function ROICalculator() {
  // Updated default values
  const [applications, setApplications] = useState<number>(1000);
  const [costPerApplication, setCostPerApplication] = useState<number>(8000);
  const [hoursPerApplication, setHoursPerApplication] = useState<number>(170);
  const [timeReductionPercent, setTimeReductionPercent] = useState<number>(35);
  
  // Input display values (can be empty)
  const [applicationsInput, setApplicationsInput] = useState<string>("1,000");
  const [costInput, setCostInput] = useState<string>("8,000");
  const [hoursInput, setHoursInput] = useState<string>("170");
  
  // Format number with commas
  const formatWithCommas = (value: number): string => {
    return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };
  
  // Remove commas for processing
  const removeCommas = (value: string): string => {
    return value.replace(/,/g, "");
  };
  
  // Handle input changes with memory of previous values
  const handleApplicationsChange = (e: ChangeEvent<HTMLInputElement>) => {
    const rawValue = removeCommas(e.target.value);
    setApplicationsInput(rawValue);
    
    // Only update the actual value if there's a valid number
    if (rawValue && !isNaN(Number(rawValue))) {
      setApplications(Number(rawValue));
    }
  };
  
  const handleCostChange = (e: ChangeEvent<HTMLInputElement>) => {
    const rawValue = removeCommas(e.target.value);
    setCostInput(rawValue);
    
    // Only update the actual value if there's a valid number
    if (rawValue && !isNaN(Number(rawValue))) {
      setCostPerApplication(Number(rawValue));
    }
  };
  
  const handleHoursChange = (e: ChangeEvent<HTMLInputElement>) => {
    const rawValue = removeCommas(e.target.value);
    setHoursInput(rawValue);
    
    // Only update the actual value if there's a valid number
    if (rawValue && !isNaN(Number(rawValue))) {
      setHoursPerApplication(Number(rawValue));
    }
  };
  
  // Handle slider change for time reduction percentage
  const handleSliderChange = (value: number[]) => {
    setTimeReductionPercent(value[0]);
  };
  
  // Handle blur events to restore previous value if field is empty and format with commas
  const handleBlur = (
    value: string, 
    setValue: (value: string) => void, 
    defaultValue: number,
    shouldFormat: boolean = true
  ) => {
    if (!value || isNaN(Number(removeCommas(value)))) {
      setValue(shouldFormat ? formatWithCommas(defaultValue) : defaultValue.toString());
    } else if (shouldFormat) {
      setValue(formatWithCommas(Number(removeCommas(value))));
    }
  };
  
  // Handle focus to remove commas for editing
  const handleFocus = (
    value: string,
    setValue: (value: string) => void
  ) => {
    setValue(removeCommas(value));
  };
  
  // Calculate savings based on the time reduction percentage
  const calculateSavings = () => {
    const reductionFactor = timeReductionPercent / 100;
    const timeSavings = applications * hoursPerApplication * reductionFactor;
    const costSavings = applications * costPerApplication * reductionFactor;
    return {
      time: timeSavings,
      cost: costSavings
    };
  };
  
  const savings = calculateSavings();
  
  // Format initial values
  useEffect(() => {
    setApplicationsInput(formatWithCommas(applications));
    setCostInput(formatWithCommas(costPerApplication));
    setHoursInput(hoursPerApplication.toString());
  }, []);
  
  return (
    <div className="bg-white py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mx-auto max-w-2xl text-center mb-12"
        >
          <h2 className="text-base font-semibold leading-7 text-gray-600">Calculate Your ROI</h2>
          <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl font-heading">
            See how much you can save
          </p>
          <p className="mt-4 text-lg leading-8 text-gray-500">
            Our platform helps research organizations save time and money on grant applications.
          </p>
        </motion.div>
        
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Input Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="lg:col-span-2"
          >
            <Card className="overflow-hidden h-full flex flex-col">
              <div className="p-6 sm:p-8 border-b border-gray-100 bg-gray-50">
                <h3 className="text-xl font-bold font-heading text-gray-900">Enter your organization's details</h3>
              </div>
              
              <div className="p-6 sm:p-8 flex flex-col gap-8 flex-grow">
                {/* Input Fields */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Applications per year */}
                  <div>
                    <div className="mb-2">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-gray-500 flex-shrink-0" />
                        <Label htmlFor="applications" className="text-sm font-bold text-gray-700">
                          Applications per year
                        </Label>
                      </div>
                    </div>
                    <Input
                      id="applications"
                      type="text"
                      inputMode="numeric"
                      value={applicationsInput}
                      onChange={handleApplicationsChange}
                      onBlur={() => handleBlur(applicationsInput, setApplicationsInput, applications)}
                      onFocus={() => handleFocus(applicationsInput, setApplicationsInput)}
                      className="w-full text-lg font-medium text-gray-900 bg-transparent border-0 border-b border-gray-200 rounded-none px-0 py-1 focus:ring-0 focus:border-gray-900 hover:border-gray-400 transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </div>
                  
                  {/* Cost per application */}
                  <div>
                    <div className="mb-2">
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-gray-500 flex-shrink-0" />
                        <Label htmlFor="costPerApplication" className="text-sm font-bold text-gray-700">
                          Cost per application ($)
                        </Label>
                      </div>
                    </div>
                    <Input
                      id="costPerApplication"
                      type="text"
                      inputMode="numeric"
                      value={costInput}
                      onChange={handleCostChange}
                      onBlur={() => handleBlur(costInput, setCostInput, costPerApplication)}
                      onFocus={() => handleFocus(costInput, setCostInput)}
                      className="w-full text-lg font-medium text-gray-900 bg-transparent border-0 border-b border-gray-200 rounded-none px-0 py-1 focus:ring-0 focus:border-gray-900 hover:border-gray-400 transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </div>
                  
                  {/* Hours per application */}
                  <div>
                    <div className="mb-2">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-gray-500 flex-shrink-0" />
                        <Label htmlFor="hoursPerApplication" className="text-sm font-bold text-gray-700">
                          Hours per application
                        </Label>
                      </div>
                    </div>
                    <Input
                      id="hoursPerApplication"
                      type="text"
                      inputMode="numeric"
                      value={hoursInput}
                      onChange={handleHoursChange}
                      onBlur={() => handleBlur(hoursInput, setHoursInput, hoursPerApplication, false)}
                      onFocus={() => handleFocus(hoursInput, setHoursInput)}
                      className="w-full text-lg font-medium text-gray-900 bg-transparent border-0 border-b border-gray-200 rounded-none px-0 py-1 focus:ring-0 focus:border-gray-900 hover:border-gray-400 transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </div>
                </div>
                
                {/* Time Reduction Slider */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Percent className="h-4 w-4 text-gray-500 flex-shrink-0" />
                      <Label htmlFor="timeReduction" className="text-sm font-bold text-gray-700">
                        Time & Cost Reduction
                      </Label>
                    </div>
                    <span className="text-lg font-medium text-gray-900">{timeReductionPercent}%</span>
                  </div>
                  
                  <Slider
                    id="timeReduction"
                    defaultValue={[35]}
                    max={100}
                    step={5}
                    value={[timeReductionPercent]}
                    onValueChange={handleSliderChange}
                    className="w-full"
                  />
                  
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>0%</span>
                    <span>25%</span>
                    <span>50%</span>
                    <span>75%</span>
                    <span>100%</span>
                  </div>
                </div>
                
                <div className="flex items-start gap-2 mt-2">
                  <Info className="h-4 w-4 text-gray-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-gray-500">
                    Adjust the values above to see your potential savings.
                  </p>
                </div>
              </div>
            </Card>
          </motion.div>
          
          {/* Results Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <Card className="overflow-hidden h-full flex flex-col">
              <div className="p-6 sm:p-8 border-b border-gray-100 bg-gray-50">
                <h3 className="text-xl font-bold font-heading text-gray-900">Your Estimated Savings</h3>
              </div>
              
              <div className="p-6 sm:p-8 flex flex-col gap-8 flex-grow">
                <div>
                  <p className="text-sm font-bold text-gray-700 mb-1">Cost Savings</p>
                  <p className="text-4xl font-bold text-gray-900 font-heading">
                    ${savings.cost.toLocaleString()}
                  </p>
                </div>
                
                <div>
                  <p className="text-sm font-bold text-gray-700 mb-1">Time Savings</p>
                  <p className="text-4xl font-bold text-gray-900 font-heading">
                    {savings.time.toLocaleString()} hours
                  </p>
                </div>
                
                <div className="flex items-start gap-2 mt-auto">
                  <Info className="h-4 w-4 text-gray-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-gray-500">
                    Based on a {timeReductionPercent}% reduction in time and cost when using our platform.
                  </p>
                </div>
              </div>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
} 