import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { deleteRmCalendarDatabase } from '../data/local/RmCalendarDatabase'
import { AppRoutes } from './routes'

describe('Milestone 1 route shell', () => {
  beforeEach(async () => {
    await deleteRmCalendarDatabase()
  })

  afterEach(async () => {
    await deleteRmCalendarDatabase()
  })

  it('opens the calendar from a local workspace and preserves the five primary routes', async () => {
    render(
      <MemoryRouter initialEntries={['/calendar']}>
        <AppRoutes />
      </MemoryRouter>
    )

    expect(await screen.findByRole('heading', { name: 'Calendar' })).toBeInTheDocument()
    expect(await screen.findByText('Day plan')).toBeInTheDocument()
    expect(await screen.findByText('Avery visit')).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Primary navigation' })).toBeInTheDocument()

    for (const label of ['Home', 'Calendar', 'People', 'Map', 'Tools']) {
      expect(screen.getByRole('link', { name: label })).toBeInTheDocument()
    }

    expect(screen.getByRole('link', { name: 'Calendar' })).toHaveAttribute('aria-current', 'page')
  })
})
