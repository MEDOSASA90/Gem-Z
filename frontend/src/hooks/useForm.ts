'use client';

import { useState, useCallback, useRef } from 'react';
import type { ZodSchema, ZodError } from 'zod';

// ─── Types ───────────────────────────────────────────────────

export type FormErrors<T> = Partial<Record<keyof T, string>>;
export type FormTouched<T> = Partial<Record<keyof T, boolean>>;

interface UseFormOptions<T extends Record<string, unknown>> {
  /** Initial form values */
  initialValues: T;
  /** Zod validation schema */
  schema?: ZodSchema<T>;
  /** Submit handler - called only when validation passes */
  onSubmit: (values: T) => Promise<void> | void;
  /** Called when validation fails */
  onError?: (errors: FormErrors<T>) => void;
  /** Validate on change (default: false) */
  validateOnChange?: boolean;
  /** Validate on blur (default: true) */
  validateOnBlur?: boolean;
  /** Reset form after successful submit */
  resetOnSuccess?: boolean;
}

interface UseFormReturn<T extends Record<string, unknown>> {
  /** Current form values */
  values: T;
  /** Validation errors */
  errors: FormErrors<T>;
  /** Touched fields */
  touched: FormTouched<T>;
  /** Is the form currently submitting */
  isSubmitting: boolean;
  /** Was the form ever submitted */
  isSubmitted: boolean;
  /** Is the form valid (no errors) */
  isValid: boolean;
  /** Is form dirty (any field changed) */
  isDirty: boolean;
  /** Dirty fields tracker */
  dirty: FormTouched<T>;
  /** Change handler for inputs - use with onChange */
  handleChange: (name: keyof T, value: unknown) => void;
  /** Blur handler for inputs - use with onBlur */
  handleBlur: (name: keyof T) => void;
  /** Submit handler - attach to form onSubmit */
  handleSubmit: (e?: React.FormEvent) => Promise<void>;
  /** Set a specific field value programmatically */
  setFieldValue: (name: keyof T, value: unknown) => void;
  /** Set multiple field values */
  setFieldValues: (values: Partial<T>) => void;
  /** Set a field error */
  setFieldError: (name: keyof T, error: string) => void;
  /** Clear all errors */
  clearErrors: () => void;
  /** Clear specific error */
  clearFieldError: (name: keyof T) => void;
  /** Reset form to initial values */
  resetForm: () => void;
  /** Validate the entire form - returns true if valid */
  validate: () => boolean;
  /** Validate a single field - returns error message or undefined */
  validateField: (name: keyof T) => string | undefined;
  /** Get field props for binding to inputs */
  getFieldProps: (name: keyof T) => {
    value: unknown;
    onChange: (value: unknown) => void;
    onBlur: () => void;
    error?: string;
    touched?: boolean;
  };
}

// ─── Hook ────────────────────────────────────────────────────

/**
 * Form management hook with Zod validation.
 *
 * @example
 * import { z } from 'zod';
 *
 * const schema = z.object({
 *   email: z.string().email('Invalid email'),
 *   password: z.string().min(8, 'Min 8 characters'),
 * });
 *
 * const form = useForm({
 *   initialValues: { email: '', password: '' },
 *   schema,
 *   onSubmit: async (values) => {
 *     await login(values);
 *   },
 * });
 *
 * // In JSX:
 * <form onSubmit={form.handleSubmit}>
 *   <input
 *     value={form.values.email}
 *     onChange={(e) => form.handleChange('email', e.target.value)}
 *     onBlur={() => form.handleBlur('email')}
 *   />
 *   {form.errors.email && <span>{form.errors.email}</span>}
 *   <button type="submit" disabled={form.isSubmitting}>
 *     {form.isSubmitting ? 'Loading...' : 'Submit'}
 *   </button>
 * </form>
 */
export function useForm<T extends Record<string, unknown>>({
  initialValues,
  schema,
  onSubmit,
  onError,
  validateOnChange = false,
  validateOnBlur = true,
  resetOnSuccess = false,
}: UseFormOptions<T>): UseFormReturn<T> {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<FormErrors<T>>({});
  const [touched, setTouched] = useState<FormTouched<T>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [dirty, setDirty] = useState<FormTouched<T>>({});
  const initialValuesRef = useRef(initialValues);

  // ─── Validation ────────────────────────────────────────────

  const validateForm = useCallback(
    (data: T): FormErrors<T> => {
      if (!schema) return {};
      try {
        schema.parse(data);
        return {};
      } catch (err) {
        if ((err as Error).name === 'ZodError') {
          const zodErr = err as { errors: Array<{ path: (string | number)[]; message: string }> };
          const formErrors: FormErrors<T> = {};
          zodErr.errors.forEach((issue) => {
            const path = issue.path[0] as keyof T;
            if (!formErrors[path]) {
              formErrors[path] = issue.message;
            }
          });
          return formErrors;
        }
        return {};
      }
    },
    [schema]
  );

  const validate = useCallback((): boolean => {
    const validationErrors = validateForm(values);
    setErrors(validationErrors);
    return Object.keys(validationErrors).length === 0;
  }, [values, validateForm]);

  const validateField = useCallback(
    (name: keyof T): string | undefined => {
      if (!schema) return undefined;
      try {
        schema.parse(values);
        return undefined;
      } catch (err) {
        if ((err as Error).name === 'ZodError') {
          const zodErr = err as { errors: Array<{ path: (string | number)[]; message: string }> };
          const fieldError = zodErr.errors.find((issue) => issue.path[0] === name);
          return fieldError?.message;
        }
        return undefined;
      }
    },
    [schema, values]
  );

  // ─── Change Handlers ───────────────────────────────────────

  const handleChange = useCallback(
    (name: keyof T, value: unknown) => {
      setValues((prev) => ({ ...prev, [name]: value }));
      setDirty((prev) => ({ ...prev, [name]: true }));

      if (validateOnChange) {
        const fieldError = validateField(name);
        setErrors((prev) => ({ ...prev, [name]: fieldError }));
      }
    },
    [validateOnChange, validateField]
  );

  const handleBlur = useCallback(
    (name: keyof T) => {
      setTouched((prev) => ({ ...prev, [name]: true }));
      if (validateOnBlur) {
        const fieldError = validateField(name);
        setErrors((prev) => ({ ...prev, [name]: fieldError }));
      }
    },
    [validateOnBlur, validateField]
  );

  // ─── Submit Handler ────────────────────────────────────────

  const handleSubmit = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault();
      setIsSubmitted(true);

      // Validate all fields
      const validationErrors = validateForm(values);
      setErrors(validationErrors);
      setTouched(
        Object.keys(values).reduce(
          (acc, key) => ({ ...acc, [key]: true }),
          {}
        ) as FormTouched<T>
      );

      if (Object.keys(validationErrors).length > 0) {
        onError?.(validationErrors);
        return;
      }

      setIsSubmitting(true);
      try {
        await onSubmit(values);
        if (resetOnSuccess) {
          resetForm();
        }
      } catch (submitError) {
        const errorMessage =
          submitError instanceof Error ? submitError.message : 'Submission failed';
        if (
          submitError &&
          typeof submitError === 'object' &&
          'fieldErrors' in submitError
        ) {
          setErrors((submitError as { fieldErrors: FormErrors<T> }).fieldErrors);
        } else {
          setErrors({ _form: errorMessage } as FormErrors<T>);
        }
      } finally {
        setIsSubmitting(false);
      }
    },
    [values, validateForm, onSubmit, onError, resetOnSuccess]
  );

  // ─── Utility Functions ─────────────────────────────────────

  const setFieldValue = useCallback((name: keyof T, value: unknown) => {
    setValues((prev) => ({ ...prev, [name]: value }));
    setDirty((prev) => ({ ...prev, [name]: true }));
  }, []);

  const setFieldValues = useCallback((newValues: Partial<T>) => {
    setValues((prev) => ({ ...prev, ...newValues }));
    setDirty((prev) => ({
      ...prev,
      ...Object.keys(newValues).reduce(
        (acc, key) => ({ ...acc, [key]: true }),
        {}
      ),
    }));
  }, []);

  const setFieldError = useCallback((name: keyof T, error: string) => {
    setErrors((prev) => ({ ...prev, [name]: error }));
  }, []);

  const clearErrors = useCallback(() => setErrors({}), []);

  const clearFieldError = useCallback((name: keyof T) => {
    setErrors((prev) => {
      const next = { ...prev };
      delete next[name];
      return next;
    });
  }, []);

  function resetForm() {
    setValues(initialValuesRef.current);
    setErrors({});
    setTouched({});
    setDirty({});
    setIsSubmitted(false);
  }

  const getFieldProps = useCallback(
    (name: keyof T) => ({
      value: values[name],
      onChange: (value: unknown) => handleChange(name, value),
      onBlur: () => handleBlur(name),
      error: errors[name],
      touched: touched[name],
    }),
    [values, errors, touched, handleChange, handleBlur]
  );

  // ─── Derived State ─────────────────────────────────────────

  const isValid = Object.keys(errors).length === 0;
  const isDirty = Object.keys(dirty).length > 0;

  return {
    values, errors, touched,
    isSubmitting, isSubmitted,
    isValid, dirty, isDirty,
    handleChange, handleBlur, handleSubmit,
    setFieldValue, setFieldValues,
    setFieldError, clearErrors, clearFieldError,
    resetForm, validate, validateField,
    getFieldProps,
  };
}

// ─── Preset Zod Schema Helpers ───────────────────────────────
// Import zod in your component and pass schemas to useForm
// Example:
//   import { z } from 'zod';
//   const schema = z.object({
//     email: z.string().email('Invalid email').min(1, 'Required'),
//     password: z.string().min(8, 'Min 8 chars'),
//   });

export default useForm;
