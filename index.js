const http = require('http')
const Rx = require('rxjs')
const urlParser = require('url')
const { parse } = require('query-string')
const pathToRegex = require('path-to-regexp')

const compose = (...fns) => start =>
  fns.reduceRight((state, fn) => fn(state), start)

/**
 * A lettable function to add Query and Path
 *
 * @param {RouteOptions} routeOptions - Options for this route
 * @return {function(Observable -> Observable)} - Returns a massaged version of the request object
 */
const addQueryAndPath = routeOptions => obs =>
  obs.map(({ request, response }) => {
    const parsedUrl = urlParser.parse(
      `http://${request.headers.host}${request.url}`
    )
    return {
      response,
      request: Object.assign(request, {
        query: parse(parsedUrl.query),
        path: parsedUrl.pathname
      })
    }
  })

const createRegexFromExpressSyntax = (route, keys = []) =>
  pathToRegex(route, keys)

/**
 * A lettable function to add Params
 *
 * @param {string} baseUrl - Base url for this route
 * @param {string} path - A non-query string
 * @return {Object} - Returns an object of parameters
 */

const getParamsFromRequest = (baseUrl, { path }) => {
  if (!path) {
    throw new Error(
      'request.path is not defined. Please ensure that you have added a path key to the request object before calling this processor'
    )
  }

  const keys = []
  const re = createRegexFromExpressSyntax(baseUrl, keys)
  const result = (re.exec(path) || []).slice(1)

  if (!result || !result.length) {
    return {}
  }

  return keys.reduce(
    (acc, { name }, i) => ({
      ...acc,
      [name]: result[i]
    }),
    {}
  )
}

/**
 * A lettable function to add Query and Path
 *
 * @param {RouteOptions} routeOptions - Options for this route
 * @return {function(Observable -> Observable)} - Returns a massaged version of the request object
 */
const addParams = routeOptions => obs =>
  obs.map(({ request, ...args }) => ({
    ...args,
    request: Object.assign(request, {
      params: getParamsFromRequest(routeOptions.url, request)
    })
  }))

/**
 * A lettable function to add Send to response
 *
 * @param {RouteOptions} routeOptions - Options for this route
 * @return {function(Observable -> Observable)} - Returns a massaged version of the request object
 */
const addResponseHelpers = routeOptions => obs =>
  obs.map(({ response, ...args }) => ({
    ...args,
    response: Object.assign(response, {
      send: ({ headers: { code = 200, ...restHeaders } = {}, body }) => {
        response.writeHead(code, restHeaders)

        const action = typeof body === 'string' ? body : JSON.stringify(body)

        response.write(action)
        response.end()
      }
    })
  }))

/**
 * A lettable function to filter by method
 *
 * @param {RouteOptions} routeOptions - Options for this route
 * @return {function(Observable -> Observable)} - Returns a massaged version of the request object
 */

const filterByMethod = routeOptions => obs =>
  obs.filter(({ request }) => {
    const { path, method: reqMethod } = request
    const { method: routeMethod = '*' } = routeOptions
    return (
      pathToRegex(path) &&
      (reqMethod.toLowerCase() === routeMethod.toLowerCase() ||
        routeMethod === '*')
    )
  })

const parseJSON = ({ request, ...args }) =>
  Rx.Observable.create(observer => {
    let body = ''
    request.on('data', data => {
      body += data
    })

    request.on('end', () => {
      observer.next({
        request: Object.assign(request, {
          body: JSON.parse(body)
        }),
        ...args
      })

      observer.complete()
    })
  })

const parseBody = ({ parseType = 'json' } = {}) => obs =>
  obs.flatMap(inputs => {
    if (inputs.request.method.toLowerCase() === 'get') {
      return Rx.Observable.of({
        ...inputs,
        request: Object.assign(inputs.request, {
          body: {}
        })
      })
    }

    const parsers = {
      json: parseJSON
    }

    const parser = parsers[parseType]

    return parser(inputs)
  })

/**
 * A lettable function to add above handlers
 *
 * @param {RouteOptions} routeOptions - Options for this route
 * @return {function(Observable -> Observable)} - Returns a massaged version of the request object
 */

const standardDataTransforms = routeOptions =>
  compose(
    addResponseHelpers(routeOptions),
    filterByMethod(routeOptions),
    addParams(routeOptions),
    addQueryAndPath(routeOptions),
    parseBody(routeOptions)
  )

const DEFAULT_OPTS = {
  port: 5000,
  pre: standardDataTransforms,
  serverStartCallback: server => () => {
    console.log(server, 'Server has started!')
  }
}

/**
 * Our way of creating server interfaces
 *
 * @param {ServerOptions} opts - The options for this server instance
 * @return {ServerInterface} - Our server interface
 */
const createServer = opts => {
  const config = Object.assign({}, DEFAULT_OPTS, opts)
  const { port, pre } = config
  const requestStream = new Rx.Subject()

  const server = http.createServer((request, response) => {
    requestStream.next({
      request,
      response
    })
  })

  server.listen(port, config.serverStartCallback(server))

  return {
    on: routeOptions => requestStream.let(pre(routeOptions))
  }
}

module.exports = Object.assign(createServer, {
  preprocessors: {
    filterByMethod,
    addResponseHelpers,
    addParams,
    addQueryAndPath,
    parseBody
  }
})

/**
 * Basic Observable Interface
 *
 * @typedef {Object} Observable
 *
 * @property {function} subscribe - Our interface to the data
 */

/**
 * Route Options
 *
 * @typedef {Object} RouteOptions
 *
 * @property {string} url - An express-style url string
 * @property {string} method - The method to listen for ( GET/ POST/ PUT/ etc )
 */

/**
 * Our Server Options
 *
 * @typedef {Object} ServerOptions
 *
 * @property {number} port - The port to listen on
 * @property {function(RouteOptions -> function(Observable -> Observable))} pre - A HoF for a Lettable operator to run before handlers
 */

/**
 * Our Server Interface
 *
 * @typedef {Object} ServerInterface
 *
 * @property {function(RouteOptions -> Observable)} on - A function that, given RouteOptions returns an observable of all requests to that endpoint and method
 */
