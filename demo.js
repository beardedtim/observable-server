const createServer = require('./index.js')

const models = {
  users: {
    get: () => Promise.resolve([])
  }
}

const getModel = collection => models[collection]

const server = createServer({
  pre: routeOptions => obs =>
    obs.map(({ request, ...rest }) => ({
      ...rest,
      request: Object.assign({}, request, {
        collection: getModel(request.params.collection) // Custom DB middleware
      })
    }))
})

server
  .on({ url: '/:collection/:id', method: 'GET' })
  .subscribe(({ request, response }) => {
    const { collection } = request

    collection.get().then(data =>
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
