const { Server } = require('ws')
var server = new Server({ port: process.env.PORT || 6789 })

const clients = new Map()
server.on('connection', ws => {
  let initialized = false
  let clientId = null
  ws.on('message', message => {
    if (!initialized) {
      init(message)
    } else {
      cast(message)
    }
  })
  function send(data, all = false) {
    clients.forEach((client, id) => {
      if (all || id != clientId) {
        client.send(data)
        console.log('sent')
      }
    })
  }
  function init(id) {
    clientId = id
    initialized = true
    clients.set(id, ws)
    send('C'+clients.size, true)
  }
  function cast(message) {
    send('D' + message)
  }
  ws.on('close', () => {
    if (clients.delete(clientId)) send('C' + clients.size)
  })
})
