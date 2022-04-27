import { RedisClientType } from '@node-redis/client'
import { createClient } from 'redis'

export type SadBotBaseParams = {
  namespace?: string,
  prefix?: string,
  redisClient?: RedisClientType<Record<string, never>, Record<string, never>>
}

export abstract class SadBotBase {
  redisClient: RedisClientType<Record<string, never>, Record<string, never>>
  namespace: string = 'sadbot'
  prefix: string = 'sadbot'

  constructor (params:SadBotBaseParams = {}) {
    this.redisClient = params.redisClient || createClient()
    this.namespace = params.namespace || this.namespace
    this.prefix = params.prefix || this.prefix
  }

  connectedRedisClient = async ():Promise<RedisClientType> => {
    if (!this.redisClient.isOpen) {
      await this.redisClient.connect()
    }
    return this.redisClient
  }

  basePrefix = ():string[] => [this.namespace, this.prefix]

  basePrefixKey = ():string => this.basePrefix().join(':')

  resourcePrefixKey = (resourceId:string) : string =>
    [...this.basePrefix(), resourceId].join(':')
}
