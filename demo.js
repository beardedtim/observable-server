const createServer = require('./index.js')
const { Observable } = require('rxjs')

const server = createServer({
  port: 5001
})

const getUser = server.on({
  url: '/users/:id',
  method: 'GET'
})

const getUserFromDB = id =>
  Promise.resolve({
    _id: id,
    name: 'John Snow'
  })

getUser
  .flatMap(({ request: { params: { id: userId } }, send }) =>
    Observable.fromPromise(getUserFromDB(userId)).map(user => ({
      data: user,
      send
    }))
  )
  .subscribe(({ data, send }) => send(data))
