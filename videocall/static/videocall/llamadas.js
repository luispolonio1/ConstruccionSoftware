const toggleBtn = document.getElementById("toggleProcessing");

const roomName = document.getElementById("room-data").dataset.room;
const ws = new WebSocket(
  (window.location.protocol === "https:" ? "wss://" : "ws://") +
  window.location.host + "/ws/call/" + roomName + "/"
);

ws.id = Math.random().toString(36).substring(2, 10);
let localStream;
let pc = new RTCPeerConnection({
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
});

const localVideo = document.getElementById("localVideo");
const remoteVideo = document.getElementById("remoteVideo");

let isCaller = false;

// ✅ Obtener cámara y micrófono
navigator.mediaDevices.getUserMedia({ video: true, audio: true })
  .then(stream => {
    localVideo.srcObject = stream;
    localStream = stream;

    stream.getTracks().forEach(track => {
      pc.addTrack(track, stream);
    });

    initializeAI().then(() => {
      toggleBtn.disabled = false;
    });
  })
  .catch(err => console.error("Error al acceder a cámara/micrófono:", err));

// ✅ Mostrar stream remoto
pc.ontrack = event => {
  if (event.streams && event.streams[0]) {
    remoteVideo.srcObject = event.streams[0];
  }
};

// Estado de ICE
pc.oniceconnectionstatechange = () => {
  console.log("📡 ICE state:", pc.iceConnectionState);
  if (pc.iceConnectionState === "disconnected" || 
      pc.iceConnectionState === "failed" || 
      pc.iceConnectionState === "closed") {
    remoteVideo.srcObject = null;
  }
};

// Enviar ICE candidates al servidor
pc.onicecandidate = event => {
  if (event.candidate) {
    ws.send(JSON.stringify({ "ice": event.candidate }));
  }
};

// ✅ Función para crear la oferta
async function makeCall() {
  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  ws.send(JSON.stringify({ "offer": offer }));
}

// ✅ Manejo de mensajes desde WebSocket
ws.onmessage = async (event) => {
  const data = JSON.parse(event.data);

  if (data.joined) {
    isCaller = true;
    makeCall();
  }

  if (data.from && data.from === ws.id) return;

  if (data.Mensaje) {
    const mensajeAlerta = data.Mensaje;
    document.getElementById('alerta').textContent = mensajeAlerta;
    document.getElementById('alerta').classList.remove('hidden');
    setTimeout(() => {
      document.getElementById('alerta').classList.add('hidden');
    }, 5000);

  }

  if (data.Informacion) {
    const mensajeAlerta = data.Informacion;
    document.getElementById('Informacion').textContent = mensajeAlerta;
    document.getElementById('Informacion').classList.remove('hidden');
    setTimeout(() => {
      document.getElementById('Informacion').classList.add('hidden');
    }, 5000);
  }

  if (data.offer) {
    await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    ws.send(JSON.stringify({ "answer": answer, "from": ws.id }));
  } 
  else if (data.answer) {
    await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
  } 
  else if (data.ice) {
    try {
      await pc.addIceCandidate(new RTCIceCandidate(data.ice));
    } catch (e) {
      console.error("Error agregando ICE:", e);
    }
  }

  if (data.type === 'broadcast_message' && data.message?.type === 'prediccion') {
    const p = data.message;
    console.log(`📩 Predicción remota: acción=${p.accion} | confianza=${p.confianza} | ts=${p.timestamp}`);
    
    //translationText.textContent = `👥 Remoto: ${p.accion} (${p.confianza})`;
  }

};