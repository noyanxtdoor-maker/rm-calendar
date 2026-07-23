import { z } from 'zod'

const nonEmptyText = z.string().trim().min(1)
const optionalShortText = z.string().trim().max(280).optional()
const localDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a calendar date.')
const localTime = z.string().regex(/^\d{2}:\d{2}$/, 'Use a time.')

export const createLocalDemoContactInputSchema = z.object({
  displayName: z.string().trim().min(1, 'A person needs a name.').max(100, 'Keep the name under 100 characters.')
})

export type CreateLocalDemoContactInput = z.infer<typeof createLocalDemoContactInputSchema>

export function normalizeDisplayName(value: string) {
  return value.trim().toLocaleLowerCase()
}

export const createContactInputSchema = z.object({
  displayName: z.string().trim().min(1, 'A person needs a name.').max(100, 'Keep the name under 100 characters.'),
  householdId: z.string().trim().min(1).optional()
})

export type CreateContactInput = z.infer<typeof createContactInputSchema>

export const createHouseholdInputSchema = z.object({
  name: z.string().trim().min(1, 'A household needs a name.').max(100, 'Keep the name under 100 characters.')
})

export type CreateHouseholdInput = z.infer<typeof createHouseholdInputSchema>

export const createPlaceInputSchema = z.object({
  name: z.string().trim().min(1, 'A place needs a name.').max(100, 'Keep the name under 100 characters.'),
  addressText: optionalShortText,
  entranceNotes: optionalShortText
})

export type CreatePlaceInput = z.infer<typeof createPlaceInputSchema>

export const activityScheduleInputSchema = z.union([
  z.object({
    kind: z.literal('timed'),
    date: localDate,
    startTime: localTime,
    endTime: localTime
  }),
  z.object({
    kind: z.literal('all-day'),
    date: localDate
  }),
  z.object({
    kind: z.literal('draft')
  })
])

export type ActivityScheduleInput = z.infer<typeof activityScheduleInputSchema>

const activityInputFields = z.object({
  title: nonEmptyText.max(140, 'Keep the title under 140 characters.'),
  activityType: z.enum(['visit', 'planning', 'service', 'personal', 'other']),
  schedule: activityScheduleInputSchema,
  objectiveText: optionalShortText,
  contactId: z.string().trim().min(1).optional(),
  inlineContactName: z.string().trim().max(100).optional(),
  placeId: z.string().trim().min(1).optional(),
  inlinePlaceName: z.string().trim().max(100).optional()
})

export const createActivityInputSchema = activityInputFields.superRefine((input, context) => {
  if (input.schedule.kind === 'timed' && input.schedule.endTime <= input.schedule.startTime) {
    context.addIssue({
      code: 'custom',
      path: ['schedule', 'endTime'],
      message: 'The end time needs to be after the start time.'
    })
  }

  if (input.contactId && input.inlineContactName) {
    context.addIssue({
      code: 'custom',
      path: ['inlineContactName'],
      message: 'Choose an existing person or create one inline, not both.'
    })
  }

  if (input.placeId && input.inlinePlaceName) {
    context.addIssue({
      code: 'custom',
      path: ['inlinePlaceName'],
      message: 'Choose an existing place or create one inline, not both.'
    })
  }
})

export type CreateActivityInput = z.infer<typeof createActivityInputSchema>

export const updateActivityInputSchema = activityInputFields
  .extend({
    activityId: z.string().trim().min(1)
  })
  .superRefine((input, context) => {
    if (input.schedule.kind === 'timed' && input.schedule.endTime <= input.schedule.startTime) {
      context.addIssue({
        code: 'custom',
        path: ['schedule', 'endTime'],
        message: 'The end time needs to be after the start time.'
      })
    }

    if (input.contactId && input.inlineContactName) {
      context.addIssue({
        code: 'custom',
        path: ['inlineContactName'],
        message: 'Choose an existing person or create one inline, not both.'
      })
    }

    if (input.placeId && input.inlinePlaceName) {
      context.addIssue({
        code: 'custom',
        path: ['inlinePlaceName'],
        message: 'Choose an existing place or create one inline, not both.'
      })
    }
  })

export type UpdateActivityInput = z.infer<typeof updateActivityInputSchema>
