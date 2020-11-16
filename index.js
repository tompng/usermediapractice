onload = async () => {
  const video = document.createElement('video')
  document.body.appendChild(video)
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: { width: 320, height: 180 }  })
  const codec = 'video/webm;codecs=vp8,opus'
  const websocket = new WebSocket('ws://localhost:6789')
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
      if (data[0] == '0') console.log('recv', data.substr(1, 100), data.substr(-100))
      pushVideoData(data.substr(1))
    }
  }
  let prevRecorder = null
  function startSend() {
    const recorder = new MediaRecorder(stream, { mimeType: codec })
    let initial = true
    recorder.ondataavailable = async event => {
      const blob = event.data
      const reader = new FileReader()
      reader.readAsDataURL(blob)
      reader.onload = () => {
        if (prevRecorder !== recorder) return
        const base64 = reader.result.split('base64,',2)[1]
        if (!base64) console.log('err', reader.result)
        websocket.send((initial ? 0 : 1) + base64)
        if (initial) console.log('send', base64.substr(0, 100), base64.substr(-100))
        initial = false
      }
    }
    recorder.start(200)
    prevRecorder = recorder
  }
  function stopSend() {
    if (!prevRecorder) return
    prevRecorder.stop()
    console.log('stoprecord')
    prevRecorder = null
  }
  let appendVideoData = _arrayBuffer => {}
  function startPlay() {
    mediaSource = new MediaSource({ mimeType: codec })
    video.src = URL.createObjectURL(mediaSource, { type: codec })
    video.play()
    mediaSource.onsourceopen = () => {
      const sourceBuffer = mediaSource.addSourceBuffer(codec)
      appendVideoData = arrayBuffer => sourceBuffer.appendBuffer(arrayBuffer)
    }
  }
  function stopPlay() {
    if (video.src) URL.revokeObjectURL(video.src)
    video.src = null
  }
  function pushVideoData(data) {
    appendVideoData(Uint8Array.from(atob(data), c => c.charCodeAt(0)))
  }
}