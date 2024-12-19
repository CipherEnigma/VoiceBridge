// DOM Elements
const textInput = document.querySelector("#text-input");
const ttsLang = document.querySelector("#tts-lang");
const speakBtn = document.querySelector("#speak-btn");
const recordBtn = document.querySelector("#record-btn");
const sttOutputLang = document.querySelector("#stt-output-lang");
const video = document.querySelector("#video");
const gestureResult = document.querySelector("#gesture-result");

// Sign Language Gesture Mapping
const gestureToText = {
    'OPEN_PALM': 'hello',
    'CLOSED_FIST': 'goodbye',
    'THUMB_UP': 'yes',
    'THUMB_DOWN': 'no',
    'PEACE': 'peace',
    'POINTING_UP': 'I',
    'L_SHAPE': 'L',
    'OK_SIGN': 'OK'
};

// Initialize Speech Recognition
let recognition = null;
let isRecording = false;
let currentTranscript = '';

if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
    recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
} else {
    console.error('Speech recognition not supported');
    if (recordBtn) recordBtn.disabled = true;
}

// Create text areas for real-time display
const createTextAreas = () => {
    const sttContainer = document.querySelector('#speech-to-text');
    
    if (!document.querySelector('#original-text-area')) {
        const originalTextArea = document.createElement('textarea');
        originalTextArea.id = 'original-text-area';
        originalTextArea.className = 'form-control mt-3';
        originalTextArea.placeholder = 'Original speech will appear here...';
        originalTextArea.readOnly = true;
        sttContainer.insertBefore(originalTextArea, document.querySelector('#translated-transcript'));
    }
    
    if (!document.querySelector('#translated-text-area')) {
        const translatedTextArea = document.createElement('textarea');
        translatedTextArea.id = 'translated-text-area';
        translatedTextArea.className = 'form-control mt-3';
        translatedTextArea.placeholder = 'Translation will appear here...';
        translatedTextArea.readOnly = true;
        sttContainer.insertBefore(translatedTextArea, document.querySelector('#translated-transcript'));
    }
};

// Create output elements for sign language
function createSignLanguageOutputs() {
    const signContainer = document.querySelector('#sign-language');
    
    if (!document.querySelector('#sign-text-output')) {
        const textOutput = document.createElement('textarea');
        textOutput.id = 'sign-text-output';
        textOutput.className = 'form-control mt-3';
        textOutput.placeholder = 'Detected signs will appear here...';
        textOutput.readOnly = true;
        signContainer.appendChild(textOutput);
    }
    
    if (!document.querySelector('#sign-translated-output')) {
        const translatedOutput = document.createElement('textarea');
        translatedOutput.id = 'sign-translated-output';
        translatedOutput.className = 'form-control mt-3';
        translatedOutput.placeholder = 'Translation will appear here...';
        translatedOutput.readOnly = true;
        signContainer.appendChild(translatedOutput);
    }
}

// Populate language dropdowns
function populateLanguageDropdowns() {
    [ttsLang, sttOutputLang].forEach(select => {
        for (let lang in langCodes) {
            const option = document.createElement("option");
            option.value = langCodes[lang];
            option.textContent = lang;
            select.appendChild(option);
            
            if (lang === 'English') {
                option.selected = true;
            }
        }
    });
}

// Debounce function for translation
const debounce = (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
};

// Translation function
async function translateText(text, targetLang) {
    try {
        const URL = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|${targetLang}`;
        const response = await fetch(URL);
        
        if (!response.ok) {
            throw new Error('Translation failed');
        }
        
        const data = await response.json();
        return data.responseData.translatedText;
    } catch (error) {
        console.error('Translation error:', error);
        throw error;
    }
}

// Translation and Text to Speech functionality
async function translateAndSpeak() {
    const text = textInput.value.trim();
    if (!text) {
        alert('Please enter some text to translate and speak');
        return;
    }

    try {
        const translatedText = await translateText(text, ttsLang.value);
        
        const utterance = new SpeechSynthesisUtterance(translatedText);
        utterance.lang = ttsLang.value;
        utterance.rate = 1.0;
        utterance.pitch = 1.0;

        window.speechSynthesis.cancel();

        utterance.onerror = (event) => {
            console.error('TTS Error:', event);
            alert('Error occurred while speaking');
        };

        window.speechSynthesis.speak(utterance);
    } catch (error) {
        console.error('Translation or speech error:', error);
        alert('Error occurred during translation or speech');
    }
}

// Speech Recognition Event Handlers
if (recognition) {
    recognition.onstart = () => {
        isRecording = true;
        recordBtn.textContent = "Stop Recording";
        recordBtn.classList.replace("btn-primary", "btn-danger");
        
        document.querySelector('#original-text-area').value = '';
        document.querySelector('#translated-text-area').value = '';
        currentTranscript = '';
    };

    recognition.onresult = debounce(async (event) => {
        const originalTextArea = document.querySelector('#original-text-area');
        const translatedTextArea = document.querySelector('#translated-text-area');
        
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
                finalTranscript += transcript;
            } else {
                interimTranscript += transcript;
            }
        }

        currentTranscript = finalTranscript || interimTranscript;
        originalTextArea.value = currentTranscript;

        if (currentTranscript.trim()) {
            try {
                const targetLang = sttOutputLang.value;
                const translatedText = await translateText(currentTranscript, targetLang);
                translatedTextArea.value = translatedText;
            } catch (error) {
                console.error('Translation error:', error);
                translatedTextArea.value = 'Translation error occurred...';
            }
        }
    }, 500);

    recognition.onend = () => {
        isRecording = false;
        recordBtn.textContent = "Start Recording";
        recordBtn.classList.replace("btn-danger", "btn-primary");
    };

    recognition.onerror = (event) => {
        console.error('Recognition error:', event.error);
        isRecording = false;
        recordBtn.textContent = "Start Recording";
        recordBtn.classList.replace("btn-danger", "btn-primary");
    };

    recordBtn.addEventListener("click", () => {
        if (!isRecording) {
            recognition.lang = 'en-US';
            try {
                recognition.start();
            } catch (error) {
                console.error('Recognition start error:', error);
            }
        } else {
            try {
                recognition.stop();
            } catch (error) {
                console.error('Recognition stop error:', error);
            }
        }
    });
}

// Sign Language Detection
async function setupCamera() {
    try {
        const constraints = {
            video: {
                width: 640,
                height: 480,
                frameRate: { ideal: 30 },
                facingMode: 'user'
            }
        };
        
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        video.srcObject = stream;
        
        return new Promise((resolve) => {
            video.onloadedmetadata = () => {
                video.play();
                resolve(video);
            };
        });
    } catch (error) {
        console.error('Camera setup error:', error);
        if (error.name === 'NotAllowedError') {
            gestureResult.textContent = 'Error: Camera access denied. Please allow camera access and refresh the page.';
        } else if (error.name === 'NotFoundError') {
            gestureResult.textContent = 'Error: No camera found. Please connect a camera and refresh the page.';
        } else {
            gestureResult.textContent = 'Error: Camera setup failed. Please check your camera and refresh the page.';
        }
        throw error;
    }
}



function interpretGesture(landmarks) {
    const palmBase = landmarks[0];
    const thumbTip = landmarks[4];
    const indexTip = landmarks[8];
    const middleTip = landmarks[12];
    const ringTip = landmarks[16];
    const pinkyTip = landmarks[20];
    
    
    const fingerHeights = [
        thumbTip[1] - palmBase[1],
        indexTip[1] - palmBase[1],
        middleTip[1] - palmBase[1],
        ringTip[1] - palmBase[1],
        pinkyTip[1] - palmBase[1]
    ];
   // Calculate horizontal distances between fingers
   const fingerSpread = Math.abs(indexTip[0] - middleTip[0]);
   const thumbSpread = Math.abs(thumbTip[0] - indexTip[0]);
   
   
   const palmAngle = Math.atan2(
       landmarks[5][1] - landmarks[17][1],
       landmarks[5][0] - landmarks[17][0]
   ) * 180 / Math.PI;
   
   
   // CLOSED_FIST detection
   if (fingerHeights.every(height => height > -20) && Math.abs(palmAngle) < 45) {
       return 'CLOSED_FIST';
   }
   
   // OPEN_PALM detection
   if (fingerHeights.every(height => height < -30) && Math.abs(palmAngle) < 45) {
       return 'OPEN_PALM';
   }
   
   // THUMB_UP and THUMB_DOWN detection with improved angle check
   if (thumbSpread > 40 && fingerHeights.slice(1).every(height => height > -20)) {
    if (thumbTip[1] < palmBase[1] - 30 && Math.abs(palmAngle) < 30) {
        return 'THUMB_UP';
    }
    if (thumbTip[1] > palmBase[1] + 30 && Math.abs(palmAngle) < 30) {
        return 'THUMB_DOWN';
    }
}
   
   // PEACE sign detection with finger spread check
   if (fingerSpread > 20 && fingerHeights[1] < -30 && fingerHeights[2] < -30 && fingerHeights[3] > -20 && fingerHeights[4] > -20) {
    return 'PEACE';
}
   
   // POINTING_UP detection with stricter angle requirements
   if (fingerHeights[1] < -40 && 
       fingerHeights.slice(2).every(height => height > -20) && 
       Math.abs(palmAngle) < 30) {
       return 'POINTING_UP';
   }
   
   // L_SHAPE detection
   if (fingerHeights[1] < -30 && thumbSpread > 40 &&
       fingerHeights.slice(2).every(height => height > -20)) {
       return 'L_SHAPE';
   }
   
   // OK_SIGN detection (thumb and index finger form a circle)
   if (thumbSpread < 20 && fingerSpread < 20 && fingerHeights[1] < -30 && fingerHeights[2] < -30 && fingerHeights[3] < -30 && fingerHeights[4] < -30) {
    return 'OK_SIGN';
}
   
   return 'UNKNOWN';
}
  


async function detectGestures(model, video) {
    const textOutput = document.querySelector('#sign-text-output');
    const translatedOutput = document.querySelector('#sign-translated-output');
    let lastGesture = '';
    let gestureCount = 0;
    const gestureThreshold = 5; 
    let lastProcessedTime = 0;
    const processInterval = 100; // Process every 100ms
    
    try {
        const currentTime = Date.now();
        if (currentTime - lastProcessedTime < processInterval) {
            return;
        }
        lastProcessedTime = currentTime;

        const predictions = await model.estimateHands(video);
        if (predictions.length > 0) {
            const landmarks = predictions[0].landmarks;
            const gesture = interpretGesture(landmarks);
            const confidence = predictions[0].handInViewConfidence;
            
            
            gestureResult.textContent = `Gesture Detected: ${gesture} (Confidence: ${(confidence * 100).toFixed(1)}%)`;
            
            // Process gesture only if confidence is high enough
            if (gesture === lastGesture && confidence > 0.7) {
                gestureCount++;
            } else {
                gestureCount = 0;
            }
            
            if (gestureCount === gestureThreshold && gesture in gestureToText) {
                const text = gestureToText[gesture];
                
                if (textOutput.value !== text) {
                    textOutput.value = text;
                    
                    try {
                        const targetLang = sttOutputLang.value;
                        const translatedText = await translateText(text, targetLang);
                        translatedOutput.value = translatedText;
                        
                        // Speak the translated text
                        const utterance = new SpeechSynthesisUtterance(translatedText);
                        utterance.lang = targetLang;
                        window.speechSynthesis.speak(utterance);
                    } catch (error) {
                        console.error('Translation error:', error);
                    }
                }
            }
            
            lastGesture = gesture;
        } else {
            gestureResult.textContent = 'No hand detected';
            gestureCount = 0;
        }
    } catch (error) {
        console.error('Gesture detection error:', error);
    }
}

async function initializeHandDetection() {
    try {
       
        await setupCamera();
        
       
        const model = await handpose.load();
        console.log('Handpose model loaded');
        
       
        setInterval(() => {
            detectGestures(model, video);
        }, 100); 
        
    } catch (error) {
        console.error('Handpose initialization error:', error);
        gestureResult.textContent = 'Error: Could not initialize hand detection';
    }
}



speakBtn.addEventListener("click", translateAndSpeak);

document.addEventListener('DOMContentLoaded', () => {
    createTextAreas();
    populateLanguageDropdowns();
    
    initializeHandDetection().catch(error => {
        console.error('Failed to initialize hand detection:', error);
        gestureResult.textContent = 'Error: Hand detection initialization failed';
    });
    
    const setLoading = (loading) => {
        speakBtn.disabled = loading;
        recordBtn.disabled = loading;
        if (loading) {
            speakBtn.textContent = 'Processing...';
        } else {
            speakBtn.textContent = 'Speak';
            recordBtn.textContent = 'Start Recording';
        }
    };
    
    window.onerror = function(msg, url, lineNo, columnNo, error) {
        console.error('Global error:', error);
        alert('An error occurred. Please refresh the page and try again.');
        return false;
    };
});