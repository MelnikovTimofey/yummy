import { z } from 'zod';

export const refreshRequestSchema = z
  .object({
    includeLocalSeeds: z.coerce.boolean().default(true),
    includeHookahPortalTobaccos: z.coerce.boolean().default(false),
    hookahPortalTobaccosLimit: z.coerce.number().int().min(1).max(10000).optional(),
    hookahPortalMixesLimit: z.coerce.number().int().min(1).max(10000).optional(),
    hookahPortalDelayMs: z.coerce.number().int().min(0).optional(),
  })
  .refine((value) => value.includeLocalSeeds || value.includeHookahPortalTobaccos, {
    message: 'At least one source must be enabled',
  })
  .refine(
    (value) =>
      !value.includeHookahPortalTobaccos ||
      value.hookahPortalTobaccosLimit === undefined ||
      value.hookahPortalTobaccosLimit > 0,
    {
      message: 'hookahPortalTobaccosLimit must be greater than zero',
    },
  )
  .refine(
    (value) =>
      !value.includeHookahPortalTobaccos ||
      value.hookahPortalMixesLimit === undefined ||
      value.hookahPortalMixesLimit > 0,
    {
      message: 'hookahPortalMixesLimit must be greater than zero',
    },
  )
  .refine(
    (value) =>
      !value.includeHookahPortalTobaccos ||
      value.hookahPortalDelayMs === undefined ||
      value.hookahPortalDelayMs >= 0,
    {
      message: 'hookahPortalDelayMs must be zero or positive',
    },
  );

export const listQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(20),
});
