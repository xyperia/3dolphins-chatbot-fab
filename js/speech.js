var r = document.getElementById('result');
var speechRecognizer = null;
var speechPlaceholder = "";
var finalTranscript = "";
var startTime = 0;
var speechSent = false;

function MicrophoneOff() {
  $('#figure-microphone').removeClass("on");
  speechRecognizer.stop();
  $('.dolphin-message-box .message-input').attr("placeholder", speechPlaceholder);
  $('.dolphin-message-box .message-input').removeClass("dolphin-blink-placeholder");
}

function onSpeechEnd() {
  if (Date.now() >= startTime + 1500) {
    MicrophoneOff();
    outgoingMessage();
    $('.dolphin-message-box .message-input').val("");
    speechSent = true;
  }
  if (!speechSent) {
    setTimeout(onSpeechEnd, 500);
  }
}

function initSpeech() {
  speechRecognizer = new webkitSpeechRecognition();
  speechPlaceholder = $('.dolphin-message-box .message-input').attr("placeholder");
  speechRecognizer.onresult = function(e){
    $('.dolphin-message-box .message-input').removeClass("dolphin-blink-placeholder");
    var interimTranscript = '';
    for (var i = event.resultIndex, len = event.results.length; i < len; i++) {
      var transcript = event.results[i][0].transcript;
      if (event.results[i].isFinal) {
        finalTranscript = transcript;
        startTime = Date.now();
        if ($('#figure-microphone').hasClass("on")) {
          $('.dolphin-message-box .message-input').val(finalTranscript);
        }
      } else {
        interimTranscript += transcript;
        startTime = Date.now();
        if ($('#figure-microphone').hasClass("on")) {
          $('.dolphin-message-box .message-input').val(interimTranscript);
        }
      }
    }
    
    onSpeechEnd();
  };

  speechRecognizer.onerror = function(){
    MicrophoneOff();
  };

  speechRecognizer.continuous = true;
  speechRecognizer.interimResults = true;
  speechRecognizer.lang = 'id-ID';

  $('.dolphin-message-box .message-submit').click(function () {
    MicrophoneOff();
  });
}

function onSpeechStop() {
  speechRecognizer.abort();
  MicrophoneOff();
}

function onSpeechStart() {
  $('#figure-microphone').addClass("on");
  $('.dolphin-message-box .message-input').addClass("dolphin-blink-placeholder");
  $('.dolphin-message-box .message-input').attr("placeholder", "Listening...")
  speechRecognizer.start();
  finalTranscript = "";
  speechSent = false;
  startTime = Date.now();
}

function onSpeechEvent() {
  if ('webkitSpeechRecognition' in window) {
    if (!speechRecognizer) {
      initSpeech();
    }
    var isOn = $('#figure-microphone').hasClass("on");
    if (isOn) {
      onSpeechStop();
    } else {
      onSpeechStart();
    }
  }
}