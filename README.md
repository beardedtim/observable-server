# Observable Server

> Like Express but with observables

## Usage

```js
import createServer from 'observable-server'
// OR
const createServer = require('observable-server')

const server = createServer()

server
  .on({ url: '/users', method: 'post' })
  .subscribe(({ request, resposne }) => { /* ... */ })
```

## API

`createServer` is the only export from this package. It is a function that takes an `options` object and returns a `ServerInterface`, both of which are defined below.

* `options`: The options for our server
  - `port`: The port to listen on. Defaults to `5000`
  - `pre`: An HoF that will be given `RouteOptions` and return an rxjs `lettable` function to run before each route handler. See `./index.js` export for `preprocessors` that are applied by default.
* `ServerInterface`: The interface for our server stream
  - `on`: A function that, given a `RouteOptions` shape, returns an observable
    -  `RouteOptions`
        * `url`: An express-style url to match on
        * `method`: The HTTP method to listen on or `'*'` or `undefined` for all methods
        * Any other values that are expected by a `pre` for its `routeOptions` Hof function.

For a full demo, check out `./demo.js` or after installing this locally, run `npx nodemon demo.js` and send requests to the server. 