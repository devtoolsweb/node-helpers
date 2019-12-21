export interface ISystemUtils {
  readEnv(name: string, defaultValue?: string): string
  safeReadEnv(name: string): string
}

class SystemUtilsCtor implements ISystemUtils {
  readEnv (name: string, defaultValue?: string): string {
    const e = process.env[name]
    if (typeof e === 'string') {
      return e
    } else if (defaultValue) {
      return defaultValue
    } else {
      throw new Error(`Environment variable '${name}' doesn't exist`)
    }
  }

  safeReadEnv (name: string): string {
    const e = process.env[name]
    return typeof e === 'string' ? e : ''
  }
}

export const SystemUtils: ISystemUtils = new SystemUtilsCtor()
