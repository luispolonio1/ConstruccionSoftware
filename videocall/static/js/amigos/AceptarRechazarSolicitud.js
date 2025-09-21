async function gestionarSolicitud(id, accion) {
    const url = accion === "aceptar" 
        ? `/aceptar_solicitud/${id}/` 
        : `/rechazar_solicitud/${id}/`;

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "X-CSRFToken": getCookie("csrftoken"),  // ⚠️ necesario en Django
                "X-Requested-With": "XMLHttpRequest"
            }
        });

        const data = await response.json();

        if (response.ok) {
            swal.fire({
                icon: 'success',
                title: data.message,
                timer: 1500,
                showConfirmButton: false
            });
            // Eliminar del DOM la solicitud procesada
            document.getElementById(`solicitud-${id}`).remove();
        } else {
            swal.fire({
                icon: 'error',
                title: 'Error',
                text: data.error || 'No se pudo procesar la solicitud.',
            });  
        }
    } catch (e) {
        swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Ocurrió un error inesperado.',
        });
    }
}

// helper para CSRF
function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}