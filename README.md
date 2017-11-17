# Observable Server

> REST for the Observable types

## Usage

```js
const createServer = require('./index.js')
const { Observable } = require('rxjs')

// OR

import createServer from './index.js'
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