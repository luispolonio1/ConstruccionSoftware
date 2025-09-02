const roomName = "{{ room_name }}";

    // Detectar protocolo (http -> ws, https -> wss)
    let protocol = window.location.protocol === "https:" ? "wss://" : "ws://";
    const ws = new WebSocket(protocol + window.location.host + "/ws/call/" + roomName + "/");

    let localStream;
    let pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
    });

    const localVideo = document.getElementById("localVideo");
    const remoteVideo = document.getElementById("remoteVideo");

    let isCaller = false;
    let answerApplied = false;

    // Obtener cámara y micrófono
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then(stream => {
        localVideo.srcObject = stream;
        localStream = stream;

        console.log("Cámara/micrófono OK, agregando tracks...");
        stream.getTracks().forEach(track => {
          console.log("Agregando track:", track.kind);
          pc.addTrack(track, stream);
        });

        // Compatibilidad extra
        if (pc.addStream) {
          console.log("Agregando stream completo con addStream (compatibilidad).");
          pc.addStream(stream);
        }
      })
      .catch(err => console.error("❌ Error al acceder a cámara/micrófono:", err));

    // Mostrar stream remoto
    pc.ontrack = event => {
      console.log("✅ Stream remoto recibido (ontrack):", event.streams);
      if (event.streams && event.streams[0]) {
        remoteVideo.srcObject = event.streams[0];
      } else {
        const inboundStream = new MediaStream();
        inboundStream.addTrack(event.track);
        remoteVideo.srcObject = inboundStream;
      }
    };

    // Compatibilidad con navegadores antiguos
    pc.onaddstream = event => {
      console.log("✅ Stream remoto recibido (onaddstream):", event.stream);
      remoteVideo.srcObject = event.stream;
    };

    // Estado de ICE
    pc.oniceconnectionstatechange = () => {
      console.log("📡 ICE state:", pc.iceConnectionState);
    };

    // Enviar ICE candidates al servidor
    pc.onicecandidate = event => {
      if (event.candidate) {
        console.log("➡️ Enviando ICE:", event.candidate);
        ws.send(JSON.stringify({ "ice": event.candidate }));
      }
    };

    // Función para crear la oferta
    async function makeCall() {
      const offer = await pc.createOffer();
      console.log("📨 Creando y enviando offer:", offer);
      await pc.setLocalDescription(offer);
      ws.send(JSON.stringify({ "offer": offer }));
    }

    // Manejo de mensajes desde WebSocket
    ws.onmessage = async (event) => {
      const data = JSON.parse(event.data);

      if (data.joined && !isCaller) {
        isCaller = true;
        console.log("🟢 Soy el que llama (caller)");
        makeCall();
      }

      if (data.offer) {
        console.log("📩 Recibí una offer:", data.offer);
        if (pc.signalingState === "stable") {
          await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
          const answer = await pc.createAnswer();
          console.log("📨 Enviando answer:", answer);
          await pc.setLocalDescription(answer);
          ws.send(JSON.stringify({ "answer": answer }));
        } else {
          console.warn("⚠️ Ignorando offer porque el estado es:", pc.signalingState);
        }
      } else if (data.answer) {
        console.log("📩 Recibí una answer:", data.answer);
        if (!answerApplied && pc.signalingState === "have-local-offer") {
          await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
          answerApplied = true;
          console.log("✅ Answer aplicada correctamente");
        } else {
          console.warn("⚠️ Ignorando answer extra porque el estado es:", pc.signalingState);
        }
      } else if (data.ice) {
        console.log("⬅️ Recibí ICE:", data.ice);
        try {
          await pc.addIceCandidate(new RTCIceCandidate(data.ice));
        } catch (e) {
          console.error("❌ Error agregando ICE:", e);
        }
      }
    };
 /* -------------------------------------------------------------------------- loque me dio claude*/
 // Funcionalidad básica para los controles
        const muteBtn = document.getElementById('muteBtn');
        const videoBtn = document.getElementById('videoBtn');
        const endBtn = document.getElementById('endBtn');
        const localVideoWrapper = document.getElementById('localVideoWrapper');

        let isMuted = false;
        let isVideoOff = false;

        muteBtn.addEventListener('click', () => {
            isMuted = !isMuted;
            muteBtn.classList.toggle('active', isMuted);
            muteBtn.innerHTML = isMuted ? '🔇' : '🎤';
            
            // Actualizar indicador de micrófono
            const micIndicator = document.querySelector('.video-wrapper.pip .mic-indicator');
            micIndicator.classList.toggle('muted', isMuted);
        });

        videoBtn.addEventListener('click', () => {
            isVideoOff = !isVideoOff;
            videoBtn.classList.toggle('active', isVideoOff);
            videoBtn.innerHTML = isVideoOff ? '📷' : '📹';
        });

        endBtn.addEventListener('click', () => {
            if (confirm('¿Estás seguro de que quieres finalizar la llamada?')) {
                alert('Llamada finalizada');
            }
        });

        // Hacer el video local arrastrable
        let isDragging = false;
        let startX, startY, startLeft, startTop;

        localVideoWrapper.addEventListener('mousedown', (e) => {
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            startLeft = parseInt(getComputedStyle(localVideoWrapper).right);
            startTop = parseInt(getComputedStyle(localVideoWrapper).bottom);
            localVideoWrapper.style.cursor = 'grabbing';
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            
            const deltaX = startX - e.clientX;
            const deltaY = e.clientY - startY;
            
            localVideoWrapper.style.right = `${startLeft + deltaX}px`;
            localVideoWrapper.style.bottom = `${startTop - deltaY}px`;
        });

        document.addEventListener('mouseup', () => {
            isDragging = false;
            localVideoWrapper.style.cursor = 'move';
        });

        // Simular actividad de habla (efecto visual)
        setInterval(() => {
            const remoteVideo = document.querySelector('.video-wrapper.main');
            if (Math.random() > 0.7) {
                remoteVideo.classList.add('speaking');
                setTimeout(() => {
                    remoteVideo.classList.remove('speaking');
                }, 2000);
            }
        }, 3000);

        // Simular cambios en la calidad de conexión
        setInterval(() => {
            const qualityBars = document.querySelectorAll('.quality-bar');
            const activeCount = Math.floor(Math.random() * 4) + 1;
            
            qualityBars.forEach((bar, index) => {
                bar.classList.toggle('active', index < activeCount);
            });
        }, 5000);