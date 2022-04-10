import 'reflect-metadata'
import * as fs from 'fs'
import * as nodePath from 'path'
import * as pinoMs from 'pino-multi-stream'
import pino, { LevelWithSilent } from 'pino'
import { Service } from 'typedi'
import { SystemUtils } from './system_utils'

export interface ILogger extends pino.BaseLogger {}

type LogFnRestArgs = unknown[]

class PinoLogger implements ILogger {

    static logger: ILogger

    private logger: ILogger

    constructor () {
        this.logger = PinoLogger.logger
    }

    get level () {
        return this.logger.level
    }

    set level (value: typeof PinoLogger.logger.level) {
        this.logger.level = value
    }

    readonly debug: pino.LogFn = <T extends object> (obj: T, msg?: string, ...args: LogFnRestArgs) => {
        this.logger.debug(obj, msg, ...args)
    }

    readonly error: pino.LogFn = <T extends object> (obj: T, msg?: string, ...args: LogFnRestArgs) => {
        this.logger.error(obj, msg, ...args)
    }

    readonly fatal: pino.LogFn = <T extends object> (obj: T, msg?: string, ...args: LogFnRestArgs) => {
        this.logger.fatal(obj, msg, ...args)
    }

    readonly info: pino.LogFn = <T extends object> (obj: T, msg?: string, ...args: LogFnRestArgs) => {
        this.logger.info(obj, msg, ...args)
    }

    readonly silent: pino.LogFn = <T extends object> (obj: T, msg?: string, ...args: LogFnRestArgs) => {
        this.logger.silent(obj, msg, ...args)
    }

    readonly trace: pino.LogFn = <T extends object> (obj: T, msg?: string, ...args: LogFnRestArgs) => {
        this.logger.trace(obj, msg, ...args)
    }

    readonly warn: pino.LogFn = <T extends object> (obj: T, msg?: string, ...args: LogFnRestArgs) => {
        this.logger.warn(obj, msg, ...args)
    }

    static initialize () {
        const logDir = nodePath.join(process.cwd(), SystemUtils.readEnv('LOG_DIR', '.logs'))
        this.logger = this.createLogger(logDir)
        this.logger.debug('Logger initialized')
    }

    private static createLogger (logDir?: string, level: LevelWithSilent = 'debug') {
        const outputDir = logDir || nodePath.join(process.cwd(), '.logs')
        fs.mkdirSync(outputDir, { recursive: true })

        const path = nodePath.join(
            outputDir,
            `${new Date().toISOString().substring(0, 10)}.log`
        )
        const streams: pinoMs.Streams = [
            {
                level,
                stream: process.stdout
            },
            {
                level,
                stream: fs.createWriteStream(path, { flags: 'a' })
            }
        ]

        // WARNING: pino-multi-streams won't work along with pino-pretty!
        return pino({ level }, pinoMs.multistream(streams))
    }

}

PinoLogger.initialize()

export const Logger = new PinoLogger()

@Service('logger')
export class LoggerService extends PinoLogger {}
