import { RedisClientType } from '@node-redis/client'
import { createClient } from 'redis'
import { Throttling } from '../src/Throttling'

global.queueMicrotask ??= require('queue-microtask')

const redis = createClient({}) as RedisClientType<Record<string, never>, Record<string, never>>

describe('Throttling', () => {
  beforeAll(async () => {
    await redis.connect()
  })

  afterAll(async done => {
    if (redis.isOpen) {
      await redis.disconnect()
    }
    done()
  })

  beforeEach(async () => {})

  it('should increment requests', async (done) => {
    const resourceId = 'resource-id-' + Math.floor(Math.random() * 999999)
    const tb = new Throttling({ redisClient: redis },
      conf => conf
        .limitRequestsTo(10)
        .duration(3).minutes())

    const r0 = await tb.rate(resourceId)
    expect(r0).toEqual(0)

    await tb.touchInputRequest(resourceId)

    const r1 = await tb.rate(resourceId)
    expect(r1).toEqual(1)

    await tb.touchInputRequest(resourceId)

    const r2 = await tb.rate(resourceId)
    expect(r2).toEqual(2)

    done()
  })

  it('should generate key prefix', () => {
    const resourceId = 'resource-id'

    const tb = new Throttling({ redisClient: redis }, conf => conf
      .limitRequestsTo(3)
      .duration(3).minutes())
    const key = ['sadbot', 'throttling', Buffer.from(resourceId).toString('base64')].join(':')
    expect(tb.hashedPrefix(resourceId)).toEqual(key)
  })

  it('should throttle requests', async (done) => {
    expect.assertions(2)
    const resourceId = 'resource-id-' + Math.floor(Math.random() * 999999)
    try {
      const tb = new Throttling({ redisClient: redis },
        conf => conf
          .limitRequestsTo(3)
          .duration(3).minutes())
      for await (const i of Array(4).keys()) {
        await tb.throttleBy(() => { return resourceId })
      }
    } catch (err: any) {
      expect(err.name).toEqual('RequestLimitExceeded')
      expect(err.message).toEqual(`Current rate of 3 for value: '${resourceId}'`)
    }

    done()
  })

  it('should doesnt fail in valid time window', async (done) => {
    const resourceId = 'resource-id-' + Math.floor(Math.random() * 999999)
    const tb = new Throttling({ redisClient: redis },
      conf => conf
        .limitRequestsTo(5)
        .duration(3).minutes())

    for await (const i of Array(4).keys()) {
      await tb.throttleBy(() => { return resourceId })
    }
    const currentRate = await tb.rate(resourceId)
    expect(currentRate).toEqual(4)

    done()
  })
})
