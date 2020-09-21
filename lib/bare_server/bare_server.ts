import { Constructor } from '@aperos/ts-goodies'
import {
  EventEmitterMixin,
  IBaseEvents,
  ITypedEvent,
  ITypedEventEmitter
} from '@aperos/event-emitter'
import { IBareBackend } from './bare_backend'
import { IBareRequest } from './bare_request'

export type BareServerEnv = Record<string, string>

export interface IBareServerEvent<
  Events extends IBareServerEvents = IBareServerEvents
> extends ITypedEvent<Events> {}

export interface IBareServerErrorEvent<Req extends IBareRequest = IBareRequest>
  extends IBareServerEvent {
  readonly errorDescription?: string
  readonly request: Req
}

export interface IBareServerRequestEvent<
  Req extends IBareRequest = IBareRequest
> extends IBareServerEvent {
  readonly request: Req
}

export interface IBareServerResponseEvent<
  Req extends IBareRequest = IBareRequest,
  Res = {}
> extends IBareServerRequestEvent<Req> {
  readonly response: Res
}

export interface IBareServerEvents<
  Req extends IBareRequest = IBareRequest,
  Res = {}
> extends IBaseEvents {
  readonly error: (event: IBareServerErrorEvent<Req>) => void
  readonly request: (event: IBareServerRequestEvent<Req>) => void
  readonly response: (event: IBareServerResponseEvent<Req, Res>) => void
}

export interface IBareServer<Events extends IBaseEvents = IBaseEvents>
  extends ITypedEventEmitter<Events> {
  readonly backends: Map<string, IBareBackend>
  readonly address: string
  readonly apiKeys?: Set<string>
  readonly env?: BareServerEnv
  readonly host: string
  readonly port: number
  addBackend(m: IBareBackend, ...aliases: string[]): this
  getBackend(alias: string): IBareBackend | undefined
  start(): void
  stop(): void
}

export interface IBareServerArgs {
  apiKeys?: string[]
  env?: BareServerEnv
  host?: string
  port: number
}

export interface IBareServerSendArgs<
  Req extends IBareRequest = IBareRequest,
  Res = {}
> {
  request: Req
  response: Res
}

export interface IBareServerConstructor<T = {}> {
  new (args: IBareServerArgs): IBareServer & T
}

export class BareBackendNotFoundError extends Error {
  constructor(message?: string) {
    super(message || 'Backend not found')
  }
}

export class BareUnauthenticatedRequestError extends Error {
  constructor(message?: string) {
    super(message || 'Request is not authenticated')
  }
}

export const BareServerMixin = <
  Req extends IBareRequest = IBareRequest,
  Res = {},
  TBase extends Constructor<{}> = Constructor<{}>,
  Events extends IBareServerEvents = IBareServerEvents
>(
  Base: TBase
): TBase & Constructor<IBareServer<Events>> => {
  return class extends EventEmitterMixin<Events, TBase>(Base) {
    readonly apiKeys?: Set<string>
    readonly backends = new Map<string, IBareBackend>()
    readonly env: BareServerEnv
    readonly host: string
    readonly port: number

    constructor(args: IBareServerArgs) {
      super(args)
      this.env = args.env || {}
      this.host = args.host || 'localhost'
      this.port = args.port
      if (args.apiKeys) {
        this.apiKeys = new Set<string>(args.apiKeys)
      }
    }

    get address() {
      return `${this.host}:${this.port}'`
    }

    addBackend(backend: IBareBackend, ...aliases: string[]) {
      const xs = this.backends
      const s = backend.name || ''
      const a = [...aliases, ...(s ? [s] : [])]
      if (!a.length) {
        throw new Error(`Must be provided at least one alias for HTTP backend`)
      }
      a.forEach(alias => {
        const key = alias.trim()
        if (xs.has(key)) {
          throw new Error(`Duplicate HTTP backend alias: '${key}`)
        }
        xs.set(key, backend)
      })
      return this
    }

    async authenticateRequest(r: Req) {
      const xs = this.apiKeys
      return xs?.size ? (r.apiKey ? xs.has(r.apiKey) : false) : true
    }

    async dispatchRequest(request: Req) {
      const [alias, backend] = this.findBackend(request) || ['']
      if (backend) {
        await backend.handleRequest({ alias, request })
      } else {
        throw new BareBackendNotFoundError()
      }
    }

    findBackend(_request: Req): [string, IBareBackend] | undefined {
      return undefined
    }

    getBackend(alias: string): IBareBackend | undefined {
      return this.backends.get(alias)
    }

    async performStart() {}

    async performStop() {}

    async sendResponse(_args: IBareServerSendArgs<Req, Res>) {}

    async start() {
      for (const b of this.backends.values()) {
        await b.start()
      }
      await this.performStart()
    }

    async stop() {
      await this.performStop()
      for (const b of this.backends.values()) {
        await b.stop()
      }
    }
  }
}
