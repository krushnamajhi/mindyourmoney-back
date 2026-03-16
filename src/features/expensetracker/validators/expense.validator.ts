import { z } from 'zod';
import { ExpenseItemLineSplitType, ExpenseSplitType } from '../lib/split-type.enum';
import { round } from '../lib/common.utils';
import { Filter_ALL, Filter_NONE } from '../../../config/constants';

const DebtMemberSplitSchema = z.object({
  userId: z.coerce.number().int().positive(),
  amount: z.coerce.number().nonnegative().optional(),
  percent: z.coerce.number().min(0).max(100).optional(),
  share: z.coerce.number().positive().optional(),
});

const DebtMemberSplitExpenseItemLineSchema = z.object({
  userId: z.coerce.number().int().positive(),
  amount: z.coerce.number().nonnegative().optional(),
  percent: z.coerce.number().min(0).max(100).optional(),
  share: z.coerce.number().positive().optional(),
});

const ExpenseItemLineSchema = z.object({
  name: z.string().min(1),
  // description: z.string().optional(),
  amount: z.coerce.number().positive(),
  isShared: z.coerce.boolean().optional().default(false),
  splitType: z.enum(ExpenseItemLineSplitType).optional(),
  debtMemberSplitsExpenseItemLines: z.array(DebtMemberSplitExpenseItemLineSchema).optional()
});

export const ExpenseSchema = z.object({
  expenseDate: z.coerce.date().default(new Date()),
  title: z.string().min(1, { message: 'Title is required' }),
  description: z.string().optional(),
  amount: z.coerce.number().positive(),
  paidByUserId: z.coerce.number(),
  isShared: z.coerce.boolean().optional(),
  groupId: z.coerce.number().int().optional(),
  expenseCategoryId: z.coerce.number().int().optional(),
  splitType: z.enum(ExpenseSplitType).optional(),
  // Made optional here
  debtMemberSplits: z.array(DebtMemberSplitSchema).optional(),
  expenseItemLines: z.array(ExpenseItemLineSchema).optional(),
})
  .superRefine((data, ctx) => superRefine(data, ctx));

export const CreateOrUpdateSettleExpenseSchema = z.object({
  amount: z.coerce.number().positive(),
  paidByUserId: z.coerce.number({ message: 'Paid by user is required' }),
  groupId: z.coerce.number().int().optional(),
  settledMemberId: z.coerce.number({ message: 'Settled member is required' }),
}).superRefine((data, ctx) => {
  if (data.paidByUserId === data.settledMemberId) {
    ctx.addIssue({
      code: "custom",
      message: "Paid by user and settled member cannot be the same",
      path: ['paidByUserId']
    });
  }
});

export const SettleExpenseSchema = z.object({
  expenseId: z.coerce.number().int(),
  amount: z.coerce.number().positive(),
  paidByUserId: z.coerce.number({ message: 'Paid by user is required' }),
  groupId: z.coerce.number().int().optional(),
  settledMemberId: z.coerce.number({ message: 'Settled member is required' }),
})


export const UpdateExpenseSchema = z.object({
  expenseDate: z.coerce.date().optional(),
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  amount: z.coerce.number().positive().optional(),
  isShared: z.coerce.boolean().optional(),
  paidByUserId: z.coerce.number().optional(),
  groupId: z.coerce.number().int().optional(),
  expenseCategoryId: z.coerce.number().int().optional(),
  splitType: z.enum(ExpenseSplitType).optional(),
  // Made optional here
  debtMemberSplits: z.array(DebtMemberSplitSchema).optional(),
  expenseItemLines: z.array(ExpenseItemLineSchema).optional(),
})
  .superRefine((data, ctx) => superRefine(data, ctx));

export const ExpenseFilterSchema = z.object({
  expenseDate: z.coerce.date().optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  amount: z.coerce.number().positive().optional(),
  isShared: z.array(z.coerce.boolean()).or(z.enum([Filter_ALL])).optional(),
  paidByUserId: z.array(z.coerce.number().or(z.enum([Filter_NONE]))).or(z.enum([Filter_ALL])).optional(),
  groupId: z.array(z.coerce.number().int().or(z.enum([Filter_NONE]))).or(z.enum([Filter_ALL])).optional(),
  expenseCategoryId: z.array(z.coerce.number().int().or(z.enum([Filter_NONE]))).or(z.enum([Filter_ALL])).optional(),
})

const superRefine = (data: any, ctx: any) => {
  const { splitType, debtMemberSplits, isShared, amount, expenseItemLines } = data;

  if (isShared) {
    if (!splitType) {
      ctx.addIssue({
        code: "custom",
        message: `splitType is required when shared expense`,
        path: ['splitType']
      });
    } else if (splitType === ExpenseSplitType.BY_ITEM)
      return;

    // 1. Check if splits are missing when they are strictly required for the type
    if (!debtMemberSplits || debtMemberSplits.length === 0) {
      ctx.addIssue({
        code: "custom",
        message: `Expense values are required for atleast one member when splitType is ${splitType}`,
        path: ['Members']
      });
      return; // Stop further refinement if array is missing
    }

    // 2. Logic for BY_PERCENT
    if (splitType === ExpenseSplitType.BY_PERCENT && debtMemberSplits) {
      let totalPercent = 0;
      debtMemberSplits.forEach((split: any, index: number) => {
        // The specific check you asked for:
        if (split.percent === undefined || split.percent === null) {
          split.percent = 0;
        }
        totalPercent += round().percent(split.percent)
      });

      if (debtMemberSplits.length > 0 && totalPercent !== 100) {
        ctx.addIssue({
          code: "custom",
          message: `Total percentage must equal 100% (currently ${totalPercent}%)`,
          path: ['Members']
        });
      }
    }
    else if (splitType === ExpenseSplitType.BY_SHARE && debtMemberSplits) {
      debtMemberSplits.forEach((split: any, index: number) => {
        // The specific check you asked for:
        if (split.share === undefined || split.share === null) {
          split.share = 0
        }
      });
    }

    if (splitType === ExpenseSplitType.UNEQUAL && debtMemberSplits) {
      let totalAmount = 0;
      debtMemberSplits.forEach((split: any, index: number) => {
        // The specific check you asked for:
        if (split.amount === undefined || split.amount === null) {
          split.amount = 0;
        }
        totalAmount += round().currency(split.amount);
      });
      if (debtMemberSplits.length > 0 && round().currency(totalAmount) !== round().currency(amount)) {
        ctx.addIssue({
          code: "custom",
          message: `Total amount must equal ${round().currency(amount)} (currently ${round().currency(totalAmount)})`,
          path: ['Members']
        });
      }
    }
    if (splitType === ExpenseSplitType.BY_ITEM) {
      if (expenseItemLines && expenseItemLines.length === 0) {
        ctx.addIssue({
          code: "custom",
          message: `Item are required when splitType is ${splitType}`,
          path: ['Items']
        });
      }
    }

  }
}
