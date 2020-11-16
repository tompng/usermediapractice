onload = async () => {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: { width: 320, height: 180 }  })
  const codec = 'video/webm;codecs=opus,vp8'
  const mediaSource = new MediaSource({ mimeType: codec })
  const voutput = document.createElement('video')
  voutput.src = URL.createObjectURL(mediaSource, { type: codec })
  voutput.play()
  mediaSource.onsourceopen = () => {
    const sourceBuffer = mediaSource.addSourceBuffer(codec)
    const recorder = new MediaRecorder(stream, { mimeType: codec })
    recorder.ondataavailable = async event => {
      const blob = event.data
      const array = await blob.arrayBuffer()
      sourceBuffer.appendBuffer(array)
    }
    recorder.start(200)
  }
  voutput.onprogress=()=>{
    console.log('progress')
  }

  document.body.appendChild(voutput)
}