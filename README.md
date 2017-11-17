# Observable Server

> REST for the Observable types

## Usage

```js
const createServer = require('observable-server')

// OR

import createServer from 'observable-server'


const server = createServer()

const userPostRequests = server.on({
  url: '/users',
  method: 'post'
})

const updateLog = userPostRequests
  .subscribe(({ request }) => {
    // do something for every time someone creates a user
  })

const userRequestSub = userPostRequest
  .flatMap(({
    request: {
      params,
      body
    },
    send
  }) => db.save.User(body).map(data => ({ data, send }))) 
  .subscribe(({ data, send }) => {
    send(data)
  })
```