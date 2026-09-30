import { describe, expect, it } from 'vitest'
import { normalizeOtpCode, validateOtpCode } from './otp-code'

describe('normalizeOtpCode', () => {
  it.each([['123456', '123456'], ['123 456', '123456'], ['123-456', '123456'], [' 123456 ', '123456']])(
    '« %s » devient « %s »',
    (input, expected) => {
      expect(normalizeOtpCode(input)).toBe(expected)
    },
  )
})

describe('validateOtpCode', () => {
  it.each(['123456', '123 456', '123-456', ' 123456 ', '000000'])('accepte « %s »', (value) => {
    expect(validateOtpCode(value)).toBeNull()
  })

  it.each(['12345', '1234567', '12a456', '', 'abcdef', '١٢٣٤٥٦'])('refuse « %s »', (value) => {
    expect(validateOtpCode(value)).toBe('Le code contient 6 chiffres.')
  })
})
