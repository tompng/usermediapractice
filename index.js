onload = async () => {
  const video = document.createElement('video')
  document.body.appendChild(video)
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: { width: 320, height: 240 }  })
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
        console.log('needrecordstart')
        startSend()
      }
    } else if (cmd == 'D') {
      if (data[0] == '0') startPlay()
      if (data[0] == '0') console.log('recv', data.substr(1, 100), data.substr(-100))
      pushVideoData(data)
    }
  }
  let prevRecorder = null
  let recid = 0
  function startSend() {
    const recorder = new MediaRecorder(stream, { mimeType: codec })
    let initial = true
    let n = 0
    recid++
    recorder.ondataavailable = async event => {
      const blob = event.data
      const arr = new Uint8Array(await blob.arrayBuffer())
      if (prevRecorder !== recorder) return
      const base64 = btoa([...arr].map(c => String.fromCharCode((c+256) % 256)).join(''))
      websocket.send((initial ? 0 : n)+';' + base64)
      n++
      if (initial) console.log('send', blob.type, base64.substr(0, 100), base64.substr(-100))
      initial = false
      console.log('reci', recid)
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
  let buffers = []
  let appendVideoData = () => { console.error('error') }
  function startPlay() {
    console.log('newsource')
    mediaSource = new MediaSource({ mimeType: codec })
    video.src = URL.createObjectURL(mediaSource, { type: codec })
    video.play()
    video.onprogress=()=>{
      console.log('progress')
    }
    buffers = []
    appendVideoData = arrayBuffer => {
      buffers.push(arrayBuffer)
    }
    console.log('sourceshouldopen')
    mediaSource.onsourceopen = () => {
      console.log('sourceopen')
      const sourceBuffer = mediaSource.addSourceBuffer(codec)
      appendVideoData = arrayBuffer => sourceBuffer.appendBuffer(arrayBuffer)
      console.log('buffers', buffers.length, buffers[0])
      buffers.forEach(appendVideoData)
      buffers = []
    }
  }
  function stopPlay() {
    if (video.src) URL.revokeObjectURL(video.src)
    video.src = ''
  }
  function pushVideoData(data) {
    console.log('a',data.split(';')[0])
    appendVideoData(Uint8Array.from(atob(data.split(';',2)[1]), c => c.charCodeAt(0)))
  }
}