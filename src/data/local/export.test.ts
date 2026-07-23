import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createContact, createNote, quickCaptureActivity } from './commands'
import { deleteRmCalendarDatabase, rmCalendarDb } from './RmCalendarDatabase'
import { createLocalWorkspaceExport, localWorkspaceExportFileName } from './export'
import { bootstrapLocalWorkspace, DEMO_WORKSPACE_ID } from './workspace'

describe('local workspace export', () => {
  beforeEach(async () => {
    await deleteRmCalendarDatabase()
    await bootstrapLocalWorkspace()
  })

  afterEach(async () => {
    await deleteRmCalendarDatabase()
  })

  it('exports user-owned planning records without device-only queue or conflict state', async () => {
    const person = await createContact({ displayName: 'Export person' })
    const capture = await quickCaptureActivity({
      title: 'Exported quick visit',
      activityType: 'visit',
      outcomeText: 'Private outcome for the user-owned export.',
      contactId: person.id
    })
    await createNote({ activityId: capture.id, body: 'Private note in a local export.' })

    await rmCalendarDb.contacts.add({
      id: 'other-workspace-contact',
      workspaceId: 'other-workspace',
      displayName: 'Should never be exported',
      displayNameNormalized: 'should never be exported',
      createdAt: '2026-07-24T00:00:00.000Z',
      updatedAt: '2026-07-24T00:00:00.000Z',
      clientUpdatedAt: '2026-07-24T00:00:00.000Z',
      revision: 1,
      syncState: 'pending'
    })

    const data = await createLocalWorkspaceExport(DEMO_WORKSPACE_ID)

    expect(data).toMatchObject({
      format: 'rm-calendar-local-export',
      version: 1,
      workspace: { id: DEMO_WORKSPACE_ID }
    })
    expect(data.records.contacts.map((contact) => contact.displayName)).toContain('Export person')
    expect(data.records.contacts.map((contact) => contact.id)).not.toContain('other-workspace-contact')
    expect(data.records.activities).toEqual(expect.arrayContaining([expect.objectContaining({ id: capture.id, outcomeText: 'Private outcome for the user-owned export.' })]))
    expect(data.records.notes).toEqual(expect.arrayContaining([expect.objectContaining({ body: 'Private note in a local export.' })]))
    expect(Object.keys(data.records)).not.toEqual(expect.arrayContaining(['outboxOperations', 'syncMetadata', 'conflicts']))
  })

  it('fails clearly when the requested local workspace is unavailable', async () => {
    await expect(createLocalWorkspaceExport('missing-workspace')).rejects.toThrow('unavailable for export')
  })

  it('uses a data-minimizing export filename', () => {
    expect(localWorkspaceExportFileName('2026-07-24T18:00:00.000Z')).toBe('rm-calendar-local-export-2026-07-24.json')
  })
})
