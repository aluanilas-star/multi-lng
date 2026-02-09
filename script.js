import { GestureRecognizer as HandEngine, FilesetResolver as ResourceLoader } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3";

let myAI;
let currentLang = 'ru';
let lastSpokenText = "";
let speechTimeout = false;

const videoElement = document.getElementById("userCamera");
const outputDisplay = document.getElementById("aiResult");
const container = document.getElementById("aiContainer");
const statusText = document.getElementById("systemStatus");

// Словари для трех языков
const dictionaries = {
    ru: {
        "Open_Palm": "Привет", "Closed_Fist": "Стоп", "Victory": "Мир",
        "Pointing_Up": "Внимание", "Thumb_Up": "Хорошо", "Thumb_Down": "Плохо",
        "ILoveYou": "Я тебя люблю"
    },
    en: {
        "Open_Palm": "Hello", "Closed_Fist": "Stop", "Victory": "Peace",
        "Pointing_Up": "Attention", "Thumb_Up": "Good", "Thumb_Down": "Bad",
        "ILoveYou": "I Love You"
    },
    kk: {
        "Open_Palm": "Сәлем", "Closed_Fist": "Тоқта", "Victory": "Бейбітшілік",
        "Pointing_Up": "Назар аударыңыз", "Thumb_Up": "Жақсы", "Thumb_Down": "Жаман",
        "ILoveYou": "Мен сені сүйемін"
    }
};

// Настройка озвучки
window.setLanguage = (lang) => {
    currentLang = lang;
    document.querySelectorAll('.controls button').forEach(b => b.classList.remove('active'));
    document.getElementById(`btn-${lang}`).classList.add('active');
    speak(lang === 'ru' ? "Русский язык" : lang === 'en' ? "English language" : "Қазақ тілі");
};

function speak(text) {
    if (!text || text === lastSpokenText || speechTimeout) return;
    
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Пытаемся подобрать голос под язык
    const voices = window.speechSynthesis.getVoices();
    if (currentLang === 'kk') {
        utterance.lang = 'kk-KZ'; // Может не поддерживаться на всех ОС
    } else if (currentLang === 'en') {
        utterance.lang = 'en-US';
    } else {
        utterance.lang = 'ru-RU';
    }

    utterance.rate = 1.0;
    window.speechSynthesis.speak(utterance);
    
    lastSpokenText = text;
    speechTimeout = true;
    
    // Задержка между словами, чтобы ИИ не частил
    setTimeout(() => { 
        speechTimeout = false; 
        lastSpokenText = ""; 
    }, 2000);
}

async function launchSystem() {
    try {
        const resources = await ResourceLoader.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm");
        myAI = await HandEngine.createFromOptions(resources, {
            baseOptions: {
                modelAssetPath: "https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/latest/gesture_recognizer.task",
                delegate: "GPU"
            },
            runningMode: "VIDEO",
            numHands: 2, // Распознаем две руки
            minHandDetectionConfidence: 0.6,
            minHandPresenceConfidence: 0.6,
            minTrackingConfidence: 0.6
        });
        startStreaming();
    } catch (error) {
        statusText.innerText = "ОШИБКА: Не удалось загрузить модель";
        console.error(error);
    }
}

function startStreaming() {
    navigator.mediaDevices.getUserMedia({ 
        video: { width: 1280, height: 720, facingMode: "user" } 
    }).then(stream => {
        videoElement.srcObject = stream;
        videoElement.addEventListener("loadeddata", processFrame);
        statusText.innerText = "Система готова. Покажите жесты.";
        outputDisplay.innerText = "ЖДУ ЖЕСТ";
    }).catch(err => {
        statusText.innerText = "Ошибка доступа к камере";
    });
}

async function processFrame() {
    if (!myAI || videoElement.videoWidth === 0) {
        requestAnimationFrame(processFrame);
        return;
    }
    
    const results = await myAI.recognizeForVideo(videoElement, Date.now());
    
    if (results.gestures && results.gestures.length > 0) {
        let frameGestures = [];

        for (let i = 0; i < results.gestures.length; i++) {
            const gesture = results.gestures[i][0];
            if (gesture.score > 0.5 && gesture.categoryName !== "None") {
                const translated = dictionaries[currentLang][gesture.categoryName] || gesture.categoryName;
                frameGestures.push(translated);
            }
        }

        if (frameGestures.length > 0) {
            const finalString = frameGestures.join(" + ");
            outputDisplay.innerText = finalString;
            container.classList.add("detected");
            speak(finalString); // Озвучка
        } else {
            container.classList.remove("detected");
        }
    } else {
        container.classList.remove("detected");
    }
    
    requestAnimationFrame(processFrame);
}

// Ждем загрузки голосов
window.speechSynthesis.onvoiceschanged = () => {};
launchSystem();
