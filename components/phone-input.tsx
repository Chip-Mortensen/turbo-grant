"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";

// Phone number formatting function
function formatPhoneNumber(value: string) {
  // Remove all non-digits
  const digits = value.replace(/\D/g, '');
  
  // Format based on length
  if (digits.length === 0) {
    return '';
  } else if (digits.length <= 3) {
    return `(${digits}`;
  } else if (digits.length <= 6) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  } else {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
  }
}

interface PhoneInputProps {
  defaultValue?: string;
  name: string;
  id: string;
  placeholder?: string;
}

export default function PhoneInput({ defaultValue = '', name, id, placeholder = '(XXX) XXX-XXXX' }: PhoneInputProps) {
  const [value, setValue] = useState('');
  
  // Format the initial value when the component mounts
  useEffect(() => {
    if (defaultValue) {
      setValue(formatPhoneNumber(defaultValue));
    }
  }, [defaultValue]);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    
    // If the user is deleting, allow it
    if (input.length < value.length) {
      setValue(input);
      return;
    }
    
    // Only allow digits to be added
    const digits = input.replace(/\D/g, '');
    const previousDigits = value.replace(/\D/g, '');
    
    // Only format if new digits were added
    if (digits.length > previousDigits.length && digits.length <= 10) {
      setValue(formatPhoneNumber(digits));
    }
  };
  
  return (
    <Input
      id={id}
      name={name}
      value={value}
      onChange={handleChange}
      placeholder={placeholder}
      maxLength={14} // (XXX) XXX-XXXX
    />
  );
} 