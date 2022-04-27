import { SadBotBase } from './SadBotBase'

export type BlockedList = {
  name: string,
  values: string[]
}

export class Blocking extends SadBotBase {
  public prefix:string = 'blocked'

  isBlocked = async (list:string, value:string):Promise<boolean> =>
    this.connectedRedisClient().then(
      redis => redis.sIsMember(this.resourcePrefixKey(list), value))

  block = async (list: string, value:string):Promise<number> =>
    this.connectedRedisClient().then(
      redis => redis.sAdd(this.resourcePrefixKey(list), value))

  unblock = async (list: string, value:string):Promise<number> =>
    this.connectedRedisClient().then(
      redis => redis.sRem(this.resourcePrefixKey(list), value))

  getBlockedList = async (list: string): Promise<BlockedList> => {
    const redis = await this.connectedRedisClient()

    const values = await redis.sMembers(this.resourcePrefixKey(list))
    return {
      name: list,
      values
    }
  }

  getAllBlockedLists = async (): Promise<BlockedList[]> => {
    const redis = await this.connectedRedisClient()
    const prefix = this.resourcePrefixKey('*')
    const keys = [] as string[]

    for await (const key of redis.scanIterator({ MATCH: prefix })) {
      keys.push(key)
    }

    return Promise.all(
      keys.map(async k => ({
        name: k.split(/:/)[2],
        values: await redis.sMembers(k)
      })))
  }
}
