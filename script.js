
// Indicate a country code such as 'fr', 'en', or others, to use a particular language for the text-to-speech functionality (reading the bot's messages out loud)
// If you leave this blank, the system's default voice will be used
var CN_WANTED_LANGUAGE_TEXT_TO_SPEECH = ""; // "fr";

// Settings for the text-to-speech functionality (the bot's voice)
var CN_TEXT_TO_SPEECH_RATE = 1.2; // The higher the rate, the faster the bot will speak
var CN_TEXT_TO_SPEECH_PITCH = 1; // This will alter the pitch for the bot's voice

// Indicate a locale code such as 'fr-FR', 'en-US', to use a particular language for the speech recognition functionality (when you speak into the mic)
// If you leave this blank, the system's default language will be used
var CN_WANTED_LANGUAGE_SPEECH_REC = ""; //"fr-FR";

// Determine which word will cause this scrip to stop.
var CN_SAY_THIS_WORD_TO_STOP = "stop";

// Determine which word will cause this script to temporarily pause
var CN_SAY_THIS_WORD_TO_PAUSE = "pause";

// ---------------------------- 


// -------------------
// CODE (DO NOT ALTER)
// -------------------
var CN_MESSAGE_COUNT = 0;
var CN_CURRENT_MESSAGE = null;
var CN_CURRENT_MESSAGE_SENTENCES = [];
var CN_SPEECHREC = null;
var CN_IS_READING = false;
var CN_IS_LISTENING = false;
var CN_FINISHED = false;
var CN_PAUSED = false;
var CN_WANTED_VOICE = null;
var CN_TIMEOUT_KEEP_SYNTHESIS_WORKING = null;
var CN_TIMEOUT_KEEP_SPEECHREC_WORKING = null;
var CN_SPEECH_REC_SUPPORTED = false;

// This function will say the given text out loud using the browser's speech synthesis API
function CN_SayOutLoud(text) {
	if (!text) return;
	// console.log("Saying out loud: "+text);
	var msg = new SpeechSynthesisUtterance();
	msg.text = text;
	
	if (CN_WANTED_VOICE) msg.voice = CN_WANTED_VOICE;
	msg.rate = CN_TEXT_TO_SPEECH_RATE;
	msg.pitch = CN_TEXT_TO_SPEECH_PITCH;
	msg.onstart = () => {
		// If speech recognition is active, disable it
		if (CN_IS_LISTENING) CN_SPEECHREC.stop();
		
		if (CN_FINISHED) return;
		CN_IS_READING = true;
		clearTimeout(CN_TIMEOUT_KEEP_SYNTHESIS_WORKING);
		CN_TIMEOUT_KEEP_SYNTHESIS_WORKING = setTimeout(CN_KeepSpeechSynthesisActive, 5000);
	};
	msg.onend = () => {
		if (CN_FINISHED) return;
		
		// Finished speaking
		clearTimeout(CN_TIMEOUT_KEEP_SYNTHESIS_WORKING);
		// console.log("Finished speaking out loud");
		
		// restart listening
		CN_IS_READING = false;
		setTimeout(function() {
			if (!window.speechSynthesis.speaking) {
				if (CN_SPEECH_REC_SUPPORTED && CN_SPEECHREC && !CN_IS_LISTENING && !CN_PAUSED) CN_SPEECHREC.start();
				clearTimeout(CN_TIMEOUT_KEEP_SPEECHREC_WORKING);
				CN_TIMEOUT_KEEP_SPEECHREC_WORKING = setTimeout(CN_KeepSpeechRecWorking, 100);
			}
		}, 500);
	}
	CN_IS_READING = true;
	window.speechSynthesis.speak(msg);
}

// This will read the bot's latest message
function CN_ReadLatestMessage() {
	// Turn off speech recognition so that it doesn't talk to itself
	if (CN_SPEECHREC) {
		try {
			CN_SPEECHREC.stop();
		} catch(e) { }
	}
	var text = jQuery(".text-base:last").find("p").text();
	// console.log("New message found, I will read this: " + text);
	CN_SayOutLoud(text);
}

// This is a workaround for Chrome's bug in the speech synthesis API (https://stackoverflow.com/questions/21947730/chrome-speech-synthesis-with-longer-texts)
function CN_KeepSpeechSynthesisActive() {
	// console.log("Keeping speech synthesis active...");
	window.speechSynthesis.pause();
	window.speechSynthesis.resume();
	CN_TIMEOUT_KEEP_SYNTHESIS_WORKING = setTimeout(CN_KeepSpeechSynthesisActive, 5000);
}

// Split the text into sentences so the speech synthesis can start speaking as soon as possible
function CN_SplitIntoSentences(text) {
	var sentences = [];
	var currentSentence = "";
	
	for(var i=0; i<text.length; i++) {
		//
		var currentChar = text[i];
		
		// Add character to current sentence
		currentSentence += currentChar;
		
		// is the current character a delimiter? if so, add current part to array and clear
		if (currentChar == ',' || currentChar == ':' || currentChar == '.' || currentChar == '!' || currentChar == '?' || currentChar == ';') {
			if (currentSentence.trim() != "") sentences.push(currentSentence.trim());
			currentSentence = "";
		}
	}
	
	return sentences;
}

// Check for new messages the bot has sent. If a new message is found, it will be read out loud
function CN_CheckNewMessages() {
	// Any new messages?
	var currentMessageCount = jQuery(".text-base").length;
	if (currentMessageCount > CN_MESSAGE_COUNT) {
		// New message!
		CN_MESSAGE_COUNT = currentMessageCount;
		CN_CURRENT_MESSAGE = jQuery(".text-base:last");
		CN_CURRENT_MESSAGE_SENTENCES = []; // Reset list of parts already spoken
	}
	
	// Split current message into parts
	if (CN_CURRENT_MESSAGE && CN_CURRENT_MESSAGE.length) {
		var currentText = CN_CURRENT_MESSAGE.text()+"";
		var newSentences = CN_SplitIntoSentences(currentText);
		if (newSentences != null && newSentences.length != CN_CURRENT_MESSAGE_SENTENCES.length) {
			// There is a new part of a sentence!
			CN_CURRENT_MESSAGE_SENTENCES = newSentences;
			var lastPart = newSentences[newSentences.length-1];
			CN_SayOutLoud(lastPart);
		}
	}
	
	setTimeout(CN_CheckNewMessages, 100);
}

// Send a message to the bot (will simply put text in the textarea and simulate a send button click)
function CN_SendMessage(text) {
	// Send the message
	jQuery("textarea").val(text);
	jQuery("textarea").closest("div").find("button").click();
	
	// Stop speech recognition until the answer is received
	if (CN_SPEECHREC) {
		clearTimeout(CN_TIMEOUT_KEEP_SPEECHREC_WORKING);
		CN_SPEECHREC.stop();
	}
}

// Start speech recognition using the browser's speech recognition API
function CN_StartSpeechRecognition() {
	if (CN_IS_READING) {
		clearTimeout(CN_TIMEOUT_KEEP_SPEECHREC_WORKING);
		CN_TIMEOUT_KEEP_SPEECHREC_WORKING = setTimeout(CN_KeepSpeechRecWorking, 100);
		return;
	}
	if (!CN_SPEECH_REC_SUPPORTED) return;
	CN_SPEECHREC = ('webkitSpeechRecognition' in window) ? new webkitSpeechRecognition() : new SpeechRecognition();
	CN_SPEECHREC.continuous = true;
	CN_SPEECHREC.lang = CN_WANTED_LANGUAGE_SPEECH_REC;
	CN_SPEECHREC.onstart = () => {
		CN_IS_LISTENING = true;
		console.log("I'm listening");
	};
	CN_SPEECHREC.onend = () => {
		CN_IS_LISTENING = false;
		console.log("I've stopped listening");
	};
	CN_SPEECHREC.onerror = () => {
		CN_IS_LISTENING = false;
		console.log("Error while listening");
	};
	CN_SPEECHREC.onresult = (event) => {
		var final_transcript = "";
		for (let i = event.resultIndex; i < event.results.length; ++i) {
			if (event.results[i].isFinal)
				final_transcript += event.results[i][0].transcript;
		}
		// console.log("You have said the following words: "+final_transcript);
		if (final_transcript.toLowerCase() == CN_SAY_THIS_WORD_TO_STOP) {
			console.log("You said '"+ CN_SAY_THIS_WORD_TO_STOP+"'. Conversation ended");
			CN_FINISHED = true;
			CN_PAUSED = false;
			CN_SPEECHREC.stop();
			CN_SayOutLoud("Bye bye");
			alert("Conversation ended. Reload the script to restart conversation");
			return;
		} else if (final_transcript.toLowerCase() == CN_SAY_THIS_WORD_TO_PAUSE) {
			console.log("You said '"+ CN_SAY_THIS_WORD_TO_PAUSE+"' Conversation paused");
			CN_PAUSED = true;
			if (CN_SPEECHREC) CN_SPEECHREC.stop();
			alert("Conversation paused, the browser is no longer listening. Click OK to resume");
			CN_PAUSED = false;
			console.log("Conversation resumed");
			return;
		}
		
		CN_SendMessage(final_transcript);
	};
	if (!CN_IS_LISTENING && CN_SPEECH_REC_SUPPORTED) CN_SPEECHREC.start();
	clearTimeout(CN_TIMEOUT_KEEP_SPEECHREC_WORKING);
	CN_TIMEOUT_KEEP_SPEECHREC_WORKING = setTimeout(CN_KeepSpeechRecWorking, 100);
}

// Make sure the speech recognition is turned on when the bot is not speaking
function CN_KeepSpeechRecWorking() {
	if (CN_FINISHED) return; // Conversation finished
	clearTimeout(CN_TIMEOUT_KEEP_SPEECHREC_WORKING);
	CN_TIMEOUT_KEEP_SPEECHREC_WORKING = setTimeout(CN_KeepSpeechRecWorking, 100);
	if (!CN_IS_READING && !CN_IS_LISTENING && !CN_PAUSED) {
		if (!CN_SPEECHREC)
			CN_StartSpeechRecognition();
		else {
			if (!CN_IS_LISTENING) {
				try {
					if (CN_SPEECH_REC_SUPPORTED && !window.speechSynthesis.speaking)
						CN_SPEECHREC.start();
				} catch(e) { }
			}
		}
	}
}


// Perform initialization after jQuery is loaded
function CN_InitScript() {
	if (typeof $ === null || typeof $ === undefined) $ = jQuery;
	
	var warning = "";
	if ('webkitSpeechRecognition' in window) {
		// console.log("Speech recognition API supported");
		CN_SPEECH_REC_SUPPORTED = true;
	} else {
		// console.log("speech recognition API not supported.");
		CN_SPEECH_REC_SUPPORTED = false;
		warning = "\n\nWARNING: speech recognition (speech-to-text) is only available in Google Chrome desktop version at the moment. If you are using another browser, you will not be able to dictate text, but you can still listen to the bot's responses.";
	}
	
	// Alert message on start
	alert("After you press OK, I will start listening to your audio. To stop the script, just say the word '" + CN_SAY_THIS_WORD_TO_STOP + "'. To pause, say 'pause'."+ warning);
	
	// Wait on voices to be loaded before fetching list
	window.speechSynthesis.onvoiceschanged = function () {
		if (!CN_WANTED_LANGUAGE_TEXT_TO_SPEECH){
			// console.log("Reading with default browser voice");
		} else {
			speechSynthesis.getVoices().forEach(function (voice) {
				//console.log("Found possible voice: " + voice.name + " (" + voice.lang + ")");
				if (voice.lang.substring(0, 2) == CN_WANTED_LANGUAGE_TEXT_TO_SPEECH) {
					CN_WANTED_VOICE = voice;
					// console.log("I will read using voice " + voice.name + " (" + voice.lang + ")");
					return false;
				}
			});
			if (!CN_WANTED_VOICE)
				console.log("No voice found for '" + CN_WANTED_LANGUAGE_TEXT_TO_SPEECH + "', reading with default browser voice");
		}
	};
	
	// Add icon on the top right corner
	jQuery("body").append("<span style='position: fixed; top: 8px; right: 8px; display: inline-block; background: #EEE; border: 1px solid #888; color: #888; padding: 5px; font-size: 14px; border-radius: 4px; cursor: pointer; font-weight: bold;' id='TTGPTSettings'>⚙️ TalkGPT settings</span>");
	
	// Try and get voices
	speechSynthesis.getVoices();
	
	setTimeout(function () {
		// Check for new messages
		CN_CheckNewMessages();
		
		// Start speech rec
		CN_StartSpeechRecognition();		
			
		// Assign event on TTGPTSettings icon click
		jQuery("#TTGPTSettings").on("click", CN_OnSettingsIconClick);
	}, 100);
}

// Open settings menu
function CN_OnSettingsIconClick() {
	// console.log("Opening settings menu");
	
	// Stop listening
	CN_PAUSED = true;
	if (CN_SPEECHREC) CN_SPEECHREC.stop();
	
	// Prepare settings row
	var rows = "";
	  
	// 1. Bot's voice
	var voices = "";
	var n = 0;
	speechSynthesis.getVoices().forEach(function (voice) {
		var label = `${voice.name} (${voice.lang})`;
		if (voice.default) label += ' — DEFAULT';
		var SEL = (CN_WANTED_VOICE && CN_WANTED_VOICE.lang == voice.lang && CN_WANTED_VOICE.name == voice.name) ? "selected=selected": "";
		voices += "<option value='"+n+"' "+SEL+">"+label+"</option>";
		n++;
	});
	rows += "<tr><td>AI voice and language:</td><td><select id='TTGPTVoice' style='width: 300px; color: black'>"+voices+"</select></td></tr>";
	
	// 2. AI talking speed
	rows += "<tr><td>AI talking speed (speech rate):</td><td><input type=number step='.1' id='TTGPTRate' style='color: black; width: 100px;' value='"+CN_TEXT_TO_SPEECH_RATE+"' /></td></tr>";
	
	// 3. AI voice pitch
	rows += "<tr><td>AI voice pitch:</td><td><input type=number step='.1' id='TTGPTPitch' style='width: 100px; color: black;' value='"+CN_TEXT_TO_SPEECH_PITCH+"' /></td></tr>";
	
	// 4. Speech recognition language CN_WANTED_LANGUAGE_SPEECH_REC
	var languages = "<option value=''></option>";
	for(var i in CN_SPEECHREC_LANGS) {
		var languageName = CN_SPEECHREC_LANGS[i][0];
		for(var j in CN_SPEECHREC_LANGS[i]) {
			if (j == 0) continue;
			var languageCode = CN_SPEECHREC_LANGS[i][j][0];
			var SEL = languageCode == CN_WANTED_LANGUAGE_SPEECH_REC ? "selected='selected'": "";
			languages += "<option value='"+languageCode+"' "+SEL+">"+languageName+" - "+languageCode+"</option>";
		}
	}
	rows += "<tr><td>Speech recognition language:</td><td><select id='TTGPTRecLang' style='width: 300px; color: black;' >"+languages+"</select></td></tr>";
	
	// 5. 'Stop' word
	rows += "<tr><td>'Stop' word:</td><td><input type=text id='TTGPTStopWord' style='width: 100px; color: black;' value='"+CN_SAY_THIS_WORD_TO_STOP+"' /></td></tr>";
	
	// 6. 'Pause' word
	rows += "<tr><td>'Pause' word:</td><td><input type=text id='TTGPTPauseWord' style='width: 100px; color: black;' value='"+CN_SAY_THIS_WORD_TO_PAUSE+"' /></td></tr>";
	
	
	// Prepare save/close buttons
	var closeRow = "<tr><td colspan=2 style='text-align: center'><br /><button id='TTGPTSave' style='font-weight: bold;'>✓ Save</button>&nbsp;<button id='TTGPTCancel' style='margin-left: 20px;'>✗ Cancel</button></td></tr>";
	
	// Prepare settings table
	var table = "<table cellpadding=6 cellspacing=0 style='margin: 30px;'>"+rows+closeRow+"</table>";
	
	// Open a whole screenful of settings
	jQuery("body").append("<div style='text-align: -webkit-center; background: #202123; position: absolute; top: 0; right: 0; left: 0; bottom: 0; z-index: 999999; padding: 20px; color: white; font-size: 17px; font' id='TTGPTSettingsArea'><h1>⚙️ TalkGPT settings</h1>"+table+"</div>");
	
	// Assign events
	setTimeout(function() {
		jQuery("#TTGPTSave").on("click", CN_SaveSettings);
		jQuery("#TTGPTCancel").on("click", CN_CloseSettingsDialog);
	}, 100);
}

// Save settings and close dialog box
function CN_SaveSettings() {
	
	// Save settings
	try {
		// AI voice settings: voice/language, rate, pitch
		var wantedVoiceIndex = jQuery("#TTGPTVoice").val();
		var allVoices = speechSynthesis.getVoices();
		CN_WANTED_VOICE = allVoices[wantedVoiceIndex];
		CN_TEXT_TO_SPEECH_RATE = Number( jQuery("#TTGPTRate").val() );
		CN_TEXT_TO_SPEECH_PITCH = Number( jQuery("#TTGPTPitch").val() );
		
		// Speech recognition settings: language, stop, pause
		CN_WANTED_LANGUAGE_SPEECH_REC = jQuery("#TTGPTRecLang").val();
		CN_SAY_THIS_WORD_TO_STOP = jQuery("#TTGPTStopWord").val();
		CN_SAY_THIS_WORD_TO_PAUSE = jQuery("#TTGPTPauseWord").val();
		
		// Apply language to speech recognition instance
		if (CN_SPEECHREC) CN_SPEECHREC.lang = CN_WANTED_LANGUAGE_SPEECH_REC;
	} catch(e) { alert('Invalid settings values'); return; }
	
	// Close dialog
	// console.log("Closing settings dialog");
	jQuery("#TTGPTSettingsArea").remove();
	
	// Resume listening
	CN_PAUSED = false;
}

// Close dialog: remove area altogether
function CN_CloseSettingsDialog() {
	// console.log("Closing settings dialog");
	jQuery("#TTGPTSettingsArea").remove();
	
	// Resume listening
	CN_PAUSED = false;
}




// MAIN ENTRY POINT
// Load jQuery, then run initialization function
(function () {

	// function LoadScript(url, success) {
	// 	var script = document.createElement("script");
	// 	script.src = url;
	// 	var head = document.getElementsByTagName("head")[0],
	// 		done = !1;
	// 	script.onload = script.onreadystatechange = function () {
	// 		!done && (!this.readyState || this.readyState == "loaded" || this.readyState == "complete") && (done = !0, success(), script.onload = script.onreadystatechange = null, head.removeChild(script))
	// 		// console.log("jQuery loaded");
	// 	}, head.appendChild(script)
	// }
	
	// // Load the script
	// LoadScript("//code.jquery.com/jquery.min.js", function () {
	// 	return typeof jQuery == "undefined" ?
	// 		alert("Sorry, but jQuery was not able to load. The script cannot run. Try using Google Chrome on Windows 11") :
	// 		CN_InitScript();
	// })

	CN_InitScript();
	
})();


// List of languages for speech recognition - Pulled from https://www.google.com/intl/en/chrome/demos/speech.html
var CN_SPEECHREC_LANGS =
[['Afrikaans',       ['af-ZA']],
 ['አማርኛ',           	 ['am-ET']],
 ['Azərbaycanca',    ['az-AZ']],
 ['বাংলা',            	 ['bn-BD', 'বাংলাদেশ'],
                     ['bn-IN', 'ভারত']],
 ['Bahasa Indonesia',['id-ID']],
 ['Bahasa Melayu',   ['ms-MY']],
 ['Català',          ['ca-ES']],
 ['Čeština',         ['cs-CZ']],
 ['Dansk',           ['da-DK']],
 ['Deutsch',         ['de-DE']],
 ['English',         ['en-AU', 'Australia'],
                     ['en-CA', 'Canada'],
                     ['en-IN', 'India'],
                     ['en-KE', 'Kenya'],
                     ['en-TZ', 'Tanzania'],
                     ['en-GH', 'Ghana'],
                     ['en-NZ', 'New Zealand'],
                     ['en-NG', 'Nigeria'],
                     ['en-ZA', 'South Africa'],
                     ['en-PH', 'Philippines'],
                     ['en-GB', 'United Kingdom'],
                     ['en-US', 'United States']],
 ['Español',         ['es-AR', 'Argentina'],
                     ['es-BO', 'Bolivia'],
                     ['es-CL', 'Chile'],
                     ['es-CO', 'Colombia'],
                     ['es-CR', 'Costa Rica'],
                     ['es-EC', 'Ecuador'],
                     ['es-SV', 'El Salvador'],
                     ['es-ES', 'España'],
                     ['es-US', 'Estados Unidos'],
                     ['es-GT', 'Guatemala'],
                     ['es-HN', 'Honduras'],
                     ['es-MX', 'México'],
                     ['es-NI', 'Nicaragua'],
                     ['es-PA', 'Panamá'],
                     ['es-PY', 'Paraguay'],
                     ['es-PE', 'Perú'],
                     ['es-PR', 'Puerto Rico'],
                     ['es-DO', 'República Dominicana'],
                     ['es-UY', 'Uruguay'],
                     ['es-VE', 'Venezuela']],
 ['Euskara',         ['eu-ES']],
 ['Filipino',        ['fil-PH']],
 ['Français',        ['fr-FR']],
 ['Basa Jawa',       ['jv-ID']],
 ['Galego',          ['gl-ES']],
 ['ગુજરાતી',           	 ['gu-IN']],
 ['Hrvatski',        ['hr-HR']],
 ['IsiZulu',         ['zu-ZA']],
 ['Íslenska',        ['is-IS']],
 ['Italiano',        ['it-IT', 'Italia'],
                     ['it-CH', 'Svizzera']],
 ['ಕನ್ನಡ',              ['kn-IN']],
 ['ភាសាខ្មែរ',            ['km-KH']],
 ['Latviešu',        ['lv-LV']],
 ['Lietuvių',        ['lt-LT']],
 ['മലയാളം',           ['ml-IN']],
 ['मराठी',               ['mr-IN']],
 ['Magyar',          ['hu-HU']],
 ['ລາວ',              ['lo-LA']],
 ['Nederlands',      ['nl-NL']],
 ['नेपाली भाषा',        	 ['ne-NP']],
 ['Norsk bokmål',    ['nb-NO']],
 ['Polski',          ['pl-PL']],
 ['Português',       ['pt-BR', 'Brasil'],
                     ['pt-PT', 'Portugal']],
 ['Română',          ['ro-RO']],
 ['සිංහල',          	 ['si-LK']],
 ['Slovenščina',     ['sl-SI']],
 ['Basa Sunda',      ['su-ID']],
 ['Slovenčina',      ['sk-SK']],
 ['Suomi',           ['fi-FI']],
 ['Svenska',         ['sv-SE']],
 ['Kiswahili',       ['sw-TZ', 'Tanzania'],
                     ['sw-KE', 'Kenya']],
 ['ქართული',         ['ka-GE']],
 ['Հայերեն',         ['hy-AM']],
 ['தமிழ்',              ['ta-IN', 'இந்தியா'],
                     ['ta-SG', 'சிங்கப்பூர்'],
                     ['ta-LK', 'இலங்கை'],
                     ['ta-MY', 'மலேசியா']],
 ['తెలుగు',             ['te-IN']],
 ['Tiếng Việt',      ['vi-VN']],
 ['Türkçe',          ['tr-TR']],
 ['اُردُو',            ['ur-PK', 'پاکستان'],
                     ['ur-IN', 'بھارت']],
 ['Ελληνικά',        ['el-GR']],
 ['български',       ['bg-BG']],
 ['Pусский',         ['ru-RU']],
 ['Српски',          ['sr-RS']],
 ['Українська',      ['uk-UA']],
 ['한국어',            ['ko-KR']],
 ['中文',             ['cmn-Hans-CN', '普通话 (中国大陆)'],
                     ['cmn-Hans-HK', '普通话 (香港)'],
                     ['cmn-Hant-TW', '中文 (台灣)'],
                     ['yue-Hant-HK', '粵語 (香港)']],
 ['日本語',           ['ja-JP']],
 ['हिन्दी',               ['hi-IN']],
 ['ภาษาไทย',         	 ['th-TH']]];