import { useState, useCallback } from 'react';

interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: string) => string | null;
}

interface ValidationRules {
  [key: string]: ValidationRule;
}

interface ValidationErrors {
  [key: string]: string;
}

export function useFormValidation(rules: ValidationRules) {
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [touched, setTouched] = useState<{ [key: string]: boolean }>({});

  const validateField = useCallback((name: string, value: string) => {
    const fieldRules = rules[name];
    if (!fieldRules) return null;

    if (fieldRules.required && !value.trim()) {
      return 'This field is required';
    }

    if (fieldRules.minLength && value.length < fieldRules.minLength) {
      return `Minimum ${fieldRules.minLength} characters required`;
    }

    if (fieldRules.maxLength && value.length > fieldRules.maxLength) {
      return `Maximum ${fieldRules.maxLength} characters allowed`;
    }

    if (fieldRules.pattern && !fieldRules.pattern.test(value)) {
      return 'Invalid format';
    }

    if (fieldRules.custom) {
      return fieldRules.custom(value);
    }

    return null;
  }, [rules]);

  const validate = useCallback((data: { [key: string]: string }): boolean => {
    const newErrors: ValidationErrors = {};
    let isValid = true;

    Object.keys(rules).forEach(key => {
      const error = validateField(key, data[key] || '');
      if (error) {
        newErrors[key] = error;
        isValid = false;
      }
    });

    setErrors(newErrors);
    return isValid;
  }, [rules, validateField]);

  const handleChange = useCallback((name: string, value: string) => {
    if (touched[name]) {
      const error = validateField(name, value);
      setErrors(prev => ({
        ...prev,
        [name]: error || ''
      }));
    }
  }, [touched, validateField]);

  const handleBlur = useCallback((name: string, value: string) => {
    setTouched(prev => ({ ...prev, [name]: true }));
    const error = validateField(name, value);
    setErrors(prev => ({
      ...prev,
      [name]: error || ''
    }));
  }, [validateField]);

  const reset = useCallback(() => {
    setErrors({});
    setTouched({});
  }, []);

  return {
    errors,
    touched,
    validate,
    handleChange,
    handleBlur,
    reset
  };
}
