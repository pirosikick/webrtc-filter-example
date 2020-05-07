interface HTMLCanvasElement {
  captureStream(): MediaStream;
}

let startButton: HTMLButtonElement;
let connectButton: HTMLButtonElement;
let receiveScpButton: HTMLButtonElement;

const init = () => {
  startButton = document.querySelector("#start-button") as HTMLButtonElement;
  startButton.onclick = startVideo;

  connectButton = document.querySelector(
    "#connect-button"
  ) as HTMLButtonElement;
  connectButton.onclick = connect;

  receiveScpButton = document.querySelector(
    "#receive-scp"
  ) as HTMLButtonElement;
  receiveScpButton.onclick = receiveScp;
};
document.addEventListener("DOMContentLoaded", init);

const createVideo = (stream: MediaStream) => {
  const video = document.createElement("video");
  video.autoplay = true;
  video.srcObject = stream;
  return video;
};

const startVideo = async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: false
    });
    // localStream = stream;
    const video = createVideo(stream);
    video.onloadedmetadata = () => {
      videoLoaded(video);
    };
    // document.querySelector("#original-video")?.appendChild(video);
  } catch (e) {
    console.log(e);
  }
};

let localStream: MediaStream;

const videoLoaded = (video: HTMLVideoElement) => {
  const { videoWidth: width, videoHeight: height } = video;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  document.querySelector("#canvas")?.appendChild(canvas);

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    console.log('canvas.getContext("2d") failed');
    return;
  }

  const render = () => {
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(video, 0, 0, width, height);
    ctx.fillText("Hello world", 10, 50);
    requestAnimationFrame(render);
  };
  render();

  const v = document.createElement("video");
  v.autoplay = true;
  localStream = v.srcObject = canvas.captureStream();
  // v.srcObject = canvas.captureStream();
  document.querySelector("#canvas-video")?.appendChild(v);
};

const peerNewConnection = () => {
  const peer = new RTCPeerConnection({ iceServers: [] });
  peer.ontrack = (e) => {
    console.log("ontrack", e);
    playRemoteVideo(e.streams[0]);
  };

  peer.onicecandidate = (e) => {
    if (e.candidate) {
      console.log(e.candidate);
    } else {
      sendSdp(peer.localDescription);
    }
  };

  for (const track of localStream.getTracks()) {
    console.log(track);
    peer.addTrack(track, localStream);
  }

  return peer;
};

let peer: RTCPeerConnection;

const connect = () => {
  if (!peer) {
    makeOffer();
  }
};

const makeOffer = async () => {
  peer = peerNewConnection();
  try {
    const description = await peer.createOffer();
    await peer.setLocalDescription(description);
  } catch (e) {
    console.log(e);
  }
};

const sendSdp = (localDescription: RTCSessionDescription | null) => {
  if (localDescription) {
    const sdp = document.querySelector("#send-sdp") as HTMLTextAreaElement;
    sdp.value = localDescription.sdp;
  }
};

const playRemoteVideo = (stream: MediaStream) => {
  console.log("pyalRemoteVideo", stream, stream.getTracks());
  const video = createVideo(stream);
  document.querySelector("#remote-video")?.appendChild(video);
};

const receiveScp = () => {
  const text = (document.querySelector("#receive-sdp") as HTMLTextAreaElement)
    .value;
  if (!text) {
    console.log("text is empty");
    return;
  }

  if (peer) {
    const answer = new RTCSessionDescription({
      type: "answer",
      sdp: text
    });
    setAnswer(answer);
  } else {
    const offer = new RTCSessionDescription({
      type: "offer",
      sdp: text
    });
    setOffer(offer);
  }
};

const setOffer = async (sessiontDescription: RTCSessionDescription) => {
  if (peer) {
    console.error("peer already exists");
    return;
  }

  peer = peerNewConnection();
  try {
    await peer.setRemoteDescription(sessiontDescription);
    makeAnswer();
  } catch (e) {
    console.error("setOffer failed", e);
  }
};

const makeAnswer = async () => {
  if (!peer) {
    console.error("peer not exists");
    return;
  }

  try {
    const sessionDescription = await peer.createAnswer();
    await peer.setLocalDescription(sessionDescription);
  } catch (e) {
    console.error("makeAnswer failed", e);
  }
};

const setAnswer = async (sessionDescription: RTCSessionDescription) => {
  if (!peer) {
    console.error("peer not exists");
    return;
  }

  try {
    await peer.setRemoteDescription(sessionDescription);
  } catch (e) {
    console.log("setAnswer failed", e);
  }
};
