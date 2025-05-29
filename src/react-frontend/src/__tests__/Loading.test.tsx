import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import Loading from '../components/Loading'

describe('Loading', () => {
  it('renders default loading message', () => {
    render(<Loading />)
    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('renders custom loading message', () => {
    render(<Loading message="Custom loading message" />)
    expect(screen.getByText('Custom loading message')).toBeInTheDocument()
  })

  it('renders loading spinner', () => {
    render(<Loading />)
    const spinner = document.querySelector('.loading-spinner')
    expect(spinner).toBeInTheDocument()
  })
})
