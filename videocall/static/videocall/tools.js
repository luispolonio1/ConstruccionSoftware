 /* -------------------------------------------------------------------------- loque me dio claude*/
const muteBtn = document.getElementById('muteBtn');
        const videoBtn = document.getElementById('videoBtn');
        const endBtn = document.getElementById('endBtn');
        const localVideo2 = document.getElementById('localVideo');
        const localPlaceholder = document.getElementById('localPlaceholder');
        const localMicIndicator = document.getElementById('localMicIndicator');

        // Estados
        let isMuted = false;
        let isVideoOff = false;

        // Control de micrófono
        muteBtn.addEventListener('click', () => {
            isMuted = !isMuted;
            
            // Cambiar apariencia del botón
            if (isMuted) {
                muteBtn.classList.add('bg-white/10', 'border-white/30', 'text-white');
                muteBtn.innerHTML = '🔇';
                localMicIndicator.classList.remove('animate-mic-pulse', 'bg-white/90');
                localMicIndicator.classList.add('bg-white/40');
            } else {
                muteBtn.classList.remove('bg-white/10', 'border-white/30', 'text-white');
                muteBtn.innerHTML = '🎤';
                localMicIndicator.classList.add('animate-mic-pulse', 'bg-white/90');
                localMicIndicator.classList.remove('bg-white/40');
            }
        });

        // Control de video
        videoBtn.addEventListener('click', () => {
            isVideoOff = !isVideoOff;
            
            // Cambiar apariencia del botón
            if (isVideoOff) {
                videoBtn.classList.add('bg-white/10', 'border-white/30', 'text-white');
                videoBtn.innerHTML = '📷';
                localVideo2.classList.add('hidden');
                localPlaceholder.classList.remove('hidden');
            } else {
                videoBtn.classList.remove('bg-white/10', 'border-white/30', 'text-white');
                videoBtn.innerHTML = '📹';
                localVideo2.classList.remove('hidden');
                localPlaceholder.classList.add('hidden');
            }
        });

        // Finalizar llamada
        endBtn.addEventListener('click', () => {
            if (confirm('¿Estás seguro de que quieres finalizar la llamada?')) {
                document.body.style.opacity = '0.5';
                setTimeout(() => {
                    alert('Llamada finalizada');
                    document.body.style.opacity = '1';
                }, 300);
            }
        });

        // Simulación de actividad de habla
        setInterval(() => {
            const remoteVideoWrapper = document.querySelector('[id="remoteVideo"]').parentElement;
            if (Math.random() > 0.8) {
                remoteVideoWrapper.classList.add('ring-2', 'ring-white/25', 'ring-offset-2', 'ring-offset-black');
                setTimeout(() => {
                    remoteVideoWrapper.classList.remove('ring-2', 'ring-white/25', 'ring-offset-2', 'ring-offset-black');
                }, 1500);
            }
        }, 3000);

        // Simulación de calidad de conexión
        setInterval(() => {
            const qualityBars = document.querySelectorAll('.w-0\\.5');
            const activeCount = Math.floor(Math.random() * 4) + 1;
            
            qualityBars.forEach((bar, index) => {
                if (index < activeCount) {
                    bar.classList.remove('bg-white/30');
                    bar.classList.add('bg-white/80');
                } else {
                    bar.classList.add('bg-white/30');
                    bar.classList.remove('bg-white/80');
                }
            });
        }, 8000);

        // Efectos mejorados de hover
        document.querySelectorAll('button').forEach(btn => {
            btn.addEventListener('mouseenter', () => {
                btn.style.transform = 'translateY(-3px)';
            });
            
            btn.addEventListener('mouseleave', () => {
                btn.style.transform = 'translateY(0)';
            });
        });
    // Toggle para sidebar en móviles
    document.getElementById('sidebarToggle').addEventListener('click', function() {
      const sidebar = document.getElementById('sidebar');
      sidebar.classList.toggle('hidden');
      sidebar.classList.toggle('flex');
      sidebar.classList.toggle('absolute');
      sidebar.classList.toggle('z-50');
      sidebar.classList.toggle('h-full');
    });