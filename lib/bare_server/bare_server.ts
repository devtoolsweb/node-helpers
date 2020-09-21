import { Constructor } from '@aperos/ts-goodies'
import {
  EventEmitterMixin,
  IBaseEvents,
  ITypedEventEmitter
} from '@aperos/event-emitter'
import { IBareBackend } from './bare_backend'
import { IBareRequest } from './bare_request'
import { IBareResponse } from './bare_response'
import {
  BareBackendNotFoundError,
  BareNotImplementedError,
  BareUnauthenticatedRequestError
} from './bare_errors'

export type BareServerEnv = Record<string, string>

export interface IBareServerEvent {
  readonly origin: IBareServer
}

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
  Res extends IBareResponse = IBareResponse
> extends IBareServerRequestEvent<Req> {
  readonly response: Res
}

export interface IBareServerEvents<
  Req extends IBareRequest = IBareRequest,
  Res extends IBareResponse = IBareResponse
> extends IBaseEvents {
  readonly error: (event: IBareServerErrorEvent<Req>) => void
  readonly request: (event: IBareServerRequestEvent<Req>) => void
  readonly response: (event: IBareServerResponseEvent<Req, Res>) => void
}

export interface IBareServer<
  Req extends IBareRequest = IBareRequest,
  Res extends IBareResponse = IBareResponse,
  Events extends IBareServerEvents<Req, Res> = IBareServerEvents<Req, Res>
> extends ITypedEventEmitter<Events> {
  readonly address: string
  readonly apiKeys?: Set<string>
  readonly env?: BareServerEnv
  readonly host: string
  readonly port: number
  addBackend(m: IBareBackend<Req, Res>, ...aliases: string[]): this
  getBackend(alias: string): IBareBackend | undefined
  start(): void
  stop(): void
}

export interface IBareServerInternals<
  Req extends IBareRequest = IBareRequest,
  Res extends IBareResponse = IBareResponse
> {
  authenticateRequest(r: Req): Promise<boolean>
  handleRawRequest(args: IBareServerRawRequestArgs): Promise<void>
  sendResponse(_args: IBareServerSendArgs<Req, Res>): Promise<void>
  translateIncomingMessage(m: any): Req | undefined
}

export interface IBareServerArgs {
  apiKeys?: string[]
  env?: BareServerEnv
  host?: string
  port: number
}

export interface IBareServerRawRequestArgs {
  incomingMessage: any
}

export interface IBareServerSendArgs<
  Req extends IBareRequest = IBareRequest,
  Res extends IBareResponse = IBareResponse
> {
  request: Req
  response: Res
  rawRequestArgs: IBareServerRawRequestArgs
}

export const BareServerMixin = <
  TBase extends Constructor<{}> = Constructor<{}>,
  Req extends IBareRequest = IBareRequest,
  Res extends IBareResponse = IBareResponse,
  Events extends IBaseEvents = IBaseEvents
>(
  Base: TBase
): TBase &
  Constructor<
    IBareServer<Req, Res> &
      IBareServerInternals<Req, Res> &
      ITypedEventEmitter<Events>
  > => {
  return class MixedBareServer
    extends EventEmitterMixin<Events & IBareServerEvents<Req, Res>, TBase>(Base)
    implements IBareServer<Req, Res> {
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

    addBackend(backend: IBareBackend<Req, Res>, ...aliases: string[]) {
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
        return await backend.handleRequest({ alias, request })
      } else {
        throw new BareBackendNotFoundError()
      }
    }

    findBackend(_request: Req): [string, IBareBackend<Req, Res>] | undefined {
      return undefined
    }

    getBackend(alias: string) {
      return this.backends.get(alias) as IBareBackend<Req, Res>
    }

    async handleRawRequest(rawRequestArgs: IBareServerRawRequestArgs) {
      const request = this.translateIncomingMessage(
        rawRequestArgs.incomingMessage
      )
      this.emit('request', { request, origin: this })
      if (!(await this.authenticateRequest(request))) {
        throw new BareUnauthenticatedRequestError()
      } else {
        const response = await this.dispatchRequest(request)
        this.sendResponse({ request, response, rawRequestArgs })
      }
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

    translateIncomingMessage(_m: any): Req {
      throw new BareNotImplementedError()
    }
  }
}
