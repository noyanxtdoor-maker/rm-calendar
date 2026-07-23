import { z } from 'zod'

export const createLocalDemoContactInputSchema = z.object({
  displayName: z.string().trim().min(1, 'A person needs a name.').max(100, 'Keep the name under 100 characters.')
})

export type CreateLocalDemoContactInput = z.infer<typeof createLocalDemoContactInputSchema>

export function normalizeDisplayName(value: string) {
  return value.trim().toLocaleLowerCase()
}
