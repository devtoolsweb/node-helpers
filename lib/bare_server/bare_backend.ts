import { IBareRequest } from './bare_request'

export interface IBareBackendRequestArgs<Req = {}> {
  alias: string
  request: Req
}

export interface IBareBackend<
  Req extends IBareRequest = IBareRequest,
  Res = {}
> {
  readonly name?: string
  handleRequest(args: IBareBackendRequestArgs<Req>): Promise<Res>
  start(): Promise<void>
  stop(): Promise<void>
}

export interface IBareBackendArgs {
  name?: string
}

export abstract class BareBackend<
  Req extends IBareRequest = IBareRequest,
  Res = {}
> implements IBareBackend<Req, Res> {
  readonly name?: string

  constructor(args: IBareBackendArgs) {
    args.name && (this.name = args.name)
  }

  abstract async handleRequest(args: IBareBackendRequestArgs<Req>): Promise<Res>

  async start() {}

  async stop() {}
}
