import RTC from '@components/BaseRTC.js';

export default class RTCClient extends RTC {
  constructor(options) {
    super(options);

    this.mirror = false;
    this.localStreamWithWaterMark = null;
    this.videoElement = null;
    this.sourceVideoTrack = null;
    this.intervalId = -1;
  }

  loadImage({ imageUrl, width, height }) {
    return new Promise((resolve) => {
      const image = new Image(width, height);
      image.src = imageUrl;
      image.onload = () => resolve(image);
    });
  }

  async startWaterMark({ localStream, imageUrl, x, y, width, height, mode, rotate = 0, alpha = 1 }) {
    if (this.localStreamWithWaterMark) {
      throw 'watermark had been added';
    }
    if (!localStream || !localStream.hasVideo()) {
      throw 'local stream has not video track';
    }

    const image = await this.loadImage({ imageUrl, width, height });
    this.videoElement = document.createElement('video');
    const mediaStream = new MediaStream();
    this.sourceVideoTrack = localStream.getVideoTrack();
    mediaStream.addTrack(this.sourceVideoTrack);

    this.videoElement.srcObject = mediaStream;
    await this.videoElement.play();

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const { width: trackWidth, height: trackHeight, frameRate } = this.sourceVideoTrack.getSettings();
    canvas.width = trackWidth;
    canvas.height = trackHeight;


    this.intervalId = setInterval(() => {
      ctx.drawImage(this.videoElement, 0, 0, canvas.width, canvas.height);

      ctx.globalAlpha = alpha;
      ctx.rotate((rotate * Math.PI) / 180);
      if (mode === 'cover') {
        const xCount = Math.ceil(canvas.width / image.width);
        const yCount = Math.ceil(canvas.height / image.height);
        for (let i = -xCount; i < xCount + 5; i++) {
          for (let j = -yCount; j < yCount + 5; j++) {
            ctx.drawImage(image, i * image.width, j * image.height, image.width, image.height);
          }
        }
      } else {
        ctx.drawImage(image, x, y, image.width, image.height);
      }
      ctx.rotate((-rotate * Math.PI) / 180);
      ctx.globalAlpha = 1;
    }, Math.floor(1000 / frameRate));

    const canvasStream = canvas.captureStream();

    await localStream.replaceTrack(canvasStream.getVideoTracks()[0]);

    this.localStreamWithWaterMark = localStream;
    return localStream;
  }

  stopWaterMark() {
    clearInterval(this.intervalId);
    this.intervalId = -1;
    if (this.localStreamWithWaterMark && this.sourceVideoTrack) {
      this.localStreamWithWaterMark.replaceTrack(this.sourceVideoTrack);
    }
    this.localStreamWithWaterMark = null;
    if (this.videoElement) {
      this.videoElement.srcObject = null;
      this.videoElement = null;
    }
  }
}
