export {}

// Create a type for the Roles
export type Roles = 'user' | 'tutor'

declare global {
  interface CustomJwtSessionClaims {
    metadata: {
      role?: Roles
    }
  }
}