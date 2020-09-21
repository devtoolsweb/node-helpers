export type BareRequestParams<P = {}> = Record<keyof P, P[keyof P]>

export interface IBareRequest<P = {}> {
  readonly apiKey?: string
  readonly params?: BareRequestParams<P>
}
