export type FormState = {
  ok?: boolean;
  message?: string;
  error?: string;
  errors?: Record<string, string>;
} | null;

export type FormAction = (prev: FormState, fd: FormData) => Promise<FormState>;
