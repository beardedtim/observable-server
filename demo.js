const createServer = require('./index.js')
const { Observable } = require('rxjs')

const server = createServer({
  port: 5001
})

const db = {
  save: {
    User: data => Promise.resolve(data)
  }
}

const userPostRequests = server.on({
  url: '/users',
  method: 'post'
})

const userRequestSub = userPostRequests
  .flatMap(
    ({ request: { params, body }, send }) =>
      console.log(body, 'body') ||
      Observable.fromPromise(db.save.User(body)).map(data => ({ data, send }))
  )
  .subscribe(({ send, data }) => {
    send({ data })
  })
