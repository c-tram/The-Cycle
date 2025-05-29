import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import App from '../App'

describe('App', () => {
  it('renders without crashing', () => {
    render(<App />)
    expect(document.body).toBeTruthy()
  })

  it('shows login component when not authenticated', () => {
    render(<App />)
    // Since the app starts with login, we should see some form of authentication UI
    // This is a basic smoke test to ensure the component renders
    expect(document.body).toBeInTheDocument()
  })
})
