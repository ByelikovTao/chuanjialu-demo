/** 本人记录与长辈回话共用麦克风生命周期。 */
'use strict';
{
  const maxSeconds = 60;

  function create({ onStart, onTime, onAudio, onError }) {
    let request = 0;
    let recording;

    function cancel() {
      request++;
      const active = recording;
      recording = null;
      if (!active) return;
      clearInterval(active.timer);
      if (active.recorder.state !== 'inactive') active.recorder.stop();
      for (const track of active.stream.getTracks()) track.stop();
    }

    async function start() {
      cancel();
      const current = request;
      let stream;
      try {
        if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) throw new Error('浏览器无法录音');
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // 离开页面或取消授权后，即使浏览器迟到地打开麦克风，也立即关闭。
        if (request !== current) {
          for (const track of stream.getTracks()) track.stop();
          return;
        }
        const recorder = new MediaRecorder(stream);
        const chunks = [];
        const started = performance.now();
        const active = { stream, recorder, timer: null };
        recording = active;
        recorder.ondataavailable = event => {
          if (event.data.size) chunks.push(event.data);
        };
        recorder.onerror = () => {
          if (recording !== active) return;
          cancel();
          onError();
        };
        recorder.onstop = () => {
          clearInterval(active.timer);
          for (const track of stream.getTracks()) track.stop();
          if (recording !== active) return;
          recording = null;
          const audio = new Blob(chunks, { type: recorder.mimeType });
          if (audio.size) onAudio(audio);
          else onError();
        };
        recorder.start();
        active.timer = setInterval(() => {
          const seconds = Math.floor((performance.now() - started) / 1000);
          onTime(Math.min(seconds, maxSeconds));
          if (seconds >= maxSeconds && recorder.state === 'recording') recorder.stop();
        }, 250);
        onStart();
      } catch {
        if (stream) for (const track of stream.getTracks()) track.stop();
        if (request !== current) return;
        cancel();
        onError();
      }
    }

    function stop() {
      if (recording?.recorder.state === 'recording') recording.recorder.stop();
    }

    return { start, stop, cancel };
  }

  window.FamilyVoice = { create };
}
