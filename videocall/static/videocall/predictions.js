const actions = ["hello", "thanks", "iloveyou"];
let sequence = [];
let sentence = [];
let predictions = [];
const threshold = 0.7;

let model = null;
let holistic = null;
let isProcessingEnabled = false;
let processingInterval = null;

// Variables for resource management
let currentTensorSequence = null;
let currentPrediction = null;
let isProcessing = false;

const icon_translate = document.getElementById("icon_translate");

const STABLE_N = 3;
const STABLE_RATIO = 0.6;

let answerApplied = false;

async function initializeAI() {
  try {
    console.log("Cargando modelo...");

    // Clean previous model
    if (model) {
      model.dispose();
      model = null;
    }

    model = await tf.loadLayersModel("/static/modelo/model.json");
    console.log("Modelo cargado");

    // Clean previous MediaPipe instance
    if (holistic) {
      holistic.close();
      holistic = null;
    }

    const HOLISTIC_BASE = "/static/holistic";

    holistic = new Holistic({
      locateFile: (file) => `${HOLISTIC_BASE}/${file}`,
    });

    holistic.setOptions({
      modelComplexity: 1,
      smoothLandmarks: true,
      enableSegmentation: false,
      smoothSegmentation: false,
      refineFaceLandmarks: false,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    holistic.onResults(onResults);
    console.log("MediaPipe inicializado");
    
  } catch (error) {
    console.error("Error cargando IA:", error);
    cleanupTensors();
  }
}

function extractKeypoints(results) {
  let pose = new Array(33 * 4).fill(0);
  if (results.poseLandmarks) {
    pose = results.poseLandmarks.map((res) => [res.x, res.y, res.z, res.visibility]).flat();
  }

  let face = new Array(468 * 3).fill(0);
  if (results.faceLandmarks) {
    face = results.faceLandmarks.map((res) => [res.x, res.y, res.z]).flat();
  }

  let lh = new Array(21 * 3).fill(0);
  if (results.leftHandLandmarks) {
    lh = results.leftHandLandmarks.map((res) => [res.x, res.y, res.z]).flat();
  }

  let rh = new Array(21 * 3).fill(0);
  if (results.rightHandLandmarks) {
    rh = results.rightHandLandmarks.map((res) => [res.x, res.y, res.z]).flat();
  }

  return [...pose, ...face, ...lh, ...rh];
}

async function onResults(results) {
  if (!isProcessingEnabled || !model || isProcessing) return;

  isProcessing = true;

  try {
    const keypoints = extractKeypoints(results);
    sequence.push(keypoints);
    if (sequence.length > 30) sequence.shift();

    if (sequence.length === 30) {
      // Clean previous tensors before creating new ones
      cleanupTensors();

      currentTensorSequence = tf.tensor([sequence]);
      currentPrediction = await model.predict(currentTensorSequence);
      const res = await currentPrediction.data();

      const maxIndex = res.indexOf(Math.max(...res));
      const confidence = Math.max(...res);

      predictions.push(maxIndex);

      const lastN = predictions.slice(-STABLE_N);
      const countSame = lastN.filter((i) => i === maxIndex).length;
      const isStable = countSame / STABLE_N >= STABLE_RATIO;

      if (isStable && confidence > threshold) {
        sendWS("prediccion", {
          accion: actions[maxIndex],
          confianza: Number(confidence.toFixed(3)),
          timestamp: new Date().toISOString(),
        });

        if (sentence.length > 0) {
          if (actions[maxIndex] !== sentence[sentence.length - 1]) {
            sentence.push(actions[maxIndex]);
          }
        } else {
          sentence.push(actions[maxIndex]);
        }
      }

      if (sentence.length > 5) {
        sentence = sentence.slice(-5);
      }

      if (sentence.length > 0) {
        const translation = sentence.join(" ");
        console.log("Traducción:", translation);
      }

      // Clean tensors immediately after use
      cleanupTensors();
    }
  } catch (error) {
    console.error("Error en predicción:", error);
    cleanupTensors();
  } finally {
    isProcessing = false;
  }
}

function cleanupTensors() {
  if (currentTensorSequence) {
    currentTensorSequence.dispose();
    currentTensorSequence = null;
  }
  if (currentPrediction) {
    currentPrediction.dispose();
    currentPrediction = null;
  }
}

function toggleProcessing() {
  if (!model || !holistic) {
    console.warn("IA no está lista");
    return;
  }

  if (!isProcessingEnabled) {
    isProcessingEnabled = true;
    icon_translate.textContent = "stop";
    toggleBtn.style.background = "#f44336";

    // Clean tensors before starting
    cleanupTensors();
    
    processingInterval = setInterval(() => {
      if (localVideo.videoWidth > 0 && !isProcessing) {
        try {
          holistic.send({ image: localVideo });
        } catch (error) {
          console.error("Error enviando imagen a MediaPipe:", error);
          // Reinitialize on error
          setTimeout(() => {
            if (holistic) holistic.close();
            initializeAI();
          }, 1000);
        }
      }
    }, 100);

    console.log("Procesamiento INICIADO");
  } else {
    isProcessingEnabled = false;
    icon_translate.textContent = "translate";
    toggleBtn.style.background = "#4CAF50";

    if (processingInterval) {
      clearInterval(processingInterval);
      processingInterval = null;
    }

    // Clean tensors when stopping
    setTimeout(cleanupTensors, 100);

    console.log("Procesamiento DETENIDO");
  }
}

function clearTranslation() {
  sentence = [];
  predictions = [];
  sequence = [];
  // Clean tensors on clear
  cleanupTensors();
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
  cleanupTensors();
  if (holistic) {
    holistic.close();
  }
  if (model) {
    model.dispose();
  }
});