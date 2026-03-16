import { z } from 'zod';

export const ExpenseCategorySchema = z.object({
  name: z.string().min(1, { message: 'Category name is required' }),
  description: z.string().optional(),
});

export const UpdateExpenseCategorySchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
});
