import { RedisClientType } from '@node-redis/client'
import moment from 'moment'
import { createClient } from 'redis'
import { Blocking } from '../src/Blocking'
import { TimeRestricted } from '../src/TimeRestricted'

global.queueMicrotask ??= require('queue-microtask')

const redis = createClient({}) as RedisClientType<Record<string, never>, Record<string, never>>

describe('TimeRestricted', () => {
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

  it('should restrict time', async (done) => {
    const namespace = 'ns-' + Math.floor(Math.random() * 999999)
    const resourceId = 'value-' + Math.floor(Math.random() * 999999)

    const now = moment()
    const startTime = now.subtract(1, 'hour').format('HH:mm:ss')
    const endTime = now.add(2, 'hour').format('HH:mm:ss')

    const tr = new TimeRestricted({ redisClient: redis, namespace })

    expect((await tr.isRestricted(resourceId))).toBeFalsy()
    tr.restrict(resourceId, { startTime, endTime })

    expect((await tr.isRestricted(resourceId))).toBeTruthy()

    done()
  })

  it('should unrestrict time', async (done) => {
    const namespace = 'ns-' + Math.floor(Math.random() * 999999)
    const resourceId = 'value-' + Math.floor(Math.random() * 999999)

    const now = moment()
    const startTime = now.subtract(1, 'hour').format('HH:mm:ss')
    const endTime = now.add(2, 'hour').format('HH:mm:ss')

    const tr = new TimeRestricted({ redisClient: redis, namespace })

    expect((await tr.isRestricted(resourceId))).toBeFalsy()
    tr.restrict(resourceId, { startTime, endTime })

    expect((await tr.isRestricted(resourceId))).toBeTruthy()

    await tr.unrestrict(resourceId)
    expect((await tr.isRestricted(resourceId))).toBeFalsy()

    done()
  })

  it('should get blocked values from all lists', async (done) => {
    done()
  })
})
