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
  return ({ request, ...args }) => ({
    ...args,
    request: (() => {
      const keys = []
      const re = createRegexFromExpressSyntax(path, keys)
      const result = re.exec(request.url).slice(1)
      if (!result || !result.length) {
        return {
          params: {},
          query: {}
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

      return Object.assign({}, request, {
        params: keys.reduce(
          (acc, { name }, i) => ({
            ...acc,
            [name]: result[i]
          }),
          {}
        ),
        query
      })
    })()
  })
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
 * Our server options
 *
 * @typedef {Object} ServerOptions
 * @property {number} port - The port to listen on
 * @property {function} preTransform - A function that takes in a path and returns a function to modify actions on that path
 * @property {function} initialTRansformation - A function that takes in the initial request and transform it to the needed values
 * @property {function} send - A function that given socket, msg, and end sends the message a socket and optionally closes the socket
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
  send: socket => (msg, end = true) => {
    const action = typeof msg === 'string' ? msg : JSON.stringify(msg)

    socket.write(action)

    if (end) {
      socket.end()
    }
  }
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
      .on(createRegexFromExpressSyntax(url))
      .filter(filterByMethod(method))
      .map(config.preTransform(url))
      .map(obj => ({
        ...obj,
        send: config.send(obj.socket)
      }))

  serverInstance.listen(config.port)

  return {
    on,
    server: serverInstance
  }
}

module.exports = createServer
