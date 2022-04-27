import { SadBotBase, SadBotBaseParams } from './SadBotBase'

export const enum ThrottlingTimeSpan {
  Seconds = 1,
  Minutes = 60 * Seconds,
  Hours = 60 * Minutes,
  Days = 24 * Hours
}

export interface ThrottlingConstraint {
  constraint: () => string
  maxRequests:number
  timeValue: number
  timeSpan: ThrottlingTimeSpan
}

export class ThrottlingConstraintBuilder {
  private constraint: () => string = () => ''
  private maxRequests:number = 10
  private timeValue: number = 10
  private timeSpan: ThrottlingTimeSpan = ThrottlingTimeSpan.Seconds

  by = (fn: () => string) => {
    this.constraint = fn
    return this
  }

  limitRequestsTo = (totalRequests:number) => {
    this.maxRequests = totalRequests
    return this
  }

  duration = (perValue: number) => {
    this.timeValue = perValue
    return this
  }

  seconds = () => {
    this.timeSpan = ThrottlingTimeSpan.Seconds
    return this
  }

  second = this.seconds

  minutes = () => {
    this.timeSpan = ThrottlingTimeSpan.Minutes
    return this
  }

  minute = this.minutes

  hours = () => {
    this.timeSpan = ThrottlingTimeSpan.Hours
    return this
  }

  hour = this.hours

  days = () => {
    this.timeSpan = ThrottlingTimeSpan.Days
    return this
  }

  day = this.days

  build = () => ({
    constraint: this.constraint,
    maxRequests: this.maxRequests,
    timeSpan: this.timeSpan,
    timeValue: this.timeValue
  })
}

export class RequestLimitExceeded extends Error {
  constructor (resourceId:string, currentRate:number) {
    super(`Current rate of ${currentRate} for value: '${resourceId}'`)
    this.name = 'RequestLimitExceeded'
  }
}

export class Throttling extends SadBotBase {
  public prefix:string = 'throttling'
  public maxKeys:number = 10000
  private configure: ThrottlingConstraintBuilder

  constructor (
    params:SadBotBaseParams = {},
    fn: (conf: ThrottlingConstraintBuilder) => ThrottlingConstraintBuilder) {
    super(params)
    this.configure = new ThrottlingConstraintBuilder()
    if (fn) {
      fn(this.configure)
    }
  }

  hashedResourceId = (resourceId:string) =>
    Buffer.from(resourceId).toString('base64')

  hashedPrefix = (resourceId:string):string => this.resourcePrefixKey(this.hashedResourceId(resourceId))

  touchInputRequest = async (resourceId:string, expiration = 60) => {
    const redis = await this.connectedRedisClient()
    const hash = this.hashedPrefix(resourceId)
    const salt = Math.floor(Math.random() * 999999)
    const now = Date.now()

    const key = [hash, now, salt].join(':')

    return redis.set(key, 1, { EX: expiration })
  }

  rate = async (resourceId:string):Promise<number> => {
    const redis = await this.connectedRedisClient()

    const hash = this.hashedPrefix(resourceId)
    const keyQuery = [hash, ':*'].join('')
    let total = 0

    for await (const _ of redis.scanIterator({ MATCH: keyQuery, COUNT: this.maxKeys })) {
      total += 1
    }

    return total
  }

  throttleBy = async (fn: () => string) => {
    this.configure.by(fn)
    return this.throttle()
  }

  throttle = async () => {
    const { constraint, maxRequests, timeSpan, timeValue } = this.configure.build()

    const resourceId = constraint() || 'unknown'
    const expireIn = timeValue * timeSpan
    const currentRate = await this.rate(resourceId)

    if ((currentRate + 1) > maxRequests) {
      throw new RequestLimitExceeded(resourceId, currentRate)
    } else {
      await this.touchInputRequest(resourceId, expireIn)
    }
  }
}
