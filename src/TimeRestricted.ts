import moment from 'moment'
import { SadBotBase } from './SadBotBase'

export type RestrictedTime = {
  startTime: string,
  endTime: string
}

export class TimeRestricted extends SadBotBase {
  public prefix:string = 'restricted'

  restrict = async (resourceId: string, restrictedTime: RestrictedTime):Promise<void> => {
    const redis = await this.connectedRedisClient()

    const key = this.basePrefixKey()
    const value = JSON.stringify({
      s: restrictedTime.startTime,
      e: restrictedTime.endTime
    })

    // @ts-ignore - it's getting semantic error TS2345 for no reason
    await redis.hSet(key, resourceId, value)
  }

  unrestrict = async (resourceId: string):Promise<void> => {
    const redis = await this.connectedRedisClient()
    const key = this.basePrefixKey()
    await redis.hDel(key, resourceId)
  }

  getRestrictedTime = async (resourceId: string): Promise<RestrictedTime|null> => {
    const redis = await this.connectedRedisClient()
    const key = this.basePrefixKey()
    try {
      const rawValue = await redis.hGet(key, resourceId)

      const value = JSON.parse(rawValue as string) as {s: string, e:string}
      return {
        startTime: value.s,
        endTime: value.e
      }
    } catch (err) {
      return null
    }
  }

  isRestricted = async (resourceId:string): Promise<boolean> => {
    const restTime = await this.getRestrictedTime(resourceId)
    if (!restTime) {
      return false
    }
    const s = moment(restTime.startTime, 'HH:mm:ss')
    const e = moment(restTime.endTime, 'HH:mm:ss')
    return moment().isBetween(s, e)
  }
}
