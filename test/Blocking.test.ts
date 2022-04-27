import { RedisClientType } from '@node-redis/client'
import { createClient } from 'redis'
import { Blocking } from '../src/Blocking'

global.queueMicrotask ??= require('queue-microtask')

const redis = createClient({}) as RedisClientType<Record<string, never>, Record<string, never>>

describe('Blocking', () => {
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

  it('should block a value in a list', async (done) => {
    const resourceId = 'value-' + Math.floor(Math.random() * 999999)

    const b = new Blocking({ redisClient: redis })
    let resp = await b.isBlocked('test', resourceId)
    expect(resp).toBeFalsy()

    await b.block('test', resourceId)
    resp = await b.isBlocked('test', resourceId)
    expect(resp).toBeTruthy()

    done()
  })

  it('should unblock a value in a list', async (done) => {
    const resourceId = 'value-' + Math.floor(Math.random() * 999999)

    const b = new Blocking({ redisClient: redis })

    await b.block('test', resourceId)
    let resp = await b.isBlocked('test', resourceId)
    expect(resp).toBeTruthy()

    await b.unblock('test', resourceId)
    resp = await b.isBlocked('test', resourceId)
    expect(resp).toBeFalsy()

    done()
  })

  it('should get blocked values from a list', async (done) => {
    const namespace = 'ns-' + Math.floor(Math.random() * 999999)

    const b = new Blocking({ redisClient: redis, namespace })

    await b.block('test', 'a')
    await b.block('test', 'b')
    await b.block('test', 'c')

    expect(await b.isBlocked('test', 'a')).toBeTruthy()
    expect(await b.isBlocked('test', 'b')).toBeTruthy()
    expect(await b.isBlocked('test', 'c')).toBeTruthy()

    const { name, values } = await b.getBlockedList('test')
    expect(name).toEqual('test')

    expect(values).toHaveLength(3)

    expect(values).toContain('a')
    expect(values).toContain('b')
    expect(values).toContain('c')

    done()
  })

  it('should get blocked values from all lists', async (done) => {
    const namespace = 'ns-' + Math.floor(Math.random() * 999999)

    const b = new Blocking({ redisClient: redis, namespace })

    await b.block('test', 'a')
    await b.block('test', 'b')
    await b.block('test', 'c')

    await b.block('foo', '1')
    await b.block('foo', '2')
    await b.block('foo', '3')

    expect(await b.isBlocked('test', 'a')).toBeTruthy()
    expect(await b.isBlocked('test', 'b')).toBeTruthy()
    expect(await b.isBlocked('test', 'c')).toBeTruthy()

    expect(await b.isBlocked('foo', '1')).toBeTruthy()
    expect(await b.isBlocked('foo', '2')).toBeTruthy()
    expect(await b.isBlocked('foo', '3')).toBeTruthy()

    const lists = await b.getAllBlockedLists()
    const [foo, test] = lists.sort((a, b) => a.name < b.name ? -1 : 1)

    expect(test.name).toEqual('test')

    expect(test.values).toHaveLength(3)

    expect(test.values).toContain('a')
    expect(test.values).toContain('b')
    expect(test.values).toContain('c')

    expect(foo.name).toEqual('foo')

    expect(foo.values).toHaveLength(3)

    expect(foo.values).toContain('1')
    expect(foo.values).toContain('2')
    expect(foo.values).toContain('3')

    done()
  })
})
