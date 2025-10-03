const notifySocket = new WebSocket(
  (window.location.protocol === "https:" ? "wss://" : "ws://") +
  window.location.host + "/ws/notify/"
);

//Cuando recibes una solicitud de llamada
notifySocket.onmessage = function(e) {
  const data = JSON.parse(e.data);

  if (data.type === "incoming_call") {
    const ringtone = new Audio("/static/audio/Tono.mp3");
    ringtone.loop = true;
    ringtone.play();

    Swal.fire({
      title: "📞 Llamada entrante",
      text: `${data.from} quiere hablar contigo`,
      icon: "info",
      showCancelButton: true,
      confirmButtonText: "Aceptar",
      cancelButtonText: "Rechazar",
      allowOutsideClick: false,
      didClose: () => {
        ringtone.pause();
        ringtone.currentTime = 0;
      }
    }).then((result) => {
      ringtone.pause();
      ringtone.currentTime = 0;
      if (result.isConfirmed) {
        notifySocket.send(JSON.stringify({
          type: "call_accepted",
          room_name: data.room_name,
          from: data.from
        }));
        // redirigir a la sala
        window.location.href = `/Inicio/room/${data.room_name}/`;
      } else {
        notifySocket.send(JSON.stringify({
          type: "call_rejected",
          room_name: data.room_name,
          from: data.from
        }));
      }
    });
  }

  if (data.type === "call_accepted") {
    Swal.fire({
      title: "✅ Llamada aceptada",
      text: `${data.from} aceptó tu llamada`,
      icon: "success",
      timer: 2000,
      showConfirmButton: false
    });
    // entrar al room
    window.location.href = `/Inicio/room/${data.room_name}/`;
  }

  if (data.type === "call_rejected") {
    Swal.fire({
      title: "❌ Llamada rechazada",
      text: `${data.from} rechazó tu llamada`,
      icon: "error",
      timer: 2000,
      showConfirmButton: false
    });
  }

  if (data.type === 'nueva_solicitud') {
    agregarNuevaSolicitud(data.solicitud);
  }
  
  // agrgegar nuevo amogi a la lista
  if (data.type === 'nuevo_amigo') {
    console.log('Nuevo amigo agregado:', data.amigo);
    agregarNuevoAmigo(data.amigo);
  }
};



// 🚀 Función para solicitar llamada
window.solicitarLlamada = function(roomName) {
  notifySocket.send(JSON.stringify({
    type: "call_request",
    room_name: roomName
  }));
};



function agregarNuevaSolicitud(solicitud) {
    const container = document.getElementById('Solicitudes');
    
    const emptyMsg = container.querySelector('.text-gray-400');
    if (emptyMsg) emptyMsg.remove();
    
    const div = document.createElement('div');
    div.id = `solicitud-${solicitud.id}`;
    div.className = 'bg-secondary-transparent border-minimal rounded p-3 flex items-center justify-between';
    div.innerHTML = `
        <div class="flex items-center gap-3">
            <div>
                <p class="font-medium text-white">${solicitud.from_user_username}</p>
            </div>
        </div>
        <div class="flex gap-2">
            <button onclick="gestionarSolicitud(${solicitud.id}, 'aceptar')" 
                    class="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded">
                Aceptar
            </button>
            <button onclick="gestionarSolicitud(${solicitud.id}, 'rechazar')" 
                    class="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded">
                Rechazar
            </button>
        </div>
    `;

    container.insertBefore(div, container.firstChild);
}


function agregarNuevoAmigo(amigo) {
    const container = document.querySelector('.flex-1.overflow-y-auto.p-4.space-y-3.max-h-\\[400px\\]');
    
    const div = document.createElement('div');
    div.className = 'bg-secondary-transparent border-minimal rounded p-3';
    div.innerHTML = `
        <div class="flex items-center gap-3">
            <div class="relative">
                <div class="w-10 h-10 bg-secondary rounded-full flex items-center justify-center text-white font-medium text-sm">
                    ${amigo.username.charAt(0).toUpperCase()}
                </div>
                <div class="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 border-2 border-black rounded-full"></div>
            </div>
            <div class="flex-1 min-w-0">
                <div class="flex items-center justify-between bg-secondary-transparent rounded px-4 py-2 shadow-lg">
                    <span class="text-white font-medium">${amigo.username}</span>
                    <button onclick="solicitarLlamada('${amigo.username}_')" 
                            class="bg-green-500 hover:bg-green-600 text-white p-2 rounded-full transition-colors duration-200 flex items-center justify-center">
                        <i class="material-icons">phone_in_talk</i>
                    </button>
                </div>
            </div>
        </div>
    `;
    
    // Insertar después del título (segundo elemento)
    const titulo = container.querySelector('h2');
    if (titulo && titulo.nextSibling) {
        container.insertBefore(div, titulo.nextSibling);
    } else {
        container.appendChild(div);
    }
}