# SadBot 🤖

SadBot is a tooling _to thwart_ (someone/"somebot") from accomplishing an action in a given resource, it blocks, throttles and time-restricts the access like a security guard guy when the party is packed or you're not so sober to be welcome. 

But he is not that kind of weightlifter-beast on steroids that snorts vanilla whey protein throughout the day... instead he respects the rules and politely allows or denies it, no beat. He relies on HA Redis where the metadata is managed.

# Features

- Blacklisting - Manage accessibility through value in a list.
- Throttling - Limit the amount of access to a resource in a period.
- Time Restriction - Restrict access to a resource by a period.

## Installation

Install the npm package:

```shell
npm install sadbot --save
```

Or with yarn

```shell
yarn add sadbot
```

## Step-by-Step Guide

### Blocking

To block a resource, you might need to generate a blacklist of resource ids. The resource id can be any distinct string in your business. The following are some hypothetical and real cases to block a resource.

#### Blocking a request

Import `Blocking` from `sadbot`, add the ips to the list `ips`, check if the ips are blocked, unblock `ip1` and check their status again. 

```typescript

import { Blocking } from 'sadbot'

const blocker = new Blocking()

const ip1 = '192.168.3'
const ip2 = '2.63.5.44'

await blocker.block('ips', ip1)
await blocker.block('ips', ip2)

console.log('ip1 is blocked', await blocker.isBlocked('ips', ip1))
console.log('ip2 is blocked', await blocker.isBlocked('ips', ip2))

await blocker.unblock('ips', ip1)
  
console.log('ip1 is blocked', await blocker.isBlocked('ips', ip1))
console.log('ip2 is blocked', await blocker.isBlocked('ips', ip2))
```

You can also get all blocked lists by:

```typescript
const list = await blocker.getAllBlockedLists()
console.log(list)
```

It outputs something like:

```typescript
[
  { name: 'ips', values: [ '2.63.5.44' ] }
]
```

Now an example of how to plug in it to a modern node web application such as [restify](restify.com) and [express](https://expressjs.com/) to prevent a bot attack. For this scenario, we previously identified the attacker from a single ip `2603:9001:660d:2b93:89f0:94a0:9c68:6f37` and many other requests with static `User-Agent: python-requests/2.25` then we're going to add these values to `ips` and `user-agents` list, respectively: 


```typescript
import { Blocking } from 'sadbot'

const blocker = new Blocking()

await blocker.block('ips', '2603:9001:660d:2b93:89f0:94a0:9c68:6f37')
await blocker.block('user-agents', 'python-requests/2.25')

//...initialize `app`

app.post('/my-form', async (req, res, next) => {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress 
  const userAgent = req.headers['user-agent']  

  const ipBlocked = await blocker.isBlocked('ips' ip)
  const userAgentBlocked = await blocker.isBlocked('user-agents' userAgent)

  if (ipBlocked || userAgentBlocked) {
    console.warn('Blocked request', res)
    res.status(403).send({error: 'Forbidden'})
  } else {
    res.send({ you: 'good' })
  }
})
```

#### Setting Redis client
The default `sadbot` connects locally to Redis, you can pass it in the constructor:

```typescript
import { createClient } from 'redis'
import { Blocking } from 'sadbot'

const redisClient = createClient({
  url: 'redis://alice:foobared@awesome.redis.server:6380'
})
const blocker = new Blocking({redisClient})

```
If you get type error in typescript, cast the Redis client with:

```typescript
import { RedisClientType } from '@node-redis/client'

const redisClient = createClient() as RedisClientType<Record<string, never>, Record<string, never>>
```
Make sure Redis is installed:

```
npm install -s  @types/redis
```

### Throttling

Use `Throttling` when you need to limit the amount of requests to a certain resource in an interim. Although there are many applications to it, the best way to demonstrate how to throttle something is to use a HTTP API throttling.

#### A case of throttling by authorization
In this scenario, our users have an authorized token, each user call our microservice passing the token in `Authorization` request header, we're going to limit to 20 requests per minute i.e. if the user request less than 20 requests per minute then it can consume the resource otherwise we respond a nope until the time cleans up:

```typescript
import { createClient } from 'redis'
import { Throttling } from 'sadbot'

const redisClient = createClient({
  url: 'redis://localhost:6379'
})
 
const throttler = new Throttling({redisClient}, 
    conf => conf.limitRequestsTo(20)
                .duration(1)
                .minute())

//...initialize `app`

app.get('/my-resource', async (req, res, next) => {
  try{
  
    await throttler.throttleBy( () => req.headers['authorization'] )
    res.send({ you: 'good' })
  
  }catch(e){
    if (err.name === 'RequestLimitExceeded'){
      res.status(429).send({error: 'Rate limiting'})
      //or next(err)
      return
    }
    throw e
  } 
})

```

You can optionally get the current rate of the resource:

```typescript
const currentRate = await throttler.rate(req.headers['authorization'])
```

### Time Restricted

It's started as a primitive feature but might be useful for cases where a resource is limited by a time in the day i.e. it can only be accessed if the request takes place in a valid period. Let's say an HR app is limiting the access to their app from requests coming from `https://obscurity-things.io` between 6am to 8pm, we're going to identify the origin of the request by `Referer` header, so the implementation would look like(note the time is 24hs based):

```typescript
import { createClient } from 'redis'
import { TimeRestricted } from 'sadbot'

const redisClient = createClient({
  url: 'redis://localhost:6379'
})
 
const constraint = new TimeRestricted({redisClient})
await constraint.restrict('https://obscurity-things.io', 
  { 
    startTime: '06:00:00 AM', 
    endTime: '08:00:00 PM' 
  })

//...initialize `app`

app.get('/my-resource', async (req, res, next) => {

  const canAccess = await constraint.isRestricted(req.headers['referer'])

  if (canAccess){
    res.send({ you: 'good' })
  }else {
    res.status(503).send({error: 'Service Unavailable (for you)'})
  }
})

```
I hope one day we can set the accessing schedule by [rrule](https://datatracker.ietf.org/doc/html/rfc5545)


