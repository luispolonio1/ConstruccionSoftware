// Array con las palabras que corresponden a cada índice
const classes = [
    "Adios", "Amigo", "Amor", "Antes", "Aqui", "Ayuda", "Beber", "Bien", "Caminar",
    "Casa", "Chica", "Chico", "Cinco", "Comer", "Como", "ComoEstas", "Con", "Cuando",
    "Cuatro", "Cuidate", "DeNuevo", "Despertar", "Despues", "Dia", "Domingo",
    "Donde", "Dormir", "Dos", "El", "Enojado", "Entiendo", "Escribir", "Escuchar",
    "Escuela", "Eso", "Familia", "Gracias", "Gustar", "Hablar", "Hola", "Hoy",
    "Increible", "Ir", "Jueves", "Leer", "Listo", "Llorar", "LoSiento", "Lunes",
    "Mal", "Mama", "Manana", "Martes", "Mes", "Miercoles", "Mio", "Nada", "Necesitar",
    "No", "Noche", "Nombre", "Nosotros", "Nueve", "Ocho", "Ok", "Olvidar", "Papa",
    "Pensar", "PorFavor", "Porque", "Pregunta", "Que", "Quien", "Sabado", "Saber",
    "Seis", "Si", "Siete", "Tardes", "TeAmo", "Tiempo", "Tienda", "Trabajar", "Tres",
    "Triste", "Tu", "Tuyo", "UnGusto", "Uno", "Ver", "Viernes", "Yo", "abrir", "parar",
    "tener", "venir"
];

let sentence = [];
let currentPrediction = null;
let predictionCount = 0;
const MIN_REPETITIONS = 3; // Mínimo de repeticiones para considerar válida
const MAX_SENTENCE_LENGTH = 10;

let isProcessingEnabled = false;
let processingInterval = null;
let isProcessing = false;

let model = null;

let hands = null;

const icon_translate = document.getElementById("icon_translate");

// Preparar el WebGL
function warmUpGPU() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;

    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) return;

    // Initialize shaders and buffers to warm up the GPU pipeline
    const vertexShader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vertexShader, `
        attribute vec2 position;
        void main() {
            gl_Position = vec4(position, 0.0, 1.0);
        }
    `);
    gl.compileShader(vertexShader);

    const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fragmentShader, `
        precision mediump float;
        void main() {
            gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
        }
    `);
    gl.compileShader(fragmentShader);

    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    // Create and use buffer
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
        -1, -1, 1, -1, -1, 1, 1, 1
    ]), gl.STATIC_DRAW);

    gl.useProgram(program);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

    // Execute multiple render calls to fully warm up
    for (let i = 0; i < 3; i++) {
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }

    // Clean up resources
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);
    gl.deleteProgram(program);
    gl.deleteBuffer(buffer);
}

async function initializeAI() {
    try {
        console.log("Inicializando modelo scikit-learn...");

        // Wait on first load to let drivers initialize
        if (!sessionStorage.getItem('mediapipe_warmed')) {
            console.log("Primera carga - inicializando GPU...");
            warmUpGPU();
            await new Promise(resolve => setTimeout(resolve, 1500));
            sessionStorage.setItem('mediapipe_warmed', 'true');
        }

        if (typeof Hands === 'undefined') {
            throw new Error("MediaPipe Hands no está cargado. Asegúrate de incluir los scripts de MediaPipe antes de este archivo.");
        }

        if (typeof score !== 'function') {
            throw new Error("La función score del modelo no está disponible. Asegúrate de incluir model.js");
        }

        model = { loaded: true };
        console.log("Modelo scikit-learn listo");

        if (hands) {
            console.log("Cerrando sesión previa de MediaPipe...");
            hands.close();
            hands = null;
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        hands = new Hands({
            locateFile: (file) => `/static/js/hands/${file}`,
        });

        hands.setOptions({
            maxNumHands: 2,
            modelComplexity: 1,
            minDetectionConfidence: 0.3,
            minTrackingConfidence: 0.5,
        });

        hands.onResults(onResults);
        console.log("MediaPipe Hands inicializado");

    } catch (error) {
        console.error("Error cargando IA:", error);
    }
}

async function onResults(results) {
    if (!isProcessingEnabled || !model || isProcessing) return;

    isProcessing = true;

    try {
        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
            let data_aux = [];

            // Inicializar variables para ambas manos
            let left_hand_landmarks = null;
            let right_hand_landmarks = null;

            for (let idx = 0; idx < results.multiHandLandmarks.length; idx++) {
                let hand_landmarks = results.multiHandLandmarks[idx];

                if (results.multiHandedness && results.multiHandedness[idx]) {
                    let handedness = results.multiHandedness[idx];
                    let hand_label = handedness.label;

                    if (hand_label === 'Left') {
                        left_hand_landmarks = hand_landmarks;
                    } else if (hand_label === 'Right') {
                        right_hand_landmarks = hand_landmarks;
                    }
                }
            }

            let hands_to_process = [
                { name: "Right", landmarks: right_hand_landmarks },
                { name: "Left", landmarks: left_hand_landmarks }
            ];

            for (let hand_info of hands_to_process) {
                let hand_landmarks = hand_info.landmarks;

                if (hand_landmarks !== null && hand_landmarks.length === 21) {
                    let x_coords = [];
                    let y_coords = [];

                    for (let i = 0; i < 21; i++) {
                        let landmark = hand_landmarks[i];
                        x_coords.push(landmark.x);
                        y_coords.push(landmark.y);
                    }

                    let min_x = Math.min(...x_coords);
                    let min_y = Math.min(...y_coords);

                    for (let i = 0; i < 21; i++) {
                        data_aux.push(x_coords[i] - min_x);
                        data_aux.push(y_coords[i] - min_y);
                    }
                } else {
                    for (let i = 0; i < 42; i++) {
                        data_aux.push(0.0);
                    }
                }
            }

            // Solo hacer predicción si tenemos exactamente 84 valores
            //console.log(data_aux.length)
            if (data_aux.length === 84) {
                const probabilities = score(data_aux);

                const maxIndex = probabilities.indexOf(Math.max(...probabilities));
                const confidence = probabilities[maxIndex];

                const predicted_character = classes[maxIndex];

                if (confidence > 0.30) {
                    if (predicted_character === currentPrediction) {
                        predictionCount++;
                    } else {
                        currentPrediction = predicted_character;
                        predictionCount = 1;
                    }
                    if (predictionCount >= MIN_REPETITIONS) {
                        if (sentence.length === 0 || sentence[sentence.length - 1] !== predicted_character) {
                            sentence.push(predicted_character);
                            if (sentence.length > MAX_SENTENCE_LENGTH) {
                                sentence.shift();
                            }

                            if ('speechSynthesis' in window) {
                                window.speechSynthesis.cancel();

                                const utterance = new SpeechSynthesisUtterance(predicted_character);
                                utterance.lang = 'es-ES';
                                utterance.rate = 2.0;
                                utterance.pitch = 1.0;
                                utterance.volume = 1.0;
                                window.speechSynthesis.speak(utterance);
                            } else {
                                console.warn('TTS no soportado en este navegador');
                            }

                            sendWS("prediccion", {
                                accion: predicted_character,
                                confianza: Number(confidence.toFixed(3))
                            });

                        }

                        predictionCount = 0;
                        currentPrediction = null;
                    }

                    console.clear();
                    const translation = sentence.join(" ");
                    console.log(`Oración: ${translation || "vacía"}`);

                }
            }
        } else {
            console.log("No se detectaron manos");
        }

    } catch (error) {
        console.error("Error en predicción:", error);
    } finally {
        isProcessing = false;
    }
}

function toggleProcessing() {
    if (!model || !hands) {
        console.warn("IA no está lista");
        return;
    }

    if (!isProcessingEnabled) {
        isProcessingEnabled = true;
        toggleBtn.textContent = "stop";
        icon_translate.style.background = "#f44336";

        processingInterval = setInterval(() => {
            if (localVideo.videoWidth > 0 && !isProcessing) {
                try {
                    hands.send({ image: localVideo });
                } catch (error) {
                    console.error("Error enviando imagen a MediaPipe:", error);
                    // Reinitialize on error
                    setTimeout(() => {
                        if (hands) hands.close();
                        initializeAI();
                    }, 1000);
                }
            }
        }, 100);

        console.log("Procesamiento INICIADO");
    } else {
        isProcessingEnabled = false;
        toggleBtn.textContent = "translate";
        icon_translate.style.background = "#4CAF50";

        if (processingInterval) {
            clearInterval(processingInterval);
            processingInterval = null;
        }

        console.log("Procesamiento DETENIDO");
    }
}

function clearTranslation() {
    sentence = [];
    console.log("Traducción limpiada");
}

function sendWS(type, payload) {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type, ...payload }));
    } else {
        console.warn("WS no está listo para enviar:", type, payload);
    }
}

// Clean resources on page unload
window.addEventListener('beforeunload', () => {
    if (isProcessingEnabled) {
        toggleProcessing();
    }
    if (hands) {
        hands.close();
    }
    // Limpiar sessionStorage para forzar warm-up en próxima carga
    sessionStorage.removeItem('mediapipe_warmed');
});