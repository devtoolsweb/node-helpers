import * as nodePath from 'path'
import fs from 'fs'

export interface IDirUtils {
  ensureDirExistsSync(path: string): boolean
}

class DirUtilsCtor implements IDirUtils {
  ensureDirExistsSync (path: string): boolean {
    nodePath
      .resolve(path.trim())
      .split(nodePath.sep)
      .slice(1)
      .reduce(
        (fp, p) => {
          fp.push(p)
          const target = fp.join(nodePath.sep)
          if (!fs.existsSync(target)) {
            fs.mkdirSync(target)
          }
          return fp
        },
        ['']
      )
    return false
  }
}

export const DirUtils: IDirUtils = new DirUtilsCtor()
