const http = require('http')
const Rx = require('rxjs')
const pathToRegex = require('path-to-regexp')
const { parse } = require('query-string')

const createEmitter = require('observable-emitter')

/**
 * Transforms incoming requests to needed shape
 *
 * @param {Object} req - The incoming request
 * @return {Object} - The massaged shape
 */
const transformRequestToAction = req => {
  const { method, url } = req
  return {
    request: req,
    socket: req.socket,
    type: url
  }
}

/**
 * Turns an express-style route into a regex
 *
 * WARNING: Affects `keys` value
 *
 * @param {string} route - Express style route
 * @param {Array<T>} keys - Keys matched on express route
 * @return {RegExp} - The regular expression matching our route
 */
const createRegexFromExpressSyntax = (route, keys = []) =>
  pathToRegex(route, keys)

/**
 * Adds param and query to incoming request shape
 *
 * @param {string} path
 * @return {function(Object -> Object)} - A function that expects our needed shape and returns an object with the query and param
 */
const addParamArgs = path => {
  return ({ request, ...args }) => {
    const keys = []
    const re = createRegexFromExpressSyntax(path, keys)
    const result = re.exec(request.url).slice(1)
    if (!result || !result.length) {
      return {
        ...args,
        request: Object.assign({}, request, {
          query: {},
          params: {}
        })
      }
    }
    const lastIndex = result.length - 1
    const lastItem = result[lastIndex]
    const queryIndex = lastItem.indexOf('?')
    let query = {}

    if (queryIndex >= 0 && result) {
      const nonQueryPath = lastItem.slice(0, queryIndex)
      const queryStr = lastItem.slice(queryIndex)
      query = parse(queryStr)
      result[lastIndex] = nonQueryPath
    }

    const newReq = Object.assign({}, request, {
      params: keys.reduce(
        (acc, { name }, i) => ({
          ...acc,
          [name]: result[i]
        }),
        {}
      ),
      query
    })

    return {
      ...args,
      request: newReq
    }
  }
}

/**
 * Filters incoming `request` objects by the given method type
 *
 * @param {string} method - The method to listen on
 * @return {function(* -> bool)} - A function that expects a request and returns truthy/falsy
 */
const filterByMethod = (method = '*') => ({ request }) =>
  request.method.toUpperCase() === method.toUpperCase() || method === '*'

/**
 * Parse the incoming request body
 *
 * @param {IncomingRequest} param
 * @return {Observable} - An observable with the body
 */
const transformBody = ({ request, ...args }) =>
  Rx.Observable.create(observer => {
    let data = ''

    request.on('data', e => {
      data += e.toString()
    })

    request.on('end', e => {
      try {
        const jsonData = JSON.parse(data) // try to treat it as JSON data
        observer.next(
          Object.assign({}, args, {
            request: Object.assign(request, { body: jsonData })
          })
        )
      } catch (e) {
        observer.next(
          Object.assign({}, args, {
            request: Object.assign(request, { body: data }) // If it threw, treat it as string
          })
        )
      } finally {
        observer.complete() // Alwys say you're done
      }
    })
  })

/**
 * Our server options
 *
 * @typedef {Object} ServerOptions
 * @property {number} port - The port to listen on
 * @property {function} preTransform - A function that takes in a path and returns a function to modify actions on that path
 * @property {function} initialTRansformation - A function that takes in the initial request and transform it to the needed values
 * @property {function} withSend - A function that, given a modified request object, adds your `send` function to the request object
 */

/**
 * Our defualt ServerOptions
 *
 * @type {ServerOptions}
 */
const DEFAULT_OPTS = {
  port: 5000,
  preTransform: addParamArgs,
  initialTransformation: transformRequestToAction,
  withSend: obj => ({
    ...obj,
    send: (msg, end = true) => {
      const action = typeof msg === 'string' ? msg : JSON.stringify(msg)

      obj.socket.write(action)

      if (end) {
        obj.socket.end()
      }
    }
  })
}

const createServer = (opts = {}) => {
  const config = Object.assign({}, DEFAULT_OPTS, opts)

  const serverInstance = http.createServer()

  const sourceStream = Rx.Observable
    .fromEvent(serverInstance, 'request')
    .map(config.initialTransformation)

  const events = createEmitter({
    source: sourceStream
  })

  /**
   * Our route handler registration
   *
   * @param {*} param
   * @param {string} param.url - The express-style route we want to listen for
   * @param {string} param.method - The method we want to listen on
   * @return {Observable} - An observable of the requests to the route we registered on
   */
  const on = ({ url, method }) =>
    events
      .on(createRegexFromExpressSyntax(url)) // convert `url` to regex
      .filter(filterByMethod(method)) // Only care about specific method
      .flatMap(transformBody) // add a body to the transformed values
      .map(config.preTransform(url)) // transform it for the rest of our system
      .map(config.withSend) // add the send value to the transformed values

  serverInstance.listen(config.port) // Listen on specific port

  return {
    on,
    server: serverInstance
  }
}

module.exports = createServer
