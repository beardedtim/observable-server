# Observable Server

> Like Express but with observables

## Usage

```js
import createServer from 'observable-server'
// OR
const createServer = require('./index.js')

const server = createServer()

// Only listen for `GET` commands
server
  .on({ url: '/:collection/:id', method: 'GET' })
  .subscribe(({ request, response }) =>
    response.send({
      headers: {
        'Content-Type': 'application/json'
      },
      body: {
        data: {
          worked: true
        }
      }
    })
  )

// Only listen for 'POST' commands
server
  .on({ url: '/:collection/:id', method: 'POST' })
  .subscribe(({ request, response }) =>
    response.send({
      headers: {
        'Content-Type': 'application/json'
      },
      body: {
        data: {
          worked: true
        }
      }
    })
  )


// Only listen for POST to /users
server
  .on({ url: '/users', method: 'post' })
  .subscribe(({ request, resposne }) => { /* ... */ })
```

## API

`createServer` is the only export from this package. It is a function that takes an `options` object and returns a `ServerInterface`, both of which are defined below.

* `options`: The options for our server
  - `port`: The port to listen on
  - `pre`: An rxjs `lettable` function to run before each route handler
* `ServerInterface`: The interface for our server stream
  - `on`: A function that, given a `RouteOptions` shape, returns an observable
    -  `RouteOptions`
        * `url`: An express-style url to match on
        * `method`: The HTTP method to listen on or `'*'` or `undefined` for all methods

For a full demo, check out `./demo.js` or after installing this locally, run `npx nodemon demo.js` and send requests to the server. 