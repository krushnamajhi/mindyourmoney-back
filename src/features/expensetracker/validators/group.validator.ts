import { z } from 'zod';

export const GroupSchema = z.object({
    name: z.string().min(1, { message: 'Group name is required' }),
    description: z.string().optional(),
    groupMemberIds: z.array(z.coerce.number().int().positive()).optional(),
});

export const UpdateGroupSchema = z.object({
    name: z.string().optional(),
    description: z.string().optional(),
    groupMemberIds: z.array(z.coerce.number().int().positive()).optional(),
});

export const GroupMemberUpdateSchema = z.object({
    groupMemberIds: z.array(z.coerce.number().int().positive()).min(1, { message: 'Include atleast one member' }),
});
