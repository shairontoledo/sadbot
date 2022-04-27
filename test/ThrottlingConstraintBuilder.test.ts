import { ThrottlingConstraintBuilder, ThrottlingTimeSpan } from '../src/Throttling'

describe('ThrottlingConstraintBuilder', () => {
  let tb:ThrottlingConstraintBuilder

  beforeEach(() => {
    tb = new ThrottlingConstraintBuilder()
  })

  it('sets a constraint as return of a function', () => {
    const { constraint } = tb.by(() => 'foo' + 'bar').build()
    expect(constraint()).toEqual('foobar')
  })

  it('sets the request limit', () => {
    const { maxRequests } = tb.limitRequestsTo(99).build()
    expect(maxRequests).toEqual(99)
  })

  it('sets the duration value', () => {
    const { timeValue } = tb.duration(33).build()
    expect(timeValue).toEqual(33)
  })

  it('sets timespan seconds', () => {
    const { timeSpan } = tb.seconds().build()
    expect(timeSpan).toEqual(ThrottlingTimeSpan.Seconds)
  })

  it('sets timespan minutes', () => {
    const { timeSpan } = tb.minutes().build()
    expect(timeSpan).toEqual(ThrottlingTimeSpan.Minutes)
  })

  it('sets timespan hours', () => {
    const { timeSpan } = tb.hours().build()
    expect(timeSpan).toEqual(ThrottlingTimeSpan.Hours)
  })

  it('sets timespan days', () => {
    const { timeSpan } = tb.days().build()
    expect(timeSpan).toEqual(ThrottlingTimeSpan.Days)
  })

  it('all options', () => {
    const params = tb.by(() => '127.0.0.1')
      .limitRequestsTo(10)
      .duration(30)
      .minutes().build()

    expect(params.constraint()).toEqual('127.0.0.1')
    expect(params.maxRequests).toEqual(10)
    expect(params.timeValue).toEqual(30)

    expect(params.timeSpan).toEqual(ThrottlingTimeSpan.Minutes)
  })
})
