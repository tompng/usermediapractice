setInterval(() => {
  location.reload()
}, 60 * 60 * 1000)
onload = async () => {
  const video = document.createElement('video')
  document.body.appendChild(video)
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: { width: 320, height: 240 }  })
  const codec = 'video/webm;codecs=vp8,opus'
  let websocket
  let reconnectTimer = null
  function reconnect() {
    if (reconnectTimer) return
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null
      connect()
    }, 10 * 1000)
  }
  function connect() {
    websocket = new WebSocket('ws://localhost:6789/')
    const clientId = location.hash.substr(1) || Math.random().toString()
    websocket.onopen = () => {
      websocket.send(clientId)
    }
    websocket.onmessage = e => {
      const cmd = e.data[0]
      const data = e.data.substr(1)
      if (cmd == 'C') {
        const count = parseInt(data)
        if (count == 1) {
          stopSend()
          stopPlay()
        } else {
          startSend()
        }
      } else if (cmd == 'D') {
        if (data[0] == '0') startPlay()
        pushVideoData(data.substr(1))
      }
    }
    websocket.onclose = reconnect
    websocket.onerror = reconnect
  }
  connect()
  let prevRecorder = null
  function startSend() {
    const recorder = new MediaRecorder(stream, { mimeType: codec })
    let initial = true
    recorder.ondataavailable = async event => {
      const blob = event.data
      reader = new FileReader()
      reader.readAsDataURL(blob)
      reader.onload = () => {
        websocket.send((initial ? 0 : 1) + reader.result.split('base64,', 2).pop())
        initial = false
      }
    }
    recorder.start(200)
    prevRecorder = recorder
  }
  function stopSend() {
    if (!prevRecorder) return
    prevRecorder.pause()
    prevRecorder = null
  }
  let tick = null
  setInterval(() => tick && tick(), 100)
  let buffers = []
  let appendVideoData = arrayBuffer => buffers.push(arrayBuffer)
  function startPlay() {
    mediaSource = new MediaSource({ mimeType: codec })
    video.src = URL.createObjectURL(mediaSource, { type: codec })
    video.play()
    mediaSource.onsourceopen = () => {
      const sourceBuffer = mediaSource.addSourceBuffer(codec)
      tick = () => {
        if (buffers.length && !sourceBuffer.updating) sourceBuffer.appendBuffer(buffers.shift())
      }
    }
  }
  function stopPlay() {
    buffers = []
    if (video.src) URL.revokeObjectURL(video.src)
    video.src = ''
  }
  function pushVideoData(base64) {
    appendVideoData(Uint8Array.from(atob(base64), c => c.charCodeAt(0)))
  }
}
