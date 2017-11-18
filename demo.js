const R = require('ramda')
const createServer = require('./index.js')

const { preprocessors } = createServer

const models = {
  users: {
    get: _id => Promise.resolve({ _id, name: 'John Smith', type: 'user' }),
    set: user =>
      Promise.resolve({
        _id: 2,
        ...user
      })
  },
  posts: {
    get: _id => Promise.resolve({ _id, title: 'My post', type: 'post' }),
    set: post =>
      Promise.resolve({
        _id: 2,
        ...post
      })
  }
}

const getModel = collection => models[collection]

const addModel = obs =>
  obs.map(({ request, ...args }) => ({
    ...args,
    request: Object.assign(request, {
      collection: getModel(request.params.collection)
    })
  }))

const server = createServer({
  pre: routeOptions =>
    R.compose(addModel, ...R.values(preprocessors).map(fn => fn(routeOptions))) // We can write our own custom pre functions
})

server
  .on({ url: '/:collection/:id', method: 'GET' })
  .subscribe(({ request, response }) => {
    const { collection, params } = request

    collection.get(params.id).then(data =>
      response.send({
        headers: {
          'Content-Type': 'application/json'
        },
        body: {
          data
        }
      })
    )
  })

server
  .on({ url: '/:collection/:id', method: 'POST', parseType: 'json' })
  .subscribe(({ request, response }) =>
    request.collection.set(request.body).then(result =>
      response.send({
        headers: {
          'Content-Type': 'application/json',
          code: 201
        },
        body: {
          data: result
        }
      })
    )
  )
