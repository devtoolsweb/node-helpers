export class BareBackendNotFoundError extends Error {
  constructor(message?: string) {
    super(message || 'Backend not found')
  }
}

export class BareNotImplementedError extends Error {
  constructor(message?: string) {
    super(message || 'Not implemented')
  }
}

export class BareUnauthenticatedRequestError extends Error {
  constructor(message?: string) {
    super(message || 'Request is not authenticated')
  }
}
