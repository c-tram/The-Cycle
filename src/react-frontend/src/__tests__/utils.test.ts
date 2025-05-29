import { describe, it, expect } from 'vitest'

// Simple utility functions to test
const add = (a: number, b: number): number => a + b
const multiply = (a: number, b: number): number => a * b

describe('Utility Functions', () => {
  it('should add two numbers correctly', () => {
    expect(add(2, 3)).toBe(5)
    expect(add(-1, 1)).toBe(0)
    expect(add(0, 0)).toBe(0)
  })

  it('should multiply two numbers correctly', () => {
    expect(multiply(2, 3)).toBe(6)
    expect(multiply(-1, 1)).toBe(-1)
    expect(multiply(0, 5)).toBe(0)
  })
})
