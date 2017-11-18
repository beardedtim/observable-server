# Observable Server

> REST for the Observable types

## Usage

```js
const createServer = require('observable-server')
const { Observable } = require('rxjs')

// OR

import createServer from 'observable-server'
import { Observable } from 'rxjs'

const server = createServer({
  port: 5001
}) // Create a server at this port

const db = {
  save: {
    User: data => Promise.resolve(data)
  }
} // Mock our DB

const userPostRequests = server.on({
  url: '/users',
  method: 'post'
}) // Create handler for POST /users

const userRequestSub = userPostRequests
  .flatMap(({ request: { params, body }, send }) =>
    Observable.fromPromise(db.save.User(body)).map(data => ({ data, send }))
  ) // Create User given a body
  .subscribe(({ send, data }) => {
    send({ data }) // Send result back to user
  })
```

## Demo

```console
$ git clone git@github.com:beardedtim/observable-server.git

$ cd observable-server

$ yarn

$ npx nodemon demo.js
```

This should start a server at localhost:5001 with a POST handler for `/users` that will return the given `body` as `data`

## Options

The export of this package is `createServer`, which takes an options object which will affect how your stream behaves. Below is the schema for that options object along with what it does

* `port`: This is the port that the server will listen on
* `initialTransformation`: An HoF that, given an incoming `request` object via `httpServer.on('request')`, returns an `action` object that adheres to `observable-emitter` shape. This is applied before ANYTHING else.
* `bodyParser`: A function that, given a transformed value via `initialTransformation`, returns an observable that has all previous values plus `body`.
* `preTransform`: An HoF that, given a string URL will return a function that transforms the incoming request into one with `query`, `params`, etc, and any other needed values. This is basically the pre-middleware hook.
* `withSend`: A function that, given all transformations above, returns an object that has a `send` function that will send a message to the underlying socket

All of these options have defaults that seem to work as needed, which you can see in `DEFUALT_OPTS` inside of `./index.js`.

## Server Interface

The returned value from `createServer` has two keys:

* `on`: A function of `({ url, method }) => Observable` signature
  - `url` is an Express-style url string: `/users` or `/users/:id`
  - `method` is a string of the method wanting to hook into or `'*'` for all methods
* `server`: The actual `http.createServer` instance in case we need manual control