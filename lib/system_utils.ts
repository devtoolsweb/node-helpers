export interface ISystemUtils {
  readEnv(name: string, defaultValue: string | null): string
  safeReadEnv(name: string): string | null
}

class SystemUtilsCtor implements ISystemUtils {
  readEnv (name: string, defaultValue: string | null = null): string {
    const e = this.safeReadEnv(name)
    if (typeof e === 'string') {
      return e
    }
    if (defaultValue === null) {
      throw new Error(`Unknown environment variable: '${name}'`)
    }
    return defaultValue
  }

  safeReadEnv (name: string): string | null {
    const e = process.env[name]
    return typeof e === 'string' ? e : null
  }
}

export const SystemUtils: ISystemUtils = new SystemUtilsCtor()
