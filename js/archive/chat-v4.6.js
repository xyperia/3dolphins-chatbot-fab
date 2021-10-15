'use strict';

/**
 * Authorization Constants
 */
var BASIC = "Basic ";
var BEARER = "Bearer ";
var AUTHORIZATION = "Authorization";

/**
 * AJAX Call Related Constant
 */
var GET = 'GET';
var POST = 'POST';
var MULTIPART_FORM = 'multipart/form-data';
var QUEUE_PATH = '/webchat/queue';
var UPLOAD_PATH = '/webchat/upload';
var CHAT_HISTORY_PATH = '/webchat/conversation';
var INFO_PATH = '/webchat/info';

/**
 * Chat Widget State Variable
 */
var CHAT_STATE_VARIABLE_NAME = 'inmotion_chat_state';
var CHAT_STATE_CHAT = 'chat';
var CHAT_STATE_ICON = 'icon';

/**
 * Chat related variable
 */
var window_focus = true;
var at = null;
var outgoingChannel = null;
var expiredChannel = null;
var transactions = [];
var outgoingTransactions = [];
var incomingTransactions = [];
var reconnect = 0;
var messageSubscription;
var messageTransaction;
var transactionToken;
var toggleVoice = false;
var isInitiatingToken = false;
var isRefreshingToken = false;
var isGettingChatHistory = false;

/**
 * Body CSS variable
 */
var position;
var overflow;
var lazyLoadInstance = new LazyLoad({
	elements_selector: ".d-lazy",
	load_delay: 300
});

/**
 * Google map related variable
 */
var map;
var markers = [];
var geocoder = null;
var tempMsgObj = null;
var tempLabel = null;
var tempMenu = null;

/**
 * Upload related variable
 */
var isUploading = false;

var MEDIA_IMAGES_BUTTON = 'media-images-button';

function timeoutMessage() {
	var values = [];
	transactions.forEach(function (value) {
		if (value.txId + 60000 <= getTimeInMillliseconds()) {
			$('#' + value.txId).removeClass("message-sending");
			$('#' + value.txId).addClass("message-failed");
			setDate(false);
			values.push(value);
			saveToSession();
		}
	});
	values.forEach(function (value) {
		transactions.remove(value);
	});
}

/**
 * Restricted character in filename
 */
var restrictedCharInFilename = [
	';',
	'.',
	'%'
];

/**
 * Check chat expiry
 */
function expiryValidation() {
	setTimeout(expiryValidation, 5000);
	setTimeout(timeoutMessage, 5000);
	Chat.clearStorageWhenExpired();
}

setTimeout(expiryValidation, 5000);

/**
 * Initialize Broadcast Message across Tab
 */
function initBroadcast() {
	if (typeof BroadcastChannel !== "undefined") {
		outgoingChannel = new BroadcastChannel('outgoing-broadcast');
		outgoingChannel.onmessage = function (e) {
			if (e.data !== null && e.data !== '') {
				$('<div class="message message-personal">' + e.data + '</div>').appendTo($('.dolphin-messages .messages-content')).addClass('new');
				setDate(false);
				removeQuickReply();
				updateScrollbar();
			}
		};
		expiredChannel = new BroadcastChannel('expired-broadcast');
		expiredChannel.onmessage = function (e) {
			if (e.data !== null && e.data !== '') {
				Chat.disconnect();
			}
		};
	}
}

/**
 * Chat Instance
 */
var Chat = {
	url: "", connect_message: "", welcome_message: "", login_sub_header: "", chat_sub_header: "", type_placeholder: "", errorLocationMessage: "", name_placeholder: "Enter your name", email_placeholder: "Enter your email", phone_placeholder: "Enter your phone",
	agent_avatar: "", avatar: "", icon_avatar: "", header: "", client_id: "", client_secret: "", access_token: "", refresh_token: "", g_captcha_key: "", token: null, session_id: null,
	name: null, email: null, phone: null, uid: null, state: null, unread: 0, isagenttyping: false, iscustomertyping: false, renderFormType: 0, number_of_messages: null, quick_reply_flat: false,
	client: null, chat_box: null, login_box: null, notif_box: null, webview: false, mobile: null, isconnecting: false, guestName: "", triggerMenu: "", menu: false, enable_voice: false, gender: "female",
	enable_queue: false, queue_text: null, enable_campaign: false, campaign_title: null, campaign_text: null, campaign_timer: 0, campaign_menu: [], enable_history: true, enable_speech: false, customerId: null,
	uploading_text: "", connect_button_text: "", connect_button_connecting_text: "", max_upload_message: null, upload_error_message: null, name_input_error_message: null, email_input_error_message: null, phone_input_error_message: null,
	enable_attachment: true,

	init: function (settings) {
		if (!settings.mobile) {
			var isIE = detectBroadcastCapability();
			if (!isIE) {
				initBroadcast();
			}
		}
		this.url = settings.url;
		this.avatar = settings.avatar;
		this.icon_avatar = settings.icon_avatar;
		this.agent_avatar = settings.agent_avatar;
		this.header = settings.header;
		this.login_sub_header = settings.login_sub_header;
		this.connect_message = settings.connect_message;
		this.chat_sub_header = settings.chat_sub_header;
		this.type_placeholder = settings.type_placeholder;
		this.welcome_message = settings.welcome_message;
		this.client_id = settings.client_id;
		this.client_secret = settings.client_secret;
		this.triggerMenu = settings.triggerMenu;
		this.guestName = settings.guestName;
		this.g_captcha_key = settings.g_captcha_key;
		this.number_of_messages = settings.number_of_messages;
		this.errorLocationMessage = settings.errorLocationMessage;
		this.enable_voice = settings.enable_voice;
		this.enable_speech = settings.enable_speech;
		this.enable_queue = settings.enable_queue;
		this.queue_text = settings.queue_text;
		this.enable_campaign = settings.enable_campaign;
		this.campaign_avatar = settings.campaign_avatar;
		this.campaign_title = settings.campaign_title;
		this.campaign_text = settings.campaign_text;
		this.campaign_timer = settings.campaign_timer;
		this.campaign_menu = settings.campaign_menu;
		this.customerId = settings.customerId;
		this.quick_reply_flat = settings.quick_reply_flat;
		this.enable_attachment = settings.enable_attachment;
		
		if (settings.gender) {
			this.gender = settings.gender;
		} else {
			this.gender = "female";
		}

		if (settings.max_upload_message) {
			this.max_upload_message = settings.max_upload_message;
		} else {
			this.max_upload_message = "File size limit exceeded. Maximum filesize is [max_filesize]";
		}
		
		if (settings.uploading_text) {
			this.uploading_text = settings.uploading_text;
		} else {
			this.uploading_text = "Uploading";
		}

		if (settings.connect_button_text) {
			this.connect_button_text = settings.connect_button_text;
		} else {
			this.connect_button_text = "Connect";
		}

		if (settings.connect_button_text) {
			this.connect_button_text = settings.connect_button_text;
		} else {
			this.connect_button_connecting_text = "Connecting...";
		}

		if (typeof settings.enable_history !== "undefined") {
			Chat.enable_history = settings.enable_history;
		}
		
		if (typeof responsiveVoice !== "undefined") {
			responsiveVoice.init();
		}

		if (settings.renderFormType) {
			this.renderFormType = settings.renderFormType;
		}
		if (settings.upload_error_message) {
			this.upload_error_message = settings.upload_error_message;
		} else {
			this.upload_error_message = "Sorry, media is not supported";
		}

		if (settings.name_input_error_message) {
			this.name_input_error_message = settings.name_input_error_message;
		} else {
			this.name_input_error_message = "Invalid name min [name_min_length] chars alphabet";
		}

		if (settings.email_input_error_message) {
			this.email_input_error_message = settings.email_input_error_message;
		} else {
			this.email_input_error_message = "Please key in valid email address";
		}

		if (settings.phone_input_error_message) {
			this.phone_input_error_message = settings.phone_input_error_message;
		} else {
			this.phone_input_error_message = "Please enter minimum [phone_min_length] digit";
		}

		Chat.initChatWindow();
		Chat.clearStorageWhenExpired();
		Chat.initProfile(settings);
		Chat.initMapModal();
		Chat.initLogin();
		Chat.addIconEvent();
		Chat.addFocusEvent();
	},
	loginToWebchat: function () {
		if (Chat.name && Chat.phone && Chat.email) {
			Chat.connectServer();
		} else {
			Chat.resetToLogin(true);
		}
	},
	clearStorageWhenExpired: function () {
		if (!Chat.webview && localStorage.getItem("expiry") !== null) {
			if (Date.now() > +localStorage.getItem("expiry")) {
				Chat.resetToLogin(true);
				var isIE = detectBroadcastCapability();
				if (!isIE) {
					if (!Chat.mobile && expiredChannel) {
						expiredChannel.postMessage("logout");
					}
				}
			}
			return;
		} else if (localStorage.getItem("expiry") === null) {
			clearChatLocalStorage();
			if (Chat.client !== null && Chat.client.connected) {
				Chat.client.disconnect();
				Chat.client = null;
			}
		}
	},
	initLogin: function () {
		if (Chat.guestName && localStorage.getItem("uid") === null) {
			Chat.uid = Chat.generateUid();
			Chat.name = Chat.guestName;
			Chat.email = Chat.uid + "@email.co.id";
			Chat.phone = Chat.uid;
			localStorage.setItem("name", Chat.name);
			localStorage.setItem("email", Chat.email);
			localStorage.setItem("phone", Chat.phone);
			localStorage.setItem("uid", Chat.uid);
			Chat.initToken(Chat);
		} else {
			if (localStorage.getItem("uid") !== null
				&& localStorage.getItem("at") !== null) {
				Chat.access_token = JSON.parse(localStorage.getItem("at")).access_token;
				Chat.token = localStorage.getItem("token");
				Chat.uid = localStorage.getItem("uid");
			} 
		}

		if (!Chat.webview) {
			if (localStorage.getItem("email") === null
				|| localStorage.getItem("phone") === null
				|| localStorage.getItem("name") === null) {
				Chat.buildLogin(Chat.login_box);
				if (Chat.mobile) {
					Chat.resetToLogin(true);
				}
			} 
		} else {
			if (Chat.name && Chat.phone && Chat.email) {
				Chat.connectServer();
				Chat.buildChat(Chat.chat_box, true);
			}
		}
	},
	callbackInitToken: function(at) {
		if (at.status !== 200) {
			if (at.status === 0) {
				if ($(".dolphin-login") && $(".dolphin-login").is(":visible")) {
					$(".dolphin-error-info").html("Network Error");
				} else {
					Chat.buildError(Chat.chat_box, "Bad Connection");
				}
			} else {
				Chat.buildError(Chat.chat_box, at.responseText);
			}
		} else {
			localStorage.setItem("at", JSON.stringify(at));
			localStorage.setItem("expiry", Date.now() + (at.expires_in * 1000));
			Chat.afterInitToken();
		}
	},
	callbackInitExistingToken: function(at) {
		var test = testConnection(JSON.parse(at));
		if (test.status !== 200) {
			if (test.status === 0) {
				Chat.buildError(Chat.chat_box, "Bad Connection");
			} else {
				Chat.buildError(Chat.chat_box, test.responseText);
			}
		} else {
			Chat.menu = true;
			Chat.afterInitToken();
		}
	},
	initToken: function (settings) {
		if (!isInitiatingToken) {
			isInitiatingToken = true;
			var at = localStorage.getItem("at");
			if (at === null) {
				obtainAccessToken(settings.url, settings.client_id, settings.client_secret);
			} else {
				Chat.callbackInitExistingToken(at);
			}
		}
	},
	initProfile: function (settings) {
		if (settings.name_placeholder) {
			Chat.name_placeholder = settings.name_placeholder;
		}
		if (settings.email_placeholder) {
			Chat.email_placeholder = settings.email_placeholder;
		}
		if (settings.phone_placeholder) {
			Chat.phone_placeholder = settings.phone_placeholder;
		}
		if (localStorage.getItem("name") !== null && localStorage.getItem("email") !== null && localStorage.getItem("phone") !== null && !Chat.webview) {
			Chat.name = localStorage.getItem("name");
			Chat.email = localStorage.getItem("email");
			Chat.phone = localStorage.getItem("phone");
			Chat.uid = localStorage.getItem("uid");
		} else {
			if (Chat.name === null && Chat.email === null && Chat.phone === null) {
				Chat.uid = Chat.generateUid();
				Chat.name = settings.name;
				Chat.email = settings.email;
				Chat.phone = settings.phone;
			}
		}
		if (localStorage.getItem(CHAT_STATE_VARIABLE_NAME)) {
			Chat.state = localStorage.getItem(CHAT_STATE_VARIABLE_NAME);
		} else {
			localStorage.setItem(CHAT_STATE_VARIABLE_NAME, CHAT_STATE_ICON);
			Chat.state = CHAT_STATE_ICON;
		}
	},
	initCampaign: function () {
		if (Chat.enable_campaign && !localStorage.getItem("messages")) {
			var chat_campaign = this.createDOMElem('div', 'dolphin-campaign-widget');
			document.body.appendChild(chat_campaign);
			var chat_campaign_header = this.createDOMElem('div', 'dolphin-campaign-header');
			chat_campaign.appendChild(chat_campaign_header);
			var chat_campaign_avatar = this.createDOMElem('div', 'dolphin-campaign-avatar');
			chat_campaign.appendChild(chat_campaign_avatar);
			var chat_campaign_title = this.createDOMElem('div', 'dolphin-campaign-title');
			chat_campaign_header.appendChild(chat_campaign_title);
			chat_campaign_title.innerHTML = Chat.campaign_title + '<img src=\"https://cdn.3dolphins.ai/widget/images/ic_close.svg\" class=\"dolphin-campaign-close\"/>';
			var chat_campaign_text = this.createDOMElem('div', 'dolphin-campaign-text');
			chat_campaign_header.appendChild(chat_campaign_text);
			chat_campaign_text.innerHTML = Chat.campaign_text;
			$('.dolphin-campaign-avatar').css('background-image', 'url("' + Chat.campaign_avatar + '")');
			$('.dolphin-campaign-widget').delay(Chat.campaign_timer).fadeIn('fast');
			Chat.initCampaignMenu(chat_campaign);
		}
	},
	initChatWindow: function () {
		Chat.login_box = this.createDOMElem('div', 'dolphin-login');
		document.body.appendChild(this.login_box);
		Chat.chat_box = this.createDOMElem('div', 'dolphin-chat');
		document.body.appendChild(this.chat_box);
		Chat.notif_box = this.createDOMElem('div', 'dolphin-chat-notification');
		document.body.appendChild(this.notif_box);
		Chat.notif_box.innerHTML = '0';
		var chat_icon = this.createDOMElem('div', 'dolphin-chat-icon');
		document.body.appendChild(chat_icon);
		$('.dolphin-chat-icon').css('background-image', 'url("' + Chat.icon_avatar + '")');
		Chat.initCampaign();
	},
	initMapModal: function () {
		if (typeof google !== "undefined") {
			geocoder = new google.maps.Geocoder();
			$('<div id="dolphin-mapModal" class="dolphin-modal-map"><div id="dolphin-mapModalContent" class="dolphin-modal-map-content"><div class="dolphin-modal-map-close-button">&times;</div><input id="dolphin-mapSearchTextField" type="text" placeholder="Search a place"><div id="dolphin-map"></div><div class="dolphin-modal-map-submit-button" onclick="submitLocation()">OK</div></div></div>').appendTo($('body'));
			$('.dolphin-modal-map-close-button').click(function () {
				toggleMapModal();
			});
			var input = document.getElementById('dolphin-mapSearchTextField');
			var autocomplete = new google.maps.places.Autocomplete(input);
			autocomplete.setFields(
				['address_components', 'geometry', 'icon', 'name']);

			map = new google.maps.Map(document.getElementById('dolphin-map'), {});
			autocomplete.bindTo('bounds', map);

			autocomplete.addListener('place_changed', function () {
				var place = autocomplete.getPlace();
				if (!place.geometry) {
					removeMarkers();
					return;
				}
				
				tempMsgObj.latitude = place.geometry.location.lat();
				tempMsgObj.longitude = place.geometry.location.lng();
				
				if (typeof place.geometry.viewport !== "undefined") {
					map.fitBounds(place.geometry.viewport);
				} else {
					map.setCenter(place.geometry.location);
					map.setZoom(17);
				}

				removeMarkers()
				var position = {
					lat: tempMsgObj.latitude,
					lng: tempMsgObj.longitude
				}
				addMarker(position)

				getAddress({
					lat: tempMsgObj.latitude,
					lng: tempMsgObj.longitude
				}, tempMsgObj)
			});
		}
	},
	afterInitToken: function () {
		Chat.buildChat(Chat.chat_box, true);
		Chat.connectServer();
	},
	onIconClick: function(menuValue) {
		try {
			if (Chat.enable_campaign) {
				$('.dolphin-campaign-widget').fadeOut('fast');
			}
			if (tempMenu) {
				Chat.triggerMenu = tempMenu;
			}
			if (menuValue) {
				Chat.triggerMenu = menuValue;
			}
			localStorage.setItem(CHAT_STATE_VARIABLE_NAME, CHAT_STATE_CHAT);
			disableBodyScroll();
			$(".dolphin-chat-icon").addClass("dolphin-icon-waiting");
			$(".dolphin-messages .messages-content").html("");
			if (messageSubscription !== undefined) {
				if (messageSubscription) {
					messageSubscription.unsubscribe();
					messageSubscription = undefined;
				}
				if (messageTransaction) {
					messageTransaction.unsubscribe();
					messageTransaction = undefined;
				}
				if (Chat.client !== null && Chat.client.connected) {
					Chat.client.disconnect();
				}
				Chat.initToken(Chat);
				Chat.loginToWebchat();
			} else {
				if ($(".dolphin-chat")) {
					Chat.menu = false;
					if (Chat.client !== null && Chat.client.connected) {
						Chat.client.disconnect();
						Chat.client = null;
					}
					Chat.initProfile(Chat);
					Chat.initLogin();
					if (Chat.name && Chat.email && Chat.phone) {
						localStorage.setItem("name", Chat.name);
						localStorage.setItem("email", Chat.email);
						localStorage.setItem("phone", Chat.phone);
						localStorage.setItem("uid", Chat.uid);
					}
				}
				if (Chat.name && Chat.email && Chat.phone) {
					Chat.loginToWebchat();
				} else if (localStorage.getItem("expiry") !== null 
					&& Date.now() < +localStorage.getItem("expiry")
					&& Chat.name && Chat.email && Chat.phone) {
					Chat.loginToWebchat();
				} else {
					Chat.resetToLogin(true);
				}
			}	
			Chat.unread = 0;
			$(".dolphin-chat-notification").fadeOut("fast");
			$(".dolphin-chat-notification").innerHTML = Chat.unread;
		} catch(error) {
			$(".dolphin-chat-icon").removeClass("dolphin-icon-waiting");
			$(".dolphin-chat-icon").fadeIn("fast");
			$(".dolphin-chat").fadeOut("fast");
			$(".dolphin-login").fadeOut("fast");
			console.log(error);
		} 
	},
	addIconEvent: function () {
		$(".dolphin-chat-icon").click(function() {
			Chat.onIconClick()
		});
	},
	addFocusEvent: function () {
		$(window).focus(function () {
			sendMarkRead();
		});
	},
	addKeydownEvent: function () {
		$(".dolphin-message-box .message-input").on('keydown', function (e) {
			if (e.which == 13) {
				outgoingMessage();
				return false;
			} else if (e.which == 32) {
				setTimeout(function() {onCustomerTyping()}, 1000);
			}
		});
	},
	createDOMElem: function (tag, name, className) {
		var elem = document.createElement(tag);
		elem.id = name;
		if (className) {
			elem.classList.add(className);
		} else {
			elem.classList.add(name);
		}
		return elem;
	},
	validateName: function (name, element) {
		if (/^[a-zA-Z-,]+(\s{0,1}[a-zA-Z-, ])*$/.test(name)) {
			if (name !== undefined && name.length > 2) {
				element.text('');
				return true;
			} else {
				element.text(Chat.name_input_error_message.replace(/\[name_min_length\]/gi, "3"));
				return false;
			}
		} else {
			element.text(Chat.name_input_error_message.replace(/\[name_min_length\]/gi, "3"));
			return false;
		}
	},
	validateEmail: function (email, element) {
		if (/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(email)) {
			element.text('');
			return true;
		} else {
			element.text(Chat.email_input_error_message);
			return false;
		}
	},
	validatePhone: function (phone, element) {
		if (/^\+?([0-9]{2})\)?[-. ]?([0-9]{8,12})$/.test(phone)) {
			element.text('');
			return true;
		} else {
			element.text(Chat.phone_input_error_message.replace(/\[phone_min_length\]/gi, "10-13"));
			return false;
		}
	},
	generateUid: function () {
		var navigator_info = window.navigator;
		var screen_info = window.screen;
		var uid = navigator_info.mimeTypes.length;
		uid += navigator_info.userAgent.replace(/\D+/g, '');
		uid += navigator_info.plugins.length;
		uid += screen_info.height || '';
		uid += screen_info.width || '';
		uid += screen_info.pixelDepth || '';
		return uid + Date.now() + Math.random().toString(36).substr(2, 9);
	},
	callbackConnectServer: function(rat, cookieToken, g_recaptcha) {
		if (rat !== null && rat !== undefined && rat.access_token !== undefined && rat.refresh_token !== undefined) {
			Chat.access_token = rat.access_token;
			Chat.refresh_token = rat.refresh_token;

			if (!Chat.client || !Chat.client.connected) {
				addConnectionAnimation();
				var socket = new SockJS(Chat.url + '/webchat?access_token=' + Chat.access_token);
				Chat.client = Stomp.over(socket);
				Chat.client.debug = false;
				Chat.client.connect({ accessToken: Chat.access_token, name: Chat.name, email: Chat.email, phone: Chat.phone, uid: Chat.uid, customerId: Chat.customerId ? Chat.customerId : '', token: cookieToken, captcha: g_recaptcha }, function (frame) {
					try {
						$(".dolphin-warning-login-box").remove();
						if (!$(".dolphin-icon-waiting")) {
							$(".dolphin-message-box .message-input").removeAttr('disabled');
						}
						var clientToken = null;
						if (Chat.name !== null && Chat.email !== null && Chat.phone !== null && Chat.uid !== null) {
							clientToken = Chat.name + Chat.email + Chat.phone + Chat.uid;
							if (Chat.customerId && Chat.customerId !== '') {
								clientToken = clientToken + Chat.customerId;
							}
							clientToken = fuse(clientToken);
						} else {
							if (cookieToken !== null) {
								clientToken = cookieToken;
								Chat.token = clientToken;
								if (Chat.token) {
									localStorage.setItem("token", Chat.token);
								}
								Chat.buildChat(Chat.chat_box, true);
								var welcomeMessage = {};
								if (Chat.welcome_message) {
									var custName = (localStorage.getItem("name")) ? localStorage.getItem("name") : Chat.name;
                                    var newWelMsg = (Chat.welcome_message).replace(/\[Nama\]/gi, custName);
                                    welcome.message = newWelMsg;
									incomingMessageFeed(welcomeMessage);
								}
							}
						}
						if (clientToken !== null) {
							setTimeout(function(){Chat.subscribeIncoming(clientToken)}, 3000);
						} else {
							Chat.resetToLogin(true);
						}
					} catch (e) {
						Chat.resetToLogin(true);
					}
				}, function (error) {
					if (error.headers && error.headers.message && error.headers.message.toLowerCase().indexOf('credential') !== -1) {
						Chat.buildError(Chat.chat_box, "Bad Credential");
					} else {
						if (reconnect < 5 && 
							Chat.client === null) {
							Chat.buildError(Chat.chat_box, "Bad Connection");
						} else if (reconnect < 5 && 
							Chat.client && !Chat.client.connected && Chat.state !== "icon") {
							Chat.buildError(Chat.chat_box, "Lost Connection");
						} else {
							Chat.resetToLogin(true);
						}
					}
				});
			} else {
				Chat.isconnecting = false;
				$(".dolphin-warning-login-box").remove();
			}
		} else {
			if (rat !== null && rat !== undefined && rat.error !== null) {
				Chat.buildError(Chat.chat_box, rat.error);
			} else {
				Chat.buildError(Chat.chat_box, "Bad Connection");
			}
		}
	},
	connectServer: function () {
		if (reconnect === 0) {
			$(".dolphin-messages .messages-content").addClass("dolphin-icon-waiting");
			$(".dolphin-messages .messages-content").html("");
		}
		Chat.isconnecting = true;
		var cookieToken = Chat.token;
		if (cookieToken == null) {
			cookieToken = document.cookie.replace(/(?:(?:^|.*;\s*)inmotion_token\s*\=\s*([^;]*).*$)|^.*$/, "$1");
		}
		if (Chat.webview || Chat.guestName || (cookieToken !== null && cookieToken !== '') || this.validateName(Chat.name, $("#warning-name")) && this.validateEmail(Chat.email, $("#warning-email")) && this.validatePhone(Chat.phone, $("#warning-phone"))) {
			var g_recaptcha = null;
			if (Chat.g_captcha_key !== null && Chat.g_captcha_key !== undefined) {
				g_recaptcha = grecaptcha.getResponse();
			}
			refreshAccessToken(Chat.url, Chat.client_id, Chat.client_secret, Chat.refresh_token, cookieToken, g_recaptcha);
		}	
	},
	subscribeIncoming: function (clientToken) {
		if (messageSubscription === undefined) {
			if (!Chat.webview) {
				getChatHistory();
			}
			messageSubscription = Chat.client.subscribe('/topic/message-' + clientToken, function (message) {
				Chat.isconnecting = false;
				reconnect = 0;
				if (/^[\],:{}\s]*$/.test(message.body.replace(/\\["\\\/bfnrtu]/g, '@').replace(/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g, ']').replace(/(?:^|:|,)(?:\s*\[)+/g, ''))) {
					var body = JSON.parse(message.body);
					var valid = decrypt(body, fuse(Chat.client_secret + Chat.access_token));
					if (valid) {
						if (body.token !== null) {
							if (body.message === null && body.event === null) {
								Chat.token = body.token;
								setTimeout(function () { }, 3000);
								if (Chat.session_id === null) {
									if (!Chat.webview) {
										localStorage.setItem("name", "" + Chat.name);
										localStorage.setItem("email", "" + Chat.email);
										localStorage.setItem("phone", "" + Chat.phone);
										localStorage.setItem("uid", "" + Chat.uid);
									}
									if (body.sessionId !== null) {
										Chat.session_id = body.sessionId;
									}
								}
								Chat.subscribeFeed();
								Chat.subscribeTransaction();
								document.cookie = "inmotion_token=" + Chat.token;
								if (clientToken !== Chat.token) {
									Chat.resetToLogin(true);
								}
								Chat.buildChat(Chat.chat_box, false);
								$(".dolphin-messages .messages-content").removeClass("dolphin-icon-waiting");
								$(".dolphin-message-box .message-input").removeAttr('disabled');
							} else {
								if (body.event === 'typing') {
									onAgentTyping(body);
								} else if (body.event === 'disconnect') {
									Chat.resetToLogin(true);
								} else if (body.event === 'read') {
									markIncomingRead(body);
								} else {
									incomingMessage(body);
								}
							}
						} else {
							Chat.resetToLogin(true);
						}
					} else {
						Chat.resetToLogin(true);
					}
				} else {
					Chat.resetToLogin(true);
				}
				if (Chat.triggerMenu && !Chat.menu && Chat.client) {
					var hashedMsg = fuse(Chat.triggerMenu);
					var msgObj = { "message": Chat.triggerMenu, "token": Chat.token, "messageHash": hashedMsg };
					encrypt(msgObj, fuse(Chat.client_secret + Chat.access_token));
					Chat.client.send("/app/wmessage", { accessToken: Chat.access_token }, JSON.stringify(msgObj));
					Chat.menu = true;
				}
			}, { accessToken: Chat.access_token });
		} 
	},
	subscribeFeed: function () {
		if (Chat.session_id !== null) {
			Chat.addKeydownEvent();
			Chat.client.subscribe('/topic/feeds-' + Chat.session_id, function (message) {
				console.log("subcribe message, session id: " + Chat.session_id + ", message: " + message);
				if (/^[\],:{}\s]*$/.test(message.body.replace(/\\["\\\/bfnrtu]/g, '@').replace(/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g, ']').replace(/(?:^|:|,)(?:\s*\[)+/g, ''))) {
					var msgObj = JSON.parse(message.body);
					if (decrypt(msgObj, fuse(Chat.client_secret + Chat.access_token))) {
						if (msgObj.inbound !== null && msgObj.inbound === true) {
							outgoingMessageFeed(msgObj);
						}
						if (msgObj.outbound !== null && msgObj.outbound === true) {
							incomingMessageFeed(msgObj);
						}
						if (msgObj.disconnect !== null && msgObj.disconnect === true) {
							Chat.resetToLogin(true);
						}
					}
				}
				updateScrollbar();
			}, { accessToken: Chat.access_token });
		}
	},
	subscribeTransaction: function () {
		transactionToken = Chat.access_token;
		messageTransaction = Chat.client.subscribe("/topic/ack-" + Chat.access_token,
			function (ack_message) {
				var values = [];
				transactions.forEach(function (value) {
					if ("" + value.txId === ack_message.body) {
						$('#' + value.txId).addClass("message-sent");
						setDate(false);
						ack_message.ack({ transaction: value.txId });
						values.push(value);
						saveToSession();
					}
				});
				values.forEach(function (value) {
					transactions.remove(value);
				});
			}, { ack: 'client', accessToken: Chat.access_token }
		);
	},
	displayChatWindow: function () {
		if (localStorage.getItem(CHAT_STATE_VARIABLE_NAME) !== CHAT_STATE_ICON) {
			$(".dolphin-chat-icon").hide();
			$(".dolphin-chat").css("display", "flex");
			$(".dolphin-chat").fadeIn("fast");
			$(".dolphin-login").hide();
			$(".dolphin-chat-notification").hide();
			localStorage.setItem(CHAT_STATE_VARIABLE_NAME, CHAT_STATE_CHAT);
			updateScrollbar();
			removeConnectionAnimation()
		}
	},
	buildLogin: function (element) {
		if (!Chat.guestName) {
			if ($(".dolphin-login").is(":visible")) {
				$(".dolphin-chat-icon").fadeOut("slow");
				$(".dolphin-chat-notification").fadeOut("slow");
			}

			if (element.childNodes.length === 0) {
				var title = this.createDOMElem('div', 'dolphin-chat-title');
				element.appendChild(title);
				var avatar = this.createDOMElem('figure', 'avatar');
				avatar.innerHTML = '<img src=\"' + Chat.avatar + '\"/>';
				title.appendChild(avatar);

				var header = this.createDOMElem('h1', 'header-title');
				title.appendChild(header);
				header.innerHTML = this.header;

				var sub_header = this.createDOMElem('h2', 'sub-header-title');
				title.appendChild(sub_header);
				sub_header.innerHTML = this.login_sub_header;

				var chat_close = this.createDOMElem('div', 'login-close');
				title.appendChild(chat_close);
				chat_close.innerHTML = '<button type=\"submit\" class=\"dolphin-message-close\" style="right:10px;"></button>';

				var body = this.createDOMElem('div', 'dolphin-login-body');
				element.appendChild(body);
				body.innerHTML = body.innerHTML + '<label class=\"dolphin-connect-message\">' + Chat.connect_message + "</label>";
				body.innerHTML = body.innerHTML + '<label id=\"warning-login\" class=\"dolphin-error-info\"></label>';
				body.innerHTML = body.innerHTML + '<input id=\"name\" type=\"text\" class=\"dolphin-name-input\" placeholder=\"' + Chat.name_placeholder + '\"></input><br>';
				body.innerHTML = body.innerHTML + '<label id=\"warning-name\" class=\"dolphin-warning-name\"></label>';
				body.innerHTML = body.innerHTML + '<br><br><input id=\"email\" type=\"text\" class=\"dolphin-email-input\" placeholder=\"' + Chat.email_placeholder + '\"></input><br>';
				body.innerHTML = body.innerHTML + '<label id=\"warning-email\" class=\"dolphin-warning-email\"></label>';
				body.innerHTML = body.innerHTML + '<br><br><input id=\"telephone\" type=\"text\" class=\"dolphin-phone-input\" placeholder=\"' + Chat.phone_placeholder + '\"></input><br>';
				body.innerHTML = body.innerHTML + '<label id=\"warning-phone\" class=\"dolphin-warning-phone\"></label>';
				if (Chat.g_captcha_key !== null && Chat.g_captcha_key !== undefined) {
					body.innerHTML = body.innerHTML + "<div class=\"dolphin-captcha\"><div class=\"g-recaptcha\" data-sitekey=\"" + Chat.g_captcha_key + "\" data-theme=\"dark\"></div></div>";
				} else {
					body.innerHTML = body.innerHTML + "<br><br>";
				}
				body.innerHTML = body.innerHTML + '<button type=\"submit\" class=\"dolphin-login-connect\">' + Chat.connect_button_text + '</button>';
			
				$(".dolphin-message-close").click(function () {
					$(".dolphin-login").fadeOut("fast");
					$(".dolphin-chat").fadeOut("fast");
					$(".dolphin-chat-icon").removeClass("dolphin-icon-waiting");
					$(".dolphin-chat-icon").fadeIn("slow");
					if (Chat.enable_campaign && !localStorage.getItem("messages")) {
						$('.dolphin-campaign-widget').fadeIn('fast');
					}
					enableBodyScroll()
					localStorage.setItem(CHAT_STATE_VARIABLE_NAME, CHAT_STATE_ICON);
					Chat.state = CHAT_STATE_ICON;
				});

				$("#name,#email,#telephone").keyup(function (event) {
					if (event.keyCode === 13) $(".dolphin-login-connect").click();
				});
			}

			$(".dolphin-login-connect").click(function () {
				$(".dolphin-warning-login-box").remove();
				$(".dolphin-error-login-box").remove();
				$(".dolphin-error-info").html("");
				Chat.uid = Chat.generateUid();
				Chat.name = $("#name").val();
				var validName = Chat.validateName(Chat.name, $("#warning-name"));
				Chat.email = $("#email").val();
				var validEmail = Chat.validateEmail(Chat.email, $("#warning-email"));
				Chat.phone = $("#telephone").val();
				var validPhone = Chat.validatePhone(Chat.phone, $("#warning-phone"));

				if (validName && validPhone && validEmail) {
					if (!Chat.webview) {
						clearChatLocalStorage();
						Chat.client = null;
						localStorage.setItem(CHAT_STATE_VARIABLE_NAME, CHAT_STATE_CHAT);
					}
					Chat.initToken(Chat);
				}
			});
		}
	},
	buildChat: function (element) {
		if (element.childNodes.length === 0) {
			var title = this.createDOMElem('div', 'dolphin-chat-title');
			element.appendChild(title);
			var avatar = this.createDOMElem('figure', 'avatar');
			avatar.innerHTML = '<img src=\"' + Chat.avatar + '\"/>';
			title.appendChild(avatar);

			var header = this.createDOMElem('h1', 'header-title');
			title.appendChild(header);
			header.innerHTML = this.header;

			var sub_header = this.createDOMElem('h2', 'sub-header-title');
			title.appendChild(sub_header);
			sub_header.innerHTML = this.chat_sub_header;

			var chat_close = this.createDOMElem('div', 'dolphin-chat-close');
			title.appendChild(chat_close);
			if (Chat.enable_voice) {
				chat_close.innerHTML = '<button type=\"submit\" class=\"dolphin-message-mute\" onclick=\"switchVoice()\"/><button type=\"submit\" class=\"dolphin-message-close\"/><button type=\"submit\" class=\"dolphin-message-logout\"/>';
			} else {
				chat_close.innerHTML = '<button type=\"submit\" class=\"dolphin-message-unmute\" onclick=\"switchVoice()\"/><button type=\"submit\" class=\"dolphin-message-close\"/><button type=\"submit\" class=\"dolphin-message-logout\"/>';
			}
			var chat_messages = this.createDOMElem('div', 'dolphin-messages');
			element.appendChild(chat_messages);
			var messages_content = this.createDOMElem('div', 'messages-content');
			chat_messages.appendChild(messages_content);

			var upload_progress_div = this.createDOMElem('div', 'dolphin-upload-progress');
			upload_progress_div.style.display = "none";
			var upload_progress_text = this.createDOMElem('div', 'upload-progress-text');
			upload_progress_text.innerHTML = Chat.uploading_text;
			upload_progress_div.appendChild(upload_progress_text);
			var upload_progress = this.createDOMElem('div', 'progress-indicator');
			upload_progress_div.appendChild(upload_progress);
			element.appendChild(upload_progress_div);

			var messages_box = this.createDOMElem('div', 'dolphin-message-box');
			var messages_box_html = '<textarea type=\"text\" class=\"message-input\" placeholder=\"' + Chat.type_placeholder + '\" disabled></textarea>[attachment_placeholder][voice_placeholder]' + '<button type=\"submit\" class=\"message-submit\">Send</button>';
			if (Chat.enable_attachment) {
				messages_box_html = messages_box_html.replace(/\[attachment_placeholder\]/gi,'<form method="POST" enctype="multipart/form-data" id="attachment-form"><input id="attachment" type=\"file\" class=\"dolphin-inputfile inputfile-1\" onchange=\"uploadFile()\"/><label for="attachment"><figure class="dolphin-attachment-figure"><svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 19 20"><path d="M10 0l-5.2 4.9h3.3v5.1h3.8v-5.1h3.3l-5.2-4.9zm9.3 11.5l-3.2-2.1h-2l3.4 2.6h-3.5c-.1 0-.2.1-.2.1l-.8 2.3h-6l-.8-2.2c-.1-.1-.1-.2-.2-.2h-3.6l3.4-2.6h-2l-3.2 2.1c-.4.3-.7 1-.6 1.5l.6 3.1c.1.5.7.9 1.2.9h16.3c.6 0 1.1-.4 1.3-.9l.6-3.1c.1-.5-.2-1.2-.7-1.5z"/></svg></figure></label></form>');
			} else {
				messages_box_html = messages_box_html.replace(/\[attachment_placeholder\]/gi,'');
			}

			if (Chat.enable_speech) {
				messages_box_html = messages_box_html.replace(/\[voice_placeholder\]/gi,'<button id=\"start-button\" class=\"speech-recognizer\" onclick=\"onSpeechEvent();\"><figure id=\"figure-microphone\" class="dolphin-speech-figure"><svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 20 20"><path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"/></svg></figure></button>');
			} else {
				messages_box_html = messages_box_html.replace(/\[voice_placeholder\]/gi,'');
			}
			messages_box.innerHTML = messages_box_html;

			element.appendChild(messages_box);
			Chat.addKeydownEvent();
			$('.dolphin-message-box .message-submit').click(function () {
				outgoingMessage();
			});

			$(".dolphin-message-close").click(function () {
				$(".dolphin-login").fadeOut("fast");
				$(".dolphin-chat").fadeOut("fast");
				$(".dolphin-chat-icon").removeClass("dolphin-icon-waiting");
				$(".dolphin-chat-icon").fadeIn("slow");
				enableBodyScroll();
				localStorage.setItem(CHAT_STATE_VARIABLE_NAME, CHAT_STATE_ICON);
				Chat.state = CHAT_STATE_ICON;
			});
			$(".dolphin-message-logout").click(function () {
				Chat.name = undefined;
				Chat.phone = undefined;
				Chat.email = undefined;
				$(".dolphin-chat").children().remove();
				Chat.resetToLogin(true);
			});
			renderQueueNumber();
			setTimeout(renderQueueNumber,30000);
		}

		if (localStorage.getItem("at") !== null) {
			$(".dolphin-error-info").html("");
			Chat.displayChatWindow();
		}
	},
	reLogin: function() {
		Chat.initToken(Chat);
		Chat.loginToWebchat();
	},
	buildError: function (element, message) {
		Chat.buildChat(Chat.chat_box);
		$(".dolphin-messages .messages-content").removeClass("dolphin-icon-waiting");
		var retry = "";
		if (message && typeof message.toLowerCase !== "undefined" && message.toLowerCase() !== 'retry') {
			document.cookie = "inmotion_token=";
			Chat.token = null;
			if (Chat.client !== null) {
				if (messageSubscription) {
					messageSubscription.unsubscribe();
					messageSubscription = undefined;
				}
				if (messageTransaction) {
					messageTransaction.unsubscribe();
					messageTransaction = undefined;
				}
				if (Chat.client !== null && Chat.client.connected) {
					Chat.client.disconnect();
				}
			}
			Chat.unread = 0;
			if (element !== null) {
				if (Chat.state !== "icon") {
					$(element).fadeIn("fast");
				}
				$(".dolphin-warning-login-box").remove();
				if ($('.dolphin-chat').children().length !== 0) {
					$(".dolphin-chat-icon").hide();
					$(".dolphin-chat-notification").fadeOut("fast");
					localStorage.setItem(CHAT_STATE_VARIABLE_NAME, CHAT_STATE_CHAT);
				}
				if (message.toLowerCase().indexOf("connection") !== -1 && localStorage.getItem("messages") !== null) {
					$('<div class=\"dolphin-warning-login-box\"><label id=\"warning-login\" class=\"dolphin-warning-login\">' + message + '</label></div>').appendTo(element);
					setTimeout(function () {
						$(".dolphin-warning-login-box").remove();
						$('<div class=\"dolphin-warning-login-box\"><label id=\"warning-login\" class=\"dolphin-warning-login\">Reconnecting...</label></div>').appendTo(element);
						setTimeout(function () {
							if (!Chat.isconnecting && reconnect < 5) {
								$(".dolphin-error-login-box").remove();
								reconnect = reconnect + 1;
								Chat.connectServer();
							}
						}, 3000);
					}, 5000);
				} else {
					if (Chat.name && Chat.phone && Chat.email) {
						setTimeout(function () {
							$(".dolphin-warning-login-box").remove();
							$('<div class=\"dolphin-warning-login-box\"><label id=\"warning-login\" class=\"dolphin-warning-login\">Reconnecting...</label></div>').appendTo(element);
							setTimeout(function () {
								if (!Chat.isconnecting && reconnect < 5) {
									$(".dolphin-error-login-box").remove();
									reconnect = reconnect + 1;
									Chat.connectServer();
								}
							}, 3000);
						}, 5000);
					} else {
						retry = '<button type=\"submit\" class=\"dolphin-message-retry\" onclick=\"Chat.resetToLogin(true)\">Retry</button>'
					}
					$(".dolphin-error-login-box").remove();
					if (Chat.state !== "icon") {
						if ($(".dolphin-chat").children().length === 0) {
							$('<div class=\"dolphin-error-login-box\"><label id=\"error-login\" class=\"dolphin-error-login\">' + message + '</label><br/>' + retry + '</div>').appendTo(element);
						} else {
							$('<div class=\"dolphin-error-login-box\" style=\"height:5%\"><label id=\"error-login\" class=\"dolphin-error-login\" style=\"font-size:12px;\">' + message + '</label><br/>' + retry + '</div>').appendTo(element);
						}
					}
					if (!$(".dolphin-login").is(":visible") 
						&& !$(".dolphin-chat").is(":visible") 
						&& !$(".dolphin-chat-icon").is(":visible")) {
						Chat.resetToLogin(true);
					}
				}
			}
			Chat.isconnecting = false;
			removeConnectionAnimation()
		} else {
			Chat.isconnecting = false;
			removeConnectionAnimation()
			$(".dolphin-error-login-box").remove();
			$(".dolphin-warning-login-box").remove();
			if (Chat.client !== null) {
				retry = '<button type=\"submit\" class=\"dolphin-message-retry\" onclick=\"Chat.connectServer()\">Retry</button>'
				$('<div class=\"dolphin-warning-login-box\" style=\"height: 8%\"><br/>' + retry + '</div>').appendTo(element);
			} else {
				retry = '<button type=\"submit\" class=\"dolphin-message-retry\" onclick=\"Chat.reLogin()\">Login</button>'
				$('<div class=\"dolphin-warning-login-box\" style=\"height: 8%\"><br/>' + retry + '</div>').appendTo(element);
				if (messageSubscription) {
					messageSubscription.unsubscribe();
					messageSubscription = undefined;
				}
				if (messageTransaction) {
					messageTransaction.unsubscribe();
					messageTransaction = undefined;
				}
			}
		}
	},
	resetToLogin: function (resetToken) {
		$(".dolphin-messages .messages-content").removeClass("dolphin-icon-waiting");
		if (!Chat.webview) {
			if (resetToken) {
				document.cookie = "inmotion_token=";
				Chat.token = null;
			}
			if (Chat.client !== null && Chat.client.connected) {
				Chat.client.disconnect();
			}
			Chat.unread = 0;
			if (!Chat.guestName) {
				if (Chat.login_box !== null) {
					if ($(".dolphin-chat .dolphin-messages").children().length === 0) {
						clearChatLocalStorage();
						deleteAllCookies();
						Chat.buildLogin(Chat.login_box);
						$(".dolphin-login").fadeIn("slow");
						$(".dolphin-chat-icon").fadeOut("slow");
						$(".dolphin-chat-notification").fadeOut("slow");
						$(".dolphin-chat").fadeOut("slow");
						if (document.getElementById("messages-content") !== null) {
							document.getElementById("messages-content").innerHTML = "";
						}
						if (Chat.g_captcha_key !== null && Chat.g_captcha_key !== undefined) {
							grecaptcha.reset();
						}
					} else {
						Chat.buildError(Chat.chat_box, "retry")
					}
				} else {
					clearChatLocalStorage();
					deleteAllCookies();
					Chat.buildLogin(Chat.login_box);
					if (document.getElementById("messages-content") !== null) {
						document.getElementById("messages-content").innerHTML = "";
					}
					if (Chat.g_captcha_key !== null && Chat.g_captcha_key !== undefined) {
						grecaptcha.reset();
					}
				}
			} else {
				clearChatLocalStorage();
				deleteAllCookies();
				$(".dolphin-chat-notification").fadeOut("slow");
				$(".dolphin-chat").css("display", "none");
				$(".dolphin-chat-icon").removeClass("dolphin-icon-waiting");
				$(".dolphin-chat-icon").fadeIn("slow");
				if (document.getElementById("messages-content") !== null) {
					document.getElementById("messages-content").innerHTML = "";
				}
				if (Chat.g_captcha_key !== null && Chat.g_captcha_key !== undefined) {
					grecaptcha.reset();
				}
			}
			localStorage.setItem(CHAT_STATE_VARIABLE_NAME, CHAT_STATE_CHAT);
			Chat.menu = false;
			Chat.client = null;
			Chat.isconnecting = false;
			isGettingChatHistory = false;
			isInitiatingToken = false;
			isRefreshingToken = false;
			if (messageSubscription) {
				messageSubscription.unsubscribe();
				messageSubscription = undefined;
			}
			if (messageTransaction) {
				messageTransaction.unsubscribe();
				messageTransaction = undefined;
			}
			reconnect = 0;
		}
		removeConnectionAnimation();
	}
};

/**
 * Add mark with initialization position lat and long
 * 
 * @param position
 */
function addMarker(position) {
	var marker = new google.maps.Marker({
		position: position
	});

	markers.push(marker);
	setMarkersOnMap(map);
	map.setCenter(position);
}

/**
 * Set marker in Maps
 * 
 * @param position
 */
function setMarkersOnMap(map) {
	for (var i = 0; i < markers.length; i++) {
		markers[i].setMap(map);
	}
}


/**
 * Remove Marker in Maps
 * 
 * @param position
 */
function removeMarkers() {
	if (markers.length > 0) {
		markers.pop().setMap(null);
	}
}

/**
 * Send message to notify webchat server on uploaded file
 * 
 * @returns
 */
function sendFileMessage(message, attachmentUrl, file) {
	if (!Chat.mobile) {
		var isIE = detectBroadcastCapability();
		if (!isIE && outgoingChannel) {
			outgoingChannel.postMessage("Attachment");
		}
	}
	if (Chat.client !== null) {
		var transactionId = getTimeInMillliseconds();
		message.transactionId = "" + transactionId;
		encrypt(message, fuse(Chat.client_secret + Chat.access_token));
		var tx = Chat.client.begin(transactionId);
		Chat.client.send("/app/wmessage", { accessToken: Chat.access_token, transaction: transactionId }, JSON.stringify(message));
		var attachmentEl = createAttachmentElement(transactionId, attachmentUrl, file);
		$("" + attachmentEl).appendTo($('.dolphin-messages .messages-content')).addClass('new');
		transactions.push({ message: message, txId: transactionId });
		tx.commit();
	} else {
		$('<div class="message message-failed">Attachment</div>').appendTo($('.dolphin-messages .messages-content')).addClass('new');
		setDate(true);
	}
	saveToSession();
}

/**
 * Encrypt and send text message
 * 
 * @param {*} msgObj 
 * @param {*} message 
 */
function sendTextMessage(msgObj, message) {
	var transactionId;
	if (!msgObj.transactionId) {
		transactionId = getTimeInMillliseconds();
		msgObj.transactionId = "" + transactionId;
	} else {
		transactionId = msgObj.transactionId;
	}
	encrypt(msgObj, fuse(Chat.client_secret + Chat.access_token));
	var tx = Chat.client.begin(transactionId);
	Chat.client.send("/app/wmessage", { accessToken: Chat.access_token, transaction: transactionId }, JSON.stringify(msgObj));
	transactions.push({ message: message, txId: transactionId });
	tx.commit();
}

/**
  * Update scrollbar when incoming or outgoing message
  * 
  * @returns
  */
function updateScrollbar() {
	$('.dolphin-messages .messages-content').animate({ scrollTop: $('.dolphin-messages .messages-content').prop("scrollHeight") });
	renderQueueNumber();
	setTimeout(renderQueueNumber, 30000);
}

/**
 * Save messages html and set expiry for 10 minutes
 */
function saveToSession() {
	if (!Chat.webview) {
		if (Chat.number_of_messages && $('.dolphin-messages .messages-content').children().length > Chat.number_of_messages) {
			var number_of_trash = $('.dolphin-messages .messages-content').children().length - Chat.number_of_messages;
			if (number_of_trash > 0) {
				$('.dolphin-messages .messages-content > div').slice(0, number_of_trash).remove()
			}
		}
		var messages = $('.dolphin-messages .messages-content').html();
		localStorage.setItem("messages", messages);
		updateScrollbar();
	}
}

/**
 * Clear chat local storage
 */
function clearChatLocalStorage() {
	localStorage.removeItem('at');
	localStorage.removeItem('name');
	localStorage.removeItem('email');
	localStorage.removeItem('phone');
	localStorage.removeItem('messages');
	localStorage.removeItem('expiry');
	localStorage.removeItem('uid');
	localStorage.removeItem('token');
	localStorage.removeItem(CHAT_STATE_VARIABLE_NAME);
}

/***
 * Set date for timestamp offline is reserved to handle offline message
 * 
 * @param offline
 * @returns
 */
function setDate(offline) {
	var d,
		m = 0;
	d = new Date();
	m = d.getMinutes();
	$('<div class="timestamp">' + d.getHours() + ':' + (m < 10 ? '0' : '') + m + '</div>').appendTo($('.message:last'));
}

/**
 * Render all outgoing message from feed subscription to handle move page
 * 
 * @param msg
 * @returns
 */
function outgoingMessageFeed(payload) {
	if (Chat.client !== null) {
		if (payload.attUrl) {
			var attachmentEl = '';
			if (payload.attFiletype.includes('image')) {
				attachmentEl = '<div class="message message-image-personal">' + '<a href="' + payload.attUrl + '" download="' + file.name + '" target="_blank" style="font-size:10px;"><img class="dolphin-attachment-image" src="' + payload.attUrl + '" alt="' + file.name + '"/></a>' + '</div>';
			} else {
				attachmentEl = '<div class="message message-personal">' + '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.0" x="0px" y="0px" viewBox="0 0 24 24" class="icon icons8-Document" ><g id="surface1"><path style=" " d="M 14 2 L 6 2 C 4.898438 2 4 2.898438 4 4 L 4 20 C 4 21.101563 4.898438 22 6 22 L 18 22 C 19.101563 22 20 21.101563 20 20 L 20 8 Z M 16 14 L 8 14 L 8 12 L 16 12 Z M 14 18 L 8 18 L 8 16 L 14 16 Z M 13 9 L 13 3.5 L 18.5 9 Z "></path></g></svg>' + '<div class="dolphin-attachment-filename-sent"><a class="attachment-filename-text" href="' + attachmentUrl + '" download="' + file.name + '" target="_blank" style="font-size:10px;">' + file.name + '</a></div>' + '</div>';
			}
			$(attachmentEl).appendTo($('.dolphin-messages .messages-content')).addClass('new');
		} else {
			var message = escapeSpecialChar(payload.message);
			message = urlify(message);
			$('<div class="message message-personal">' + message + '</div>').appendTo($('.dolphin-messages .messages-content')).addClass('new');
		}
		setDate(false);
	}
	$('.dolphin-message-box .message-input').val(null);
	removeQuickReply();
	updateScrollbar();
}

/**
 * Render all incoming message from feed subscription to handle page move
 * 
 * @param value
 * @returns
 */
function incomingMessageFeed(payload) {
	removeQuickReply();
	var message = payload.message;
	var avatar = Chat.agent_avatar;
	var agentName = "";
	if (payload.agentAvatar !== undefined && payload.agentAvatar !== null && payload.agentAvatar !== "") {
		avatar = payload.agentAvatar;
	}
	if (payload.agentName !== undefined && payload.agentName !== null && payload.agentName !== "") {
		agentName = payload.agentName;
		renderQueueNumber();
	}

	if (payload.attUrl) {
		var attachmentEl = '';
		if (payload.attFiletype.includes("image")) {
			attachmentEl = '<a href="' + payload.attUrl + '?access_token=' + Chat.access_token + '" download="' + payload.attFilename + '?access_token=' + Chat.access_token + '" target="_blank" style="font-size:10px;"><img class="dolphin-attachment-image" src="' + payload.attUrl + '?access_token=' + Chat.access_token + '" alt="' + payload.attFilename + '"/></a>';
			$('<div class="message message-image-agent new"><figure class="avatar"></figure>' + attachmentEl + '</div>').appendTo($('.dolphin-messages .messages-content')).addClass('new');
		} else if (payload.attFiletype && payload.attFiletype.includes("video")) {
			attachmentEl = '<video controls width="250" style="border-radius:3px;"> <source src="' + payload.attUrl + '?access_token=' + Chat.access_token + '" type="' + payload.attFiletype + '"/></video>';
			$('<div class="message message-image-agent new"><figure class="avatar"></figure>' + attachmentEl + '</div>').appendTo($('.dolphin-messages .messages-content')).addClass('new');
		} else if (payload.attFiletype && payload.attFiletype.includes("audio")) {
			attachmentEl = '<audio controls style="border-radius:3px;height:40px;width:250px;"><source src="' + payload.attUrl + '?access_token=' + Chat.access_token + '" type="' + payload.attFiletype + '"/></audio>';
			$('<div class="message message-image-agent new"><figure class="avatar"></figure>' + attachmentEl + '</div>').appendTo($('.dolphin-messages .messages-content')).addClass('new');
		} else {
			attachmentEl = '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.0" x="0px" y="0px" viewBox="0 0 24 24" style="width:15px;" class="icon icons8-Document" ><g id="surface1"><path style=" " d="M 14 2 L 6 2 C 4.898438 2 4 2.898438 4 4 L 4 20 C 4 21.101563 4.898438 22 6 22 L 18 22 C 19.101563 22 20 21.101563 20 20 L 20 8 Z M 16 14 L 8 14 L 8 12 L 16 12 Z M 14 18 L 8 18 L 8 16 L 14 16 Z M 13 9 L 13 3.5 L 18.5 9 Z "></path></g></svg>' + '<div class="attachment-filename-receive"><a class="attachment-filename-text" href="' + payload.attUrl + '">' + payload.attFilename + '</a></div>';
			$('<div class="message new"><figure class="avatar"></figure>' + attachmentEl + '</div>').appendTo($('.dolphin-messages .messages-content')).addClass('new');
		}
	} else if (isQuickReply(message)) {
		if (Chat.quick_reply_flat) {
			buildQuickReplyFlat(message);
		} else {
			buildQuickReply(message);
		}
	} else if (isButton(message)) {
		buildButton(message, true);
	} else {
		message = escapeSpecialChar(message);
		message = urlify(message);
		if (agentName !== "") {
			$('<div class="message new"><figure class="avatar"><img src=\"' + avatar + '\"/></figure>' + message + '<br/><span style=\"color:#2ECC71;float:right;font-size:10px;margin-top:3px;\">' + escapeSpecialChar(agentName) + '</span></div>').appendTo($('.dolphin-messages .messages-content')).addClass('new');
		} else {
			$('<div class="message new"><figure class="avatar"><img src=\"' + avatar + '\"/></figure>' + message + '</div>').appendTo($('.dolphin-messages .messages-content')).addClass('new');
		}
	}
	if (!isButton(message)) {
		if (Chat.client === null) {
			setDate(false);
		} else {
			setDate(true);
		}
	}
	updateScrollbar();
	saveToSession();
}

/**
 * Detect Browser Capability for Broadcast Channel
 */
function detectBroadcastCapability() {
	var ua = window.navigator.userAgent;
	var msie = ua.indexOf('MSIE ');
	if (msie > 0) {
		// IE 10 or older => return version number
		return parseInt(ua.substring(msie + 5, ua.indexOf('.', msie)), 10);
	}

	var trident = ua.indexOf('Trident/');
	if (trident > 0) {
		// IE 11 => return version number
		var rv = ua.indexOf('rv:');
		return parseInt(ua.substring(rv + 3, ua.indexOf('.', rv)), 10);
	}

	var edge = ua.indexOf('Edge/');
	if (edge > 0) {
		// Edge (IE 12+) => return version number
		return parseInt(ua.substring(edge + 5, ua.indexOf('.', edge)), 10);
	}

	var safari = ua.indexOf('Safari/');
	var chrome = ua.indexOf('Chrome/')
	if (safari > 0 && chrome < 0) {
		// Safari => return version number
		return parseInt(ua.substring(safari + 7, ua.indexOf('.', safari)), 10);
	}


	// other browser
	return false;
}

/**
 * Check is Mobile Browser
 */
function isUsingMobileBrowser() {
	return navigator.userAgent.match(/Android/i)
		|| navigator.userAgent.match(/iPhone/i)
		|| navigator.userAgent.match(/iPad/i)
		|| navigator.userAgent.match(/iPod/i)
		|| navigator.userAgent.match(/BlackBerry/i)
		|| navigator.userAgent.match(/Windows Phone/i);
}

/**
 * Escape html-like tag
 */
function escapeSpecialChar(str) {
	try {
		return String(str.trim())
			.replace(/&/g, "&amp;")
			.replace(/</g, "&lt;")
			.replace(/>/g, "&gt;")
			.replace(/"/g, "&quot;")
			.replace(/'/g, "&#039;")
			.replace(/\//g, "&#x2F;")
			.replace(/\r?\n/g, "<br/>")
	} catch(e) {
		return String(str)
			.replace(/&/g, "&amp;")
			.replace(/</g, "&lt;")
			.replace(/>/g, "&gt;")
			.replace(/"/g, "&quot;")
			.replace(/'/g, "&#039;")
			.replace(/\//g, "&#x2F;")
			.replace(/\r?\n/g, "<br/>")
	}
}

/**
 * Resubscribe Transaction
 */
function resubscribeTransaction() {
	if (transactionToken !== Chat.access_token) {
		if (messageTransaction !== undefined) {
			messageTransaction.unsubscribe();
			messageTransaction = undefined;
		}
		Chat.subscribeTransaction();
		sleep(1000);
	}
}

/**
 * Callback for outgoing message after refresh token
 */
function callbackOutgoingMessage(rat) {
	var message = $('.dolphin-message-box .message-input').val();
	if (!Chat.mobile) {
		var isIE = detectBroadcastCapability();
		if (!isIE && outgoingChannel) {
			outgoingChannel.postMessage(message);
		}
	}
	if ($.trim(message) == '') {
		return false;
	}
	if (rat !== null && rat !== undefined && rat.access_token !== undefined && rat.refresh_token !== undefined) {
		Chat.access_token = rat.access_token;
		Chat.refresh_token = rat.refresh_token;
		resubscribeTransaction()
		sendTextMessage(tempMsgObj, message);
	} else {
		Chat.buildError(Chat.chat_box, "Access Denied");
	}
}

function preRenderOutgoingMessage(message, label) {
	var hashedMsg = fuse(message);
	if (tempMsgObj && tempMsgObj.latitude) {
		tempMsgObj = { "message": message, "token": Chat.token, "messageHash": hashedMsg, "latitude": tempMsgObj.latitude, "longitude": tempMsgObj.longitude };
	} else {
		tempMsgObj = { "message": message, "token": Chat.token, "messageHash": hashedMsg }
	}
	tempMsgObj.transactionId = "" + getTimeInMillliseconds();
	message = escapeSpecialChar(message);
	message = urlify(message);
	if (label) {
		$('<div id="' + tempMsgObj.transactionId + '" class="message message-sending">' + label + '</div>').appendTo($('.dolphin-messages .messages-content')).addClass('new');
	} else {
		$('<div id="' + tempMsgObj.transactionId + '" class="message message-sending">' + message + '</div>').appendTo($('.dolphin-messages .messages-content')).addClass('new');
	}
}

/**
 * Render outgoing message bubble
 * 
 * @returns
 */
function outgoingMessage() {
	var message = $('.dolphin-message-box .message-input').val();
	if (!Chat.mobile) {
		var isIE = detectBroadcastCapability();
		if (!isIE && outgoingChannel) {
			outgoingChannel.postMessage(message);
		}
	}
	if ($.trim(message) == '') {
		return false;
	}

	if (Chat.client !== null) {
		preRenderOutgoingMessage(message);
		refreshAccessToken(Chat.url, Chat.client_id, Chat.client_secret, Chat.refresh_token, Chat.token, Chat.g_recaptcha, callbackOutgoingMessage);
	} else {
		message = escapeSpecialChar(message);
		message = urlify(message);
		$('<div class="message message-failed">' + message + '</div>').appendTo($('.dolphin-messages .messages-content')).addClass('new');
		setDate(true);
		Chat.buildError(Chat.chat_box, "retry");
	}
	$('.dolphin-message-box .message-input').val(null);
	removeQuickReply();
	saveToSession();
}

/**
 * Render quick reply when option clicked
 * 
 * @param message
 * @returns
 */
function outgoingQuickReply(message, label) {
	if (!message) {
		message = $('.dolphin-message-box .message-input').val();
		if ($.trim(message) == '') {
			return false;
		}
	}
	if (Chat.client !== null) {
		if (message.trim().toLowerCase() === 'location') {
			getLocation(tempMsgObj, label);
		} else {
			preRenderOutgoingMessage(message, label);
			sendTextMessage(tempMsgObj, label);
		}
	} else {
		$('<div class="message message-failed">' + escapeSpecialChar(label) + '</div>').appendTo($('.dolphin-messages .messages-content')).addClass('new');
		setDate(true);
	}
	$('.dolphin-message-box .message-input').val(null);
	removeQuickReply();
	updateScrollbar();
}

/**
 * Submit Current Location to Socket
 */
function submitLocation() {
	if (typeof tempMsgObj.latitude !== "undefined") {
		toggleMapModal();
		preRenderOutgoingMessage(tempLabel);
		sendTextMessage(tempMsgObj, tempLabel);
		$('#dolphin-mapSearchTextField').val("");
		tempLabel = null;
		tempMsgObj = null;
		updateScrollbar();
	} 
}

/**
 * Get current location
 * 
 * @param msgObj 
 * @param label 
 */
function getLocation(msgObj, label) {
	if (typeof navigator.geolocation !== "undefined") {
		navigator.geolocation.getCurrentPosition(function (position) {
			msgObj.latitude = position.coords.latitude;
			msgObj.longitude = position.coords.longitude;

			var latlng = {
				lat: msgObj.latitude,
				lng: msgObj.longitude
			};

			map.setCenter(latlng);
			addMarker(latlng)
			toggleMapModal();
			getAddress(latlng, msgObj);

		}, function (error) {
			msgObj.message = 'Location setting is not available';
			preRenderOutgoingMessage(msgObj.message);
			sendTextMessage(msgObj, msgObj.message);
			if (Chat.errorLocationMessage && Chat.errorLocationMessage !== "") {
				var payload = { message: "" };
				payload.message = Chat.errorLocationMessage;
				incomingMessageErrorLocation(payload)
			}
		});
	} else {
		msgObj.message = "Geolocation is not supported by this browser";
		preRenderOutgoingMessage(msgObj.message);
		sendTextMessage(msgObj, msgObj.message);
	}
}

/**
 * Get address by latitude and longitude
 * 
 * @param latlng 
 * @param msgObj 
 */
function getAddress(latlng, msgObj) {
	geocoder.geocode({ 'location': latlng }, function (results, status) {
		if (status === 'OK') {
			if (results[0]) {
				map.setZoom(17);
				tempLabel = results[0].formatted_address;
				$('#dolphin-mapSearchTextField').val(tempLabel);
			} else {
				window.alert('No results found');
			}
		} else {
			window.alert('Geocoder failed due to: ' + status);
		}
	});
}

/**
 * Toggle map dialog
 */
function toggleMapModal() {
	$('#dolphin-mapModal').toggleClass('dolphin-show-map-modal');
}

/**
 * Render loading bubble when agent is typing
 * 
 * @returns
 */
function onAgentTyping(payload) {
	if (!Chat.isagenttyping) {
		Chat.isagenttyping = true;
		var avatar = Chat.agent_avatar;
		if (payload.agentAvatar !== undefined && payload.agentAvatar !== null && payload.agentAvatar !== "") {
			avatar = payload.agentAvatar;
		}
		$('<div class="message loading new"><figure class="avatar"><img src=\"' + avatar + '\" /></figure><span></span></div>').appendTo($('.dolphin-messages .messages-content'));
		updateScrollbar();

		setTimeout(function () {
			$('.message.loading').remove();
			Chat.isagenttyping = false;
		}, 2000);
	}
}

/**
 * Callback on customer typing
 * 
 * @param {*} rat 
 */
function callbackCustomerTyping(rat) {
	if (rat !== null && rat !== undefined && rat.access_token !== undefined && rat.refresh_token !== undefined) {
		Chat.access_token = rat.access_token;
		Chat.refresh_token = rat.refresh_token;
		resubscribeTransaction()

		var typingOn = { "token": Chat.token, "event": "typing_on" };
		encrypt(typingOn, fuse(Chat.client_secret + Chat.access_token));
		if (Chat.client != null) {
			Chat.client.send("/app/wmessage", { accessToken: Chat.access_token }, JSON.stringify(typingOn));
			setTimeout(function () {
				Chat.iscustomertyping = false;
			}, 10000);
		}
	} else {
		Chat.buildError(Chat.chat_box, "Access Denied");
	}
}

/**
 * Call method when customer is typing 
 * 
 * @returns
 */
function onCustomerTyping() {
	if (!Chat.iscustomertyping) {
		Chat.iscustomertyping = true;
		refreshAccessToken(Chat.url, Chat.client_id, Chat.client_secret, Chat.refresh_token, Chat.token, Chat.g_recaptcha, callbackCustomerTyping);
	}
}

/**
 * Sleep in miliseconds
 * 
 * @param milliseconds
 * @returns
 */
function sleep(milliseconds) {
	var start = new Date().getTime();
	for (var i = 0; i < 1e7; i++) {
		if (new Date().getTime() - start > milliseconds) {
			break;
		}
	}
}

/**
 * Send a mark read from incoming message transactions
 */
function sendMarkRead() {
	if ($('.chat').is(":visible")) {
		var values = [];
		incomingTransactions.forEach(function (value) {
			var msgObj = { token: Chat.token, event: "mark_read", transactionId: value };
			encrypt(msgObj, fuse(Chat.client_secret + Chat.access_token));
			Chat.client.send("/app/wmessage", { accessToken: Chat.access_token }, JSON.stringify(msgObj));
			values.push(value);
		})
		values.forEach(function (value) {
			incomingTransactions.remove(value);
		})
	}
}

/**
 * Speak the message
 * 
 * @param {*} message 
 */
function speak(message, lang, gender, isAgent) {
	if (typeof responsiveVoice !== "undefined" && Chat.enable_voice && !isAgent) {
		if (!responsiveVoice.isPlaying()) {
			if (lang === "english") {
				if (gender === "female") {
					responsiveVoice.speak(message.replace(/<(.|\n)*?>/g, '').replace(/([\uE000-\uF8FF]|\uD83C[\uDF00-\uDFFF]|\uD83D[\uDC00-\uDDFF])/g, '').replace(/[^a-zA-Z0-9 .,]/g, " "), "US English Female");
				} else {
					responsiveVoice.speak(message.replace(/<(.|\n)*?>/g, '').replace(/([\uE000-\uF8FF]|\uD83C[\uDF00-\uDFFF]|\uD83D[\uDC00-\uDDFF])/g, '').replace(/[^a-zA-Z0-9 .,]/g, " "), "US English Male");
				}
			} else {
				if (gender === "female") {
					responsiveVoice.speak(message.replace(/<(.|\n)*?>/g, '').replace(/([\uE000-\uF8FF]|\uD83C[\uDF00-\uDFFF]|\uD83D[\uDC00-\uDDFF])/g, '').replace(/[^a-zA-Z0-9 .,]/g, " "), "Indonesian Female");
				} else {
					responsiveVoice.speak(message.replace(/<(.|\n)*?>/g, '').replace(/([\uE000-\uF8FF]|\uD83C[\uDF00-\uDFFF]|\uD83D[\uDC00-\uDDFF])/g, '').replace(/[^a-zA-Z0-9 .,]/g, " "), "Indonesian Male");
				}
			}
		} else {
			setTimeout(function () {
				speak(message, lang, gender, isAgent);
			}, 1000);
		}
	}
}

/**
 * On incoming message display to html element
 * 
 * @param value
 * @returns
 */
function incomingMessage(payload) {
	removeQuickReply();
	var message = payload.message;
	var avatar = Chat.agent_avatar;
	var agentName = "";
	var isAgent = false;
	if (payload.agentAvatar !== undefined && payload.agentAvatar !== null && payload.agentAvatar !== "") {
		avatar = payload.agentAvatar;
	}
	if (payload.agentName !== undefined && payload.agentName !== null && payload.agentName !== "") {
		agentName = payload.agentName;
		isAgent = true;
		renderQueueNumber();
	}

	var i = 0;

	$('<div class="message loading new"><figure class="avatar"><img src=\"' + avatar + '\"/></figure><span></span></div>').appendTo($('.dolphin-messages .messages-content'));
	updateScrollbar();
	setTimeout(function () {
		$('.message.loading').remove();
		if (payload.attUrl) {
			var attachmentEl = '';
			if (payload.attFiletype && payload.attFiletype.includes("image")) {
				attachmentEl = '<a href="' + payload.attUrl + '?access_token=' + Chat.access_token + '" download="' + payload.attFilename + '?access_token=' + Chat.access_token + '" target="_blank" style="font-size:10px;"><img class="dolphin-attachment-image" src="' + payload.attUrl + '?access_token=' + Chat.access_token + '" alt="' + payload.attFilename + '"/></a>';
				$('<div class="message message-image-agent new"><figure class="avatar"><img src=\"' + avatar + '\"/></figure>' + attachmentEl + '</div>').appendTo($('.dolphin-messages .messages-content')).addClass('new');
			} else if (payload.attFiletype && payload.attFiletype.includes("video")) {
				attachmentEl = '<video controls width="250" style="border-radius:3px;"> <source src="' + payload.attUrl + '?access_token=' + Chat.access_token + '" type="' + payload.attFiletype + '"/></video>';
				$('<div class="message message-image-agent new"><figure class="avatar"><img src=\"' + avatar + '\"/></figure>' + attachmentEl + '</div>').appendTo($('.dolphin-messages .messages-content')).addClass('new');
			} else if (payload.attFiletype && payload.attFiletype.includes("audio")) {
				attachmentEl = '<audio controls style="border-radius:3px;height:40px;width:250px;"> <source src="' + payload.attUrl + '?access_token=' + Chat.access_token + '" type="' + payload.attFiletype + '"/></audio>';
				$('<div class="message message-image-agent new"><figure class="avatar"><img src=\"' + avatar + '\"/></figure>' + attachmentEl + '</div>').appendTo($('.dolphin-messages .messages-content')).addClass('new');
			} else {
				attachmentEl = '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.0" x="0px" y="0px" viewBox="0 0 24 24" class="icon icons8-Document" ><g id="surface1"><path style=" " d="M 14 2 L 6 2 C 4.898438 2 4 2.898438 4 4 L 4 20 C 4 21.101563 4.898438 22 6 22 L 18 22 C 19.101563 22 20 21.101563 20 20 L 20 8 Z M 16 14 L 8 14 L 8 12 L 16 12 Z M 14 18 L 8 18 L 8 16 L 14 16 Z M 13 9 L 13 3.5 L 18.5 9 Z "></path></g></svg>' + '<div class="dolphin-attachment-filename-sent"><a class="attachment-filename-text" href="' + payload.attUrl + '?access_token=' + Chat.access_token + '" download target="_blank" style="font-size:10px;">' + payload.attFilename + '</a></div>';
				$('<div class="message new"><figure class="avatar"><img src=\"' + avatar + '\"/></figure>' + attachmentEl + '</div>').appendTo($('.dolphin-messages .messages-content')).addClass('new');
			}
		} else if (isQuickReply(message)) {
			if (Chat.quick_reply_flat) {
				buildQuickReply(message, payload.language, isAgent);
			} else {
				buildQuickReplyFlat(message, payload.language, isAgent);
			}
		} else if (isButton(message)) {
			buildButton(message, true);
		} else {
			if (message) {
				var urlRegex = /(https?:\/\/[^\s]+)/g;
				message.replace(urlRegex, function (url) {
					if (url.trim().indexOf("view=widget") !== -1) {
						viewPage(url);
					}
				});
			}

			message = escapeSpecialChar(message);
			message = urlify(message);

			speak(message, payload.language, Chat.gender, isAgent);
			if (agentName !== "") {
				$('<div class="message new"><figure class="avatar"><img src=\"' + avatar + '\"/></figure>' + message + '<br/><span style=\"color:#2ECC71;float:right;font-size:10px;margin-top:3px;\">' + escapeSpecialChar(agentName) + '</span></div>').appendTo($('.dolphin-messages .messages-content')).addClass('new');
			} else {
				$('<div class="message new"><figure class="avatar"><img src=\"' + avatar + '\"/></figure>' + message + '</div>').appendTo($('.dolphin-messages .messages-content')).addClass('new');
			}
		}
		if (localStorage.getItem(CHAT_STATE_VARIABLE_NAME) === CHAT_STATE_ICON) {
			Chat.unread = Chat.unread + 1;
			if (Chat.unread > 9) {
				Chat.notif_box.innerHTML = "...";
			} else {
				Chat.notif_box.innerHTML = Chat.unread;
			}
			if (Chat.unread > 0) {
				$(".dolphin-chat-notification").fadeIn("fast");
			}
		}
		if (!isButton(message)) {
			if (Chat.client === null) {
				setDate(false);
			} else {
				setDate(true);
			}
		}
		incomingTransactions.push(payload.transactionId);
		sendMarkRead();
		saveToSession();
		lazyLoadInstance.update();
		i++;
	}, 1000);
}

/**
 * On incoming message display to html element
 * 
 * @param value
 * @returns
 */
function incomingMessageErrorLocation(payload) {
	removeQuickReply();
	var message = payload.message;
	var avatar = Chat.agent_avatar;
	var i = 0;
	if (message != null) {
		message = escapeSpecialChar(message);
	}

	$('<div class="message loading new"><figure class="avatar"><img src=\"' + avatar + '\"/></figure><span></span></div>').appendTo($('.dolphin-messages .messages-content'));
	updateScrollbar();

	setTimeout(function () {
		$('.message.loading').remove();
		if (payload.message) {
			$('<div class="message new"><figure class="avatar"><img src=\"' + avatar + '\"/></figure>' + message + '</div>').appendTo($('.dolphin-messages .messages-content')).addClass('new');
		}
		if (localStorage.getItem(CHAT_STATE_VARIABLE_NAME) === CHAT_STATE_ICON) {
			Chat.unread = Chat.unread + 1;
			if (Chat.unread > 9) {
				Chat.notif_box.innerHTML = "...";
			} else {
				Chat.notif_box.innerHTML = Chat.unread;
			}
			if (Chat.unread > 0) {
				$(".dolphin-chat-notification").fadeIn("fast");
			}
		}
		if (!isButton(message)) {
			if (Chat.client === null) {
				setDate(false);
			} else {
				setDate(true);
			}
		}
		updateScrollbar();
		saveToSession();
		i++;
	}, 1000);
}

/**
 * Mark incoming as red 
 * 
 * @param {*} payload 
 */
function markIncomingRead(payload) {
	$('#' + payload.transactionId).removeClass("message-personal");
	$('#' + payload.transactionId).removeClass("message-sent");
	$('#' + payload.transactionId).addClass("message-read");
	saveToSession();
}

/**
 * Check if the value is URL
 * 
 * @param value
 * @returns
 */
function isValidUrl(value) {
	var regex = /(http|https):\/\/(\w+:{0,1}\w*)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%!\-\/]))?/;
	if (regex.test(value)) {
		return true;
	}
	return false;
}

/**
 * Is button template message
 * 
 * @param message
 * @returns
 */
function isButton(message) {
	var pattern1 = /.*\{button.*\}/;
	var pattern2 = /.*\{lbutton.*\}/
	return pattern1.test(message) || pattern2.test(message);
}

/**
 * Get picture button
 * 
 * @param filename
 * @returns
 */
function getPictureButton(filename) {
	return Chat.url + '/webchat/out/button/' + filename + "?access_token=" + Chat.access_token;
}

/**
 * Parse button message to construct button display
 * 
 * @param message
 * @returns
 */
function parseButton(message) {
	var prefix = message.lastIndexOf("button:");
	var buttonMessage = message.substring(prefix + 7, message.length - 1);
	var buttons = JSON.parse(buttonMessage);
	buttons.forEach(function (button) {
		if (typeof button.pictureLink !== "undefined" && !isValidUrl(button.pictureLink)) {
			var picture = IsJsonString(button.pictureLink) ? JSON.parse(button.pictureLink) : button.pictureLink;
			var pictureLink = getPictureButton(picture.filename);
			button.pictureLink = pictureLink;
		}
	});
	return buttons;
}

/**
 * Is single form button with no other actions
 */
function isSingleForm(buttons) {
	if (buttons.length === 1) {
		if (buttons[0].buttonValues.length === 1) {
			var action = buttons[0].buttonValues[0];
			if (action.value.trim().indexOf("form.client") !== -1) {
				return true;
			}
		}
	}
	return false;
}

/**
 * Render buttons to webchat widget
 * 
 * @param {*} buttons 
 */
function renderButton(buttons, appendToHtml) {
	var buttonHtmls = "";
	var ids = "";
	buttons.forEach(function (button) {
		if (typeof button.title === "undefined" || typeof button.subTitle === "undefined") {
			return;
		}
		if (button.id) {
			ids = ids + button.id;
		}
		var buttonImage = "";
		if (buttons.length > 1) {
			buttonImage = '<li><div class="dolphin-button-cards"><div class="dolphin-button-cards__item"><div class="dolphin-button-card">';
		} else {
			buttonImage = '<div class="dolphin-button-cards"><div class="dolphin-button-cards__item"><div class="dolphin-button-card">';
		}
		if (typeof button.pictureLink !== "undefined") {
			buttonImage = buttonImage + '<img class="dolphin-button-card__image d-lazy" src="https://cdn.3dolphins.ai/widget/images/ic_loading.gif" data-src="' + button.pictureLink + '" onerror="this.src=https://cdn.3dolphins.ai/widget/images/ic_image_empty.jpg"></img>';
		}

		var btnTitle = escapeSpecialChar(button.title);
		var btnSubtitle = escapeSpecialChar(button.subTitle);

		var buttonTitle = '';
		if (typeof button.pictureLink !== "undefined") {
			buttonTitle = '<div class="dolphin-button-card__content"><div class="dolphin-button-card__title dolphin-truncate-160" title="' + btnTitle + '">' + btnTitle + '</div>';
		} else {
			buttonTitle = '<div class="dolphin-button-card__content" style="height:150px"><div class="dolphin-button-card__title dolphin-truncate-160" title="' + btnTitle + '">' + btnTitle + '</div>';
		}

		var subTitle = btnSubtitle;
		if (subTitle.length > 70) {
			subTitle = subTitle.substr(0, 80) + "...";
		}

		var buttonSubtitle = '<p class="dolphin-button-card__text dolphin-truncate-160" title="' + button.subTitle + '">' + subTitle + '</p>';
		var buttonActions = '';
		for (var i = 0; i < button.buttonValues.length; i++) {
			var buttonAction = button.buttonValues[i];
			var btnActionName = escapeSpecialChar(buttonAction.name.trim());
			if (!isValidUrl(buttonAction.value.trim())) {
				buttonActions = buttonActions + '<a href="#" class="dolphin-button" role="button" onclick="outgoingQuickReply(\'' + buttonAction.value.trim() + '\',\'' + btnActionName + '\');return false;"><span>' + btnActionName + '</span></a>';
			} else {
				if (buttonAction.value.trim().indexOf("form.client") !== -1) {
					var value = buttonAction.value.replace("form.client", "form.client.mini");
					buttonActions = buttonActions + '<span class="dolphin-button" onclick="viewForm(\'' + value + '\')" style="cursor:pointer;"><span>' + btnActionName + '</span></span>';
				} else if (buttonAction.value.trim().indexOf("payment.client") !== -1) {
					buttonActions = buttonActions + '<span class="dolphin-button" onclick="viewPayment(\'' + buttonAction.value + '\')" style="cursor:pointer;"><span>' + btnActionName + '</span></span>';
				} else if (buttonAction.value.trim().indexOf("think.3dolphins.ai") !== -1) {
					buttonActions = buttonActions + '<span class="dolphin-button" onclick="viewThink(\'' + buttonAction.value + '\')" style="cursor:pointer;"><span>' + btnActionName + '</span></span>';
				} else if (buttonAction.value.trim().indexOf("view=widget") !== -1) {
					buttonActions = buttonActions + '<span class="dolphin-button" onclick="viewPage(\'' + buttonAction.value + '\')" style="cursor:pointer;"><span>' + btnActionName + '</span></span>';
				} else {
					buttonActions = buttonActions + '<a target="_blank" href="' + buttonAction.value + '" class="dolphin-button"><span>' + btnActionName + '</span></a>';
				}
			}
		}
		var buttonEnd = "";
		if (buttons.length > 1) {
			buttonEnd = "</div></div></div></div></li>";
		} else {
			buttonEnd = "</div></div></div></div>";
		}
		var buttonHtml = buttonImage + buttonTitle + buttonSubtitle + buttonActions + buttonEnd;
		buttonHtmls = buttonHtmls + buttonHtml;
	});

	var btnUniqueId = getTimeInMillliseconds() + ids;

	if (buttons.length > 1) {
		buttonHtmls = '<div id="' + btnUniqueId + '" class="dolphin-button-carousel"><ul id="lightslider' + btnUniqueId + '" class="lightslider-button">' + buttonHtmls + '</ul></div>';
	} else {
		buttonHtmls = '<div id="' + btnUniqueId + '" class="dolphin-button-carousel">' + buttonHtmls + '</div>';
	}

	var completedButton = '<div class="message new dolphin-contain-buttons"><figure class="avatar"></figure>' + buttonHtmls + '</div>';
	if (appendToHtml) {
		var target = $('.dolphin-messages .messages-content');
		$(completedButton).appendTo(target).addClass("new");
		if (buttons.length > 1) {
			$("#lightslider" + btnUniqueId).lightSlider({ item: 2, autoWidth: true, loop: false, responsive: []});
		} 
	}
	return completedButton;
}

/**
 * Build button message
 * 
 * @param message
 * @returns
 */
function buildButton(message, appendToHtml) {
	var formOrButton = "";
	try {
		var buttons = parseButton(message);
		if (isSingleForm(buttons) && Chat.renderFormType == 0) {
			var value = buttons[0].buttonValues[0].value;
			formOrButton = viewFormInChat(value);
		} else {
			formOrButton = renderButton(buttons, appendToHtml);
		}
	} catch(e) {
		console.log("Unable to generate button");
	}
	return formOrButton;
}

/**
 * Rebuild button processing
 */
function rebuildButton() {
	$(".lSPager").remove();
	$(".lSAction").remove();
	$(".lightslider-button").each(function () {
		$(this).lightSlider({ item: 2, autoWidth: true, loop: false, responsive: []});
	});
	$(".lSPager").css("visibility", "hidden");

	$('[id^=frame]' ).on("load", function () {
		iFrameResize({ log: true, checkOrigin: false }, '#' + this.id);
	});
}

/**
 * Get time milliseconds
 */
function getTimeInMillliseconds() {
	var d = new Date();
	return d.getTime();
}

/**
 * Checks if the message is a quick replies macro.
 * 
 * @param message
 * @returns whether the message is a quick replies macro
 */
function isQuickReply(message) {
	var pattern = /.*\{replies.*\}/;
	return pattern.test(message);
}

/**
 * Converts a quick replies macro into messages object array.
 * 
 * The first object in the array is the quick reply title.
 * Second object is the quick reply options
 * 
 * @param message
 * @returns
 */
function parseQuickReply(message) {
	var messages = [];
	var prefix = message.lastIndexOf("replies:");
	var reply = message.substring(prefix + 8, message.length - 1);
	var replyTitle = null;
	var replyOptions = [];
	var replyArray = reply.split(",");
	replyArray.forEach(function (replyText) {
		if (!replyText.toLowerCase().match("^title=")) {
			var replyValues = replyText.trim().split("@===@");
			var action = { label: "", text: "" };
			if (replyValues.length > 1) {
				action.label = escapeSpecialChar(replyValues[0]);
				action.text = escapeSpecialChar(replyValues[1]);
				replyOptions.push(action);
			} else {
				action.label = escapeSpecialChar(replyValues[0]);
				action.text = escapeSpecialChar(replyValues[0]);
				replyOptions.push(action);
			}
		} else {
			prefix = replyText.toLowerCase().lastIndexOf("title=");
			replyTitle = replyText.substring(prefix + 6);
		}
	});

	var titleMessage = {
		text: replyTitle,
		createdAt: new Date()
	};
	messages.push(titleMessage);
	var optionsMessage = {
		createdAt: new Date(),
		options: replyOptions
	};
	messages.push(optionsMessage);
	return messages;
}

/**
 * Build quick reply message
 * 
 * @param message
 * @returns
 */
function buildQuickReply(message, lang, isAgent) {
	var quickReply = parseQuickReply(message);

	//show quick reply title as regular message
	speak(quickReply[0].text, lang, Chat.gender, isAgent)
	$('<div class="message new"><figure class="avatar"></figure>' + quickReply[0].text + '</div>').appendTo($('.dolphin-messages .messages-content')).addClass('new');

	var quickReplyUniqueId = getTimeInMillliseconds() + 'quick-reply';
	var msgQuickReplyUniqueId = quickReplyUniqueId + '-message';

	//construct quick reply options. This is only rendered on incoming message only
	var quickReplyEl = '<div id="' + msgQuickReplyUniqueId + '" class="dolphin-message-q-replies">';
	for (var x = 0; x < quickReply[1].options.length; x++) {
		var qReply = quickReply[1].options[x];
		quickReplyEl = quickReplyEl + '<div class="dolphin-q-replies"><figure class="avatar"><img src=\"' + Chat.agent_avatar + '\" /></figure><div class="dolphin-q-reply-text" role="button" data-value="' + qReply.text + '" data-label="' + qReply.label + '" onclick="outgoingQuickReply(\'' + qReply.text + '\', \'' + qReply.label + '\');$(\'.quick-reply\').remove();">' + qReply.label + '</div></div>';
	}

	quickReplyEl = quickReplyEl + '</div>';
	$('<div id="' + quickReplyUniqueId + '" class="quick-reply new">' + quickReplyEl + '</div>').appendTo($('.dolphin-messages .messages-content')).addClass('new');

	//Calculate quick reply container and content width
	var qReplyChildWidth = $('.dolphin-message-q-replies')[0].scrollWidth;
	var qReplyParentWidth = $('.dolphin-message-q-replies').outerWidth();

	//Justify quick replies to center when no scroll needed
	if (qReplyChildWidth <= qReplyParentWidth) {
		$('.quick-reply').css("justify-content", "center");
	}

	//If quick reply requires scrolling, Render scroll button for convenience on desktop web browser
	if (qReplyChildWidth > qReplyParentWidth) {
		//Scroll left button
		var quickReplyLeftArrowUniqueId = quickReplyUniqueId + '-left';
		$('<div id="' + quickReplyLeftArrowUniqueId + '" class="dolphin-q-reply-left" onclick="navigateQuickReply(\'' + msgQuickReplyUniqueId + '\', \'left\')"><svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="#bbc3c3"><path d="M16.67 0l2.83 2.829-9.339 9.175 9.339 9.167-2.83 2.829-12.17-11.996z"/></svg></div>').prependTo($('#' + quickReplyUniqueId));

		// //Scroll right button
		var quickReplyRightArrowUniqueId = quickReplyUniqueId + '-right';
		$('<div id="' + quickReplyRightArrowUniqueId + '" class="dolphin-q-reply-right" onclick="navigateQuickReply(\'' + msgQuickReplyUniqueId + '\', \'right\')"><svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="#bbc3c3"><path d="M7.33 24l-2.83-2.829 9.339-9.175-9.339-9.167 2.83-2.829 12.17 11.996z"/></svg></div>').appendTo($('#' + quickReplyUniqueId));
	}
}

/**
 * Build quick reply message with no navigation
 * 
 * @param message
 * @returns
 */
function buildQuickReplyFlat(message, lang, isAgent) {
	var quickReply = parseQuickReply(message);

	//show quick reply title as regular message
	speak(quickReply[0].text, lang, Chat.gender, isAgent)
	$('<div class="message new"><figure class="avatar"></figure>' + quickReply[0].text + '</div>').appendTo($('.dolphin-messages .messages-content')).addClass('new');

	var quickReplyUniqueId = getTimeInMillliseconds() + 'quick-reply';
	var msgQuickReplyUniqueId = quickReplyUniqueId + '-message';

	//construct quick reply options. This is only rendered on incoming message only
	var quickReplyEl = '<div id="' + msgQuickReplyUniqueId + '" class="message new quick-reply-flat">';
	for (var x = 0; x < quickReply[1].options.length; x++) {
		var qReply = quickReply[1].options[x];
		quickReplyEl = quickReplyEl + '<div class="dolphin-q-replies-flat"><div class="dolphin-q-reply-text" role="button" data-value="' + qReply.text + '" data-label="' + qReply.label + '" onclick="outgoingQuickReply(\'' + qReply.text + '\', \'' + qReply.label + '\');$(\'.quick-reply-flat\').remove();">' + qReply.label + '</div></div>';
	}
	$(".dolphin-messages .messages-content").append(quickReplyEl);
}

function removeQuickReply() {
	$(".quick-reply").remove();
	$(".quick-reply-flat").remove();
}

/**
 * Quick Reply Navigation
 * 
 * @param id 
 * @param dir 
 */
function navigateQuickReply(id, dir) {
	var newScroll = 0;
	if (dir === 'left') {
		//Check if scroll is at leftmost position
		var currLeftScroll = $('#' + id).scrollLeft();
		if (currLeftScroll > 0) {
			newScroll = currLeftScroll - 75;
			if (newScroll < 0) newScroll = 0;
			$('#' + id).animate({ scrollLeft: newScroll }, 100);
		}
	} else {
		//Find maximum scroll by substracting scroll width with container outer width
		var repliesWidth = $('#' + id).outerWidth();
		var scrollWidth = $('#' + id)[0].scrollWidth;
		var currRightScroll = $('#' + id).scrollLeft();
		var maxScroll = scrollWidth - repliesWidth;
		newScroll = currRightScroll + 75;
		if (newScroll > maxScroll) newScroll = maxScroll;
		if (currRightScroll < maxScroll) {
			$('#' + id).animate({ scrollLeft: newScroll }, 100);
		}
	}
}

/**
 * View Form inside widget
 * 
 * @param {*} url 
 */
function viewForm(url) {
	$('<iframe src="' + url + '&overflowY=scroll" frameBorder="0" width="320" height="470"/>').appendTo('#dolphin-messages');
	$('#messages-content').css("visibility", "hidden");
	$('.dolphin-message-box .message-input').css("visibility", "hidden");
	$('.dolphin-message-box form label').css("visibility", "hidden");
	$('.dolphin-message-box .dolphin-message-box .message-submit').css("visibility", "hidden");
	if ($('.speech-recognizer')) {
		$('.speech-recognizer').hide();
	}
	$('<button id="cancel" type="submit" class="message-submit">GO BACK</button>').appendTo('.dolphin-message-box');
	$('#cancel').click(function () {
		$('#dolphin-messages iframe').remove();
		$('.dolphin-message-box #cancel').remove();
		$('#messages-content').css("visibility", "visible");
		$('.dolphin-message-box .message-input').css("visibility", "visible");
		$('.dolphin-message-box form label').css("visibility", "visible");
		$('.dolphin-message-box .dolphin-message-box .message-submit').css("visibility", "visible");
		if ($('.speech-recognizer')) {
			$('.speech-recognizer').show();
		}
	});
}

/**
 * View Page inside widget
 * 
 * @param {*} url 
 */
function viewPage(url) {
	var height = window.innerHeight;
	var minHeight = false;
	if (url.indexOf("youtube") !== 0) {
		height = "100%";
		minHeight = true;
		$('.dolphin-messages').css("background", "black");
	}
	$('<iframe src="' + url + '&overflowY=scroll" frameBorder="0" width="100%" height="' + height + '" allowfullscreen/>').appendTo('#dolphin-messages');
	if (minHeight) {
		$('.dolphin-messages iframe').css("min-height", "450px");
	}
	$('#messages-content').css("visibility", "hidden");
	$('.dolphin-message-box .message-input').css("visibility", "hidden");
	$('.dolphin-message-box form label').css("visibility", "hidden");
	$('.dolphin-message-box .dolphin-message-box .message-submit').css("visibility", "hidden");
	if ($('.speech-recognizer')) {
		$('.speech-recognizer').hide();
	}
	$('<button id="cancel" type="submit" class="message-submit">GO BACK</button>').appendTo('.dolphin-message-box');
	$('#cancel').click(function () {
		$('.dolphin-messages').css("background", "white");
		$('#dolphin-messages iframe').remove();
		$('.dolphin-message-box #cancel').remove();
		$('#messages-content').css("visibility", "visible");
		$('.dolphin-message-box .message-input').css("visibility", "visible");
		$('.dolphin-message-box form label').css("visibility", "visible");
		$('.dolphin-message-box .dolphin-message-box .message-submit').css("visibility", "visible");
		if ($('.speech-recognizer')) {
			$('.speech-recognizer').show();
		}
	});
}

/**
 * View Think News
 * 
 * @param {*} url 
 */
function viewThink(url) {
	$('.dolphin-message-close').trigger("click");
	window.location.href = url;
}

/**
 * View Payment inside widget
 * 
 * @param {*} url 
 */
function viewPayment(url) {
	var dualScreenLeft = window.screenLeft != undefined ? window.screenLeft : window.screenX;
	var dualScreenTop = window.screenTop != undefined ? window.screenTop : window.screenY;

	var width = window.innerWidth ? window.innerWidth : document.documentElement.clientWidth ? document.documentElement.clientWidth : screen.width;
	var height = window.innerHeight ? window.innerHeight : document.documentElement.clientHeight ? document.documentElement.clientHeight : screen.height;

	var systemZoom = width / window.screen.availWidth;
	var left = (width - 370) / 2 / systemZoom + dualScreenLeft
	var top = (height - 500) / 2 / systemZoom + dualScreenTop
	var win = window.open(url, 'payment', 'location=yes,height=570,width=370,scrollbars=yes,status=yes,top=' + top + ",left=" + left);
	win.focus();
}

/**
 * Render Form inside chat bubble
 * 
 * @param {*} url 
 */
function viewFormInChat(url) {
	var value = url.replace("form.client", "form.client.mini")
	var frameId = 'frame' + new Date().getTime();
	var completedForm = '<div class="message new dolphin-contain-buttons"><iframe id="' + frameId + '" src="' + value + '" frameBorder="0" width="270"/></div>';
	$(completedForm).appendTo($('.dolphin-messages .messages-content')).addClass('new');
	$('#' + frameId).on("load", function () {
		iFrameResize({ log: true, checkOrigin: false }, '#' + frameId);
		setTimeout(function () {
			saveToSession();
		}, 3000);
	});

	return completedForm;
}

/**
 * Get attachment url by attachment type
 * 
 * @param file
 * @returns
 */
function getAttachmentUrlByType(file, result, accessToken) {
	var attachmentUrl;
	if (file.type.match("^image")) {
		attachmentUrl = Chat.url + '/webchat/in/image/' + result.filename + "?access_token=" + accessToken;
	} else if (file.type.match("^audio")) {
		attachmentUrl = Chat.url + '/webchat/in/audio/' + result.filename + "?access_token=" + accessToken;
	} else if (file.type.match("^video")) {
		attachmentUrl = Chat.url + '/webchat/in/video/' + result.filename + "?access_token=" + accessToken;
	} else {
		attachmentUrl = Chat.url + '/webchat/in/document/' + result.filename + "?access_token=" + accessToken;
	}
	return attachmentUrl;
}

/**
 * Create attachment html element by type
 * 
 * @param file
 * @returns
 */
function createAttachmentElement(transactionId, attachmentUrl, file) {
	var attachmentEl = '';
	if (file.type.includes('image')) {
		attachmentEl = '<div id="' + transactionId + '" class="message message-image-personal message-sent">' + '<a href="' + attachmentUrl + '" download="' + file.name + '" target="_blank" style="font-size:10px;"><img class="dolphin-attachment-image" src="' + attachmentUrl + '" alt="' + file.name + '"/></a>' + '</div>';
	} else {
		attachmentEl = '<div id="' + transactionId + '" class="message message-personal message-sent">' + '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.0" x="0px" y="0px" viewBox="0 0 24 24" class="icon icons8-Document" ><g id="surface1"><path style=" " d="M 14 2 L 6 2 C 4.898438 2 4 2.898438 4 4 L 4 20 C 4 21.101563 4.898438 22 6 22 L 18 22 C 19.101563 22 20 21.101563 20 20 L 20 8 Z M 16 14 L 8 14 L 8 12 L 16 12 Z M 14 18 L 8 18 L 8 16 L 14 16 Z M 13 9 L 13 3.5 L 18.5 9 Z "></path></g></svg>' + '<div class="dolphin-attachment-filename-sent"><a class="attachment-filename-text" href="' + attachmentUrl + '" download="' + file.name + '" target="_blank" style="font-size:10px;">' + file.name + '</a></div>' + '</div>';
	}
	return attachmentEl;
}

/**
 * Upload file and send file message notification
 * 
 * @returns
 */
function uploadFile() {
	var attachment = document.getElementById('attachment');
	var file = attachment.files[0];
	var upload_endpoint = Chat.url + UPLOAD_PATH;
	$('.dolphin-message-box .message-input').val("");
	var form = $('#attachment-form')[0];
	var data = new FormData(form);
	data.append("sessionId", Chat.session_id);
	data.append("attachment", file);

	var progress_bar = $('.dolphin-upload-progress .progress-indicator');
	var progress_bar_div = $('.dolphin-upload-progress');

	$.ajax({
		type: POST, enctype: MULTIPART_FORM,
		url: upload_endpoint, data: data,
		processData: false, contentType: false,
		cache: false, timeout: 600000,
		headers: {
			AUTHORIZATION: BEARER + Chat.access_token
		},
		xhr: function() {
			var xhr = $.ajaxSettings.xhr();
			xhr.upload.onprogress = function(e) {
				var percentVal = Math.floor(e.loaded / e.total *100) + '%'
				progress_bar.width(percentVal);
			};
			return xhr;
		},
		beforeSend: function() {
			progress_bar.width('1%');
			progress_bar_div.show();
		},
		success: function success(data) {
			var message = {};
			var result = JSON.parse(window.atob(data));
			if (!result.status || result.status === 'success') {
				var attachmentUrl = getAttachmentUrlByType(file, result, Chat.access_token);
				message.attFilepath = result.filepath;
				message.attFilename = result.filename;
				message.attFiletype = file.type;
				message.attFilesize = file.size;
				message.attUrl = attachmentUrl;
				message.token = Chat.token;
				message.messageHash = fuse(message.attFilename + ":" + message.attFiletype + ":" + message.attUrl);
				sendFileMessage(message, attachmentUrl, file);
				progress_bar_div.hide();
				removeQuickReply();
				updateScrollbar();
			} else if (result.status === 'upload_limit_exceeded') {
				var maxFilesize = result.maximum_filesize;
				var newUploadMsg = (Chat.max_upload_message).replace(/\[max_filesize\]/gi, maxFilesize)
				incomingMessage({ 'message': newUploadMsg });
				progress_bar_div.hide();
			} else {
				incomingMessage({ 'message': Chat.upload_error_message });
				progress_bar_div.hide();
			}
		},
		error: function error(e) {
			incomingMessage({ 'message': Chat.upload_error_message });
			progress_bar_div.hide();
			console.log("ERROR : ", e.responseText);
		}
	});
}

function initialMessage() {
	if (!localStorage.getItem("messages")) {
		setTimeout(function () {
			var welcome = {};
			if (Chat.welcome_message) {
                var custName = (localStorage.getItem("name")) ? localStorage.getItem("name") : Chat.name;
                var newWelMsg = (Chat.welcome_message).replace(/\[Nama\]/gi, custName);
                welcome.message = newWelMsg;
                incomingMessage(welcome);
			}
		}, 100);
	}
}

function isValidToUpload(file) {
	var filenameSplitWithDot = file.name.split('.');
	var ext = '.' + filenameSplitWithDot.pop();
	var filenameWithoutExt = filenameSplitWithDot.join('');

	for (var i = 0; i < restrictedCharInFilename.length; i++) {
		if(filenameWithoutExt.indexOf(restrictedCharInFilename[i]) !== -1) return false;
	}

	var acceptedFileTypes = Chat.accept_file.split(',');
	return acceptedFileTypes.includes(ext);
}

/**
 * Get chat history by social id
 * 
 * @returns
 */
function getChatHistory() {
	if (Chat.enable_history && Chat.access_token && !isGettingChatHistory) {
		isGettingChatHistory = true;
		var socialId = Chat.phone + '-' + Chat.name;
		if (Chat.customerId && Chat.customerId !== '') {
			socialId = Chat.customerId;
		}

		socialId = socialId.replace(/\+/g, "%2b");

		var history_endpoint = Chat.url + CHAT_HISTORY_PATH + '?access_token=' + Chat.access_token + '&contactid=' + socialId;
		$.ajax({
			type: GET,
			url: history_endpoint,
			processData: false,
			contentType: false,
			cache: false,
			timeout: 600000,
			success: function success(data) {
				parseChatHistoryToHTML(data);
				rebuildButton();
				initialMessage();
				updateScrollbar();
				isGettingChatHistory = false;
			},
			error: function error(e) {
				if (localStorage.getItem("messages") !== null) {
					$('.dolphin-messages .messages-content').html(localStorage.getItem("messages"));
				}
				rebuildButton();
				initialMessage();
				updateScrollbar();
				isGettingChatHistory = false;
				console.log("ERROR : ", e.responseText);
			}
		});
	}
}

function parseChatHistoryToHTML(chatHistory) {
	var history = "";
	for (var i=0;i<chatHistory.length;i++) {
		var hist = chatHistory[i];
		if (hist.pictureLink) {
			history = parseHistoryImageMessageToHTML(hist) + history;
		} else if (hist.videoLink) {
			history = parseHistoryVideoMessageToHTML(hist) + history;
		} else if (hist.audioLink) {
			history = parseHistoryAudioMessageToHTML(hist) + history;
		} else if (hist.documentLink) {
			history = parseHistoryDocumentMessageToHTML(hist) + history;
		} else if (isButton(hist.message)) {
			history = buildButton(hist.message
				.replace(/'/g, '"')
				.replace(/"{/g, '{')
				.replace(/}"/g, '}')
				.replace(/"\[/g, '[')
				.replace(/\]"/g, ']')
			, false) + history;
		} else if (hist.message.match("^{like-survey:")) {
			hist.message = "👍";
			history = parseHistoryTextMessageToHTML(hist) + history;
		} else if (hist.message.match("^{dislike-survey:")) {
			hist.message = "👎";
			history = parseHistoryTextMessageToHTML(hist) + history;
		} else {
			history = parseHistoryTextMessageToHTML(hist) + history;
		}
	}

	$('.dolphin-messages .messages-content').html(history);
	lazyLoadInstance.update();
}

function parseHistoryImageMessageToHTML(hist) {
	var picture = JSON.parse(hist.pictureLink.replace(/'/g, '"'));
	var filename = picture.filename;
	var bucket = picture.bucket;
	var time = hist.createdDateText.slice(-5);
	var attachmentUrl = "";
	
	if (hist.answer) {
		var avatar = Chat.agent_avatar;
		if (hist.agentAvatar && hist.agentAvatar !== "") {
			avatar = hist.agentAvatar;
		}

		attachmentUrl = Chat.url + '/webchat/out/image/' + filename + '?access_token=' + Chat.access_token;

		if (filename.match("^http")) {
			attachmentUrl = filename;
		} else {
			if (bucket === MEDIA_IMAGES_BUTTON) {
				attachmentUrl = Chat.url + '/webchat/out/button/' + filename + '?access_token=' + Chat.access_token;
			}	 
		}

		var attachmentEl = '<a href="' + attachmentUrl + '" download="' + getOriginalFilenameOfIncomingFile(filename) + '" target="_blank" style="font-size:10px;"><img class="dolphin-attachment-image" src="' + attachmentUrl + '" alt="' + getOriginalFilenameOfIncomingFile(filename) + '"/></a>';
		var incoming = '<div class="message message-image-agent new"><figure class="avatar"><img src=\"' + avatar + '\"/></figure>' + attachmentEl + '<div class="timestamp">' + time + '</div></div>'
		return incoming;
	} else {
		attachmentUrl = Chat.url + '/webchat/in/image/' + filename + '?access_token=' + Chat.access_token;
		var outgoing = '<div id="' + hist.transactionId + '" class="message message-image-personal message-sent new">' + '<a href="' + attachmentUrl + '" download="' + getOriginalFilenameOfOutgoingFile(filename) + '" target="_blank" style="font-size:10px;"><img class="dolphin-attachment-image" src="' + attachmentUrl + '" alt="' + getOriginalFilenameOfOutgoingFile(filename) + '"/></a><div class="timestamp">' + time + '</div></div>';
		return outgoing;
	}
}

function parseHistoryVideoMessageToHTML(hist) {
	var video = JSON.parse(hist.videoLink.replace(/'/g, '"'));
	var filename = video.filename;
	var time = hist.createdDateText.slice(-5);
	var attachmentUrl = "";
	
	if (hist.answer) {
		var avatar = Chat.agent_avatar;
		if (hist.agentAvatar && hist.agentAvatar !== "") {
			avatar = hist.agentAvatar;
		}
		attachmentUrl = Chat.url + '/webchat/out/button/' + filename + '?access_token=' + Chat.access_token;
		var attachmentEl = '<video controls width="250" style="border-radius:3px;"> <source src="' + attachmentUrl + '" type="' + video.contentType + '"/></video>';
		var incoming = '<div class="message message-image-agent new"><figure class="avatar"><img src=\"' + avatar + '\"/></figure>' + attachmentEl + '</div>'
		return incoming;
	} else {
		attachmentUrl = Chat.url + '/webchat/in/video/' + filename + '?access_token=' + Chat.access_token;
		var outgoing = '<div id="' + hist.transactionId + '" class="message message-personal message-sent new">' + '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.0" x="0px" y="0px" viewBox="0 0 24 24" class="icon icons8-Document" ><g id="surface1"><path style=" " d="M 14 2 L 6 2 C 4.898438 2 4 2.898438 4 4 L 4 20 C 4 21.101563 4.898438 22 6 22 L 18 22 C 19.101563 22 20 21.101563 20 20 L 20 8 Z M 16 14 L 8 14 L 8 12 L 16 12 Z M 14 18 L 8 18 L 8 16 L 14 16 Z M 13 9 L 13 3.5 L 18.5 9 Z "></path></g></svg>' + '<div class="dolphin-attachment-filename-sent"><a class="attachment-filename-text" href="' + attachmentUrl + '" download="' + getOriginalFilenameOfOutgoingFile(filename) + '" target="_blank" style="font-size:10px;">' + getOriginalFilenameOfOutgoingFile(filename) + '</a></div><div class="timestamp">' + time + '</div></div>';
		return outgoing;
	}
}

function parseHistoryAudioMessageToHTML(hist) {
	var audio = JSON.parse(hist.videoLink.replace(/'/g, '"'));
	var filename = audio.filename;
	var time = hist.createdDateText.slice(-5);
	var attachmentUrl = "";
	
	if (hist.answer) {
		var avatar = Chat.agent_avatar;
		if (hist.agentAvatar && hist.agentAvatar !== "") {
			avatar = hist.agentAvatar;
		}

		attachmentUrl = Chat.url + '/webchat/out/button/' + filename + '?access_token=' + Chat.access_token;
		var attachmentEl = '<audio controls style="border-radius:3px;height:40px;width:250px;"> <source src="' + attachmentUrl + '" type="' + audio.contentType + '"/></audio>';
		var incoming = '<div class="message message-image-agent new"><figure class="avatar"><img src=\"' + avatar + '\"/></figure>' + attachmentEl + '</div>'
		return incoming;
	} else {
		attachmentUrl = Chat.url + '/webchat/in/audio/' + filename + '?access_token=' + Chat.access_token;
		var outgoing = '<div id="' + hist.transactionId + '" class="message message-personal message-sent new">' + '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.0" x="0px" y="0px" viewBox="0 0 24 24" class="icon icons8-Document" ><g id="surface1"><path style=" " d="M 14 2 L 6 2 C 4.898438 2 4 2.898438 4 4 L 4 20 C 4 21.101563 4.898438 22 6 22 L 18 22 C 19.101563 22 20 21.101563 20 20 L 20 8 Z M 16 14 L 8 14 L 8 12 L 16 12 Z M 14 18 L 8 18 L 8 16 L 14 16 Z M 13 9 L 13 3.5 L 18.5 9 Z "></path></g></svg>' + '<div class="dolphin-attachment-filename-sent"><a class="attachment-filename-text" href="' + attachmentUrl + '" download="' + getOriginalFilenameOfOutgoingFile(filename) + '" target="_blank" style="font-size:10px;">' + getOriginalFilenameOfOutgoingFile(filename) + '</a></div><div class="timestamp">' + time + '</div></div>';
		return outgoing;
	}
}

function parseHistoryDocumentMessageToHTML(hist) {
	var document = JSON.parse(hist.documentLink.replace(/'/g, '"'));
	var filename = document.filename;
	var time = hist.createdDateText.slice(-5);
	var attachmentUrl = "";
	
	if (hist.answer) {
		var avatar = Chat.agent_avatar;
		if (hist.agentAvatar && hist.agentAvatar !== "") {
			avatar = hist.agentAvatar;
		}
		attachmentUrl = Chat.url + '/webchat/out/button/' + filename + '?access_token=' + Chat.access_token;
		var attachmentEl = '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.0" x="0px" y="0px" viewBox="0 0 24 24" style="width:15px;" class="icon icons8-Document" ><g id="surface1"><path style=" " d="M 14 2 L 6 2 C 4.898438 2 4 2.898438 4 4 L 4 20 C 4 21.101563 4.898438 22 6 22 L 18 22 C 19.101563 22 20 21.101563 20 20 L 20 8 Z M 16 14 L 8 14 L 8 12 L 16 12 Z M 14 18 L 8 18 L 8 16 L 14 16 Z M 13 9 L 13 3.5 L 18.5 9 Z "></path></g></svg>' + '<div class="dolphin-attachment-filename-sent"><a class="attachment-filename-text" href="' + attachmentUrl + '" download target="_blank" style="font-size:10px;">' + getOriginalFilenameOfIncomingFile(filename) + '</a></div>';
		var incoming = '<div class="message new"><figure class="avatar"><img src=\"' + avatar + '\"/></figure>' + attachmentEl + '<div class="timestamp">' + time + '</div></div>'
		return incoming;
	} else {
		attachmentUrl = Chat.url + '/webchat/in/document/' + filename + '?access_token=' + Chat.access_token;
		var outgoing = '<div id="' + hist.transactionId + '" class="message message-personal message-sent new">' + '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.0" x="0px" y="0px" viewBox="0 0 24 24" class="icon icons8-Document" ><g id="surface1"><path style=" " d="M 14 2 L 6 2 C 4.898438 2 4 2.898438 4 4 L 4 20 C 4 21.101563 4.898438 22 6 22 L 18 22 C 19.101563 22 20 21.101563 20 20 L 20 8 Z M 16 14 L 8 14 L 8 12 L 16 12 Z M 14 18 L 8 18 L 8 16 L 14 16 Z M 13 9 L 13 3.5 L 18.5 9 Z "></path></g></svg>' + '<div class="dolphin-attachment-filename-sent"><a class="attachment-filename-text" href="' + attachmentUrl + '" download="' + getOriginalFilenameOfOutgoingFile(filename) + '" target="_blank" style="font-size:10px;">' + getOriginalFilenameOfOutgoingFile(filename) + '</a></div><div class="timestamp">' + time + '</div></div>';
		return outgoing;
	}
}

function parseHistoryTextMessageToHTML(hist) {
	var message = escapeSpecialChar(hist.message);
	message = urlify(message);
	var time = hist.createdDateText.slice(-5);

	if (hist.answer) {
		var avatar = Chat.agent_avatar;
		if (hist.agentAvatar && hist.agentAvatar !== "") {
			avatar = hist.agentAvatar;
		}
		var incoming = "";
		if (hist.agentName && hist.agentName !== "") {
			incoming = '<div class="message new"><figure class="avatar"><img src=\"' + avatar + '\"/></figure>' + message + '<br/><span style=\"color:#2ECC71;float:right;font-size:10px;margin-top:3px;\">' + escapeSpecialChar(hist.agentName) + '</span><div class="timestamp">' + time + '</div></div>';
		} else {
			incoming = '<div class="message new"><figure class="avatar"><img src=\"' + avatar + '\"/></figure>' + message + '<div class="timestamp">' + time + '</div></div>';
		}

		return incoming;
	} else {
		var outgoing = '<div id="' + hist.transactionId + '" class="message message-sending new ' + (hist.markRead ? 'message-read' : 'message-sent') + '">' + message + '<div class="timestamp">' + time + '</div></div>';
		return outgoing;
	}
}

function getOriginalFilenameOfOutgoingFile(filename) {
	var times = 0, index = null, n = 2;

	while (times < n && index !== -1) {
		index = filename.indexOf('_', index + 1);
		times++;
	}

	return filename.substring(index + 1);
}

function getOriginalFilenameOfIncomingFile(filename) {
	return filename.substring(filename.indexOf('*~*') + 3);
}

/**
 * Encoded client id and secret
 * 
 * @param u
 * @param p
 * @returns
 */
function encodedClientIdAndClientSecret(u, p) {
	return btoa(u + ':' + p);
}

function setupToken() {

}
/**
 * Get access token 
 * 
 * @param l
 * @param u
 * @param p
 * @returns
 */
function obtainAccessToken(l, u, p) {
	var token_endpoint = l + '/oauth/token?' + 'grant_type=password' + "&username=" + u + '&password=' + p;
	$.ajax({
		url: token_endpoint,
		type: 'POST',
		crossDomain: true,
		async: true,
		xhrFields: { withCredentials: true },
		headers: {
			AUTHORIZATION: BASIC + encodedClientIdAndClientSecret(u, p)
		},
		accepts: {
			json: 'application/json'
		},
		dataType: 'json',
		success: function(data) {
			data.status = 200;
			Chat.callbackInitToken(data);
			isInitiatingToken = false;
		},
		error: function (xhr) {
			Chat.callbackInitToken(xhr);
			isInitiatingToken = false;
		}
	})
}

/**
 * Refresh access token 
 * 
 * @param l
 * @param u
 * @param p
 * @param r
 * @returns
 */
function refreshAccessToken(l, u, p, r, cookieToken, g_recaptcha, callback) {
	if (!Chat.webview) {
		if (localStorage.getItem("at") === null && !isRefreshingToken) {
			isRefreshingToken = true;
			var token_endpoint = l + '/oauth/token?' + 'grant_type=refresh_token' + "&client_id=" + u + '&refresh_token=' + r;
			$.ajax({
				url: token_endpoint,
				type: POST,
				crossDomain: true,
				async: true,
				xhrFields: { withCredentials: true },
				headers: {
					AUTHORIZATION: BASIC + encodedClientIdAndClientSecret(u, p)
				},
				accepts: {
					json: 'application/json'
				},
				dataType: 'json',
				success: function(data) {
					data.status = 200;
					if (callback) {
						callback(data);
					} else {
						Chat.callbackConnectServer(data, cookieToken, g_recaptcha);
					}
					isRefreshingToken = false;
				},
				error: function (xhr) {
					Chat.buildError(Chat.chat_box, xhr.responseText);
					isRefreshingToken = false;
				}
			});
		} else {
			if (callback) {
				callback(JSON.parse(localStorage.getItem("at")));
			} else {
				Chat.callbackConnectServer(JSON.parse(localStorage.getItem("at"), cookieToken, g_recaptcha));
			}
		}
	} else {
		if (callback) {
			callback(JSON.parse(localStorage.getItem("at")));
		} else {
			Chat.callbackConnectServer(at, cookieToken, g_recaptcha);
		}
	}
}

/**
 * Render queue number
 */
function renderQueueNumber() {
	if (Chat.access_token && Chat.enable_queue && Chat.queue_text !== null) {
		var queue_endpoint = Chat.url + QUEUE_PATH + '?access_token=' + Chat.access_token + "&accountId=" + Chat.email;
		
		$.ajax({
			url: queue_endpoint,
			type: GET,
			crossDomain: true,
			async: true,
			accepts: {
				json: 'application/json'
			},
			dataType: 'json',
			success: function(data) {
				if (data !== null && data.response === null) {
					queue_endpoint = Chat.url + QUEUE_PATH + '?access_token=' + Chat.access_token + "&accountId=" + Chat.email;
					$.ajax({
						url: queue_endpoint,
						type: GET,
						crossDomain: true,
						async: false,
						accepts: {
							json: 'application/json'
						},
						dataType: 'json',
						success: function(data) {
							if (data.response != null) {
								var counter = JSON.parse(data.response).data
								if (counter > 0) {
									$('.dolphin-queue-title').remove();
									$('<span class="dolphin-queue-title">' + Chat.queue_text + counter + '</span>').appendTo($('.dolphin-chat'));
								} else {
									$('.dolphin-queue-title').remove();
								}
							} else {
								$('.dolphin-queue-title').remove();
							}
						},
						error: function(xhr) {
							$('.dolphin-queue-title').remove();
							Chat.buildError(Chat.chat_box, xhr.responseText);
						}
					});
				} else {
					if (data && data.response != null) {
						var counter = JSON.parse(data.response).data
						if (counter > 0) {
							$('.dolphin-queue-title').remove();
							$('<span class="dolphin-queue-title">' + Chat.queue_text + counter + '</span>').appendTo($('.dolphin-chat'));
						} else {
							$('.dolphin-queue-title').remove();
						}
					} else {
						$('.dolphin-queue-title').remove();
					}
				}
			},
			error: function() {
				$('.dolphin-queue-title').remove();
			}
		});
	}
}

/**
 * Get access token 
 * 
 * @param l
 * @param u
 * @param p
 * @returns
 */
function testConnection(at) {
	var test_endpoint = Chat.url + INFO_PATH;
	return $.ajax({
		url: test_endpoint,
		type: 'GET',
		crossDomain: true,
		async: false,
		xhrFields: { withCredentials: true },
		headers: {
			AUTHORIZATION: BEARER + at.access_token
		},
		accepts: {
			json: 'application/json'
		},
		dataType: 'json'
	});
}

/**
 * Decrypt message based on generated key
 * 
 * @param message
 * @param key
 * @returns
 */
function decrypt(message, key) {
	var iterationCount = 1000;
	var keySize = 128;
	var hashedKey = fuse(key);
	var iv = message.iv;
	var salt = message.salt;

	if (iv !== undefined && iv !== null && salt !== undefined && salt !== null) {
		var aesUtil = new AesUtil(keySize, iterationCount);
		if (message.agent !== undefined && message.agent !== null) {
			message.agent = aesUtil.decrypt(salt, iv, hashedKey, message.agent);
		}
		if (message.attFilename !== undefined && message.attFilename !== null) {
			message.attFilename = aesUtil.decrypt(salt, iv, hashedKey, message.attFilename);
		}
		if (message.attFilepath !== undefined && message.attFilepath !== null) {
			message.attFilepath = aesUtil.decrypt(salt, iv, hashedKey, message.attFilepath);
		}
		if (message.attFiletype !== undefined && message.attFiletype !== null) {
			message.attFiletype = aesUtil.decrypt(salt, iv, hashedKey, message.attFiletype);
		}
		if (message.attUrl !== undefined && message.attUrl !== null) {
			message.attUrl = aesUtil.decrypt(salt, iv, hashedKey, message.attUrl);
		}
		if (message.event !== undefined && message.event !== null) {
			message.event = aesUtil.decrypt(salt, iv, hashedKey, message.event);
		}
		if (message.message !== undefined && message.message !== null) {
			message.message = aesUtil.decrypt(salt, iv, hashedKey, message.message);
		}
		if (message.sessionId !== undefined && message.sessionId !== null) {
			message.sessionId = aesUtil.decrypt(salt, iv, hashedKey, message.sessionId);
		}
		if (message.token !== undefined && message.token !== null) {
			message.token = aesUtil.decrypt(salt, iv, hashedKey, message.token);
		}
		if (message.agentAvatar !== undefined && message.agentAvatar !== null) {
			message.agentAvatar = aesUtil.decrypt(salt, iv, hashedKey, message.agentAvatar);
		}
		if (message.agentName !== undefined && message.agentName !== null) {
			message.agentName = aesUtil.decrypt(salt, iv, hashedKey, message.agentName);
		}
		if (message.transactionId !== undefined && message.transactionId !== null) {
			message.transactionId = aesUtil.decrypt(salt, iv, hashedKey, message.transactionId);
		}
		if (message.language !== undefined && message.language !== null) {
			message.language = aesUtil.decrypt(salt, iv, hashedKey, message.language);
		}
		return true;
	}
	return false;
}

/**
 * Encrypt message based on generated key
 * 
 * @param message
 * @param key
 * @returns
 */
function encrypt(message, key) {
	var iterationCount = 1000;
	var keySize = 128;
	var hashedKey = fuse(key);
	var iv = CryptoJS.lib.WordArray.random(128 / 8).toString(CryptoJS.enc.Base64);
	var salt = CryptoJS.lib.WordArray.random(128 / 8).toString(CryptoJS.enc.Base64);
	var aesUtil = new AesUtil(keySize, iterationCount);
	if (message.agent !== undefined && message.agent !== null) {
		message.agent = aesUtil.encrypt(salt, iv, hashedKey, message.agent);
	}
	if (message.attFilename !== undefined && message.attFilename !== null) {
		message.attFilename = aesUtil.encrypt(salt, iv, hashedKey, message.attFilename);
	}
	if (message.attFilepath !== undefined && message.attFilepath !== null) {
		message.attFilepath = aesUtil.encrypt(salt, iv, hashedKey, message.attFilepath);
	}
	if (message.attFiletype !== undefined && message.attFiletype !== null) {
		message.attFiletype = aesUtil.encrypt(salt, iv, hashedKey, message.attFiletype);
	}
	if (message.attUrl !== undefined && message.attUrl !== null) {
		message.attUrl = aesUtil.encrypt(salt, iv, hashedKey, message.attUrl);
	}
	if (message.event !== undefined && message.event !== null) {
		message.event = aesUtil.encrypt(salt, iv, hashedKey, message.event);
	}
	if (message.message !== undefined && message.message !== null) {
		message.message = aesUtil.encrypt(salt, iv, hashedKey, message.message);
	}
	if (message.sessionId !== undefined && message.sessionId !== null) {
		message.sessionId = aesUtil.encrypt(salt, iv, hashedKey, message.sessionId);
	}
	if (message.token !== undefined && message.token !== null) {
		message.token = aesUtil.encrypt(salt, iv, hashedKey, message.token);
	}
	if (message.transactionId !== undefined && message.transactionId !== null) {
		message.transactionId = aesUtil.encrypt(salt, iv, hashedKey, message.transactionId);
	}
	if (message.language !== undefined && message.language !== null) {
		message.language = aesUtil.encrypt(salt, iv, hashedKey, message.language);
	}

	message.iv = iv;
	message.salt = salt;
}

function urlify(text) {
	var urlRegex = /(https?:&#x2F;&#x2F;[^\s]+)/g;
	if (typeof text.replace !== "undefined") {
		return text.replace(urlRegex, function (url) {
			if (url.trim().indexOf("view=widget") !== -1) {
				return '<svg id="svgelem" class="dolphin-icons8-Document" xmlns="http://www.w3.org/2000/svg"> <polygon points="10,1 4,18 19,6 1,6 16,18" fill="black"/> </svg><div class="dolphin-attachment-filename-sent" onclick="viewPage(\'' + url + '\')">'+ '<button class="button-agent-feedback">Rate My Service</button></div>'
			} else {
				return '<a href="' + url + '" target="_blank" style="background: rgba(247, 249, 249, 0.9);border-radius: 3px;padding: 1px;">' + url + '</a>';
			}
		})
	} else {
		return text;
	}
}


function IsJsonString(str) {
	try {
		JSON.parse(str);
	} catch (e) {
		return false;
	}
	return true;
}

function deleteAllCookies() {
	var cookies = document.cookie.split(";");

	for (var i = 0; i < cookies.length; i++) {
		var cookie = cookies[i];
		var eqPos = cookie.indexOf("=");
		var name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
		document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT";
	}
}

function disableBodyScroll() {
	var tmpPosition = $(document.body).css('position')
	var tmpOverflow = $(document.body).css('overflow')
	if (tmpPosition && tmpPosition !== "fixed") {
		position = tmpPosition;
	}
	if (tmpOverflow && tmpOverflow !== "hidden") {
		overflow = tmpOverflow
	}
	if (window.innerWidth < 700) {
		$(document.body).css('position', 'fixed');
		$(document.body).css('overflow', 'hidden');
	}
}

function enableBodyScroll() {
	$(document.body).css('position', position);
	$(document.body).css('overflow', overflow);
}

function addConnectionAnimation() {
	$(".dolphin-login-connect").addClass("dolphin-blink-placeholder");
	$(".dolphin-login-connect").html(Chat.connect_button_connecting_text);
	$(".dolphin-login-connect").prop("disabled", true)
}

function removeConnectionAnimation() {
	$(".dolphin-login-connect").removeClass("dolphin-blink-placeholder");
	$(".dolphin-login-connect").prop("disabled", false)
	$(".dolphin-login-connect").html(Chat.connect_button_text);
}

function switchVoice() {
	if (!toggleVoice) {
		$('.dolphin-message-mute').addClass('dolphin-message-unmute');
		$('.dolphin-message-unmute').removeClass('dolphin-message-mute');
		toggleVoice = true;
		Chat.enable_voice = false;
	} else {
		$('.dolphin-message-unmute').addClass('dolphin-message-mute');
		$('.dolphin-message-mute').removeClass('dolphin-message-unmute');
		toggleVoice = false;
		Chat.enable_voice = true;
	}
}
var eventMethod = window.addEventListener
	? "addEventListener"
	: "attachEvent";
var eventer = window[eventMethod];
var messageEvent = eventMethod === "attachEvent"
	? "onmessage"
	: "message";
eventer(messageEvent, function (e) {
	if (e.data.key === Chat.client_id && e.data.message && e.data.label) {
		outgoingQuickReply(e.data.message, e.data.label);
		$('.dolphin-messages').css("background", "white");
		$('#dolphin-messages iframe').remove();
		$('.dolphin-message-box #cancel').remove();
		$('#messages-content').css("visibility", "visible");
		$('.dolphin-message-box .message-input').css("visibility", "visible");
		$('.dolphin-message-box form label').css("visibility", "visible");
		$('.dolphin-message-box .dolphin-message-box .message-submit').css("visibility", "visible");
	}
});

$(window).resize(function() {
	disableBodyScroll();
	enableBodyScroll();
});

Array.prototype.remove = function () {
	var what, a = arguments, L = a.length, ax;
	while (L && this.length) {
		what = a[--L];
		while ((ax = this.indexOf(what)) !== -1) {
			this.splice(ax, 1);
		}
	}
	return this;
};
