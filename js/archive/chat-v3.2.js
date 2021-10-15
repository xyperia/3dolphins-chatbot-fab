'use strict';

/**
 * Livechat version And Updated On
 */
var UPDATED_ON = "Updated On: 05 Nov 2020"
var LIVECHAT_VERSION = "Livehcat Version: 3.3.0.0";
console.log(LIVECHAT_VERSION + " | " + UPDATED_ON);

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
var EMAIL_PATH = '/webchat/email/outbound';
var MEMBER_ID_VALIDATION_PATH = '/webchat/validate-member-id';

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
var unsent = [];
var outgoingTransactions = [];
var incomingTransactions = [];
var reconnect = 0;
var transactionToken;
var toggleVoice = false;
var isInitiatingToken = false;
var isRefreshingToken = false;
var isGettingChatHistory = false;
var isSendEmail = false;
var lastConnectingTime = null;
var isBuildError = false;
var incomingMessageTemp = [];
var isInputFocus = false;
var prevFocus = null;
var timeoutChat = null;
/**
 * Body CSS variable
 */
var bodyPosition = null;
var bodyOverflow = null;
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

/**
 * country code variable
 */
var countryCode;
var iti;

/**
 * click icon variable
 */
var is_icon_click = false;

/**
 * send welcome message variable
 */
var send_welcome_message = false;

/**
 * member mode variable
 */
var is_member = null;
/**
 * Perform timeout on messages send time > 15s
 */
function timeoutMessage() {
	var values = [];
	transactions.forEach(function (value) {
		if (+value.txId + 15000 <= getTimeInMillliseconds()) {
			$('#' + value.txId).removeClass("message-sending");
			$('#' + value.txId).addClass("message-failed");
			setDate(false);
			values.push(value);
			saveToSession();
			if (!isBuildError) {
				isBuildError = true;
				Chat.buildError(Chat.chat_box, "Updating Messages...");
			}
		}
	});
	values.forEach(function (value) {
		transactions.remove(value);
	});
}

/**
 * Set messages with failed status for ongoing transactions
 */
function failedMessage() {
	var values = [];
	transactions.forEach(function (value) {
		$('#' + value.txId).removeClass("message-sending");
		$('#' + value.txId).addClass("message-failed");
		setDate(false);
		values.push(value);
	});
	values.forEach(function (value) {
		transactions.remove(value);
	});
}

/**
 * Cancel messages and set the messages with failed status
 */
function cancelMessages() {
	unsent.forEach(function (value) {
		$('#' + value).removeClass("message-sending");
		$('#' + value).addClass("message-failed");
	});
	unsent = [];
}

/**
 * Clean up multiple subscription as proactive prevention
 */
function cleanupMultipleSubscription() {
	if (Chat.client !== null && Chat.client.connected) {
		var count = Object.keys(Chat.client.subscriptions).length;
		if (count > 3) {
			for (var i = count; i > 2; i--) {
				var key = Object.keys(Chat.client.subscriptions)[i];
				Chat.client.unsubscribe(key);
			}
		}
	}
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
		expiredChannel = new BroadcastChannel('expired-broadcast');
		expiredChannel.onmessage = function (e) {
			if (e.data !== null && e.data !== '') {
				Chat.resetToLogin(true, false);
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
	client: null, chat_box: null, login_box: null, notif_box: null, guestName: "", triggerMenu: "", menu: false, enable_voice: false, gender: "female",
	enable_queue: false, queue_text: null, enable_campaign: false, campaign_title: null, campaign_text: null, campaign_timer: 0, campaign_menu: [], enable_history: true, enable_speech: false, customerId: null,
	uploading_text: "", connect_button_text: "", connect_button_connecting_text: "", max_upload_message: null, upload_error_message: null, name_input_error_message: null, email_input_error_message: null, phone_input_error_message: [],
	enable_attachment: true, compatibility_mode: false, regex_name: null, regex_email: null, name_min_length: null, member_mode: false,
	member_id_placeholder: "Enter your member id", comment_placeholder: "Please fill in your complaint or question here ...",
	comment: null, webview: false, mobile: null, email_submit_text: "", member_id_input_error_message: null, comment_input_error_message: null,
	selection_topic_input_error_message: null, member_mode_title: "Who are you", option_member: "Member", option_non_member: "Guest",
	selection_topic_placeholder: "Please select a question", selection_topic_member: ["Product", "Service"], selection_topic_non_member: ["Hai", "Hello"],
	off_hour_message: "", enable_service_hour: false, service_hour: null, send_email_success_message: "", process_send_email_message: "", process_send_email_error_message: "", subject_email: "", channel_id_email: "",
	isWebView: false, error_location_setting_message: "", error_location_supported_message: "", enable_input_in_queue: true, iframe_height_method: 'custom', disable_map_search: false, cancel_share_location: "Cancel",
	lightSlider_settings: {}, waiting_text_icon: "", is_waiting_text_icon: false, enable_email_form: true, trigger_menu_after_icon_click: false, no_header: false, chat_background: null, remove_guest_name_on_logout: false,
	one_line_campaign: false, enable_replace_guestName: false, always_updated_uid: false, member_mode_validation: false, enable_force_logout: false, member_mode_select_error_message : null,

	init: function (settings) {
		var isIE = detectBroadcastCapability();
		if (!isIE) {
			initBroadcast();
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
		this.member_mode = settings.member_mode;
		this.enable_service_hour = settings.enable_service_hour;
		this.channel_id_email = settings.channel_id_email;
		this.isWebView = settings.isWebView;
		if (typeof settings.cancel_share_location !== "undefined") {
			this.cancel_share_location = settings.cancel_share_location;
		}

		if (typeof settings.disable_map_search !== "undefined") {
			this.disable_map_search = settings.disable_map_search;
		}

		if (typeof settings.iframe_height_method !== "undefined") {
			this.iframe_height_method = settings.iframe_height_method;
		}

		if (typeof settings.enable_input_in_queue !== "undefined") {
			this.enable_input_in_queue = settings.enable_input_in_queue;
		} else {
			this.enable_input_in_queue = true;
		}

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

		if (settings.email_submit_text) {
			this.email_submit_text = settings.email_submit_text;
		} else {
			this.email_submit_text = "Submit";
		}

		if (settings.connect_button_connecting_text) {
			this.connect_button_connecting_text = settings.connect_button_connecting_text;
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

		if (settings.member_id_input_error_message) {
			this.member_id_input_error_message = settings.member_id_input_error_message;
		} else {
			this.member_id_input_error_message = "Sorry, your member id is incorrect";
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
			this.phone_input_error_message = ["Invalid number", "Invalid country code", "Number is to short", "Number is to long", "Invalid number"];
		}

		if (settings.comment_input_error_message) {
			this.comment_input_error_message = settings.comment_input_error_message;
		} else {
			this.comment_input_error_message = "Invalid comment min 10 characters";
		}

		if (settings.selection_topic_input_error_message) {
			this.selection_topic_input_error_message = settings.selection_topic_input_error_message;
		} else {
			this.selection_topic_input_error_message = "Please select one question";
		}

		if (settings.off_hour_message) {
			this.off_hour_message = settings.off_hour_message;
		} else {
			this.off_hour_message = "Your question or complaint will be emailed to 3dophins@inmotion.co.id <br/><br/> thank you";
		}

		if (settings.member_mode_title) {
			this.member_mode_title = settings.member_mode_title;
		} else {
			this.member_mode_title = Chat.member_mode_title;
		}

		if (settings.option_member) {
			this.option_member = settings.option_member;
		} else {
			this.option_member = Chat.option_member;
		}

		if (settings.option_non_member) {
			this.option_non_member = settings.option_non_member;
		} else {
			this.option_non_member = Chat.option_non_member;
		}

		if (settings.selection_topic_placeholder) {
			this.selection_topic_placeholder = settings.selection_topic_placeholder;
		} else {
			this.selection_topic_placeholder = Chat.selection_topic_placeholder;
		}

		if (settings.selection_topic_member) {
			this.selection_topic_member = settings.selection_topic_member;
		} else {
			this.selection_topic_member = Chat.selection_topic_member;
		}

		if (settings.selection_topic_non_member) {
			this.selection_topic_non_member = settings.selection_topic_non_member;
		} else {
			this.selection_topic_non_member = Chat.selection_topic_non_member;
		}

		if (settings.compatibility_mode) {
			this.compatibility_mode = settings.compatibility_mode;
		} else {
			this.compatibility_mode = false;
		}

		if (settings.quick_reply_flat) {
			this.quick_reply_flat = settings.quick_reply_flat;
		} else {
			this.quick_reply_flat = false;
		}
		if (settings.service_hour) {
			this.service_hour = settings.service_hour;
		} else {
			this.service_hour = [
				{ "days": "sunday", "startHour": "00:00", "endHour": "23:59", "holiday": false },
				{ "days": "monday", "startHour": "00:00", "endHour": "23:59", "holiday": false },
				{ "days": "tuesday", "startHour": "00:00", "endHour": "23:59", "holiday": false },
				{ "days": "wednesday", "startHour": "00:00", "endHour": "23:59", "holiday": false },
				{ "days": "thursday", "startHour": "00:00", "endHour": "23:59", "holiday": false },
				{ "days": "friday", "startHour": "00:00", "endHour": "23:59", "holiday": false },
				{ "days": "saturday", "startHour": "00:00", "endHour": "23:59", "holiday": false }
			];
		}

		if (settings.send_email_success_message) {
			this.send_email_success_message = settings.send_email_success_message;
		} else {
			this.send_email_success_message = "Email sent successfully !<br/><br/>Thanks, we have received your question or your complaint"
		}

		if (settings.subject_email) {
			this.subject_email = settings.subject_email;
		} else {
			this.subject_email = "Of service hour ticket";
		}

		if (settings.process_send_email_message) {
			this.process_send_email_message = settings.process_send_email_message;
		} else {
			this.process_send_email_message = "Sending Email...";
		}

		if (settings.process_send_email_error_message) {
			this.process_send_email_error_message = settings.process_send_email_error_message;
		} else {
			this.process_send_email_error_message = "Email sent failed !";
		}


		if (settings.regex_name) {
			this.regex_name = settings.regex_name;
		} else {
			this.regex_name = /^[a-zA-Z-,]+(\s{0,1}[a-zA-Z-, ])*$/;
		}

		if (settings.regex_email) {
			this.regex_email = settings.regex_email;
		} else {
			this.regex_email = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
		}

		if (settings.name_min_length) {
			this.name_min_length = settings.name_min_length;
		} else {
			this.name_min_length = 3;
		}

		if (settings.error_location_setting_message) {
			this.error_location_setting_message = settings.error_location_setting_message;
		} else {
			this.error_location_setting_message = "Location setting is not available";
		}

		if (settings.error_location_supported_message) {
			this.error_location_supported_message = settings.error_location_supported_message;
		} else {
			this.error_location_supported_message = "Location is not supported by this browser";
		}

		if (settings.lightSlider_settings) {
			this.lightSlider_settings = settings.lightSlider_settings;
		} else {
			this.lightSlider_settings = { item: 2, autoWidth: true, loop: false, responsive: [] };
		}

		if (settings.waiting_text_icon) {
			this.waiting_text_icon = settings.waiting_text_icon;
		} else {
			this.waiting_text_icon = "Connecting...";
		}

		if (settings.is_waiting_text_icon) {
			this.is_waiting_text_icon = settings.is_waiting_text_icon;
		} else {
			this.is_waiting_text_icon = false;
		}

		if (typeof settings.enable_email_form !== "undefined") {
			this.enable_email_form = settings.enable_email_form;
		} else {
			this.enable_email_form = true;
		}

		if (settings.trigger_menu_after_icon_click) {
			this.trigger_menu_after_icon_click = settings.trigger_menu_after_icon_click;
		} else {
			this.trigger_menu_after_icon_click = false;
		}

		if (settings.no_header) {
			this.no_header = settings.no_header;
		} else {
			this.no_header = false;
		}

		if (settings.chat_background) {
			this.chat_background = settings.chat_background;
		}

		if (settings.one_line_campaign) {
			this.one_line_campaign = settings.one_line_campaign;
		}

		if (settings.enable_replace_guestName) {
			this.enable_replace_guestName = settings.enable_replace_guestName;
		}

		if (typeof settings.member_mode_validation !== "undefined") {
			this.member_mode_validation = settings.member_mode_validation;
		}
		
		if (settings.always_updated_uid !== "undefined") {
			this.always_updated_uid = settings.always_updated_uid;
		}

		if (settings.enable_force_logout !== "undefined") {
			this.enable_force_logout = settings.enable_force_logout;
		}

		if (settings.member_mode_select_error_message) {
			this.member_mode_select_error_message = settings.member_mode_select_error_message;
		} else {
			this.member_mode_select_error_message = "Please select user mode";
		}

		Chat.initChatWindow();
		Chat.clearStorageWhenExpired();
		Chat.initProfile(settings);
		Chat.initMapModal();
		Chat.initLogin();
		Chat.addIconEvent();
		Chat.addFocusEvent();
	},
	attachOptions: function (select, options) {
		for (var i = 0; i < options.length; i++) {
			var opt = document.createElement('option');
			opt.innerHTML = options[i];
			opt.value = options[i];
			select.appendChild(opt);
			select.options[0].disabled = true;
			select.options[0].value = "";
			select.options[i].defaultSelected = i == select.selectedIndex;
		}
	},
	loginToWebchat: function () {
		if (Chat.name && Chat.phone && Chat.email && Chat.uid) {
			localStorage.setItem("name", Chat.name);
			localStorage.setItem("email", Chat.email);
			localStorage.setItem("phone", Chat.phone);
			localStorage.setItem("uid", Chat.uid);
			Chat.guestName = Chat.name;
		}
		if (Chat.guestName) {
			send_welcome_message = true;
			Chat.initToken(Chat);
		} else {
			Chat.resetToLogin(true, false);
		}
	},
	autoLogin: function () {
		localStorage.setItem("name", Chat.name);
		localStorage.setItem("email", Chat.email);
		localStorage.setItem("phone", Chat.phone);
		localStorage.setItem("uid", Chat.uid);
		Chat.guestName = Chat.name;
	},
	autoLoginWithoutGuestName: function () {
		if (Chat.name && Chat.phone && Chat.email && Chat.uid) {
			localStorage.setItem("name", Chat.name);
			localStorage.setItem("email", Chat.email);
			localStorage.setItem("phone", Chat.phone);
			localStorage.setItem("uid", Chat.uid);
			Chat.initToken(Chat);
		}
		else {
			Chat.resetToLogin(true, false);
		}
	},
	clearStorageWhenExpired: function () {
			if (localStorage.getItem("expiry") !== null) {
				if (Date.now() > localStorage.getItem("expiry")) {
					if (!Chat.enable_force_logout) {
						Chat.resetToLogin(true, false);
						var isIE = detectBroadcastCapability();
						if (!isIE) {
							if (expiredChannel) {
								expiredChannel.postMessage("logout");
							}
						}
					} else {
						$("#dolphin-name").val("");
						$("#dolphin-email").val("");
						$("#dolphin-telephone").val("");
						Chat.name = undefined;
						Chat.phone = undefined;
						Chat.email = undefined;
						if (Chat.remove_guest_name_on_logout) {
							Chat.guestName = undefined;
						}
						enableBodyScroll();
						$(".dolphin-chat").children().remove();
						Chat.resetToLogin(true, false);
						var isIE = detectBroadcastCapability();
						if (!isIE) {
							if (expiredChannel) {
								expiredChannel.postMessage("logout");
							}
						}
					}
					
				}
			} else if (localStorage.getItem("expiry") === null) {
				clearChatLocalStorage();
				Chat.disconnect();
			}
			if (localStorage.getItem(CHAT_STATE_VARIABLE_NAME) === CHAT_STATE_CHAT) {
				if (Chat.client !== null && Chat.client.connected) {
					$(".dolphin-warning-login-box").remove();
					$(".dolphin-error-login-box").remove();
					if (Object.keys(Chat.client.subscriptions).length < 3) {
						Chat.buildError(Chat.chat_box, "Updating Connection...");
					}
				} else {
					if ($('.dolphin-warning-login').length > 0 && $('.dolphin-warning-login').html().indexOf("Connecting...") !== -1
						&& lastConnectingTime && Date.now() > lastConnectingTime + 10000) {
						Chat.buildError(Chat.chat_box, "Updating Connection...");
						reconnect = -1;
					}
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

		if (localStorage.getItem("email") === null
			|| localStorage.getItem("phone") === null
			|| localStorage.getItem("name") === null) {
			Chat.buildLogin(Chat.login_box);
		}
	},
	callbackInitToken: function (at) {
		if (at.status !== 200) {
			if (at.status === 0) {
				if ($(".dolphin-login") && $(".dolphin-login").is(":visible")) {
					$(".dolphin-error-info").html("Network Error");
					removeConnectionAnimation();
				} else {
					Chat.buildError(Chat.chat_box, "Waiting For Network...");
				}
			} else {
				Chat.buildError(Chat.chat_box, at.responseText);
			}
		} else {
			localStorage.setItem("at", JSON.stringify(at));
			localStorage.setItem("expiry", Date.now() + (at.expires_in * 1000));
			Chat.access_token = at.access_token;
			Chat.refresh_token = at.refresh_token;
			Chat.afterInitToken();
		}
	},
	callbackInitExistingToken: function (at) {
		testConnection(JSON.parse(at), function () {
			Chat.afterInitToken();
		}, function (xhr) {
			if (xhr.status === 0) {
				Chat.buildError(Chat.chat_box, "Waiting For Network...");
			} else {
				Chat.buildError(Chat.chat_box, xhr.responseText);
			}
		});
	},
	initToken: function (settings) {
		if (!isInitiatingToken) {
			isInitiatingToken = true;
			var at = localStorage.getItem("at");
			if (at === null) {
				obtainAccessToken(settings.url, settings.client_id, settings.client_secret, this.compatibility_mode);
			} else {
				Chat.callbackInitExistingToken(at);
			}
		}
	},
	initProfile: function (settings) {
		if (settings.member_id_placeholder) {
			Chat.member_id_placeholder = settings.member_id_placeholder;
		}
		if (settings.name_placeholder) {
			Chat.name_placeholder = settings.name_placeholder;
		}
		if (settings.email_placeholder) {
			Chat.email_placeholder = settings.email_placeholder;
		}
		if (settings.phone_placeholder) {
			Chat.phone_placeholder = settings.phone_placeholder;
		}
		if (localStorage.getItem("name") !== null && localStorage.getItem("email") !== null && localStorage.getItem("phone") !== null) {
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
			var chat_campaign;
			var chat_campaign_header;
			var chat_campaign_text
			if (Chat.one_line_campaign) {
				chat_campaign = this.createDOMElem('div', 'dolphin-campaign-one-line');
				document.body.appendChild(chat_campaign);
				chat_campaign_header = this.createDOMElem('div', 'dolphin-campaign-header-one-line-text');
				chat_campaign.appendChild(chat_campaign_header);
				chat_campaign_header.innerHTML = '<img src=\"https://cdn.3dolphins.ai/widget/images/ic_close.svg\" style=\"filter: contrast(0.5);\" class=\"dolphin-campaign-close\"/>';
				chat_campaign_text = this.createDOMElem('div', 'dolphin-campaign-one-line-text');
				chat_campaign.appendChild(chat_campaign_text);
				chat_campaign_text.innerHTML = Chat.campaign_text;
				$('.dolphin-campaign-one-line').delay(Chat.campaign_timer).fadeIn('fast');
				$('.dolphin-campaign-close').click(function () {
					$('.dolphin-campaign-one-line').fadeOut('fast');
				});
			} else {
				chat_campaign = this.createDOMElem('div', 'dolphin-campaign-widget');
				document.body.appendChild(chat_campaign);
				chat_campaign_header = this.createDOMElem('div', 'dolphin-campaign-header');
				chat_campaign.appendChild(chat_campaign_header);
				var chat_campaign_avatar = this.createDOMElem('div', 'dolphin-campaign-avatar');
				chat_campaign.appendChild(chat_campaign_avatar);
				var chat_campaign_title = this.createDOMElem('div', 'dolphin-campaign-title');
				chat_campaign_header.appendChild(chat_campaign_title);
				chat_campaign_title.innerHTML = Chat.campaign_title + '<img src=\"https://cdn.3dolphins.ai/widget/images/ic_close.svg\" class=\"dolphin-campaign-close\"/>';
				chat_campaign_text = this.createDOMElem('div', 'dolphin-campaign-text');
				chat_campaign_header.appendChild(chat_campaign_text);
				chat_campaign_text.innerHTML = Chat.campaign_text;
				$('.dolphin-campaign-avatar').css('background-image', 'url("' + Chat.campaign_avatar + '")');
				$('.dolphin-campaign-widget').delay(Chat.campaign_timer).fadeIn('fast');
				Chat.initCampaignMenu(chat_campaign);
			}
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
			if (Chat.disable_map_search) {
				$('<div id="dolphin-mapModal" class="dolphin-modal-map"><div id="dolphin-mapModalContent" class="dolphin-modal-map-content"><div class="dolphin-modal-map-close-button">&times;</div><input id="dolphin-mapSearchTextField" type="text" placeholder="Search a place" disabled><div id="dolphin-map"></div><div class="dolphin-modal-map-submit-button" onclick="submitLocation()">OK</div></div></div>').appendTo($('body'));
			} else {
				$('<div id="dolphin-mapModal" class="dolphin-modal-map"><div id="dolphin-mapModalContent" class="dolphin-modal-map-content"><div class="dolphin-modal-map-close-button">&times;</div><input id="dolphin-mapSearchTextField" type="text" placeholder="Search a place"><div id="dolphin-map"></div><div class="dolphin-modal-map-submit-button" onclick="submitLocation()">OK</div></div></div>').appendTo($('body'));
			}
			$('.dolphin-modal-map-close-button').click(function () {
				toggleMapModal();
				var hashedMsg = fuse(Chat.cancel_share_location);
				tempMsgObj = { "message": Chat.cancel_share_location, "token": Chat.token, "messageHash": hashedMsg }
				preRenderOutgoingMessage(Chat.cancel_share_location);
				sendTextMessage(tempMsgObj, Chat.cancel_share_location);
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
		Chat.buildChat(Chat.chat_box);
		Chat.connectServer();
	},
	removeWaitingTextIcon: function () {
		$(".dolphin-text-waiting").remove();
		is_icon_click = false;
	},
	onIconClick: function (menuValue) {
		try {
			if(Chat.guestName) {
				send_welcome_message = true;
			}
			if (Chat.trigger_menu_after_icon_click) {
				Chat.trigger_menu_after_icon_click = false;
			}
			reconnect = -1;
			if (Chat.enable_campaign) {
				if (Chat.one_line_campaign) {
					$('.dolphin-campaign-one-line').fadeOut('fast');
				} else {
					$('.dolphin-campaign-widget').fadeOut('fast');
				}
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

			if (Chat.is_waiting_text_icon && !is_icon_click) {
				is_icon_click = true;
				var btn = document.createElement("a");
				btn.className = "dolphin-text-waiting";
				btn.innerHTML = Chat.waiting_text_icon;
				document.body.appendChild(btn);
			}

			$(".dolphin-messages .messages-content").html("");
			if (Chat.client !== null) {
				Chat.disconnect();
				Chat.initToken(Chat);
			} else {
				Chat.menu = false;
				Chat.initProfile(Chat);
				Chat.initLogin();
				if (localStorage.getItem("expiry") !== null
					&& Date.now() < +localStorage.getItem("expiry")
					&& Chat.name && Chat.email && Chat.phone) {
					Chat.initToken(Chat);
				} else if (Chat.access_token
					&& Chat.name && Chat.email && Chat.phone) {
					Chat.initToken(Chat);
				} else {
					if (Chat.guestName) {
						Chat.loginToWebchat();
					} else {
						$(".dolphin-login").fadeIn("fast");
						$(".dolphin-chat-icon").removeClass("dolphin-icon-waiting");
						Chat.removeWaitingTextIcon();
						$(".dolphin-chat-icon").fadeOut("fast");
						$(".dolphin-login-connect").prop("disabled", false);
					}
				}
			}
			Chat.unread = 0;
			$(".dolphin-chat-notification").fadeOut("fast");
			$(".dolphin-chat-notification").innerHTML = Chat.unread;
		} catch (error) {
			$(".dolphin-chat-icon").removeClass("dolphin-icon-waiting");
			Chat.removeWaitingTextIcon();
			$(".dolphin-chat-icon").fadeIn("fast");
			$(".dolphin-chat").fadeOut("fast");
			$(".dolphin-login").fadeOut("fast");
			console.log(error);
		}
	},
	addIconEvent: function () {
		$(".dolphin-chat-icon").click(function () {
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
				setTimeout(function () { onCustomerTyping() }, 1000);
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
		if (Chat.regex_name.test(name)) {
			if (name !== undefined && name.length >= Chat.name_min_length) {
				element.text('');
				return true;
			} else {
				element.text(Chat.name_input_error_message.replace(/\[name_min_length\]/gi, Chat.name_min_length));
				return false;
			}
		} else {
			element.text(Chat.name_input_error_message.replace(/\[name_min_length\]/gi, Chat.name_min_length));
			return false;
		}
	},
	validateEmail: function (email, element) {
		if (Chat.regex_email.test(email)) {
			element.text('');
			return true;
		} else {
			element.text(Chat.email_input_error_message);
			return false;
		}
	},
	validatePhone: function (phone, element) {
		var errorMap = Chat.phone_input_error_message;
		if (typeof iti === "undefined" || iti.isValidNumber()) {
			element.text('');
			return true;
		} else {
			if (Array.isArray(errorMap)) {
				var errorCode = iti.getValidationError();
				element.text(errorMap[errorCode]);
			} else {
				element.text(errorMap);
			}
			return false;
		}
	},
	validateMemberId: function (memberId, element) {
		if (memberId !== null && memberId !== "") {
			element.text('');
			if (Chat.member_mode_validation) {
				return checkMemberIdValidity(memberId);
			}
			return true;
		} else {
			element.text(Chat.member_id_input_error_message);
			return false;
		}
	},
	validateTopic: function (topic, element) {
		if (topic !== null) {
			element.text('');
			return true;
		} else {
			element.text(Chat.selection_topic_input_error_message);
			return false;
		}
	},
	validateComment: function (comment, element) {
		if (comment !== undefined && comment.length > 10) {
			element.text('');
			return true;
		} else {
			element.text(Chat.comment_input_error_message);
			return false;
		}
	},
	validateServiceHour: function (element) {
		var now = new Date();
		var day = now.getDay();
		var hour = now.getHours();
		var minute = now.getMinutes();
		var dayOfName = "";
		var filterDays = Chat.service_hour.find(function (item, i) {
			if (day === 0) { dayOfName = "sunday"; }
			if (day === 1) { dayOfName = "monday"; }
			if (day === 2) { dayOfName = "tuesday"; }
			if (day === 3) { dayOfName = "wednesday"; }
			if (day === 4) { dayOfName = "thursday"; }
			if (day === 5) { dayOfName = "friday"; }
			if (day === 6) { dayOfName = "saturday"; }
			return item.days === dayOfName;
		});
		var start_hour = parseInt(filterDays.startHour.replace(/[^0-9]/g, ""));
		var end_hour = parseInt(filterDays.endHour.replace(/[^0-9]/g, ""));
		var current_time = "" + hour + (minute < 10 ? '0' : '') + minute;
		if (filterDays.holiday === false) {
			if (current_time >= start_hour && current_time <= end_hour) {
				Chat.buildLoginForm(element);
			} else if (Chat.enable_email_form) {
				Chat.buildEmailForm(element);
				$('#dolphin-send-email-success').fadeOut('fast');
			} else {
				Chat.buildWithoutEmailForm(element);
			}
		} else if (Chat.enable_email_form) {
			Chat.buildEmailForm(element);
			$('#dolphin-send-email-success').fadeOut('fast');
		} else {
			Chat.buildWithoutEmailForm(element);
		}
	},

	generateUid: function () {
		if (!Chat.uid || Chat.always_updated_uid) {
			var navigator_info = window.navigator;
			var screen_info = window.screen;
			var uid = navigator_info.mimeTypes.length;
			uid += navigator_info.userAgent.replace(/\D+/g, '');
			uid += navigator_info.plugins.length;
			uid += screen_info.height || '';
			uid += screen_info.width || '';
			uid += screen_info.pixelDepth || '';
			return uid + Date.now() + Math.random().toString(36).substr(2, 9);
		} else {
			return Chat.uid;
		}
	},
	callbackConnectServer: function (rat, cookieToken) {
		if (rat !== null && rat !== undefined && rat.access_token !== undefined && rat.refresh_token !== undefined) {
			Chat.access_token = rat.access_token;
			Chat.refresh_token = rat.refresh_token;

			if (!Chat.client || !Chat.client.connected) {
				var socket;
				if (Chat.compatibility_mode) {
					socket = new SockJS(Chat.url + '/webchat' + '?access_token=' + Chat.access_token);
					Chat.client = Stomp.over(socket);
					Chat.client.heartbeat.outgoing = 25000;
					Chat.client.heartbeat.incoming = 25000;
				} else {
					socket = new SockJS(Chat.url + '/webchat', null, { transports: ['xhr-streaming', 'xhr-polling', 'jsonp-polling'] });
					Chat.client = Stomp.over(socket);
					Chat.client.heartbeat.outgoing = 25000;
					Chat.client.heartbeat.incoming = 25000;
				}
				Chat.client.debug = false;
				Chat.client.connect({ accessToken: Chat.access_token, name: Chat.name, email: Chat.email, phone: Chat.phone, uid: Chat.uid, customerId: Chat.customerId ? Chat.customerId : '', token: cookieToken, captcha: Chat.g_recaptcha }, function (frame) {
					try {
						$(".dolphin-warning-login-box").remove();
						$(".dolphin-error-login-box").remove();
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
							}
						}
						if (clientToken !== null) {
							Chat.buildChat(Chat.chat_box);
							if (Chat.token) {
								localStorage.setItem("token", Chat.token);
							}
							Chat.subscribeIncoming(clientToken);
						} else {
							Chat.resetToLogin(true, false);
						}
					} catch (e) {
						Chat.resetToLogin(true, false);
					}
				}, function (error) {
					if (error.headers && error.headers.message && error.headers.message.toLowerCase().indexOf('credential') !== -1) {
						Chat.buildError(Chat.chat_box, "Oops, Credential is not valid");
					} else {
						if (reconnect < 5 &&
							Chat.client === null) {
							Chat.buildError(Chat.chat_box, "Lost Connection...");
						} else if (reconnect < 5 &&
							Chat.client && Chat.state !== "icon") {
							Chat.buildError(Chat.chat_box, "Waiting For Network...");
						} else {
							Chat.resetToLogin(true, false);
						}
					}
				});
			} else {
				$(".dolphin-warning-login-box").remove();
				$(".dolphin-error-login-box").remove();
			}
		} else {
			if (rat !== null && rat !== undefined && rat.error !== null) {
				Chat.buildError(Chat.chat_box, rat.error);
			} else {
				Chat.buildError(Chat.chat_box, "Waiting For Network...");
			}
		}
	},
	connectServer: function () {
		if (reconnect === -1 && $(".dolphin-message-retry").length === 0) {
			$(".dolphin-messages .messages-content").addClass("dolphin-icon-waiting");
			$(".dolphin-messages .messages-content").html("");
		}
		var cookieToken = Chat.token;
		if (cookieToken == null) {
			cookieToken = document.cookie.replace(/(?:(?:^|.*;\s*)inmotion_token\s*\=\s*([^;]*).*$)|^.*$/, "$1");
		}
		if (Chat.guestName || (cookieToken !== null && cookieToken !== '') || this.validateName(Chat.name, $("#dolphin-warning-name")) && this.validateEmail(Chat.email, $("#dolphin-warning-email")) && this.validatePhone(Chat.phone, $("#dolphin-warning-phone"))) {
			if (Chat.g_captcha_key !== null && Chat.g_captcha_key !== undefined) {
				Chat.g_recaptcha = grecaptcha.getResponse();
			}
			refreshAccessToken(Chat.url, Chat.client_id, Chat.client_secret, Chat.refresh_token, Chat.token, null, Chat.compatibility_mode);
		}
	},
	subscribeIncoming: function (clientToken) {
		if (Chat.client !== null) {
			Chat.client.subscribe('/topic/message-' + clientToken, function (message) {
				reconnect = 0;
				if (/^[\],:{}\s]*$/.test(message.body.replace(/\\["\\\/bfnrtu]/g, '@').replace(/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g, ']').replace(/(?:^|:|,)(?:\s*\[)+/g, ''))) {
					var body = JSON.parse(message.body);
					var valid = decrypt(body, fuse(Chat.client_secret + Chat.access_token));
					if (valid) {
						if (body.token !== null) {
							if (body.message === null && body.event === null) {
								Chat.token = body.token;
								Chat.buildHistory(Chat.chat_box);
								setTimeout(function () { getChatHistory(Chat.compatibility_mode) }, 1000);
								localStorage.setItem("name", "" + Chat.name);
								localStorage.setItem("email", "" + Chat.email);
								localStorage.setItem("phone", "" + Chat.phone);
								localStorage.setItem("uid", "" + Chat.uid);
								if (body.sessionId !== null) {
									Chat.session_id = body.sessionId;
								}
								Chat.subscribeFeed();
								Chat.subscribeTransaction();
								document.cookie = "inmotion_token=" + Chat.token;
								if (clientToken !== Chat.token) {
									Chat.resetToLogin(true, false);
								}
								Chat.buildChat(Chat.chat_box);
								$(".dolphin-messages .messages-content").removeClass("dolphin-icon-waiting");
								$(".dolphin-message-box .message-input").removeAttr('disabled');
								Chat.buildChat(Chat.chat_box, false);
							} else {
								if (body.event === 'typing') {
									onAgentTyping(body);
								} else if (body.event === 'disconnect') {
									Chat.resetToLogin(true, true);
								} else if (body.event === 'read') {
									markIncomingRead(body);
								} else {
									if (Array.isArray(incomingMessageTemp) && !incomingMessageTemp.length){
										incomingMessageTemp.push(body);
										incomingMessage(body)
									} else {
										incomingMessageTemp.push(body);
									}
								}
							}
						} else {
							Chat.resetToLogin(true, false);
						}
					} else {
						Chat.resetToLogin(true, false);
					}
				} else {
					Chat.resetToLogin(true, false);
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
								Chat.resetToLogin(true, true);
						}
					}
				}
				updateScrollbar();
			}, { accessToken: Chat.access_token });
		}
	},
	subscribeTransaction: function () {
		transactionToken = Chat.access_token;
		if (Chat.client !== null) {
			Chat.client.subscribe("/topic/ack-" + Chat.access_token,
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
		}
	},
	showChatIfChat: function () {
		if (localStorage.getItem(CHAT_STATE_VARIABLE_NAME) === CHAT_STATE_CHAT) {
			$(".dolphin-chat-icon").hide();
			Chat.removeWaitingTextIcon();
			$(".dolphin-chat").css("display", "flex");
			$(".dolphin-chat").fadeIn("fast");
			$(".dolphin-login").hide();
			$(".dolphin-chat-notification").hide();
			localStorage.setItem(CHAT_STATE_VARIABLE_NAME, CHAT_STATE_CHAT);
			updateScrollbar();
			removeConnectionAnimation()
		}
	},
	buildWithoutEmailForm: function (element) {
		var body = this.createDOMElem('div', 'dolphin-login-body');
		element.appendChild(body);
		body.innerHTML = body.innerHTML + '<label class=\"dolphin-message-service-hour\">' + Chat.off_hour_message + "</label>";
	},
	buildEmailForm: function (element) {
		var body = this.createDOMElem('div', 'dolphin-login-body');
		element.appendChild(body);
		body.innerHTML = body.innerHTML + '<label id=\"dolphin-hour-message\" class=\"dolphin-connect-message\">' + Chat.off_hour_message + "</label>";
		body.innerHTML = body.innerHTML + '<input id=\"dolphin-name\" type=\"text\" class=\"dolphin-name-input\" placeholder=\"' + Chat.name_placeholder + '\"></input>';
		body.innerHTML = body.innerHTML + '<label id=\"dolphin-warning-name\" class=\"dolphin-warning-name\"></label>';
		body.innerHTML = body.innerHTML + '<input id=\"dolphin-email\" type=\"text\" class=\"dolphin-email-input\" placeholder=\"' + Chat.email_placeholder + '\"></input>';
		body.innerHTML = body.innerHTML + '<label id=\"dolphin-warning-email\" class=\"dolphin-warning-email\"></label>';
		body.innerHTML = body.innerHTML + '<textarea rows=\"10\" cols=\"28\" id=\"dolphin-comment\" class=\"dolphin-comment-input\" placeholder=\"' + Chat.comment_placeholder + '\"></textarea>';
		body.innerHTML = body.innerHTML + '<label id=\"dolphin-warning-comment\" class=\"dolphin-warning-comment\"></label>';
		body.innerHTML = body.innerHTML + '<button id=\"dolphin-login-connect\" type=\"submit\" class=\"dolphin-email-submit\">' + Chat.email_submit_text + '</button>';

		body.innerHTML = body.innerHTML + '<div id="snackbar" style=\"margin-top:10px !important;\" class=\"dolphin-connect-message\"></div>';

		body.innerHTML = body.innerHTML + '<div id="dolphin-send-email-success" class=\"test\">'
			+ '<div class=\"dolphin-box-message-send-email\">'
			+ '<div class="dolphin-message-send-email">' + Chat.send_email_success_message + '</div>'
			+ '</div>'
			+ '<button id=\"dolphin-back-send-email\" type=\"submit\" class=\"dolphin-email-submit\">back</button>'
			+ '</div>';

		$("#dolphin-back-send-email").click(function () {
			$('#dolphin-send-email-success').fadeOut('fast');
			document.getElementById('dolphin-login-body').style.backgroundImage = 'none';
			document.getElementById('dolphin-login-body').style.backgroundSize = 'none';
			setTimeout(function () {
				$('#dolphin-hour-message').fadeIn('fast');
				$('#dolphin-name').fadeIn('fast');
				$('#dolphin-email').fadeIn('fast');
				$('#dolphin-comment').fadeIn('fast');
				$('#dolphin-login-connect').fadeIn('fast');
				$('#dolphin-warning-name').fadeIn('fast');
				$('#dolphin-warning-email').fadeIn('fast');
				$('#dolphin-warning-comment').fadeIn('fast');
				$('#dolphin-warning-name').text('');
				$('#dolphin-warning-email').text('');
				$('#dolphin-warning-comment').text('');
			}, 500);
		});
	},
	buildLoginForm: function (element) {
		var body = this.createDOMElem('div', 'dolphin-login-body');
		element.appendChild(body);
		body.innerHTML = body.innerHTML + '<label class=\"dolphin-connect-message\">' + Chat.connect_message + "</label>";
		body.innerHTML = body.innerHTML + '<label id=\"warning-login\" class=\"dolphin-error-info\"></label>';

		body.innerHTML = body.innerHTML + '<div class=\"dolphin-member-mode-tilte-box\"><label>' + Chat.member_mode_title + "</label></div>"
			+ '<div class=\"dolphin-member-box\">'
				+ '<span class=\"dolphin-member-mode-check\">'
					+ '<span class=\"dolphin-select-member-mode member\"></span>'
					+ '<input class=\"dolphin-select-member\" type=\"radio\" name=\"member-mode\" id=\"member\">'
				+ '</span>'
				+ '<span>' + Chat.option_member + '</span>'
			+ '</div>'
			+ '<div class=\"dolphin-non-member-box\">'
				+ '<span class=\"dolphin-member-mode-check\">'
					+ '<span class=\"dolphin-select-member-mode non-member\"></span>'
					+ '<input class=\"dolphin-select-non-member\" type=\"radio\" name=\"member-mode\" id=\"non_member\">'
				+ '</span>'
				+ '<span>' + Chat.option_non_member + '</span>'
			+ '<div>';
		body.innerHTML = body.innerHTML + '<label id=\"dolphin-warning-member-mode\" class=\"dolphin-warning-member-mode\">' + Chat.member_mode_select_error_message + '</label>';
		body.innerHTML = body.innerHTML + '<input id=\"dolphin-member-id\" type=\"text\" class=\"dolphin-member-id-input\" placeholder=\"' + Chat.member_id_placeholder + '\"></input>';
		body.innerHTML = body.innerHTML + '<label id=\"dolphin-warning-member-id\" class=\"dolphin-warning-member-id\"></label>';

		body.innerHTML = body.innerHTML + '<input id=\"dolphin-name\" type=\"text\" class=\"dolphin-name-input\" placeholder=\"' + Chat.name_placeholder + '\"></input>';
		body.innerHTML = body.innerHTML + '<label id=\"dolphin-warning-name\" class=\"dolphin-warning-name\"></label>';
		body.innerHTML = body.innerHTML + '<input id=\"dolphin-email\" type=\"text\" class=\"dolphin-email-input\" placeholder=\"' + Chat.email_placeholder + '\"></input>';
		body.innerHTML = body.innerHTML + '<label id=\"dolphin-warning-email\" class=\"dolphin-warning-email\"></label>';
		body.innerHTML = body.innerHTML + '<input id=\"dolphin-telephone\" onFocus=\"onFocusInputPhone()\" type=\"text\" class=\"dolphin-phone-input\" placeholder=\"' + Chat.phone_placeholder + '\"></input>';
		body.innerHTML = body.innerHTML + '<label id=\"dolphin-warning-phone\" class=\"dolphin-warning-phone\"></label>';

		body.innerHTML = body.innerHTML + '<select id=\"dolphin-select-topic-member\" class=\"dolphin-select-topic\">'
			+ '</select>';
		body.innerHTML = body.innerHTML + '<select id=\"dolphin-select-topic-non-member\" class=\"dolphin-select-topic\">'
			+ '</select>';
		body.innerHTML = body.innerHTML + '<label id=\"dolphin-warning-selection-topic\" class=\"dolphin-warning-selection-topic\"></label>';

		var selection_topic = [Chat.selection_topic_placeholder];

		var topicMember = document.getElementById('dolphin-select-topic-member');
		var topic_member = selection_topic.concat(Chat.selection_topic_member);
		Chat.attachOptions(topicMember, topic_member);

		var topicNonMember = document.getElementById('dolphin-select-topic-non-member');
		var topic_non_member = selection_topic.concat(Chat.selection_topic_non_member);
		Chat.attachOptions(topicNonMember, topic_non_member);

		if (Chat.g_captcha_key !== null && Chat.g_captcha_key !== undefined) {
			body.innerHTML = body.innerHTML + "<div class=\"dolphin-captcha\"><div class=\"g-recaptcha\" data-sitekey=\"" + Chat.g_captcha_key + "\" data-theme=\"dark\"></div></div>";
		}
		body.innerHTML = body.innerHTML + '<button id=\"login-connect\" type=\"submit\" class=\"dolphin-login-connect\">' + Chat.connect_button_text + '</button>';

		countryCode = document.querySelector("#dolphin-telephone");
		iti = window.intlTelInput(countryCode, {
			nationalMode: false,
			preferredCountries: ['id'],
			utilsScript: "js/utils.js",
		});

		$(".iti").attr('id', 'dolphin-country-code');

		if (Chat.member_mode) {
			if (is_member === null) {
				$(".dolphin-warning-member-mode").hide();
				$(".dolphin-member-id-input").hide();
				$(".dolphin-warning-member-id").hide();
				$(".dolphin-name-input").hide();
				$(".dolphin-warning-name").hide();
				$(".dolphin-email-input").hide();
				$(".dolphin-warning-email").hide();
				$(".dolphin-phone-input").hide();
				$("#dolphin-country-code").hide();
				$(".dolphin-warning-phone").hide();
				$("#dolphin-select-topic-member").hide();
				$("#dolphin-select-topic-non-member").hide();
				$("#dolphin-warning-selection-topic").hide();
			}

			$(".dolphin-select-member").change(function () {
				is_member = true;
				$(".member").addClass("dolphin-select-option-member-mode");
				$(".non-member").removeClass("dolphin-select-option-member-mode");
				$(".dolphin-warning-member-mode").hide();
				$(".dolphin-member-id-input").show();
				$(".dolphin-warning-member-id").show();
				$("#dolphin-select-topic-member").show();
				$("#dolphin-select-topic-non-member").hide();
				$(".dolphin-name-input").show();
				$(".dolphin-warning-name").show();
				$(".dolphin-email-input").show();
				$(".dolphin-warning-email").show();
				$(".dolphin-phone-input").show();
				$("#dolphin-country-code").show();
				$(".dolphin-warning-phone").show();
				$("#dolphin-warning-selection-topic").show();
				$(".dolphin-warning-member-id").text('');
				$(".dolphin-warning-name").text('');
				$(".dolphin-warning-email").text('');
				$(".dolphin-warning-phone").text('');
				$("#dolphin-warning-selection-topic").text('');
			});

			$(".dolphin-select-non-member").change(function () {
				is_member = false;
				$(".member").removeClass("dolphin-select-option-member-mode");
				$(".non-member").addClass("dolphin-select-option-member-mode");
				$(".dolphin-warning-member-mode").hide();
				$(".dolphin-member-id-input").hide();
				$(".dolphin-warning-member-id").hide();
				$("#dolphin-select-topic-member").hide();
				$("#dolphin-select-topic-non-member").show();
				$(".dolphin-name-input").show();
				$(".dolphin-warning-name").show();
				$(".dolphin-email-input").show();
				$(".dolphin-warning-email").show();
				$(".dolphin-phone-input").show();
				$("#dolphin-country-code").show();
				$(".dolphin-warning-phone").show();
				$("#dolphin-warning-selection-topic").show();
				$(".dolphin-warning-name").text('');
				$(".dolphin-warning-email").text('');
				$(".dolphin-warning-phone").text('');
				$("#dolphin-warning-selection-topic").text('');
			});
		} else {
			$(".dolphin-member-mode-tilte-box").remove();
			$(".dolphin-member-box").remove();
			$(".dolphin-non-member-box").remove();
			$(".dolphin-warning-member-mode").remove();
			$(".dolphin-select-member").remove();
			$(".dolphin-select-non-member").remove();
			$(".dolphin-member-id-input").remove();
			$(".dolphin-warning-member-id").remove();
			$(".dolphin-select-topic").remove();
			$("#dolphin-warning-selection-topic").remove();
			$(".dolphin-name-input").css("margin-top", "53px");
			$(".dolphin-email-input").css("margin-top", "15px");
			$(".iti").css('margin-top', '15px');
			$(".dolphin-login-connect").css('margin-top', '15px');
		}

		$(".dolphin-message-close").click(function () {
			$(".dolphin-login").fadeOut("fast");
			$(".dolphin-chat").fadeOut("fast");
			$(".dolphin-chat-icon").removeClass("dolphin-icon-waiting");
			Chat.removeWaitingTextIcon();
			$(".dolphin-chat-icon").fadeIn("slow");
			if (Chat.enable_campaign && !localStorage.getItem("messages")) {
				if (Chat.one_line_campaign) {
					$('.dolphin-campaign-one-line').fadeOut('fast');
				} else {
					$('.dolphin-campaign-widget').fadeOut('fast');
				}
			}
			enableBodyScroll();
			localStorage.setItem(CHAT_STATE_VARIABLE_NAME, CHAT_STATE_ICON);
			Chat.state = CHAT_STATE_ICON;
		});

		$("#dolphin-name,#dolphin-email,#dolphin-telephone,#dolphin-member-id").keyup(function (event) {
			if (event.keyCode === 13) $(".dolphin-login-connect").click();
		});
	},
	showChat: function () {
		if (Chat.enable_campaign) {
			if (Chat.one_line_campaign) {
				$('.dolphin-campaign-one-line').remove();
			} else {
				$('.dolphin-campaign-widget').remove();
			}
		}
		$(".dolphin-chat-icon").hide();
		Chat.removeWaitingTextIcon();
		$(".dolphin-chat").css("display", "flex");
		$(".dolphin-chat").fadeIn("fast");
		$(".dolphin-login").hide();
		$(".dolphin-chat-notification").hide();
		localStorage.setItem(CHAT_STATE_VARIABLE_NAME, CHAT_STATE_CHAT);
		updateScrollbar();
		removeConnectionAnimation()
	},
	buildLogin: function (element) {
		if (!Chat.guestName) {
			if ($(".dolphin-login").is(":visible")) {
				$(".dolphin-chat-icon").fadeOut("slow");
				Chat.removeWaitingTextIcon();
				$(".dolphin-chat-notification").fadeOut("slow");
			}

			if (element.childNodes.length === 0) {
				var title = this.createDOMElem('div', 'dolphin-chat-title');
				element.appendChild(title);

				var avatar = this.createDOMElem('figure', 'avatar');
				avatar.innerHTML = '<img src=\"' + Chat.avatar + '\"/>';
				title.appendChild(avatar);

				var login_header_box = this.createDOMElem('div', 'login-header-box');
				title.appendChild(login_header_box);

				var header = this.createDOMElem('span', 'header-title');
				login_header_box.appendChild(header);
				header.innerHTML = this.header;

				var login_sub_header_box = this.createDOMElem('div', 'login-sub-header-box');
				title.appendChild(login_sub_header_box);

				var sub_header = this.createDOMElem('span', 'sub-header-title');
				login_sub_header_box.appendChild(sub_header);
				sub_header.innerHTML = this.login_sub_header;

				var chat_close = this.createDOMElem('div', 'login-close');
				title.appendChild(chat_close);
				chat_close.innerHTML = '<button type=\"submit\" class=\"dolphin-message-close\" style="right:10px;"></button>';

				if (Chat.enable_service_hour === true) {
					Chat.validateServiceHour(element);
				} else {
					Chat.buildLoginForm(element);
				}
			}
			$(".dolphin-message-close").click(function () {
				$(".dolphin-login").fadeOut("fast");
				$(".dolphin-chat").fadeOut("fast");
				$(".dolphin-chat-icon").removeClass("dolphin-icon-waiting");
				Chat.removeWaitingTextIcon();
				$(".dolphin-chat-icon").fadeIn("slow");
				enableBodyScroll();
				localStorage.setItem(CHAT_STATE_VARIABLE_NAME, CHAT_STATE_ICON);
				Chat.state = CHAT_STATE_ICON;
			});

			$(".dolphin-login-connect").unbind().click(function () {
				if (Chat.member_mode & is_member === null) {
					$(".dolphin-warning-member-mode").show();
				}
				$(".dolphin-login-connect").prop("disabled", true);
				$(".dolphin-warning-login-box").remove();
				$(".dolphin-error-login-box").remove();
				$(".dolphin-error-info").html("");
				send_welcome_message= true;
				Chat.uid = Chat.generateUid();
				var validMemberId = null;
				if (is_member) {
					Chat.customerId = $("#dolphin-member-id").val();
					validMemberId = Chat.validateMemberId(Chat.customerId, $("#dolphin-warning-member-id"));
				} else {
					Chat.customerId = null;
					validMemberId = true;
				}
				Chat.name = $("#dolphin-name").val();
				var validName = Chat.validateName(Chat.name, $("#dolphin-warning-name"));
				Chat.email = $("#dolphin-email").val();
				var validEmail = Chat.validateEmail(Chat.email, $("#dolphin-warning-email"));
				Chat.phone = $("#dolphin-telephone").val();
				var originPhone = iti.getNumber();
				Chat.phone = originPhone.substr(1);
				$('#dolphin-telephone').val(originPhone);
				var validPhone = Chat.validatePhone(Chat.phone, $("#dolphin-warning-phone"));
				var topic = null;
				var validTopic = null;
				if (Chat.member_mode) {
					if (is_member) {
						topic = $('#dolphin-select-topic-member').val();
					} else {
						topic = $('#dolphin-select-topic-non-member').val();
					}
					validTopic = Chat.validateTopic(topic, $("#dolphin-warning-selection-topic"));
				} else {
					validTopic = true;
				}
				if (validName && validPhone && validEmail && validMemberId && validTopic) {
					if (!Chat.webview) {
						clearChatLocalStorage();
						localStorage.setItem(CHAT_STATE_VARIABLE_NAME, CHAT_STATE_CHAT);
					}
					addConnectionAnimation();
					Chat.initToken(Chat);
				} else {
					$(".dolphin-login-connect").prop("disabled", false);
				}
			});

			$(".dolphin-email-submit").click(function () {
				Chat.name = $("#dolphin-name").val();
				var validName = Chat.validateName(Chat.name, $("#dolphin-warning-name"));
				Chat.email = $("#dolphin-email").val();
				var validEmail = Chat.validateEmail(Chat.email, $("#dolphin-warning-email"));
				Chat.comment = $("#dolphin-comment").val();
				var validComment = Chat.validateComment(Chat.comment, $("#dolphin-warning-comment"));
				if (validName && validEmail && validComment) {
					emailProcessingMethod();
					if (!isSendEmail) {
						sendEmail();
						isSendEmail = true;
					}
					return false;
				}
			});
		}
		if (Chat.no_header) {
			$(".dolphin-chat-title").css("display", "none");
		}
	},
	buildChat: function (element, skip) {
		if (element.childNodes.length === 0) {
			var title = this.createDOMElem('div', 'dolphin-chat-title');
			element.appendChild(title);

			var avatar = this.createDOMElem('figure', 'avatar');
			avatar.innerHTML = '<img src=\"' + Chat.avatar + '\"/>';
			title.appendChild(avatar);

			var chat_header_box = this.createDOMElem('div', 'chat-header-box');
			title.appendChild(chat_header_box);

			var header = this.createDOMElem('span', 'header-title');
			chat_header_box.appendChild(header);
			header.innerHTML = this.header;

			var chat_sub_header_box = this.createDOMElem('div', 'chat-sub-header-box');
			title.appendChild(chat_sub_header_box);

			var sub_header = this.createDOMElem('span', 'sub-header-title');
			chat_sub_header_box.appendChild(sub_header);
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

			var messages_box_container = this.createDOMElem('div', 'dolphin-message-box-container');
			var messages_box = this.createDOMElem('div', 'dolphin-message-box');
			var messages_box_html = '<textarea type=\"text\" id=\"message-input\" class=\"message-input [message-input-width]\" placeholder=\"' + Chat.type_placeholder + '\" disabled></textarea>[attachment_placeholder][voice_placeholder]' + '<button id="messageSubmit" type=\"submit\" class=\"message-submit\"></button>';
			if (!Chat.enable_attachment && !Chat.enable_speech) {
				messages_box_html = messages_box_html.replace(/\[message-input-width\]/gi, 'message-input-85-percent');
			}
			if (Chat.enable_attachment && Chat.enable_speech) {
				messages_box_html = messages_box_html.replace(/\[message-input-width\]/gi, '');
			}
			if (Chat.enable_attachment) {
				messages_box_html = messages_box_html.replace(/\[attachment_placeholder\]/gi, '<form method="POST" enctype="multipart/form-data" id="attachment-form"><input id="attachment" type=\"file\" class=\"dolphin-inputfile [attachment_position] inputfile-1\" onchange=\"uploadFile()\"/><label for="attachment"><figure class="dolphin-attachment-figure"><svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 19 20"><path d="M10 0l-5.2 4.9h3.3v5.1h3.8v-5.1h3.3l-5.2-4.9zm9.3 11.5l-3.2-2.1h-2l3.4 2.6h-3.5c-.1 0-.2.1-.2.1l-.8 2.3h-6l-.8-2.2c-.1-.1-.1-.2-.2-.2h-3.6l3.4-2.6h-2l-3.2 2.1c-.4.3-.7 1-.6 1.5l.6 3.1c.1.5.7.9 1.2.9h16.3c.6 0 1.1-.4 1.3-.9l.6-3.1c.1-.5-.2-1.2-.7-1.5z"/></svg></figure></label></form>');
				if(!Chat.enable_speech) {
					messages_box_html = messages_box_html.replace(/\[attachment_position\]/gi, 'dolphin-attachment-position');
				} else {
					messages_box_html =messages_box_html.replace(/\[attachment_position\]/gi, '');
				}
			} else {
				messages_box_html = messages_box_html.replace(/\[message-input-width\]/gi, 'message-input-75-percent');
				messages_box_html = messages_box_html.replace(/\[attachment_placeholder\]/gi, '');
			}

			if (Chat.enable_speech) {
				messages_box_html = messages_box_html.replace(/\[voice_placeholder\]/gi, '<button id=\"start-button\" class=\"speech-recognizer\" onclick=\"onSpeechEvent();\"><figure id=\"figure-microphone\" class="dolphin-speech-figure"><svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 20 20"><path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"/></svg></figure></button>');
			} else {
				messages_box_html = messages_box_html.replace(/\[message-input-width\]/gi, 'message-input-75-percent');
				messages_box_html = messages_box_html.replace(/\[voice_placeholder\]/gi, '');
			}
			messages_box.innerHTML = messages_box_html;
			messages_box_container.appendChild(messages_box);

			element.appendChild(messages_box_container);
			Chat.addKeydownEvent();
			$('.dolphin-message-box .message-submit').click(function () {
				isInputFocus = true;
				outgoingMessage();
			});
			$('.dolphin-message-box .message-input').focus(function () {
				onMessageInputFocus();
			});
			$('.dolphin-message-box .message-input').blur(function () {
				onMessageInputBlur();
			});
			$(".dolphin-message-close").click(function () {
				$(".dolphin-login").fadeOut("fast");
				$(".dolphin-chat").fadeOut("fast");
				$(".dolphin-chat-icon").removeClass("dolphin-icon-waiting");
				Chat.removeWaitingTextIcon();
				$(".dolphin-chat-icon").fadeIn("slow");
				enableBodyScroll();
				localStorage.setItem(CHAT_STATE_VARIABLE_NAME, CHAT_STATE_ICON);
				Chat.state = CHAT_STATE_ICON;
			});
			$(".dolphin-message-logout").click(function () {
				if(send_welcome_message) {
					send_welcome_message = false;
				}
				Chat.name = undefined;
				Chat.phone = undefined;
				Chat.email = undefined;
				if (Chat.remove_guest_name_on_logout) {
					Chat.guestName = undefined;
				}
				enableBodyScroll();
				$(".dolphin-chat").children().remove();
				Chat.resetToLogin(true, false);
				var isIE = detectBroadcastCapability();
				if (!isIE) {
					if (expiredChannel) {
						expiredChannel.postMessage("logout");
					}
				}
			});
			renderQueueNumber(Chat.compatibility_mode);
			setTimeout(renderQueueNumber, 30000);
		}

		if (Chat.member_mode) {
			if (!skip) {
				if (!localStorage.getItem('hasSentQuestionMessage')) {
					setTimeout(() => {
						outgoingMessage();
						localStorage.setItem('hasSentQuestionMessage', true);
					}, 2000);
				}
			}
		}

		if (localStorage.getItem("at") !== null) {
			$(".dolphin-error-info").html("");
			Chat.showChatIfChat();
		}
		if (Chat.no_header) {
			$(".dolphin-chat-title").css("display", "none");
		}
		if (Chat.chat_background) {
			$(".dolphin-messages").css("background", "url(" + Chat.chat_background + ")");
			$(".dolphin-messages").css("background-repeat", "no-repeat");
			$(".dolphin-messages").css("background-size", "cover");
		}

	},
	onClickRetry: function () {
		reconnect = -1;
		Chat.initToken(Chat);
	},
	onClickLogin: function () {
		reconnect = -1;
		clearChatLocalStorage();
		Chat.initToken(Chat);
	},
	triggerMenuIfValid: function () {
		if (Chat.triggerMenu && !Chat.menu && Chat.client) {
			var hashedMsg = fuse(Chat.triggerMenu);
			var msgObj = { "message": Chat.triggerMenu, "token": Chat.token, "messageHash": hashedMsg };
			encrypt(msgObj, fuse(Chat.client_secret + Chat.access_token));
			Chat.client.send("/app/wmessage", { accessToken: Chat.access_token }, JSON.stringify(msgObj));
			Chat.menu = true;
		}
	},
	buildHistory: function (element) {
		$(".dolphin-warning-login-box").remove();
		$(".dolphin-error-login-box").remove();
		$('<div class=\"dolphin-warning-login-box\"><label id=\"dolphin-warning-login\" class=\"dolphin-warning-login\">Synchronizing...</label></div>').appendTo(element);
		failedMessage();
	},
	buildError: function (element, message) {
		Chat.buildChat(Chat.chat_box);
		$(".dolphin-messages .messages-content").removeClass("dolphin-icon-waiting");
		var retry = "";
		if (Chat.client !== null) {
			Chat.disconnect();
		}
		var isRetry = message && typeof message.toLowerCase !== "undefined"
			&& message.toLowerCase() !== 'retry';
		if (isRetry || (reconnect > -1 && reconnect < 5)) {
			document.cookie = "inmotion_token=";
			Chat.token = null;
			Chat.unread = 0;
			if (element !== null) {
				if (Chat.state !== "icon") {
					$(element).fadeIn("fast");
				}
				$(".dolphin-warning-login-box").remove();
				$(".dolphin-error-login-box").remove();
				if ($('.dolphin-chat').children().length !== 0) {
					$(".dolphin-chat-icon").hide();
					Chat.removeWaitingTextIcon();
					$(".dolphin-chat-notification").fadeOut("fast");
				}
				if (message && typeof message.toLowerCase !== "undefined"
					&& message.toLowerCase().indexOf("connection") !== -1
					&& localStorage.getItem("messages") !== null) {
					setTimeout(function () {
						if (retry === "") {
							$(".dolphin-warning-login-box").remove();
							$(".dolphin-error-login-box").remove();
							$('<div class=\"dolphin-warning-login-box\"><label id=\"dolphin-warning-login\" class=\"dolphin-warning-login\">Connecting...</label></div>').appendTo(element);
							lastConnectingTime = Date.now();
						}
						setTimeout(function () {
							if (reconnect < 5) {
								$(".dolphin-error-login-box").remove();
								reconnect = reconnect + 1;
								Chat.connectServer();
							}
						}, 1000);
					}, 3000);
				} else {
					if (Chat.name && Chat.phone && Chat.email) {
						setTimeout(function () {
							if (retry === "") {
								$(".dolphin-warning-login-box").remove();
								$(".dolphin-error-login-box").remove();
								$('<div class=\"dolphin-warning-login-box\"><label id=\"dolphin-warning-login\" class=\"dolphin-warning-login\">Connecting...</label></div>').appendTo(element);
								lastConnectingTime = Date.now();
							}
							setTimeout(function () {
								if (reconnect < 5) {
									$(".dolphin-error-login-box").remove();
									reconnect = reconnect + 1;
									Chat.connectServer();
								}
							}, 1000);
						}, 3000);
					}
					$(".dolphin-error-login-box").remove();
					if (Chat.state !== "icon") {
						if (message !== undefined && message !== "") {
							cancelMessages();
							retry = '<button type=\"submit\" class=\"dolphin-message-retry\" onclick=\"Chat.onClickLogin();\">Login</button>'
							if (message.match("^{") || message.toLowerCase() === 'retry') {
								$('<div class=\"dolphin-error-login-box\" style=\"height:5%\"><label id=\"error-login\" class=\"dolphin-error-login\" style=\"font-size:13px;\">Oops, Credential is not valid</label><br/></div>').appendTo(element);
								$('<div class=\"dolphin-warning-login-box\" style=\"height: 8%\"><br/>' + retry + '</div>').appendTo(element);
							} else {
								$('<div class=\"dolphin-error-login-box\" style=\"height:5%\"><label id=\"error-login\" class=\"dolphin-error-login\" style=\"font-size:13px;\">' + message + '</label><br/></div>').appendTo(element);
							}
						}
					}
					if (!$(".dolphin-login").is(":visible")
						&& !$(".dolphin-chat").is(":visible")
						&& !$(".dolphin-chat-icon").is(":visible")) {
						Chat.resetToLogin(true, false);
					}
				}
			}
			removeConnectionAnimation();
		} else {
			removeConnectionAnimation();
			$(".dolphin-warning-login-box").remove();
			$(".dolphin-error-login-box").remove();
			if (Chat.client !== null) {
				retry = '<button type=\"submit\" class=\"dolphin-message-retry\" onclick=\"Chat.onClickRetry()\">Retry</button>'
				$('<div class=\"dolphin-warning-login-box\" style=\"height: 8%\"><br/>' + retry + '</div>').appendTo(element);
			} else {
				retry = '<button type=\"submit\" class=\"dolphin-message-retry\" onclick=\"Chat.onClickLogin()\">Retry</button>'
				$('<div class=\"dolphin-warning-login-box\" style=\"height: 8%\"><br/>' + retry + '</div>').appendTo(element);
			}
		}
	},
	disconnect: function () {
		if (Chat.client !== null) {
			var count = Object.keys(Chat.client.subscriptions).length;
			for (var i = 0; i < count; i++) {
				var key = Object.keys(Chat.client.subscriptions)[i];
				Chat.client.unsubscribe(key);
			}
			if (Chat.client.connected) {
				Chat.client.disconnect();
			}
			Chat.client = null;
		}
	},
	resetToLogin: function (resetToken, closeChat) {
		$(".dolphin-messages .messages-content").removeClass("dolphin-icon-waiting");
		if (resetToken) {
			document.cookie = "inmotion_token=";
			Chat.token = null;
			clearChatLocalStorage();
		}
		Chat.unread = 0;
		if (!Chat.guestName) {
			if (Chat.login_box !== null && !closeChat) {
				if ($(".dolphin-chat .dolphin-messages").children().length === 0) {
					clearChatLocalStorage();
					deleteAllCookies();
					Chat.buildLogin(Chat.login_box);
					$(".dolphin-login").fadeIn("slow");
					$(".dolphin-chat-icon").fadeOut("slow");
					Chat.removeWaitingTextIcon();
					$(".dolphin-chat-notification").fadeOut("slow");
					$(".dolphin-chat").fadeOut("slow");
					if (Chat.g_captcha_key !== null && Chat.g_captcha_key !== undefined) {
						grecaptcha.reset();
					}
				} else {
					if ($(".dolphin-chat").is(":visible") && reconnect === -1) {
						Chat.buildError(Chat.chat_box, "retry");
					} else {
						Chat.buildError(Chat.chat_box);
					}
				}
			} else if (Chat.login_box !== null && closeChat) {
				clearChatLocalStorage();
				deleteAllCookies();
				$(".dolphin-login").fadeIn("slow");
				$(".dolphin-chat-icon").fadeOut("slow");
				Chat.removeWaitingTextIcon();
				$(".dolphin-chat-notification").fadeOut("slow");
				$(".dolphin-chat").fadeOut("slow");
				if (Chat.g_captcha_key !== null && Chat.g_captcha_key !== undefined) {
					grecaptcha.reset();
				}
			} else {
				clearChatLocalStorage();
				deleteAllCookies();
				$(".dolphin-chat-notification").fadeOut("slow");
				$(".dolphin-chat").css("display", "none");
				$(".dolphin-chat-icon").removeClass("dolphin-icon-waiting");
				Chat.removeWaitingTextIcon();
				$(".dolphin-chat-icon").fadeIn("slow");
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
			Chat.removeWaitingTextIcon();
			$(".dolphin-chat-icon").fadeIn("slow");
			if (Chat.g_captcha_key !== null && Chat.g_captcha_key !== undefined) {
				grecaptcha.reset();
			}
		}
		Chat.menu = false;
		isGettingChatHistory = false;
		isInitiatingToken = false;
		isRefreshingToken = false;
		Chat.disconnect();
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
	lazyLoadInstance.update();
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
	if (msgObj.message !== message) {
		msgObj.label = message;
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
	$('.dolphin-messages .messages-content').animate({ scrollTop: $('.dolphin-messages .messages-content').prop("scrollHeight"), duration: 50 });
	renderQueueNumber(Chat.compatibility_mode);
	setTimeout(renderQueueNumber, 30000);
}

/**
 * Save messages html and set expiry for 10 minutes
 */
function saveToSession() {
	if (Chat.number_of_messages && $('.dolphin-messages .messages-content').children().length > Chat.number_of_messages) {
		var number_of_trash = $('.dolphin-messages .messages-content').children().length - Chat.number_of_messages;
		if (number_of_trash > 0) {
			$('.dolphin-messages .messages-content > div').slice(0, number_of_trash).remove()
		}
	}
	var messages = $('.dolphin-messages .messages-content').html();
	localStorage.setItem("messages", messages);
	if (timeoutChat === null) {
		at = JSON.parse(localStorage.getItem("at"));
		timeoutChat = at.expires_in;
	}
	localStorage.setItem("expiry", Date.now() + (timeoutChat * 1000));
	updateScrollbar();
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
	localStorage.removeItem('hasSentQuestionMessage');
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
	if ($(".dolphin-messages #" + payload.transactionId).length === 0) {
		if (payload.attUrl) {
			var attachmentEl = '';
			if (checkAttrImageTypeByBrowser(payload.attFiletype)) {
				attachmentEl = '<div class="message message-image-personal">' + '<a href="' + payload.attUrl + '" download="' + file.name + '" target="_blank" style="font-size:10px;"><img class="dolphin-attachment-image d-lazy" src="https://cdn.3dolphins.ai/widget/images/ic_loading.gif" data-src="' + payload.attUrl + '" alt="' + file.name + '" onerror="this.src=data:image/jpeg;base64,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FFAB2oNFLQA5Pvr9RV6qCffH1FX6AP/S/SVvvH6mm05vvH6mm0AFApKWgA+lFFFABRRRQAYoopaAEpaTijPpQAYooooAKKOaM0AFFFFABS0maOKACijNFABxRijrRmgAoNFFAB1paKSgAooooAKKKOKACiiigAoo60dqAD8KKKM0AFHNFFABxRRRQAtJRRQAUfhRxRQAUUUUAFHelpKAD6UUUYoAKKKKACjmijNABRRRQAUtJRQAUYoooAKKWigApKKKAFooooASig0tACUtFFADk++PqKvVRT76/UVeoA//0/0kb7x+ppKc33j9TTaADjtSUv40n60ALR9KKKACig+1BoAKSlooATtR9aKWgBOlFLSUAFFLzRQAUlLRQAlFLSfjQAtJS0UAJ70UdsUtACUcUoz60UAJRS0fWgBMUo/Wj9aOlACUtHtRQAUUUUAFFFFABxRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRR3oAKKKKACilpKACiiigAooooAKKKKACij6UUALRxSUtABSUUUALRSUUALRSUUAFLRSUAPT76/UVeqin31+oq9QB/9T9JW+8frTaV/vH60lABRRRQAUUUUAFFFFABRSUtABSUUdqACl96TrS0AFFFHSgBKWkpaACiikoAWik60tABz60UUnNABS0maKAFooooATNFFFAC0UUUAHaikpaACiikoAWj60d6DQAUUUd6ACijiigAopKWgAopKKAFooo9qACiijigAopKWgAo5opM0ALRSUtAAKKKSgBaKKQ0ALRRRQAUtFFACUtJS0AFJzRS0AJRS0UAFFJS0AOT74+oq9VFPvL9RV6gD//1f0lb7x+pptK33j9TSUALSUUlAC0UUcUAJS0UUAFFFJ9aAFpPeiloASilooASil96KADvRSZo96AFpKODS0AJzS+9FJQAUUdTS/jQAn1o9qWigBKKOKWgBKXmj2ooAKKSloASloooAKKKOBQAUUlLQAUUYooASl5oooAP0oo5oxQAUlLSUALRRRQAUd6TiloAKKKPagAooo4oAKKTiloAKKOKKACiiigAooooAWikooAWikooAWikooAWiko+tAC0UlFAD0++v1FXqoJ99fqKv0Af//W/SRvvH60lOb7x+tNoAKSlooAOlFFFABR9aKKAEpaSl70AFIcUtJQAtFJS0AFFFJ+NABRRS0A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/9L9JW+8fqabTm+8frTaACilooASiiigA+lBoooAKKKSgA+lFH40tACCloooAKT6UtJx0oAKWj8aKACij8aSgA6fWloooAKSl+lJQAUClo/GgAooooAT2paKKACijijpQAUUUUAFFFLQAlFFHagApaSigAooozQAUUUUAFFLSUAFFFFABRRRQAUUUUALSUUUAFFFLQAUlFFABRRRQAUUUfSgBaKSloAKKKKACikpaACikzRQAtFJS0AOT7y/UVeqin31+oq9QB//0/0lb7x+pptOb7x+tNoAOaPrRRQAUUUUAFJS0lAC0UlLQAlFHNBoAKWkpcUAHvRRSc0ALSUUvWgAoopKACiiigBaKTj0paACijmigA9qKKSgAooooAO1OpMUtACUtJRQAUUUtABSUtFACUUtJQAUUUUAFFFLQAlFFFAC0lFFABRRRQAtJRRQAUUUUAFLRSUAFFFFABRRRQAUUtJQAtFFFACUtJRQAtFJS0AFJRRQAtFFJQA9Pvr9RV6qKffX6ir1AH//1P0lb7x+ppKVvvH6mm0AFFFFABRRRQAUlLRQAlLRSUAFFH1ooAKUUcUdqAE+lFH0ooAX8KKSl7UAFJS0lABS0lH40ALSUvekoAPpR+FHFFAC0UlFABRS8UcUAFFFFABQaKKAFpPejtRQAUUUUALSUUtABSUdaKAFpKKKACiiigApaSigAoo7UUAFFHFFAC0lFFABRRRQAUUUUAFFFFAC0lFHHSgBaKKKACiikoAWiiigApKWigAooooAcn31+oq9VFPvr9RV6gD/1f0kb7x+ppKc33j9ab1oAKKKKADFFFJQAtJS0UAJS0UUAFFFFABSUUvegBKKKKAFopKWgAooooAKOaT6UUAFLRSUALR70UlAC0UCigANJS0nWgBaKKWgBKOlFFABRRRQAtFJRQAUUtJQAUtJRQAUUUUAFLSUUALSUUUAFLSUUAFFFFABRRRQAtFJRQAUtJRQAUUUUAFFAooAWikpaACkoooAKWiigBKKKBQAUUtFADk++PqKvVQT76/UVfoA/9b9JW+8frTac33j9TTaAClopKAE60tFFABRR7UUAIPej2paKACk+tHaigApaSloAKSlpKAD9KKKKAF70lL2pKAFopOlAoAXmkpTRQAlFGOaWgApMUZ9aKACiiigBaKTINLQAUUUUAFLSUtACUUUUAFFFFABRRRQAUUUUAFFLSUAFFGKKACiiigApaSigAoooFABRRR70AGaKKKACiiigAooo60ALRRRQAUUUUAFFFFABRRRQAlLRRQA5Pvr9RV6qKffX6ir1AH/1/0mb7x+tNpzfeP1ptABSd6Wk70ABpM0ppPWgBe9LikHWloAQ9Kbk049KZQAueadjmm9/wAaf3oASmk0+mHrQAZpRzzTaevSgBcU08U6mtQAntSjnrSDrSrQA7FNPFOpG6UANyaBzxQKB1oAdilxRRQAzNGaKSgB+BS0UUANPU06mnqadQAUUUUAFFFFABSYpaKACiiigAooooAKKKKACjFFFABRRRQAUUUUAFFFFABRRRQAUYoooAKKKKADFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFADk++v1FXqop99fqKvUAf//Z"/></a>' + '</div>';
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
		$('.dolphin-message-box .message-input').val(null);
		removeQuickReply();
		updateScrollbar();
	}
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
		renderQueueNumber(Chat.compatibility_mode);
	}

	if (payload.attUrl) {
		var attachmentEl = '';
		if (checkAttrImageTypeByBrowser(payload.attFiletype)) {
			if (Chat.isWebView) {
				attachmentEl = '<a style="font-size:10px;"><img class="dolphin-attachment-image d-lazy" src="https://cdn.3dolphins.ai/widget/images/ic_loading.gif" data-src="' + payload.attUrl + '?access_token=' + Chat.access_token + '" alt="' + payload.attFilename + '" onerror="this.src=data:image/jpeg;base64,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FFAB2oNFLQA5Pvr9RV6qCffH1FX6AP/S/SVvvH6mm05vvH6mm0AFApKWgA+lFFFABRRRQAYoopaAEpaTijPpQAYooooAKKOaM0AFFFFABS0maOKACijNFABxRijrRmgAoNFFAB1paKSgAooooAKKKOKACiiigAoo60dqAD8KKKM0AFHNFFABxRRRQAtJRRQAUfhRxRQAUUUUAFHelpKAD6UUUYoAKKKKACjmijNABRRRQAUtJRQAUYoooAKKWigApKKKAFooooASig0tACUtFFADk++PqKvVRT76/UVeoA//0/0kb7x+ppKc33j9TTaADjtSUv40n60ALR9KKKACig+1BoAKSlooATtR9aKWgBOlFLSUAFFLzRQAUlLRQAlFLSfjQAtJS0UAJ70UdsUtACUcUoz60UAJRS0fWgBMUo/Wj9aOlACUtHtRQAUUUUAFFFFABxRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRR3oAKKKKACilpKACiiigAooooAKKKKACij6UUALRxSUtABSUUUALRSUUALRSUUAFLRSUAPT76/UVeqin31+oq9QB/9T9JW+8frTaV/vH60lABRRRQAUUUUAFFFFABRSUtABSUUdqACl96TrS0AFFFHSgBKWkpaACiikoAWik60tABz60UUnNABS0maKAFooooATNFFFAC0UUUAHaikpaACiikoAWj60d6DQAUUUd6ACijiigAopKWgAopKKAFooo9qACiijigAopKWgAo5opM0ALRSUtAAKKKSgBaKKQ0ALRRRQAUtFFACUtJS0AFJzRS0AJRS0UAFFJS0AOT74+oq9VFPvL9RV6gD//1f0lb7x+pptK33j9TSUALSUUlAC0UUcUAJS0UUAFFFJ9aAFpPeiloASilooASil96KADvRSZo96AFpKODS0AJzS+9FJQAUUdTS/jQAn1o9qWigBKKOKWgBKXmj2ooAKKSloASloooAKKKOBQAUUlLQAUUYooASl5oooAP0oo5oxQAUlLSUALRRRQAUd6TiloAKKKPagAooo4oAKKTiloAKKOKKACiiigAooooAWikooAWikooAWikooAWiko+tAC0UlFAD0++v1FXqoJ99fqKv0Af//W/SRvvH60lOb7x+tNoAKSlooAOlFFFABR9aKKAEpaSl70AFIcUtJQAtFJS0AFFFJ+NABRRS0A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/9L9JW+8fqabTm+8frTaACilooASiiigA+lBoooAKKKSgA+lFH40tACCloooAKT6UtJx0oAKWj8aKACij8aSgA6fWloooAKSl+lJQAUClo/GgAooooAT2paKKACijijpQAUUUUAFFFLQAlFFHagApaSigAooozQAUUUUAFFLSUAFFFFABRRRQAUUUUALSUUUAFFFLQAUlFFABRRRQAUUUfSgBaKSloAKKKKACikpaACikzRQAtFJS0AOT7y/UVeqin31+oq9QB//0/0lb7x+pptOb7x+tNoAOaPrRRQAUUUUAFJS0lAC0UlLQAlFHNBoAKWkpcUAHvRRSc0ALSUUvWgAoopKACiiigBaKTj0paACijmigA9qKKSgAooooAO1OpMUtACUtJRQAUUUtABSUtFACUUtJQAUUUUAFFFLQAlFFFAC0lFFABRRRQAtJRRQAUUUUAFLRSUAFFFFABRRRQAUUtJQAtFFFACUtJRQAtFJS0AFJRRQAtFFJQA9Pvr9RV6qKffX6ir1AH//1P0lb7x+ppKVvvH6mm0AFFFFABRRRQAUlLRQAlLRSUAFFH1ooAKUUcUdqAE+lFH0ooAX8KKSl7UAFJS0lABS0lH40ALSUvekoAPpR+FHFFAC0UlFABRS8UcUAFFFFABQaKKAFpPejtRQAUUUUALSUUtABSUdaKAFpKKKACiiigApaSigAoo7UUAFFHFFAC0lFFABRRRQAUUUUAFFFFAC0lFHHSgBaKKKACiikoAWiiigApKWigAooooAcn31+oq9VFPvr9RV6gD/1f0kb7x+ppKc33j9ab1oAKKKKADFFFJQAtJS0UAJS0UUAFFFFABSUUvegBKKKKAFopKWgAooooAKOaT6UUAFLRSUALR70UlAC0UCigANJS0nWgBaKKWgBKOlFFABRRRQAtFJRQAUUtJQAUtJRQAUUUUAFLSUUALSUUUAFLSUUAFFFFABRRRQAtFJRQAUtJRQAUUUUAFFAooAWikpaACkoooAKWiigBKKKBQAUUtFADk++PqKvVQT76/UVfoA/9b9JW+8frTac33j9TTaAClopKAE60tFFABRR7UUAIPej2paKACk+tHaigApaSloAKSlpKAD9KKKKAF70lL2pKAFopOlAoAXmkpTRQAlFGOaWgApMUZ9aKACiiigBaKTINLQAUUUUAFLSUtACUUUUAFFFFABRRRQAUUUUAFFLSUAFFGKKACiiigApaSigAoooFABRRR70AGaKKKACiiigAooo60ALRRRQAUUUUAFFFFABRRRQAlLRRQA5Pvr9RV6qKffX6ir1AH/1/0mb7x+tNpzfeP1ptABSd6Wk70ABpM0ppPWgBe9LikHWloAQ9Kbk049KZQAueadjmm9/wAaf3oASmk0+mHrQAZpRzzTaevSgBcU08U6mtQAntSjnrSDrSrQA7FNPFOpG6UANyaBzxQKB1oAdilxRRQAzNGaKSgB+BS0UUANPU06mnqadQAUUUUAFFFFABSYpaKACiiigAooooAKKKKACjFFFABRRRQAUUUUAFFFFABRRRQAUYoooAKKKKADFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFADk++v1FXqop99fqKvUAf//Z"/></a>';
			} else {
				attachmentEl = '<a href="' + payload.attUrl + '?access_token=' + Chat.access_token + '" download="' + payload.attFilename + '?access_token=' + Chat.access_token + '" target="_blank" style="font-size:10px;"><img class="dolphin-attachment-image d-lazy" src="https://cdn.3dolphins.ai/widget/images/ic_loading.gif" data-src="' + payload.attUrl + '?access_token=' + Chat.access_token + '" alt="' + payload.attFilename + '" onerror="this.src=data:image/jpeg;base64,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FFAB2oNFLQA5Pvr9RV6qCffH1FX6AP/S/SVvvH6mm05vvH6mm0AFApKWgA+lFFFABRRRQAYoopaAEpaTijPpQAYooooAKKOaM0AFFFFABS0maOKACijNFABxRijrRmgAoNFFAB1paKSgAooooAKKKOKACiiigAoo60dqAD8KKKM0AFHNFFABxRRRQAtJRRQAUfhRxRQAUUUUAFHelpKAD6UUUYoAKKKKACjmijNABRRRQAUtJRQAUYoooAKKWigApKKKAFooooASig0tACUtFFADk++PqKvVRT76/UVeoA//0/0kb7x+ppKc33j9TTaADjtSUv40n60ALR9KKKACig+1BoAKSlooATtR9aKWgBOlFLSUAFFLzRQAUlLRQAlFLSfjQAtJS0UAJ70UdsUtACUcUoz60UAJRS0fWgBMUo/Wj9aOlACUtHtRQAUUUUAFFFFABxRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRR3oAKKKKACilpKACiiigAooooAKKKKACij6UUALRxSUtABSUUUALRSUUALRSUUAFLRSUAPT76/UVeqin31+oq9QB/9T9JW+8frTaV/vH60lABRRRQAUUUUAFFFFABRSUtABSUUdqACl96TrS0AFFFHSgBKWkpaACiikoAWik60tABz60UUnNABS0maKAFooooATNFFFAC0UUUAHaikpaACiikoAWj60d6DQAUUUd6ACijiigAopKWgAopKKAFooo9qACiijigAopKWgAo5opM0ALRSUtAAKKKSgBaKKQ0ALRRRQAUtFFACUtJS0AFJzRS0AJRS0UAFFJS0AOT74+oq9VFPvL9RV6gD//1f0lb7x+pptK33j9TSUALSUUlAC0UUcUAJS0UUAFFFJ9aAFpPeiloASilooASil96KADvRSZo96AFpKODS0AJzS+9FJQAUUdTS/jQAn1o9qWigBKKOKWgBKXmj2ooAKKSloASloooAKKKOBQAUUlLQAUUYooASl5oooAP0oo5oxQAUlLSUALRRRQAUd6TiloAKKKPagAooo4oAKKTiloAKKOKKACiiigAooooAWikooAWikooAWikooAWiko+tAC0UlFAD0++v1FXqoJ99fqKv0Af//W/SRvvH60lOb7x+tNoAKSlooAOlFFFABR9aKKAEpaSl70AFIcUtJQAtFJS0AFFFJ+NABRRS0A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/9L9JW+8fqabTm+8frTaACilooASiiigA+lBoooAKKKSgA+lFH40tACCloooAKT6UtJx0oAKWj8aKACij8aSgA6fWloooAKSl+lJQAUClo/GgAooooAT2paKKACijijpQAUUUUAFFFLQAlFFHagApaSigAooozQAUUUUAFFLSUAFFFFABRRRQAUUUUALSUUUAFFFLQAUlFFABRRRQAUUUfSgBaKSloAKKKKACikpaACikzRQAtFJS0AOT7y/UVeqin31+oq9QB//0/0lb7x+pptOb7x+tNoAOaPrRRQAUUUUAFJS0lAC0UlLQAlFHNBoAKWkpcUAHvRRSc0ALSUUvWgAoopKACiiigBaKTj0paACijmigA9qKKSgAooooAO1OpMUtACUtJRQAUUUtABSUtFACUUtJQAUUUUAFFFLQAlFFFAC0lFFABRRRQAtJRRQAUUUUAFLRSUAFFFFABRRRQAUUtJQAtFFFACUtJRQAtFJS0AFJRRQAtFFJQA9Pvr9RV6qKffX6ir1AH//1P0lb7x+ppKVvvH6mm0AFFFFABRRRQAUlLRQAlLRSUAFFH1ooAKUUcUdqAE+lFH0ooAX8KKSl7UAFJS0lABS0lH40ALSUvekoAPpR+FHFFAC0UlFABRS8UcUAFFFFABQaKKAFpPejtRQAUUUUALSUUtABSUdaKAFpKKKACiiigApaSigAoo7UUAFFHFFAC0lFFABRRRQAUUUUAFFFFAC0lFHHSgBaKKKACiikoAWiiigApKWigAooooAcn31+oq9VFPvr9RV6gD/1f0kb7x+ppKc33j9ab1oAKKKKADFFFJQAtJS0UAJS0UUAFFFFABSUUvegBKKKKAFopKWgAooooAKOaT6UUAFLRSUALR70UlAC0UCigANJS0nWgBaKKWgBKOlFFABRRRQAtFJRQAUUtJQAUtJRQAUUUUAFLSUUALSUUUAFLSUUAFFFFABRRRQAtFJRQAUtJRQAUUUUAFFAooAWikpaACkoooAKWiigBKKKBQAUUtFADk++PqKvVQT76/UVfoA/9b9JW+8frTac33j9TTaAClopKAE60tFFABRR7UUAIPej2paKACk+tHaigApaSloAKSlpKAD9KKKKAF70lL2pKAFopOlAoAXmkpTRQAlFGOaWgApMUZ9aKACiiigBaKTINLQAUUUUAFLSUtACUUUUAFFFFABRRRQAUUUUAFFLSUAFFGKKACiiigApaSigAoooFABRRR70AGaKKKACiiigAooo60ALRRRQAUUUUAFFFFABRRRQAlLRRQA5Pvr9RV6qKffX6ir1AH/1/0mb7x+tNpzfeP1ptABSd6Wk70ABpM0ppPWgBe9LikHWloAQ9Kbk049KZQAueadjmm9/wAaf3oASmk0+mHrQAZpRzzTaevSgBcU08U6mtQAntSjnrSDrSrQA7FNPFOpG6UANyaBzxQKB1oAdilxRRQAzNGaKSgB+BS0UUANPU06mnqadQAUUUUAFFFFABSYpaKACiiigAooooAKKKKACjFFFABRRRQAUUUUAFFFFABRRRQAUYoooAKKKKADFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFADk++v1FXqop99fqKvUAf//Z"/></a>';
			}
			$('<div class="message message-image-agent new"><figure class="avatar"></figure>' + attachmentEl + '</div>').appendTo($('.dolphin-messages .messages-content')).addClass('new');
		} else if (payload.attFiletype && checkAttrVideoTypeByBrowser(payload.attFiletype)) {
			attachmentEl = '<video controls width="250" style="border-radius:3px;"> <source src="' + payload.attUrl + '?access_token=' + Chat.access_token + '" type="' + payload.attFiletype + '"/></video>';
			$('<div class="message message-image-agent new"><figure class="avatar"></figure>' + attachmentEl + '</div>').appendTo($('.dolphin-messages .messages-content')).addClass('new');
		} else if (payload.attFiletype && checkAttrAudioTypeByBrowser(payload.attFiletype)) {
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
		message = waStyle(message);
		if (agentName !== "") {
			$('<div class="message new"><figure class="avatar"><img src=\"' + avatar + '\"/></figure>' + message + '<br/><span style=\"color:#2ECC71;float:right;font-size:10px;margin-top:3px;text-overflow: ellipsis;overflow: hidden;max-width: 300px;white-space: nowrap;\">' + escapeSpecialChar(agentName) + '</span></div>').appendTo($('.dolphin-messages .messages-content')).addClass('new');
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
 * Check attribute image file by user browser
 * @param fileAttrType
 * @returns
 */
function checkAttrImageTypeByBrowser(fileAttrType) {
	return fileAttrType.indexOf('image') != -1;
}

/**
 * Check attribute Video file by user browser
 * @param fileAttrType
 * @returns
 */
function checkAttrVideoTypeByBrowser(fileAttrType) {
	return fileAttrType.indexOf('video') != -1;
}

/**
 * Check attribute Audio file by user browser
 * @param fileAttrType
 * @returns
 */
function checkAttrAudioTypeByBrowser(fileAttrType) {
	return fileAttrType.indexOf('audio') != -1;
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
	} catch (e) {
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
	if ($.trim(message) == '' && !ignoreMessageBox) {
		return false;
	}
	if (rat !== null && rat !== undefined && rat.access_token !== undefined && rat.refresh_token !== undefined) {
		Chat.access_token = rat.access_token;
		Chat.refresh_token = rat.refresh_token;
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
	unsent.push(tempMsgObj.transactionId);
}

/**
 * Render outgoing message bubble
 * 
 * @returns
 */
function outgoingMessage() {
	if ($(".message-input").length > 0 && isInputFocus) {
		$(".message-input").focus();
	}
	if (Chat.member_mode) {
		if (!localStorage.getItem('hasSentQuestionMessage')) {
			var messageInput = document.getElementById('message-input');
			if (is_member) {
				messageInput.value = $('#dolphin-select-topic-member').val();
			} else {
				messageInput.value = $('#dolphin-select-topic-non-member').val();
			}
		}
	}
	var message = $('.dolphin-message-box .message-input').val();
	if ($.trim(message) == '') {
		return false;
	}

	if (Chat.client !== null) {
		preRenderOutgoingMessage(message);
		refreshAccessToken(Chat.url, Chat.client_id, Chat.client_secret, Chat.refresh_token, Chat.token, callbackOutgoingMessage, Chat.compatibility_mode);
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
	if ($(".message-input").length > 0 && isInputFocus) {
		$(".message-input").focus();
	}
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
	if ($(".message-input").length > 0 && isInputFocus) {
		$(".message-input").focus();
	}
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
			var latlng = {
				lat: 0,
				lng: 0
			};

			map.setCenter(latlng);
			addMarker(latlng)
			toggleMapModal();
		});
	} else {
		msgObj.message = Chat.error_location_supported_message;
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
		refreshAccessToken(Chat.url, Chat.client_id, Chat.client_secret, Chat.refresh_token, Chat.token, callbackCustomerTyping, Chat.compatibility_mode);
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
	if ($('.dolphin-chat').is(":visible")) {
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
 * Make wa style message
 * 
 * @param {*} message 
 */
function waStyle(message) {
	var words = message.split("*");
	var transformMessage = "";
	for (var i = 0; i < words.length; i++) {
		var tempWord = words[i];
		if (message.indexOf("*" + words[i].trim() + "*") > -1) {
			tempWord = "<strong>" + words[i] + "</strong>";
		}
		transformMessage = transformMessage + tempWord + " ";
	}

	return transformMessage;
}

/**
 * regex for replace guestName in message
 * @returns
 * 
 */

function regExpGuestName(guesName){
	return guesName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * replace all guestname in message
 * @returns
 * 
 */
function replaceAllGuestName(message, replacement) {
	var splitName = Chat.guestName.split(" ");
	Chat.guestName = splitName[0];
	return message.replace(new RegExp(regExpGuestName(Chat.guestName), 'g'), replacement);
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
	if (Chat.enable_replace_guestName && Chat.guestName !== null && message != null) {
		message = replaceAllGuestName(message, '');
	}
	var avatar = Chat.agent_avatar;
	var agentName = "";
	var isAgent = false;
	if (payload.agentAvatar !== undefined && payload.agentAvatar !== null && payload.agentAvatar !== "") {
		avatar = payload.agentAvatar;
	}
	if (payload.agentName !== undefined && payload.agentName !== null && payload.agentName !== "") {
		agentName = payload.agentName;
		isAgent = true;
		renderQueueNumber(Chat.compatibility_mode);
	}

	var i = 0;

	$('<div class="message loading new"><figure class="avatar"><img src=\"' + avatar + '\"/></figure><span></span></div>').appendTo($('.dolphin-messages .messages-content'));
	updateScrollbar();
	setTimeout(function () {
		$('.message.loading').remove();
		if (payload.attUrl) {
			var attachmentEl = '';
			if (payload.attFiletype && checkAttrImageTypeByBrowser(payload.attFiletype)) {
				if (Chat.isWebView) {
					attachmentEl = '<a style="font-size:10px;"><img class="dolphin-attachment-image d-lazy" src="https://cdn.3dolphins.ai/widget/images/ic_loading.gif" data-src="' + payload.attUrl + '?access_token=' + Chat.access_token + '" alt="' + payload.attFilename + '" onerror="this.src=data:image/jpeg;base64,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FFAB2oNFLQA5Pvr9RV6qCffH1FX6AP/S/SVvvH6mm05vvH6mm0AFApKWgA+lFFFABRRRQAYoopaAEpaTijPpQAYooooAKKOaM0AFFFFABS0maOKACijNFABxRijrRmgAoNFFAB1paKSgAooooAKKKOKACiiigAoo60dqAD8KKKM0AFHNFFABxRRRQAtJRRQAUfhRxRQAUUUUAFHelpKAD6UUUYoAKKKKACjmijNABRRRQAUtJRQAUYoooAKKWigApKKKAFooooASig0tACUtFFADk++PqKvVRT76/UVeoA//0/0kb7x+ppKc33j9TTaADjtSUv40n60ALR9KKKACig+1BoAKSlooATtR9aKWgBOlFLSUAFFLzRQAUlLRQAlFLSfjQAtJS0UAJ70UdsUtACUcUoz60UAJRS0fWgBMUo/Wj9aOlACUtHtRQAUUUUAFFFFABxRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRR3oAKKKKACilpKACiiigAooooAKKKKACij6UUALRxSUtABSUUUALRSUUALRSUUAFLRSUAPT76/UVeqin31+oq9QB/9T9JW+8frTaV/vH60lABRRRQAUUUUAFFFFABRSUtABSUUdqACl96TrS0AFFFHSgBKWkpaACiikoAWik60tABz60UUnNABS0maKAFooooATNFFFAC0UUUAHaikpaACiikoAWj60d6DQAUUUd6ACijiigAopKWgAopKKAFooo9qACiijigAopKWgAo5opM0ALRSUtAAKKKSgBaKKQ0ALRRRQAUtFFACUtJS0AFJzRS0AJRS0UAFFJS0AOT74+oq9VFPvL9RV6gD//1f0lb7x+pptK33j9TSUALSUUlAC0UUcUAJS0UUAFFFJ9aAFpPeiloASilooASil96KADvRSZo96AFpKODS0AJzS+9FJQAUUdTS/jQAn1o9qWigBKKOKWgBKXmj2ooAKKSloASloooAKKKOBQAUUlLQAUUYooASl5oooAP0oo5oxQAUlLSUALRRRQAUd6TiloAKKKPagAooo4oAKKTiloAKKOKKACiiigAooooAWikooAWikooAWikooAWiko+tAC0UlFAD0++v1FXqoJ99fqKv0Af//W/SRvvH60lOb7x+tNoAKSlooAOlFFFABR9aKKAEpaSl70AFIcUtJQAtFJS0AFFFJ+NABRRS0A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/9L9JW+8fqabTm+8frTaACilooASiiigA+lBoooAKKKSgA+lFH40tACCloooAKT6UtJx0oAKWj8aKACij8aSgA6fWloooAKSl+lJQAUClo/GgAooooAT2paKKACijijpQAUUUUAFFFLQAlFFHagApaSigAooozQAUUUUAFFLSUAFFFFABRRRQAUUUUALSUUUAFFFLQAUlFFABRRRQAUUUfSgBaKSloAKKKKACikpaACikzRQAtFJS0AOT7y/UVeqin31+oq9QB//0/0lb7x+pptOb7x+tNoAOaPrRRQAUUUUAFJS0lAC0UlLQAlFHNBoAKWkpcUAHvRRSc0ALSUUvWgAoopKACiiigBaKTj0paACijmigA9qKKSgAooooAO1OpMUtACUtJRQAUUUtABSUtFACUUtJQAUUUUAFFFLQAlFFFAC0lFFABRRRQAtJRRQAUUUUAFLRSUAFFFFABRRRQAUUtJQAtFFFACUtJRQAtFJS0AFJRRQAtFFJQA9Pvr9RV6qKffX6ir1AH//1P0lb7x+ppKVvvH6mm0AFFFFABRRRQAUlLRQAlLRSUAFFH1ooAKUUcUdqAE+lFH0ooAX8KKSl7UAFJS0lABS0lH40ALSUvekoAPpR+FHFFAC0UlFABRS8UcUAFFFFABQaKKAFpPejtRQAUUUUALSUUtABSUdaKAFpKKKACiiigApaSigAoo7UUAFFHFFAC0lFFABRRRQAUUUUAFFFFAC0lFHHSgBaKKKACiikoAWiiigApKWigAooooAcn31+oq9VFPvr9RV6gD/1f0kb7x+ppKc33j9ab1oAKKKKADFFFJQAtJS0UAJS0UUAFFFFABSUUvegBKKKKAFopKWgAooooAKOaT6UUAFLRSUALR70UlAC0UCigANJS0nWgBaKKWgBKOlFFABRRRQAtFJRQAUUtJQAUtJRQAUUUUAFLSUUALSUUUAFLSUUAFFFFABRRRQAtFJRQAUtJRQAUUUUAFFAooAWikpaACkoooAKWiigBKKKBQAUUtFADk++PqKvVQT76/UVfoA/9b9JW+8frTac33j9TTaAClopKAE60tFFABRR7UUAIPej2paKACk+tHaigApaSloAKSlpKAD9KKKKAF70lL2pKAFopOlAoAXmkpTRQAlFGOaWgApMUZ9aKACiiigBaKTINLQAUUUUAFLSUtACUUUUAFFFFABRRRQAUUUUAFFLSUAFFGKKACiiigApaSigAoooFABRRR70AGaKKKACiiigAooo60ALRRRQAUUUUAFFFFABRRRQAlLRRQA5Pvr9RV6qKffX6ir1AH/1/0mb7x+tNpzfeP1ptABSd6Wk70ABpM0ppPWgBe9LikHWloAQ9Kbk049KZQAueadjmm9/wAaf3oASmk0+mHrQAZpRzzTaevSgBcU08U6mtQAntSjnrSDrSrQA7FNPFOpG6UANyaBzxQKB1oAdilxRRQAzNGaKSgB+BS0UUANPU06mnqadQAUUUUAFFFFABSYpaKACiiigAooooAKKKKACjFFFABRRRQAUUUUAFFFFABRRRQAUYoooAKKKKADFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFADk++v1FXqop99fqKvUAf//Z"/></a>';
				} else {
					attachmentEl = '<a href="' + payload.attUrl + '?access_token=' + Chat.access_token + '" download="' + payload.attFilename + '?access_token=' + Chat.access_token + '" target="_blank" style="font-size:10px;"><img class="dolphin-attachment-image d-lazy" src="https://cdn.3dolphins.ai/widget/images/ic_loading.gif" data-src="' + payload.attUrl + '?access_token=' + Chat.access_token + '" alt="' + payload.attFilename + '" onerror="this.src=data:image/jpeg;base64,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FFAB2oNFLQA5Pvr9RV6qCffH1FX6AP/S/SVvvH6mm05vvH6mm0AFApKWgA+lFFFABRRRQAYoopaAEpaTijPpQAYooooAKKOaM0AFFFFABS0maOKACijNFABxRijrRmgAoNFFAB1paKSgAooooAKKKOKACiiigAoo60dqAD8KKKM0AFHNFFABxRRRQAtJRRQAUfhRxRQAUUUUAFHelpKAD6UUUYoAKKKKACjmijNABRRRQAUtJRQAUYoooAKKWigApKKKAFooooASig0tACUtFFADk++PqKvVRT76/UVeoA//0/0kb7x+ppKc33j9TTaADjtSUv40n60ALR9KKKACig+1BoAKSlooATtR9aKWgBOlFLSUAFFLzRQAUlLRQAlFLSfjQAtJS0UAJ70UdsUtACUcUoz60UAJRS0fWgBMUo/Wj9aOlACUtHtRQAUUUUAFFFFABxRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRR3oAKKKKACilpKACiiigAooooAKKKKACij6UUALRxSUtABSUUUALRSUUALRSUUAFLRSUAPT76/UVeqin31+oq9QB/9T9JW+8frTaV/vH60lABRRRQAUUUUAFFFFABRSUtABSUUdqACl96TrS0AFFFHSgBKWkpaACiikoAWik60tABz60UUnNABS0maKAFooooATNFFFAC0UUUAHaikpaACiikoAWj60d6DQAUUUd6ACijiigAopKWgAopKKAFooo9qACiijigAopKWgAo5opM0ALRSUtAAKKKSgBaKKQ0ALRRRQAUtFFACUtJS0AFJzRS0AJRS0UAFFJS0AOT74+oq9VFPvL9RV6gD//1f0lb7x+pptK33j9TSUALSUUlAC0UUcUAJS0UUAFFFJ9aAFpPeiloASilooASil96KADvRSZo96AFpKODS0AJzS+9FJQAUUdTS/jQAn1o9qWigBKKOKWgBKXmj2ooAKKSloASloooAKKKOBQAUUlLQAUUYooASl5oooAP0oo5oxQAUlLSUALRRRQAUd6TiloAKKKPagAooo4oAKKTiloAKKOKKACiiigAooooAWikooAWikooAWikooAWiko+tAC0UlFAD0++v1FXqoJ99fqKv0Af//W/SRvvH60lOb7x+tNoAKSlooAOlFFFABR9aKKAEpaSl70AFIcUtJQAtFJS0AFFFJ+NABRRS0A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/9L9JW+8fqabTm+8frTaACilooASiiigA+lBoooAKKKSgA+lFH40tACCloooAKT6UtJx0oAKWj8aKACij8aSgA6fWloooAKSl+lJQAUClo/GgAooooAT2paKKACijijpQAUUUUAFFFLQAlFFHagApaSigAooozQAUUUUAFFLSUAFFFFABRRRQAUUUUALSUUUAFFFLQAUlFFABRRRQAUUUfSgBaKSloAKKKKACikpaACikzRQAtFJS0AOT7y/UVeqin31+oq9QB//0/0lb7x+pptOb7x+tNoAOaPrRRQAUUUUAFJS0lAC0UlLQAlFHNBoAKWkpcUAHvRRSc0ALSUUvWgAoopKACiiigBaKTj0paACijmigA9qKKSgAooooAO1OpMUtACUtJRQAUUUtABSUtFACUUtJQAUUUUAFFFLQAlFFFAC0lFFABRRRQAtJRRQAUUUUAFLRSUAFFFFABRRRQAUUtJQAtFFFACUtJRQAtFJS0AFJRRQAtFFJQA9Pvr9RV6qKffX6ir1AH//1P0lb7x+ppKVvvH6mm0AFFFFABRRRQAUlLRQAlLRSUAFFH1ooAKUUcUdqAE+lFH0ooAX8KKSl7UAFJS0lABS0lH40ALSUvekoAPpR+FHFFAC0UlFABRS8UcUAFFFFABQaKKAFpPejtRQAUUUUALSUUtABSUdaKAFpKKKACiiigApaSigAoo7UUAFFHFFAC0lFFABRRRQAUUUUAFFFFAC0lFHHSgBaKKKACiikoAWiiigApKWigAooooAcn31+oq9VFPvr9RV6gD/1f0kb7x+ppKc33j9ab1oAKKKKADFFFJQAtJS0UAJS0UUAFFFFABSUUvegBKKKKAFopKWgAooooAKOaT6UUAFLRSUALR70UlAC0UCigANJS0nWgBaKKWgBKOlFFABRRRQAtFJRQAUUtJQAUtJRQAUUUUAFLSUUALSUUUAFLSUUAFFFFABRRRQAtFJRQAUtJRQAUUUUAFFAooAWikpaACkoooAKWiigBKKKBQAUUtFADk++PqKvVQT76/UVfoA/9b9JW+8frTac33j9TTaAClopKAE60tFFABRR7UUAIPej2paKACk+tHaigApaSloAKSlpKAD9KKKKAF70lL2pKAFopOlAoAXmkpTRQAlFGOaWgApMUZ9aKACiiigBaKTINLQAUUUUAFLSUtACUUUUAFFFFABRRRQAUUUUAFFLSUAFFGKKACiiigApaSigAoooFABRRR70AGaKKKACiiigAooo60ALRRRQAUUUUAFFFFABRRRQAlLRRQA5Pvr9RV6qKffX6ir1AH/1/0mb7x+tNpzfeP1ptABSd6Wk70ABpM0ppPWgBe9LikHWloAQ9Kbk049KZQAueadjmm9/wAaf3oASmk0+mHrQAZpRzzTaevSgBcU08U6mtQAntSjnrSDrSrQA7FNPFOpG6UANyaBzxQKB1oAdilxRRQAzNGaKSgB+BS0UUANPU06mnqadQAUUUUAFFFFABSYpaKACiiigAooooAKKKKACjFFFABRRRQAUUUUAFFFFABRRRQAUYoooAKKKKADFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFADk++v1FXqop99fqKvUAf//Z"/></a>';
				}
				$('<div class="message message-image-agent new"><figure class="avatar"><img src=\"' + avatar + '\"/></figure>' + attachmentEl + '</div>').appendTo($('.dolphin-messages .messages-content')).addClass('new');
			} else if (payload.attFiletype && checkAttrVideoTypeByBrowser(payload.attFiletype)) {
				attachmentEl = '<video controls width="250" style="border-radius:3px;"> <source src="' + payload.attUrl + '?access_token=' + Chat.access_token + '" type="' + payload.attFiletype + '"/></video>';
				$('<div class="message message-image-agent new"><figure class="avatar"><img src=\"' + avatar + '\"/></figure>' + attachmentEl + '</div>').appendTo($('.dolphin-messages .messages-content')).addClass('new');
			} else if (payload.attFiletype && checkAttrAudioTypeByBrowser(payload.attFiletype)) {
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
			message = waStyle(message);

			speak(message, payload.language, Chat.gender, isAgent);
			if (agentName !== "") {
				$('<div class="message new"><figure class="avatar"><img src=\"' + avatar + '\"/></figure>' + message + '<br/><span style=\"color:#2ECC71;float:right;font-size:10px;margin-top:3px;text-overflow: ellipsis;overflow: hidden;max-width: 300px;white-space: nowrap;\">' + escapeSpecialChar(agentName) + '</span></div>').appendTo($('.dolphin-messages .messages-content')).addClass('new');
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
		incomingMessageTemp.splice(0,1);
		if (incomingMessageTemp.length > 0){
			setTimeout(function () {
				incomingMessage(incomingMessageTemp[0]);
			}, 1000);
		}
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
			buttonImage = buttonImage + '<img class="dolphin-button-card__image d-lazy" src="https://cdn.3dolphins.ai/widget/images/ic_loading.gif" data-src="' + button.pictureLink + '" onerror="this.src=data:image/jpeg;base64,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FFAB2oNFLQA5Pvr9RV6qCffH1FX6AP/S/SVvvH6mm05vvH6mm0AFApKWgA+lFFFABRRRQAYoopaAEpaTijPpQAYooooAKKOaM0AFFFFABS0maOKACijNFABxRijrRmgAoNFFAB1paKSgAooooAKKKOKACiiigAoo60dqAD8KKKM0AFHNFFABxRRRQAtJRRQAUfhRxRQAUUUUAFHelpKAD6UUUYoAKKKKACjmijNABRRRQAUtJRQAUYoooAKKWigApKKKAFooooASig0tACUtFFADk++PqKvVRT76/UVeoA//0/0kb7x+ppKc33j9TTaADjtSUv40n60ALR9KKKACig+1BoAKSlooATtR9aKWgBOlFLSUAFFLzRQAUlLRQAlFLSfjQAtJS0UAJ70UdsUtACUcUoz60UAJRS0fWgBMUo/Wj9aOlACUtHtRQAUUUUAFFFFABxRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRR3oAKKKKACilpKACiiigAooooAKKKKACij6UUALRxSUtABSUUUALRSUUALRSUUAFLRSUAPT76/UVeqin31+oq9QB/9T9JW+8frTaV/vH60lABRRRQAUUUUAFFFFABRSUtABSUUdqACl96TrS0AFFFHSgBKWkpaACiikoAWik60tABz60UUnNABS0maKAFooooATNFFFAC0UUUAHaikpaACiikoAWj60d6DQAUUUd6ACijiigAopKWgAopKKAFooo9qACiijigAopKWgAo5opM0ALRSUtAAKKKSgBaKKQ0ALRRRQAUtFFACUtJS0AFJzRS0AJRS0UAFFJS0AOT74+oq9VFPvL9RV6gD//1f0lb7x+pptK33j9TSUALSUUlAC0UUcUAJS0UUAFFFJ9aAFpPeiloASilooASil96KADvRSZo96AFpKODS0AJzS+9FJQAUUdTS/jQAn1o9qWigBKKOKWgBKXmj2ooAKKSloASloooAKKKOBQAUUlLQAUUYooASl5oooAP0oo5oxQAUlLSUALRRRQAUd6TiloAKKKPagAooo4oAKKTiloAKKOKKACiiigAooooAWikooAWikooAWikooAWiko+tAC0UlFAD0++v1FXqoJ99fqKv0Af//W/SRvvH60lOb7x+tNoAKSlooAOlFFFABR9aKKAEpaSl70AFIcUtJQAtFJS0AFFFJ+NABRRS0A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/9L9JW+8fqabTm+8frTaACilooASiiigA+lBoooAKKKSgA+lFH40tACCloooAKT6UtJx0oAKWj8aKACij8aSgA6fWloooAKSl+lJQAUClo/GgAooooAT2paKKACijijpQAUUUUAFFFLQAlFFHagApaSigAooozQAUUUUAFFLSUAFFFFABRRRQAUUUUALSUUUAFFFLQAUlFFABRRRQAUUUfSgBaKSloAKKKKACikpaACikzRQAtFJS0AOT7y/UVeqin31+oq9QB//0/0lb7x+pptOb7x+tNoAOaPrRRQAUUUUAFJS0lAC0UlLQAlFHNBoAKWkpcUAHvRRSc0ALSUUvWgAoopKACiiigBaKTj0paACijmigA9qKKSgAooooAO1OpMUtACUtJRQAUUUtABSUtFACUUtJQAUUUUAFFFLQAlFFFAC0lFFABRRRQAtJRRQAUUUUAFLRSUAFFFFABRRRQAUUtJQAtFFFACUtJRQAtFJS0AFJRRQAtFFJQA9Pvr9RV6qKffX6ir1AH//1P0lb7x+ppKVvvH6mm0AFFFFABRRRQAUlLRQAlLRSUAFFH1ooAKUUcUdqAE+lFH0ooAX8KKSl7UAFJS0lABS0lH40ALSUvekoAPpR+FHFFAC0UlFABRS8UcUAFFFFABQaKKAFpPejtRQAUUUUALSUUtABSUdaKAFpKKKACiiigApaSigAoo7UUAFFHFFAC0lFFABRRRQAUUUUAFFFFAC0lFHHSgBaKKKACiikoAWiiigApKWigAooooAcn31+oq9VFPvr9RV6gD/1f0kb7x+ppKc33j9ab1oAKKKKADFFFJQAtJS0UAJS0UUAFFFFABSUUvegBKKKKAFopKWgAooooAKOaT6UUAFLRSUALR70UlAC0UCigANJS0nWgBaKKWgBKOlFFABRRRQAtFJRQAUUtJQAUtJRQAUUUUAFLSUUALSUUUAFLSUUAFFFFABRRRQAtFJRQAUtJRQAUUUUAFFAooAWikpaACkoooAKWiigBKKKBQAUUtFADk++PqKvVQT76/UVfoA/9b9JW+8frTac33j9TTaAClopKAE60tFFABRR7UUAIPej2paKACk+tHaigApaSloAKSlpKAD9KKKKAF70lL2pKAFopOlAoAXmkpTRQAlFGOaWgApMUZ9aKACiiigBaKTINLQAUUUUAFLSUtACUUUUAFFFFABRRRQAUUUUAFFLSUAFFGKKACiiigApaSigAoooFABRRR70AGaKKKACiiigAooo60ALRRRQAUUUUAFFFFABRRRQAlLRRQA5Pvr9RV6qKffX6ir1AH/1/0mb7x+tNpzfeP1ptABSd6Wk70ABpM0ppPWgBe9LikHWloAQ9Kbk049KZQAueadjmm9/wAaf3oASmk0+mHrQAZpRzzTaevSgBcU08U6mtQAntSjnrSDrSrQA7FNPFOpG6UANyaBzxQKB1oAdilxRRQAzNGaKSgB+BS0UUANPU06mnqadQAUUUUAFFFFABSYpaKACiiigAooooAKKKKACjFFFABRRRQAUUUUAFFFFABRRRQAUYoooAKKKKADFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFADk++v1FXqop99fqKvUAf//Z"></img>';
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

	var completedButton = '<div class="message new dolphin-contain-buttons" style="background-color:transparent!important"><figure class="avatar"></figure>' + buttonHtmls + '</div>';
	if (appendToHtml) {
		var target = $('.dolphin-messages .messages-content');
		$(completedButton).appendTo(target).addClass("new");
		if (buttons.length > 1) {
			$("#lightslider" + btnUniqueId).lightSlider(Chat.lightSlider_settings);
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
	} catch (e) {
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
		$(this).lightSlider(Chat.lightSlider_settings);
	});
	$(".lSPager").css("visibility", "hidden");

	$('[id^=frame]').each(function () {
		iFrameResize({ log: true, checkOrigin: false, heightCalculationMethod: Chat.iframe_height_method }, '#' + this.id);
		updateScrollbar();
	});
}

function reconstructImage() {
	$(".dolphin-button-card__image").removeClass("loaded");
	var emptyImage;
	var values;
	if ($(".dolphin-button-card__image").length > 0) {
		emptyImage = $($(".dolphin-button-card__image")[0]).attr("onerror");
		values = emptyImage.split("=");
		if (values.length > 1) {
			$(".dolphin-button-card__image").attr("src", values[1]);
			$(".dolphin-button-card__image").attr("data-was-processed", "false");
			lazyLoadInstance.update();
		}
	}
	if ($(".dolphin-attachment-image").length > 0) {
		emptyImage = $($(".dolphin-attachment-image")[0]).attr("onerror");
		values = emptyImage.split("=");
		if (values.length > 1) {
			$(".dolphin-attachment-image").attr("src", values[1]);
			$(".dolphin-attachment-image").attr("data-was-processed", "false");
			lazyLoadInstance.update();
		}
	}
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
	if (Chat.no_header) {
		$('<iframe src="' + url + '&overflowY=scroll" frameBorder="0" width="320" height="100%"/>').appendTo('#dolphin-messages');
	} else {
		$('<iframe src="' + url + '&overflowY=scroll" frameBorder="0" width="320" height="470"/>').appendTo('#dolphin-messages');
	}
	$('#messages-content').css("visibility", "hidden");
	$('.dolphin-message-box .message-input').css("visibility", "hidden");
	$('.dolphin-message-box form label').css("visibility", "hidden");
	$('.dolphin-message-box .message-submit').css("visibility", "hidden");
	if ($('.speech-recognizer')) {
		$('.speech-recognizer').hide();
	}
	$('<button id="cancel" type="submit" class="message-submit"/>').appendTo('.dolphin-message-box');
	$('#cancel').click(function () {
		$('#dolphin-messages iframe').remove();
		$('.dolphin-message-box #cancel').remove();
		$('#messages-content').css("visibility", "visible");
		$('.dolphin-message-box .message-input').css("visibility", "visible");
		$('.dolphin-message-box form label').css("visibility", "visible");
		$('.dolphin-message-box .message-submit').css("visibility", "visible");
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
		height = "400px";
		minHeight = true;
		$('.dolphin-messages').css("background", "black");
	}
	if (Chat.no_header) {
		$('<div id="pageFrame" style="position: fixed;right:0;bottom:0;left: 0;width:100%;height:100%;-webkit-overflow-scrolling:touch;"><object data="' + url + '" style="position:absolute;left:0px;width:100%; height:100%;overflow:hidden"/></div>').appendTo('#dolphin-messages');
	} else {
		$('<div id="pageFrame" style="position: fixed;top: 55px;right:0;bottom:0;left: 0;width:100%;height:' + height + 'px;-webkit-overflow-scrolling:touch;"><object data="' + url + '" style="position:absolute;left:0px;width:100%; height:100%;overflow:hidden"/></div>').appendTo('#dolphin-messages');
	}
	if (minHeight) {
		$('.dolphin-messages #pageFrame').css("min-height", "450px");
	}
	$('#messages-content').css("visibility", "hidden");
	$('.dolphin-message-box .message-input').css("visibility", "hidden");
	$('.dolphin-message-box form label').css("visibility", "hidden");
	$('.dolphin-message-box .message-submit').css("visibility", "hidden");
	$('.dolphin-message-box #dolphin-send').css("visibility", "hidden");
	$('.dolphin-message-box').css("background", "transparent");
	$('.dolphin-message-box').css("box-shadow", "none");
	$('.dolphin-message-box').css("border", "none");
	$('.dolphin-message-box').css("width", "62px");
	$('.dolphin-message-box').css("right", "22px");
	$('.dolphin-message-box').css("float", "right");
	if ($('.speech-recognizer')) {
		$('.speech-recognizer').hide();
	}
	$('<button id="cancel" type="submit" class="message-submit"/>').appendTo('.dolphin-message-box');
	$('#cancel').click(function () {
		if (Chat.chat_background) {
			$(".dolphin-messages").css("background", "url(" + Chat.chat_background + ")");
			$(".dolphin-messages").css("background-repeat", "no-repeat");
			$(".dolphin-messages").css("background-size", "cover");
		} else {
			$('.dolphin-messages').css("background", "white");
		}
		$('#dolphin-messages #pageFrame').remove();
		$('.dolphin-message-box #cancel').remove();
		$('#messages-content').css("visibility", "visible");
		$('.dolphin-message-box .message-input').css("visibility", "visible");
		$('.dolphin-message-box form label').css("visibility", "visible");
		$('.dolphin-message-box .message-submit').css("visibility", "visible");
		$('.dolphin-message-box #dolphin-send').css("visibility", "visible");
		$('.dolphin-message-box').css("background", "rgba(255, 255, 255, 1)");
		$('.dolphin-message-box').css("box-shadow", "0 0 20px 0 rgba(150,165,190,.3)");
		$('.dolphin-message-box').css("border", "1px solid white");
		document.getElementById("dolphin-message-box").removeAttribute("style");
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
	var completedForm = '<div class="message new dolphin-contain-buttons" style="background-color:transparent!important"><iframe id="' + frameId + '" src="' + value + '" frameBorder="0" allowfullscreen width="270" style="border-radius: 10px;"/></div>';
	$(completedForm).appendTo($('.dolphin-messages .messages-content')).addClass('new');
	$('#' + frameId).on("load", function () {
		iFrameResize({ log: true, checkOrigin: false, heightCalculationMethod: Chat.iframe_height_method }, '#' + this.id);
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
	if (checkAttrImageTypeByBrowser(file.type)) {
		attachmentEl = '<div id="' + transactionId + '" class="message message-image-personal message-sent">' + '<a href="' + attachmentUrl + '" download="' + file.name + '" target="_blank" style="font-size:10px;"><img class="dolphin-attachment-image d-lazy" src="https://cdn.3dolphins.ai/widget/images/ic_loading.gif" data-src="' + attachmentUrl + '" alt="' + file.name + '" onerror="this.src=data:image/jpeg;base64,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FFAB2oNFLQA5Pvr9RV6qCffH1FX6AP/S/SVvvH6mm05vvH6mm0AFApKWgA+lFFFABRRRQAYoopaAEpaTijPpQAYooooAKKOaM0AFFFFABS0maOKACijNFABxRijrRmgAoNFFAB1paKSgAooooAKKKOKACiiigAoo60dqAD8KKKM0AFHNFFABxRRRQAtJRRQAUfhRxRQAUUUUAFHelpKAD6UUUYoAKKKKACjmijNABRRRQAUtJRQAUYoooAKKWigApKKKAFooooASig0tACUtFFADk++PqKvVRT76/UVeoA//0/0kb7x+ppKc33j9TTaADjtSUv40n60ALR9KKKACig+1BoAKSlooATtR9aKWgBOlFLSUAFFLzRQAUlLRQAlFLSfjQAtJS0UAJ70UdsUtACUcUoz60UAJRS0fWgBMUo/Wj9aOlACUtHtRQAUUUUAFFFFABxRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRR3oAKKKKACilpKACiiigAooooAKKKKACij6UUALRxSUtABSUUUALRSUUALRSUUAFLRSUAPT76/UVeqin31+oq9QB/9T9JW+8frTaV/vH60lABRRRQAUUUUAFFFFABRSUtABSUUdqACl96TrS0AFFFHSgBKWkpaACiikoAWik60tABz60UUnNABS0maKAFooooATNFFFAC0UUUAHaikpaACiikoAWj60d6DQAUUUd6ACijiigAopKWgAopKKAFooo9qACiijigAopKWgAo5opM0ALRSUtAAKKKSgBaKKQ0ALRRRQAUtFFACUtJS0AFJzRS0AJRS0UAFFJS0AOT74+oq9VFPvL9RV6gD//1f0lb7x+pptK33j9TSUALSUUlAC0UUcUAJS0UUAFFFJ9aAFpPeiloASilooASil96KADvRSZo96AFpKODS0AJzS+9FJQAUUdTS/jQAn1o9qWigBKKOKWgBKXmj2ooAKKSloASloooAKKKOBQAUUlLQAUUYooASl5oooAP0oo5oxQAUlLSUALRRRQAUd6TiloAKKKPagAooo4oAKKTiloAKKOKKACiiigAooooAWikooAWikooAWikooAWiko+tAC0UlFAD0++v1FXqoJ99fqKv0Af//W/SRvvH60lOb7x+tNoAKSlooAOlFFFABR9aKKAEpaSl70AFIcUtJQAtFJS0AFFFJ+NABRRS0A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/9L9JW+8fqabTm+8frTaACilooASiiigA+lBoooAKKKSgA+lFH40tACCloooAKT6UtJx0oAKWj8aKACij8aSgA6fWloooAKSl+lJQAUClo/GgAooooAT2paKKACijijpQAUUUUAFFFLQAlFFHagApaSigAooozQAUUUUAFFLSUAFFFFABRRRQAUUUUALSUUUAFFFLQAUlFFABRRRQAUUUfSgBaKSloAKKKKACikpaACikzRQAtFJS0AOT7y/UVeqin31+oq9QB//0/0lb7x+pptOb7x+tNoAOaPrRRQAUUUUAFJS0lAC0UlLQAlFHNBoAKWkpcUAHvRRSc0ALSUUvWgAoopKACiiigBaKTj0paACijmigA9qKKSgAooooAO1OpMUtACUtJRQAUUUtABSUtFACUUtJQAUUUUAFFFLQAlFFFAC0lFFABRRRQAtJRRQAUUUUAFLRSUAFFFFABRRRQAUUtJQAtFFFACUtJRQAtFJS0AFJRRQAtFFJQA9Pvr9RV6qKffX6ir1AH//1P0lb7x+ppKVvvH6mm0AFFFFABRRRQAUlLRQAlLRSUAFFH1ooAKUUcUdqAE+lFH0ooAX8KKSl7UAFJS0lABS0lH40ALSUvekoAPpR+FHFFAC0UlFABRS8UcUAFFFFABQaKKAFpPejtRQAUUUUALSUUtABSUdaKAFpKKKACiiigApaSigAoo7UUAFFHFFAC0lFFABRRRQAUUUUAFFFFAC0lFHHSgBaKKKACiikoAWiiigApKWigAooooAcn31+oq9VFPvr9RV6gD/1f0kb7x+ppKc33j9ab1oAKKKKADFFFJQAtJS0UAJS0UUAFFFFABSUUvegBKKKKAFopKWgAooooAKOaT6UUAFLRSUALR70UlAC0UCigANJS0nWgBaKKWgBKOlFFABRRRQAtFJRQAUUtJQAUtJRQAUUUUAFLSUUALSUUUAFLSUUAFFFFABRRRQAtFJRQAUtJRQAUUUUAFFAooAWikpaACkoooAKWiigBKKKBQAUUtFADk++PqKvVQT76/UVfoA/9b9JW+8frTac33j9TTaAClopKAE60tFFABRR7UUAIPej2paKACk+tHaigApaSloAKSlpKAD9KKKKAF70lL2pKAFopOlAoAXmkpTRQAlFGOaWgApMUZ9aKACiiigBaKTINLQAUUUUAFLSUtACUUUUAFFFFABRRRQAUUUUAFFLSUAFFGKKACiiigApaSigAoooFABRRR70AGaKKKACiiigAooo60ALRRRQAUUUUAFFFFABRRRQAlLRRQA5Pvr9RV6qKffX6ir1AH/1/0mb7x+tNpzfeP1ptABSd6Wk70ABpM0ppPWgBe9LikHWloAQ9Kbk049KZQAueadjmm9/wAaf3oASmk0+mHrQAZpRzzTaevSgBcU08U6mtQAntSjnrSDrSrQA7FNPFOpG6UANyaBzxQKB1oAdilxRRQAzNGaKSgB+BS0UUANPU06mnqadQAUUUUAFFFFABSYpaKACiiigAooooAKKKKACjFFFABRRRQAUUUUAFFFFABRRRQAUYoooAKKKKADFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFADk++v1FXqop99fqKvUAf//Z"/></a>' + '</div>';
	} else {
		attachmentEl = '<div id="' + transactionId + '" class="message message-personal message-sent">' + '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.0" x="0px" y="0px" viewBox="0 0 24 24" class="icon icons8-Document" ><g id="surface1"><path style="fill:white;" d="M 14 2 L 6 2 C 4.898438 2 4 2.898438 4 4 L 4 20 C 4 21.101563 4.898438 22 6 22 L 18 22 C 19.101563 22 20 21.101563 20 20 L 20 8 Z M 16 14 L 8 14 L 8 12 L 16 12 Z M 14 18 L 8 18 L 8 16 L 14 16 Z M 13 9 L 13 3.5 L 18.5 9 Z "></path></g></svg>' + '<div class="dolphin-attachment-filename-sent"><a class="attachment-filename-text" href="' + attachmentUrl + '" download="' + file.name + '" target="_blank" style="font-size:10px; color:white; display: block; text-overflow: ellipsis; width: 100px; overflow: hidden; white-space: nowrap;" title="' + file.name + '">' + file.name + '</a></div>' + '</div>';
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
	data.append("token", Chat.token);
	data.append("access_token", Chat.access_token);

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
		xhr: function () {
			var xhr = $.ajaxSettings.xhr();
			xhr.upload.onprogress = function (e) {
				var percentVal = Math.floor(e.loaded / e.total * 100) + '%'
				progress_bar.width(percentVal);
			};
			return xhr;
		},
		beforeSend: function () {
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
	if (!localStorage.getItem("messages") && send_welcome_message) {
		setTimeout(function () {
			var welcome = {};
			if (Chat.welcome_message) {
				var custName = (localStorage.getItem("name")) ? localStorage.getItem("name") : Chat.name;
				var newWelMsg = (Chat.welcome_message).replace(/\[Nama\]/gi, custName);
				welcome.message = newWelMsg;
				incomingMessage(welcome);
			}
		}, 10);
	}
}

function isValidToUpload(file) {
	var filenameSplitWithDot = file.name.split('.');
	var filenameWithoutExt = filenameSplitWithDot.join('');

	for (var i = 0; i < restrictedCharInFilename.length; i++) {
		if (filenameWithoutExt.indexOf(restrictedCharInFilename[i]) !== -1) return false;
	}

	var acceptedFileTypes = Chat.accept_file.split(',');
	return checkAcceptedFileTypeByBrowser(acceptedFileTypes);
}

/**
 * Check accepted file by browser type
 * @param acceptedFile
 * @returns
 */
function checkAcceptedFileTypeByBrowser(acceptedFile) {
	return acceptedFile.indexOf('ext') != -1;
}

/**
 * Get chat history by social id
 * 
 * @returns
 */
function getChatHistory(compatibility_mode) {
	if (Chat.access_token && Chat.token) {
		if (Chat.enable_history && !isGettingChatHistory) {
			isGettingChatHistory = true;
			var socialId = Chat.phone + '-' + Chat.name;
			if (Chat.customerId && Chat.customerId !== '') {
				socialId = Chat.customerId;
			}
			cleanupMultipleSubscription();
			socialId = socialId.replace(/\+/g, "%2b");
			var history_endpoint = Chat.url + CHAT_HISTORY_PATH;
			if (!compatibility_mode) {
				$.ajax({
					type: POST,
					url: history_endpoint,
					crossDomain: true,
					async: true,
					data: 'token=' + Chat.token + "&access_token=" + Chat.access_token + '&contactid=' + socialId,
					timeout: 20000,
					success: function success(data) {
						if (data.length === 0 && localStorage.getItem("messages") !== null) {
							$('.dolphin-messages .messages-content').html(localStorage.getItem("messages"));
						} else {
							parseChatHistoryToHTML(data);
						}
						rebuildButton();
						initialMessage();
						updateScrollbar();
						isGettingChatHistory = false;
						$(".dolphin-warning-login-box").remove();
						$(".dolphin-error-login-box").remove();
						if (!Chat.trigger_menu_after_icon_click && data.length == 0) {
							Chat.triggerMenuIfValid();
						}
						lazyLoadInstance.update();
					},
					error: function error(e) {
						if (localStorage.getItem("messages") !== null) {
							$('.dolphin-messages .messages-content').html(localStorage.getItem("messages"));
						}
						cancelMessages();
						rebuildButton();
						reconstructImage();
						initialMessage();
						updateScrollbar();
						isGettingChatHistory = false;
						console.log("ERROR : ", e.responseText);
						$(".dolphin-warning-login-box").remove();
						$(".dolphin-error-login-box").remove();
						if (!Chat.trigger_menu_after_icon_click && localStorage.getItem("messages") === null) {
							Chat.triggerMenuIfValid();
						}
						lazyLoadInstance.update();
					}
				});
			} else {
				history_endpoint = history_endpoint + '?access_token=' + Chat.access_token + '&contactid=' + socialId;
				$.ajax({
					type: GET,
					url: history_endpoint,
					processData: false,
					contentType: false,
					cache: false,
					crossDomain: true,
					async: true,
					timeout: 20000,
					success: function success(data) {
						if (data.length === 0 && localStorage.getItem("messages") !== null) {
							$('.dolphin-messages .messages-content').html(localStorage.getItem("messages"));
						} else {
							parseChatHistoryToHTML(data);
						}
						rebuildButton();
						initialMessage();
						updateScrollbar();
						isGettingChatHistory = false;
						$(".dolphin-warning-login-box").remove();
						$(".dolphin-error-login-box").remove();
						if (!Chat.trigger_menu_after_icon_click && data.length == 0) {
							Chat.triggerMenuIfValid();
						}
						lazyLoadInstance.update();
					},
					error: function error(e) {
						if (localStorage.getItem("messages") !== null) {
							$('.dolphin-messages .messages-content').html(localStorage.getItem("messages"));
						}
						cancelMessages();
						rebuildButton();
						reconstructImage();
						initialMessage();
						updateScrollbar();
						isGettingChatHistory = false;
						console.log("ERROR : ", e.responseText);
						$(".dolphin-warning-login-box").remove();
						$(".dolphin-error-login-box").remove();
						if (!Chat.trigger_menu_after_icon_click && localStorage.getItem("messages") === null) {
							Chat.triggerMenuIfValid();
						}
						lazyLoadInstance.update();
					}
				});
			}
		} else {
			if (localStorage.getItem("messages") !== null) {
				$('.dolphin-messages .messages-content').html(localStorage.getItem("messages"));
			} else {
				initialMessage();
				if (!Chat.trigger_menu_after_icon_click) {
					Chat.triggerMenuIfValid();
				}
			}
			rebuildButton();
			reconstructImage();
			updateScrollbar();
			lazyLoadInstance.update();
		}
	}
}

function parseChatHistoryToHTML(chatHistory) {
	var history = "";
	for (var i = 0; i < chatHistory.length; i++) {
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
		} else if (isQuickReply(hist.message)
			&& i === chatHistory.length - 1) {
			if (Chat.quick_reply_flat) {
				parseHistoryQuickReply(hist);
			} else {
				history = parseHistoryQuickReplyFlat(hist) + history;
			}
		} else if (hist.message.match("^{like-survey:")) {
			hist.message = "👍";
			history = parseHistoryTextMessageToHTML(hist) + history;
		} else if (hist.message.match("^{dislike-survey:")) {
			hist.message = "👎";
			history = parseHistoryTextMessageToHTML(hist) + history;
		} else if (hist.message !== "") {
			if (Chat.enable_replace_guestName && Chat.guestName !== null) {
				hist.message = replaceAllGuestName(hist.message, '');
			}
			if (hist.message !== Chat.triggerMenu) {
				history = parseHistoryTextMessageToHTML(hist) + history;
			} else {
				if (hist.answer) {
					history = parseHistoryTextMessageToHTML(hist) + history;
				}
			}
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

		var attachmentEl = '';
		if (Chat.isWebView) {
			attachmentEl = '<a style="font-size:10px;"><img class="dolphin-attachment-image d-lazy" src="https://cdn.3dolphins.ai/widget/images/ic_loading.gif" data-src="' + attachmentUrl + '" alt="' + getOriginalFilenameOfIncomingFile(filename) + '" onerror="this.src=data:image/jpeg;base64,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FFAB2oNFLQA5Pvr9RV6qCffH1FX6AP/S/SVvvH6mm05vvH6mm0AFApKWgA+lFFFABRRRQAYoopaAEpaTijPpQAYooooAKKOaM0AFFFFABS0maOKACijNFABxRijrRmgAoNFFAB1paKSgAooooAKKKOKACiiigAoo60dqAD8KKKM0AFHNFFABxRRRQAtJRRQAUfhRxRQAUUUUAFHelpKAD6UUUYoAKKKKACjmijNABRRRQAUtJRQAUYoooAKKWigApKKKAFooooASig0tACUtFFADk++PqKvVRT76/UVeoA//0/0kb7x+ppKc33j9TTaADjtSUv40n60ALR9KKKACig+1BoAKSlooATtR9aKWgBOlFLSUAFFLzRQAUlLRQAlFLSfjQAtJS0UAJ70UdsUtACUcUoz60UAJRS0fWgBMUo/Wj9aOlACUtHtRQAUUUUAFFFFABxRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRR3oAKKKKACilpKACiiigAooooAKKKKACij6UUALRxSUtABSUUUALRSUUALRSUUAFLRSUAPT76/UVeqin31+oq9QB/9T9JW+8frTaV/vH60lABRRRQAUUUUAFFFFABRSUtABSUUdqACl96TrS0AFFFHSgBKWkpaACiikoAWik60tABz60UUnNABS0maKAFooooATNFFFAC0UUUAHaikpaACiikoAWj60d6DQAUUUd6ACijiigAopKWgAopKKAFooo9qACiijigAopKWgAo5opM0ALRSUtAAKKKSgBaKKQ0ALRRRQAUtFFACUtJS0AFJzRS0AJRS0UAFFJS0AOT74+oq9VFPvL9RV6gD//1f0lb7x+pptK33j9TSUALSUUlAC0UUcUAJS0UUAFFFJ9aAFpPeiloASilooASil96KADvRSZo96AFpKODS0AJzS+9FJQAUUdTS/jQAn1o9qWigBKKOKWgBKXmj2ooAKKSloASloooAKKKOBQAUUlLQAUUYooASl5oooAP0oo5oxQAUlLSUALRRRQAUd6TiloAKKKPagAooo4oAKKTiloAKKOKKACiiigAooooAWikooAWikooAWikooAWiko+tAC0UlFAD0++v1FXqoJ99fqKv0Af//W/SRvvH60lOb7x+tNoAKSlooAOlFFFABR9aKKAEpaSl70AFIcUtJQAtFJS0AFFFJ+NABRRS0A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/9L9JW+8fqabTm+8frTaACilooASiiigA+lBoooAKKKSgA+lFH40tACCloooAKT6UtJx0oAKWj8aKACij8aSgA6fWloooAKSl+lJQAUClo/GgAooooAT2paKKACijijpQAUUUUAFFFLQAlFFHagApaSigAooozQAUUUUAFFLSUAFFFFABRRRQAUUUUALSUUUAFFFLQAUlFFABRRRQAUUUfSgBaKSloAKKKKACikpaACikzRQAtFJS0AOT7y/UVeqin31+oq9QB//0/0lb7x+pptOb7x+tNoAOaPrRRQAUUUUAFJS0lAC0UlLQAlFHNBoAKWkpcUAHvRRSc0ALSUUvWgAoopKACiiigBaKTj0paACijmigA9qKKSgAooooAO1OpMUtACUtJRQAUUUtABSUtFACUUtJQAUUUUAFFFLQAlFFFAC0lFFABRRRQAtJRRQAUUUUAFLRSUAFFFFABRRRQAUUtJQAtFFFACUtJRQAtFJS0AFJRRQAtFFJQA9Pvr9RV6qKffX6ir1AH//1P0lb7x+ppKVvvH6mm0AFFFFABRRRQAUlLRQAlLRSUAFFH1ooAKUUcUdqAE+lFH0ooAX8KKSl7UAFJS0lABS0lH40ALSUvekoAPpR+FHFFAC0UlFABRS8UcUAFFFFABQaKKAFpPejtRQAUUUUALSUUtABSUdaKAFpKKKACiiigApaSigAoo7UUAFFHFFAC0lFFABRRRQAUUUUAFFFFAC0lFHHSgBaKKKACiikoAWiiigApKWigAooooAcn31+oq9VFPvr9RV6gD/1f0kb7x+ppKc33j9ab1oAKKKKADFFFJQAtJS0UAJS0UUAFFFFABSUUvegBKKKKAFopKWgAooooAKOaT6UUAFLRSUALR70UlAC0UCigANJS0nWgBaKKWgBKOlFFABRRRQAtFJRQAUUtJQAUtJRQAUUUUAFLSUUALSUUUAFLSUUAFFFFABRRRQAtFJRQAUtJRQAUUUUAFFAooAWikpaACkoooAKWiigBKKKBQAUUtFADk++PqKvVQT76/UVfoA/9b9JW+8frTac33j9TTaAClopKAE60tFFABRR7UUAIPej2paKACk+tHaigApaSloAKSlpKAD9KKKKAF70lL2pKAFopOlAoAXmkpTRQAlFGOaWgApMUZ9aKACiiigBaKTINLQAUUUUAFLSUtACUUUUAFFFFABRRRQAUUUUAFFLSUAFFGKKACiiigApaSigAoooFABRRR70AGaKKKACiiigAooo60ALRRRQAUUUUAFFFFABRRRQAlLRRQA5Pvr9RV6qKffX6ir1AH/1/0mb7x+tNpzfeP1ptABSd6Wk70ABpM0ppPWgBe9LikHWloAQ9Kbk049KZQAueadjmm9/wAaf3oASmk0+mHrQAZpRzzTaevSgBcU08U6mtQAntSjnrSDrSrQA7FNPFOpG6UANyaBzxQKB1oAdilxRRQAzNGaKSgB+BS0UUANPU06mnqadQAUUUUAFFFFABSYpaKACiiigAooooAKKKKACjFFFABRRRQAUUUUAFFFFABRRRQAUYoooAKKKKADFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFADk++v1FXqop99fqKvUAf//Z"/></a>';
		} else {
			attachmentEl = '<a href="' + attachmentUrl + '" download="' + getOriginalFilenameOfIncomingFile(filename) + '" target="_blank" style="font-size:10px;"><img class="dolphin-attachment-image d-lazy" src="https://cdn.3dolphins.ai/widget/images/ic_loading.gif" data-src="' + attachmentUrl + '" alt="' + getOriginalFilenameOfIncomingFile(filename) + '" onerror="this.src=data:image/jpeg;base64,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FFAB2oNFLQA5Pvr9RV6qCffH1FX6AP/S/SVvvH6mm05vvH6mm0AFApKWgA+lFFFABRRRQAYoopaAEpaTijPpQAYooooAKKOaM0AFFFFABS0maOKACijNFABxRijrRmgAoNFFAB1paKSgAooooAKKKOKACiiigAoo60dqAD8KKKM0AFHNFFABxRRRQAtJRRQAUfhRxRQAUUUUAFHelpKAD6UUUYoAKKKKACjmijNABRRRQAUtJRQAUYoooAKKWigApKKKAFooooASig0tACUtFFADk++PqKvVRT76/UVeoA//0/0kb7x+ppKc33j9TTaADjtSUv40n60ALR9KKKACig+1BoAKSlooATtR9aKWgBOlFLSUAFFLzRQAUlLRQAlFLSfjQAtJS0UAJ70UdsUtACUcUoz60UAJRS0fWgBMUo/Wj9aOlACUtHtRQAUUUUAFFFFABxRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRR3oAKKKKACilpKACiiigAooooAKKKKACij6UUALRxSUtABSUUUALRSUUALRSUUAFLRSUAPT76/UVeqin31+oq9QB/9T9JW+8frTaV/vH60lABRRRQAUUUUAFFFFABRSUtABSUUdqACl96TrS0AFFFHSgBKWkpaACiikoAWik60tABz60UUnNABS0maKAFooooATNFFFAC0UUUAHaikpaACiikoAWj60d6DQAUUUd6ACijiigAopKWgAopKKAFooo9qACiijigAopKWgAo5opM0ALRSUtAAKKKSgBaKKQ0ALRRRQAUtFFACUtJS0AFJzRS0AJRS0UAFFJS0AOT74+oq9VFPvL9RV6gD//1f0lb7x+pptK33j9TSUALSUUlAC0UUcUAJS0UUAFFFJ9aAFpPeiloASilooASil96KADvRSZo96AFpKODS0AJzS+9FJQAUUdTS/jQAn1o9qWigBKKOKWgBKXmj2ooAKKSloASloooAKKKOBQAUUlLQAUUYooASl5oooAP0oo5oxQAUlLSUALRRRQAUd6TiloAKKKPagAooo4oAKKTiloAKKOKKACiiigAooooAWikooAWikooAWikooAWiko+tAC0UlFAD0++v1FXqoJ99fqKv0Af//W/SRvvH60lOb7x+tNoAKSlooAOlFFFABR9aKKAEpaSl70AFIcUtJQAtFJS0AFFFJ+NABRRS0A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/9L9JW+8fqabTm+8frTaACilooASiiigA+lBoooAKKKSgA+lFH40tACCloooAKT6UtJx0oAKWj8aKACij8aSgA6fWloooAKSl+lJQAUClo/GgAooooAT2paKKACijijpQAUUUUAFFFLQAlFFHagApaSigAooozQAUUUUAFFLSUAFFFFABRRRQAUUUUALSUUUAFFFLQAUlFFABRRRQAUUUfSgBaKSloAKKKKACikpaACikzRQAtFJS0AOT7y/UVeqin31+oq9QB//0/0lb7x+pptOb7x+tNoAOaPrRRQAUUUUAFJS0lAC0UlLQAlFHNBoAKWkpcUAHvRRSc0ALSUUvWgAoopKACiiigBaKTj0paACijmigA9qKKSgAooooAO1OpMUtACUtJRQAUUUtABSUtFACUUtJQAUUUUAFFFLQAlFFFAC0lFFABRRRQAtJRRQAUUUUAFLRSUAFFFFABRRRQAUUtJQAtFFFACUtJRQAtFJS0AFJRRQAtFFJQA9Pvr9RV6qKffX6ir1AH//1P0lb7x+ppKVvvH6mm0AFFFFABRRRQAUlLRQAlLRSUAFFH1ooAKUUcUdqAE+lFH0ooAX8KKSl7UAFJS0lABS0lH40ALSUvekoAPpR+FHFFAC0UlFABRS8UcUAFFFFABQaKKAFpPejtRQAUUUUALSUUtABSUdaKAFpKKKACiiigApaSigAoo7UUAFFHFFAC0lFFABRRRQAUUUUAFFFFAC0lFHHSgBaKKKACiikoAWiiigApKWigAooooAcn31+oq9VFPvr9RV6gD/1f0kb7x+ppKc33j9ab1oAKKKKADFFFJQAtJS0UAJS0UUAFFFFABSUUvegBKKKKAFopKWgAooooAKOaT6UUAFLRSUALR70UlAC0UCigANJS0nWgBaKKWgBKOlFFABRRRQAtFJRQAUUtJQAUtJRQAUUUUAFLSUUALSUUUAFLSUUAFFFFABRRRQAtFJRQAUtJRQAUUUUAFFAooAWikpaACkoooAKWiigBKKKBQAUUtFADk++PqKvVQT76/UVfoA/9b9JW+8frTac33j9TTaAClopKAE60tFFABRR7UUAIPej2paKACk+tHaigApaSloAKSlpKAD9KKKKAF70lL2pKAFopOlAoAXmkpTRQAlFGOaWgApMUZ9aKACiiigBaKTINLQAUUUUAFLSUtACUUUUAFFFFABRRRQAUUUUAFFLSUAFFGKKACiiigApaSigAoooFABRRR70AGaKKKACiiigAooo60ALRRRQAUUUUAFFFFABRRRQAlLRRQA5Pvr9RV6qKffX6ir1AH/1/0mb7x+tNpzfeP1ptABSd6Wk70ABpM0ppPWgBe9LikHWloAQ9Kbk049KZQAueadjmm9/wAaf3oASmk0+mHrQAZpRzzTaevSgBcU08U6mtQAntSjnrSDrSrQA7FNPFOpG6UANyaBzxQKB1oAdilxRRQAzNGaKSgB+BS0UUANPU06mnqadQAUUUUAFFFFABSYpaKACiiigAooooAKKKKACjFFFABRRRQAUUUUAFFFFABRRRQAUYoooAKKKKADFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFADk++v1FXqop99fqKvUAf//Z"/></a>';
		}
		var incoming = '<div class="message message-image-agent new"><figure class="avatar"><img src=\"' + avatar + '\"/></figure>' + attachmentEl + '<div class="timestamp">' + time + '</div></div>'
		return incoming;
	} else {
		attachmentUrl = Chat.url + '/webchat/in/image/' + filename + '?access_token=' + Chat.access_token;
		var outgoing = '<div id="' + hist.transactionId + '" class="message message-image-personal message-sent new">' + '<a href="' + attachmentUrl + '" download="' + getOriginalFilenameOfOutgoingFile(filename) + '" target="_blank" style="font-size:10px;"><img class="dolphin-attachment-image d-lazy" src="https://cdn.3dolphins.ai/widget/images/ic_loading.gif" data-src="' + attachmentUrl + '" alt="' + getOriginalFilenameOfOutgoingFile(filename) + '" onerror="this.src=data:image/jpeg;base64,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FFAB2oNFLQA5Pvr9RV6qCffH1FX6AP/S/SVvvH6mm05vvH6mm0AFApKWgA+lFFFABRRRQAYoopaAEpaTijPpQAYooooAKKOaM0AFFFFABS0maOKACijNFABxRijrRmgAoNFFAB1paKSgAooooAKKKOKACiiigAoo60dqAD8KKKM0AFHNFFABxRRRQAtJRRQAUfhRxRQAUUUUAFHelpKAD6UUUYoAKKKKACjmijNABRRRQAUtJRQAUYoooAKKWigApKKKAFooooASig0tACUtFFADk++PqKvVRT76/UVeoA//0/0kb7x+ppKc33j9TTaADjtSUv40n60ALR9KKKACig+1BoAKSlooATtR9aKWgBOlFLSUAFFLzRQAUlLRQAlFLSfjQAtJS0UAJ70UdsUtACUcUoz60UAJRS0fWgBMUo/Wj9aOlACUtHtRQAUUUUAFFFFABxRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRR3oAKKKKACilpKACiiigAooooAKKKKACij6UUALRxSUtABSUUUALRSUUALRSUUAFLRSUAPT76/UVeqin31+oq9QB/9T9JW+8frTaV/vH60lABRRRQAUUUUAFFFFABRSUtABSUUdqACl96TrS0AFFFHSgBKWkpaACiikoAWik60tABz60UUnNABS0maKAFooooATNFFFAC0UUUAHaikpaACiikoAWj60d6DQAUUUd6ACijiigAopKWgAopKKAFooo9qACiijigAopKWgAo5opM0ALRSUtAAKKKSgBaKKQ0ALRRRQAUtFFACUtJS0AFJzRS0AJRS0UAFFJS0AOT74+oq9VFPvL9RV6gD//1f0lb7x+pptK33j9TSUALSUUlAC0UUcUAJS0UUAFFFJ9aAFpPeiloASilooASil96KADvRSZo96AFpKODS0AJzS+9FJQAUUdTS/jQAn1o9qWigBKKOKWgBKXmj2ooAKKSloASloooAKKKOBQAUUlLQAUUYooASl5oooAP0oo5oxQAUlLSUALRRRQAUd6TiloAKKKPagAooo4oAKKTiloAKKOKKACiiigAooooAWikooAWikooAWikooAWiko+tAC0UlFAD0++v1FXqoJ99fqKv0Af//W/SRvvH60lOb7x+tNoAKSlooAOlFFFABR9aKKAEpaSl70AFIcUtJQAtFJS0AFFFJ+NABRRS0AFFFFABSUtFABVuxsLzU7qOysIjNNKcKq/wAyewHc1Ur3r4T6VFHp8+sMoMszmJGPUKnUD6mgDIsfg/cSRB9T1IRueTHBHuA/4ExH8q0P+FOWX/QUn/79r/jXslLQB41/wp2y/wCgpP8A9+1/xo/4U7Y/9BSf/v2v+NeymigDxr/hTtl/0FJ/+/a/40f8Kdsf+gpP/wB+1/xr2UUdaAPGv+FOWX/QUn/79r/jSf8ACnbH/oKT/wDftf8AGvZqTvQB41/wp6y/6Ck//fC/40f8Kdsf+gnP/wB+1/xr2WigDxr/AIU7Y/8AQTn/AO/a/wCNH/CnbLP/ACE5/wDvhf8AGvZaKAPGv+FPWX/QUn/79r/jR/wp2y/6Cc//AH7X/GvZaKAPGv8AhTtj/wBBSf8A79r/AI0f8Kdsf+gnP/37X/GvZfxoxQB41/wp6x/6Ck//AH7X/Gj/AIU7Zf8AQTn/AO/a/wCNey0UAeNf8Kdsf+gnP/37X/Gj/hTtj/0FJ/8Av2v+Ney0UAeNf8Kesv8AoKT/APfC/wCNH/CnbH/oKT/9+1/xr2WjFAHjX/CnbL/oKT/9+1/xpf8AhTtl/wBBSf8A79r/AI17JR170AfPus/CjU7GFrjSboXwUZMTr5chH+yQSCfyrytkdHaORSjqSGVhggjqCK+1q8J+KuhQ288Gt2yhTOfLmA7sOjfXtQB46aX3oooAKKKKADiiigUAFFFFACUtFFABiiijNABRS0UAJRRRQAUUtFACUfSlpOaACj2paKAHJ99fqKvVRT74+oq9QB//1/0lb7x+pptObO4/U02gAooooAKKKKACijFFAB7iiiigApKWjFACUpoooAKKKMUAJS0UUAFFFFACc0tFFABX0r8MP+RVj/67Sf0r5qr6V+GH/Iqx/wDXaT+lAHodQz3FvaxNPcypDEmNzyMFUZOBknAGSamrifiL/wAibqH/AGw/9HJQBv8A9v6D/wBBK0/7/p/8VR/wkGg/9BKz/wC/6f8AxVfH1FAH2D/wkGg/9BK0/wC/6f8AxVH/AAkGhf8AQStP+/8AH/8AFV8fYooA+wf+Eg0H/oJWn/f9P/iqP7f0H/oJWf8A3/j/APiq+PqKAPsH/hINC/6CVn/3/T/4qk/t/Qv+glZ/9/4//iq+P6KAPsH/AISDQe+pWn/f+P8A+Ko/4SDQf+glZ/8Af+P/AOKr4+ooA+wf+Eg0H/oJWf8A3/T/AOKo/wCEg0H/AKCVn/3/AI//AIqvj6igD7B/t/Qf+glZ/wDf+P8A+Ko/4SDQf+glaf8Af+P/AOKr4+ooA+wf+Eg0HH/ISs/+/wDH/wDFUf8ACQaD/wBBKz/7/wAf+NfH1FAH2D/wkGg/9BK0/wC/6f8AxVH/AAkGhdtSs/8Av/H/APFV8fUUAfYP9v6D/wBBKz/7/wAf/wAVR/wkGg/9BK0/7/x//FV8fUUAfYP/AAkGhf8AQStP+/8AH/8AFVpQzQ3MSz28iyxuMq6EMrfQjiviyvqvwL/yKWm/9cj/AOhGgDrK8w+K/wDyAIv+u4/lXqFeX/Fb/kARf9d1/lQB870UUUAFGaKKACiiigAopaSgA6UUUUAFFFFAC0UlFABS0lFABS0lFABRRRQAUtJmigB6ffX6ir1UU++v1FXqAP/Q/SVvvH6mm0rD5m+ppKACiiigAoxRRQAYoo60UAFFJS8UAFFFJxQAtFJSmgAoFFJ0oAWiiigAoxRRQAUUdaSgBa+lfhh/yKsf/XaT+lfNXFfS3ww/5FaP/rtJ/SgD0KuJ+Iv/ACJuof8AbD/0cldt2rifiL/yJuof9sf/AEclAHy7RzRRxQAYrU0nQ9Y12Yw6TavPtOGb7sa/7zHAH061peFPDk3ibVFswSkEfzzuOyeg926V9S6fp9lpVoljYRLDDGMKq8fiT3J7mgDwOL4SeJHTdLd2cbYyFBdvzO0fpmsLVvAHinR4zPJbrdQryz2rF8D3UgN+lfU1JQB8UA56UV7n8Q/BMLwSa/pMYjlT5riNRgOvdgPUd/UV4Z70AFFFFABRRRQAUUUUAFFHsMkngAck12up+BtU0rQIdcnyS5zNDjmJG+6T/X0oA4qiiigAooooAWvqrwL/AMinpv8A1yP/AKE1fKlfVfgX/kUtN/65H/0JqAOs/SvMPit/yAIv+u6/yr0+vMPit/yAIv8Aruv8qAPnc0UUUAFFFFABRRRQAUUUUAFLSUUAFFFFABS0lLQAlFLSe9AC0UlLQAlFLSUAFFFLQA5Pvr9RV6qKffX6ir1AH//R/SVvvH6mm05vvH6mkoASilpKACiiigAooooAQUtFFABSUtJQAUtFFABSUtGKAEFLRRQAUUUUAJS0UUAHNfSvww/5FWP/AK7Sf0r5qNfSvww/5FaP/rtJ/SgD0LNcV8Rf+RN1D/tj/wCjkrtscVxPxF/5E3UP+2H/AKOSgD5d9qKKBQB9E/Cqxjg0B73Hz3MzZPsnAFen15p8LbxJ/DhtRjfbysGHs3Ir0ugApPelpKAGyRpKjRSAMrgqwPQgjBFfHms2f9n6td2Q/wCWEzp+RNfYjMqKXYgADJJ6DFfH2u3a3+s3t4vImndh9CTQBlUUUe1AB3oow20vtbYCFLYO0MeQC3QE+nWigAoorsvBfhWXxNqP70FbG3IM7/3vRAfU9/QfhQB1fw38H/bJV8Qakn7iM/6MjD77D+Mj0HavdLi3huoHtrhQ8cqlHU9CDwaWGGK3iSCFQkcahVUcAAdABU1AHyV4q8PzeHNXksXy0L/vIHP8UZ6fiOh/+vXOV9UeNfDKeJdIaGMAXkGZLZjx82OVJ9GHHscHtXywyujNHIpR0JVlbgqwOCCOxB4NACYoNFFABX1X4F/5FLTf+uR/9CNfKlfVfgX/AJFPTf8Arkf/AEI0AdZ2ry/4rf8AIAi/67rXqFeYfFb/AJAEX/XdaAPnbrS0Ue9ABRRRQAUUUUAFFFFACUtFFABiiiigBaKSloASlpKWgBKWiigBKKKKAFooooAcn31+oq9VFPvr9RV6gD//0v0lb7x+pptOb7x+tNoAKKKKACj60d6KACiiigAo6UUUAFFFFACUtJS0AFFH4UfhQAUUUUAFH4UUfhQAUUUfWgAr6V+GH/Iqp/12k/pXzV2r6V+GH/Iqx/8AXaT+lAHodcT8Rf8AkTdQ/wC2P/o5K7btXE/EX/kTdQ/7Y/8Ao5KAPl2iiigDr/BniZvDWpiaTLWs+EmUdh2Ye4r6gtLy2v7dLq0kWWKQZVlOQQa+L+3St7RvEus6C5OnTlUJyY2+ZD+H+GKAPrukrwCL4tauqYltIXb+8CQPy5rE1X4jeItSjaFJFtY24IhGGIP+0efyoA9E+IPjOGytZNF01w9zMCsrKciNT1H1NfP1KzMxLOSzNySecmkoAPetbRNFvdf1GPTrEZZ+Xc/djTuzfT9ap2VldajdxWNkhlnmbaij+Z9AO5r6j8J+F7XwxpwgTD3MmGnm/vN6D/ZHagCS08JaNa6D/wAI8YRJbuv7wt953PV8/wB7PT0r528VeFrzwvfeTLmS1lJME+OGH90+jCvq/nNZ2q6VY61YyafqEYkikH4qezKexHagD5N0XR7zX9Si0yxH7yQ5ZiMrGg+87ew/U8da+r9F0ey0HTotNsVxHEOWP3nY/eZj6k/4dKyPCnhKy8K20kcLGaeZsyTMMMVGdq47AD9cmusoAKKT6UUAHNeD/FDwv9muP+EjskxFMQt0q/wv0D/8C6H3x6mveaq3lnBf2stndIHimQo6nuCMUAfGNFbviPQp/Duqy6dNkqDuic/xxnofqOhrCoAK+q/Av/Ipab/1yP8A6E1fKn0NfVfgX/kU9N/65H/0I0AdbXl/xW/5AEX/AF3X+Ven815h8Vv+QBF/13X+VAHzvRRRQAUUUZoAKKKPxoAKKKKACiiigAoo/GigAoopaAEoopaAEopaKAEooooAKKKWgBU++v1FX6op99fqKvUAf//T/SVvvH60lK33j9abQAUUfzoNABRRRQAUUUUAHvRRRQAUnFLSd+tABS0UUAJRS0lABS0fjRQAUUUUAFJQKWgAr6V+GH/Iqx/9d5P6V81V9K/DD/kVY/8ArtJ/SgD0OuJ+Iv8AyJuof9sP/RyV2tcV8Rf+RO1H/th/6OSgD5dooooASiikLKoLMdoHUmgBaWgHNFABTkR5XWKJS7uQqqvJZjwAB60zIAzXvvw88FGwRde1WP8A0qRcwRsP9Uh7n/bP6CgDb8CeDU8OWf2y9AfUbhRvPURL12L/AFPc+1egUUtACUUd6KADiil+tFACUtJ70UALSe1LR+NAHDeO/DA8Q6UXt1/0y1BeI/3vVfxr5hIYEqwwRkEHqCO1fa1fPnxM8L/2def25Zp/o902JQBwkp7/AEb+dAHldfVfgX/kUtN/65H/ANCavlTFfVfgX/kUtN/65H/0JqAOsrzD4rf8gCL/AK7r/WvUK8v+K3/IAi/67r/KgD527UtFGKAFpKKKACiiigAo5owKKADmiiigBaSiigBaKKKACkoooAWiiigAoopKAFooooAcn31+oq9VFPvL9RV6gD//1P0mb7x+tMpzfeP1NNoAKKKKACiiigAo6UUUAFFJS0AFFGaSgBaKKKAEpaKKACijNFABRRRQAfSiiigA7V9K/DH/AJFWP/rtJ/SvmqvpX4Yf8itH/wBdpP6UAeh1xPxF/wCRO1D/ALYf+jkrtq4n4i/8ibqH/bH/ANHJQB8u0UUUAFet/DLwoL64/wCEgv0zBASturDIeToXx6L0Hvn0FcF4b0G48RarFp0OVQndM4/gjHU/U9BX1jZ2dvYWsVlaoEihUIijsBQB4R46+H7aYZNZ0GMtaHLTWyjmH1ZB/c9V/h7ccDybIxkdK+2SARgjIPavMbz4Y6Rc66mpxt5dozF5rUD5Wf2PZT3FAHJ/DvwV9rePxBq0f7lDutomH3yP4yPQdh+Ne801EWNFjjAVVGABwAB0xTqAD8aWkpfrQAlFFH6UAAo/Glo+lACUYo5ooAKPxo+tLQAlUtR0+11Wym0+8XfDOpVh9e49weRV3nFHegD4+1vSLjQtUn0y55aFvlYfxIeVP4ivpXwL/wAinpv/AFyP/oTV4n8S/wDkbLj/AK5xf+gCvbPAv/Ip6b/1yP8A6E1AHW/jXl/xW/5F+L/ruv8AKvT68w+K3/IAiz/z3X+VAHzvR+FFFABRRRQAUtJRQAfrRR3ooAKKKKAD8KKKKADmigUtACUUYooAKKKKACiiigAo5oo/CgB6ffX6ir1UU++v1FXqAP/V/SVvvH602nN94/U02gAooooAKKKKACiiigAooooAKSlooAKKPSigBKWk70tABRRRQAUUUUAHSijrRQAZr6V+GH/IrR/9dpP6V81V9K/DD/kVY/8ArtJ/SgD0OuJ+Iv8AyJuof9sf/RyV2wrifiL/AMibqH/bH/0clAHy7Soru6pGpZmIVVHUk9BSV658MfC32y4/4SC+T9zCdturfxOOrfQdvegD0fwN4ZXw5pQ84D7ZcYeZvT0X6Cu1o7UUAFFFFACUUUtACfSlopKADvS0e9JQAtJ70Uv4UAJS0lLxQAnPailooAKSgUtAHzN8TP8AkbLn/rnF/wCgCvbPAv8AyKem/wDXI/8AoRrxP4mf8jbcf9c4v/QBXtngX/kU9N/65H/0I0AdZXmHxW/5AEX/AF3X+Ven15h8Vv8AkARf9d1oA+d6KO1FABRRR1oAKKKKACiiigAooooAKKKKAFooooASlpKKAFooooAKSiigBaKKKAHJ99fqKvVRT76/UVeoA//W/SVvvH6mm05vvH602gAoo4o4oAO9FFFABRRSUALRmiigBKBS0UAAoopKACilooAKKKO9ABSUtFABRSUUALX0r8MP+RVj/wCu0n9K+aq+lfhh/wAirH/12k/pQB6HXE/EX/kTdQ/7Yf8Ao5K7auV8a6fe6r4ZvbDTovOuJfK2R7lTO2VGPLEAYAJ5NAHzPommJq+pQ2c08dtCxzLLI4QKg643EZJ6AetfUdnqfhqwtYrK1vrNIoVCIonTgD8a+d/+Fe+N/wDoF/8AkxB/8XSf8K98bf8AQL/8mIf/AIugD6R/t7Qun9o2n/f9P/iqX+39C/6CNp/3/T/4qvm3/hXvjb/oF/8AkxD/APF0f8K98b/9Av8A8mIP/i6APpL+39C/6CNp/wB/0/8AiqT+3tC/6CNp/wB/0/8Aiq+bv+FeeNv+gX/5MQf/ABdL/wAK98bf9Av/AMmIP/i6APpD+3tC/wCgjaf9/wBP/iqP7e0L/oI2n/f9P/iq+b/+Fe+Nv+gX/wCTEH/xdH/CvvG3/QL/APJiH/4ugD6Q/t/Qv+gjaf8Af9P/AIql/t7Qv+gjaf8Af9P/AIqvm7/hXvjb/oF/+TEH/wAXR/wr3xt/0C//ACYg/wDi6APpH+39C6/2jaf9/wBP8aT+39C6f2jaf9/0/wDiq+b/APhXvjb/AKBf/kxB/wDF0f8ACvfG3/QL/wDJiH/4ugD6Q/t7Quv9o2n/AH+T/wCKo/t7Qv8AoI2n/f8AT/4qvm//AIV742/6Bf8A5MQf/F0n/CvfG3/QL/8AJiD/AOLoA+kf7e0L/oI2n/f9P8aP7f0L/oI2n/f9P/iq+b/+Fe+Nv+gX/wCTEH/xdJ/wr3xt/wBAv/yYg/8Ai6APpH+3tC/6CNp/3/T/AOKo/t7Qv+gjaf8Af5P/AIqvm/8A4V742/6Bf/kxB/8AF0f8K98bf9Av/wAmIP8A4ugD6Q/t7Qv+gjaf9/0/+Ko/t/Qv+gjaf9/0/wAa+bv+FfeNv+gX/wCTEH/xdL/wr3xt/wBAv/yYg/8Ai6AJ/iJc2914ouJrWVJo2SIB42DKcIO44r3PwL/yKWm/9cj/AOhNXgv/AAr7xt/0C/8AyYg/+Lr6E8J2N3pvh2xsb6Pyp4oyHTIbaSxPVSQevY0AdHXl/wAVv+Rfi/67rXp9eYfFbH/CPxf9d1/lQB870UUtACUUUtACUUZpaAEooooAKKKKACiiigBaKSigApaSigBaKSjigAooooAWikooAen31+oq9VBPvr9RV+gD/9f9JW+831ptOb75+tJQAlFGaKACiiigAo60UUAFFJS0AJxR3oooAKKKX6UAJRS0lABR0ozS0AFFFJ70AFFFLQAV9JfC50bwuEB5SeTIz0zivm2vQ/AHixPD949renFpckbm/uP2P09aAPpSlqKCeG4iWeB1kjcZVkOQRUtABRRRQAUUdqKACkpaKAEopaKAE+lFBooAWko4o4oAWkoooAKOlLRQAh6UfrS0nFAB1ooooAM0UtJQAV5b8WJFGhQRk/M04wPoK9Kuru2soGubuRYokGSznAr5n8ceKP8AhJNRH2fItLfKxA/xerH60AcRRRRQAtJS0goAKWkooAPrRS0nSgAooooAKKKWgAooooASjtS0UAFFFFACUUUtACUtFFADk++v1FXqop99fqKvUAf/0P0lb7zfU0lK33j9aSgBKKKKACiikoAWiikoAWjqKKSgAo60vvRQAmKWiigBMelFFL2oASl9qSloAKTml9qOtACUtFFACUuKKSgDWsNd1fTBtsLyaEf3Ucgfl0rW/wCE48Vf9BCX8xXKe9FAHV/8Jz4q/wCgjL+Ypf8AhOPFf/QQl/MVydJQB1n/AAnPir/oIy0f8Jx4q/6CMv5iuUooA6z/AITjxV/0EJfzFH/CceKv+ghL+Y/wrkqX+tAHWf8ACceKv+ghL+Yo/wCE48Vf9BGX8x/hXJ0UAdZ/wnHin/oIS/nR/wAJx4q/6CEv5/8A1q5OigDrP+E48Vf9BGX86P8AhOPFX/QRl/OuTooA6z/hOPFX/QQl/MUf8Jx4q/6CMv5//Wrk6KAOs/4TjxV/0EJfzFH/AAnHir/oIS/mK5OigDrP+E48Vf8AQRl/Oj/hOPFX/QRl/OuTpaAOr/4TjxV/0EJfzH+FH/CceKv+gjL+Y/wrk6KAOs/4TjxV/wBBCX86P+E48Vf9BCX8xXJ0UAad/rGq6oQdQupZ8dA7EgfhWZRRQAUtJRQAUUUUAFFH1ooAWkoooAOtLSUUAFFFFAC0UlFAC0UUlAC0UmaKAFopKKAFopKKAHp99fqKvVQT76/UVfoA/9H9JW+8fqabTm+8fqabQAUfSiigAooooAKKKKAEpaQUZoAWiikoAKU0lFAC5pKKKAFooooABRRRQAlLSUtABRmiigA4opKKAFooooAKSlpKAFoopaAEooooAKKKD0oAOKKKKACigUUAFFFFABS0lFABRRR3oAKKMUdqACiiigANH1oooAPalopKACiiigAooooAKKKKACiiigApaKKAEopaSgBaKKKAEopaSgBaSiloAcn31+oq9VFPvj6ir1AH/9L9JW+8fqabTm+8frTaACilooASiiigA+lBoooAKKKSgA+lFH40tACCloooAKT6UtJx0oAKWj8aKACij8aSgA6fWloooAKSl+lJQAUClo/GgAooooAT2paKKACijijpQAUUUUAFFFLQAlFFHagApaSigAooozQAUUUUAFFLSUAFFFFABRRRQAUUUUALSUUUAFFFLQAUlFFABRRRQAUUUfSgBaKSloAKKKKACikpaACikzRQAtFJS0AOT7y/UVeqin31+oq9QB//0/0lb7x+pptOb7x+tNoAOaPrRRQAUUUUAFJS0lAC0UlLQAlFHNBoAKWkpcUAHvRRSc0ALSUUvWgAoopKACiiigBaKTj0paACijmigA9qKKSgAooooAO1OpMUtACUtJRQAUUUtABSUtFACUUtJQAUUUUAFFFLQAlFFFAC0lFFABRRRQAtJRRQAUUUUAFLRSUAFFFFABRRRQAUUtJQAtFFFACUtJRQAtFJS0AFJRRQAtFFJQA9Pvr9RV6qKffX6ir1AH//1P0lb7x+ppKVvvH6mm0AFFFFABRRRQAUlLRQAlLRSUAFFH1ooAKUUcUdqAE+lFH0ooAX8KKSl7UAFJS0lABS0lH40ALSUvekoAPpR+FHFFAC0UlFABRS8UcUAFFFFABQaKKAFpPejtRQAUUUUALSUUtABSUdaKAFpKKKACiiigApaSigAoo7UUAFFHFFAC0lFFABRRRQAUUUUAFFFFAC0lFHHSgBaKKKACiikoAWiiigApKWigAooooAcn31+oq9VFPvr9RV6gD/1f0kb7x+ppKc33j9ab1oAKKKKADFFFJQAtJS0UAJS0UUAFFFFABSUUvegBKKKKAFopKWgAooooAKOaT6UUAFLRSUALR70UlAC0UCigANJS0nWgBaKKWgBKOlFFABRRRQAtFJRQAUUtJQAUtJRQAUUUUAFLSUUALSUUUAFLSUUAFFFFABRRRQAtFJRQAUtJRQAUUUUAFFAooAWikpaACkoooAKWiigBKKKBQAUUtFADk++PqKvVQT76/UVfoA/9b9JW+8frTac33j9TTaAClopKAE60tFFABRR7UUAIPej2paKACk+tHaigApaSloAKSlpKAD9KKKKAF70lL2pKAFopOlAoAXmkpTRQAlFGOaWgApMUZ9aKACiiigBaKTINLQAUUUUAFLSUtACUUUUAFFFFABRRRQAUUUUAFFLSUAFFGKKACiiigApaSigAoooFABRRR70AGaKKKACiiigAooo60ALRRRQAUUUUAFFFFABRRRQAlLRRQA5Pvr9RV6qKffX6ir1AH/1/0mb7x+tNpzfeP1ptABSd6Wk70ABpM0ppPWgBe9LikHWloAQ9Kbk049KZQAueadjmm9/wAaf3oASmk0+mHrQAZpRzzTaevSgBcU08U6mtQAntSjnrSDrSrQA7FNPFOpG6UANyaBzxQKB1oAdilxRRQAzNGaKSgB+BS0UUANPU06mnqadQAUUUUAFFFFABSYpaKACiiigAooooAKKKKACjFFFABRRRQAUUUUAFFFFABRRRQAUYoooAKKKKADFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFADk++v1FXqop99fqKvUAf//Z"/></a><div class="timestamp">' + time + '</div></div>';
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

function parseHistoryQuickReplyFlat(hist) {
	var quickReply = parseQuickReply(hist.message);

	$('<div class="message new"><figure class="avatar"></figure>' + quickReply[0].text + '</div>').appendTo($('.dolphin-messages .messages-content')).addClass('new');

	var quickReplyUniqueId = getTimeInMillliseconds() + 'quick-reply';
	var msgQuickReplyUniqueId = quickReplyUniqueId + '-message';

	//construct quick reply options. This is only rendered on incoming message only
	var quickReplyEl = '<div id="' + msgQuickReplyUniqueId + '" class="message new quick-reply-flat">';
	for (var x = 0; x < quickReply[1].options.length; x++) {
		var qReply = quickReply[1].options[x];
		quickReplyEl = quickReplyEl + '<div class="dolphin-q-replies-flat"><div class="dolphin-q-reply-text" role="button" data-value="' + qReply.text + '" data-label="' + qReply.label + '" onclick="outgoingQuickReply(\'' + qReply.text + '\', \'' + qReply.label + '\');$(\'.quick-reply-flat\').remove();">' + qReply.label + '</div></div>';
	}
	return quickReplyEl;
}

function parseHistoryQuickReply(hist) {
	var quickReply = parseQuickReply(hist.message);

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

function parseHistoryTextMessageToHTML(hist) {
	var message = escapeSpecialChar(hist.message);
	if (hist.messageLabel) {
		message = escapeSpecialChar(hist.messageLabel);
	}
	message = urlify(message);
	message = waStyle(message);
	var time = hist.createdDateText.slice(-5);

	if (hist.answer) {
		var avatar = Chat.agent_avatar;
		if (hist.agentAvatar && hist.agentAvatar !== "") {
			avatar = hist.agentAvatar;
		}
		var incoming = "";
		if (hist.agentName && hist.agentName !== "") {
			incoming = '<div class="message new"><figure class="avatar"><img src=\"' + avatar + '\"/></figure>' + message + '<br/><span style=\"color:#2ECC71;float:right;font-size:10px;margin-top:3px;text-overflow: ellipsis;overflow: hidden;max-width: 300px;white-space: nowrap;\">' + escapeSpecialChar(hist.agentName) + '</span><div class="timestamp">' + time + '</div></div>';
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
function obtainAccessToken(l, u, p, compatibility_mode) {
	var token_endpoint = l + '/oauth/token';
	if (!compatibility_mode) {
		$.ajax({
			url: token_endpoint,
			type: 'POST',
			crossDomain: true,
			async: true,
			data: 'grant_type=password' + "&username=" + u + '&password=' + p,
			headers: {
				AUTHORIZATION: BASIC + encodedClientIdAndClientSecret(u, p)
			},
			accepts: {
				json: 'application/json'
			},
			dataType: 'json',
			timeout: 10000,
			tryCount: 0,
			retryLimit: 3,
			success: function (data) {
				data.status = 200;
				isInitiatingToken = false;
				timeoutChat= data.expires_in;
				Chat.callbackInitToken(data);
			},
			error: function (xhr, statusText) {
				isInitiatingToken = false;
				if (statusText == 'timeout') {
					this.tryCount++;
					if (this.tryCount <= this.retryLimit) {
						$.ajax(this);
						return;
					}
					return;
				}
				Chat.callbackInitToken(xhr);
			}
		})
	} else {
		token_endpoint = token_endpoint + '?grant_type=password' + "&username=" + u + '&password=' + p;
		$.ajax({
			url: token_endpoint,
			type: 'POST',
			crossDomain: true,
			async: true,
			xhrFields: { withCredentials: false },
			headers: {
				AUTHORIZATION: BASIC + encodedClientIdAndClientSecret(u, p)
			},
			accepts: {
				json: 'application/json'
			},
			dataType: 'json',
			timeout: 10000,
			tryCount: 0,
			retryLimit: 3,
			success: function (data) {
				data.status = 200;
				isInitiatingToken = false;
				timeoutChat= data.expires_in;
				Chat.callbackInitToken(data);
			},
			error: function (xhr, statusText) {
				isInitiatingToken = false;
				if (statusText == 'timeout') {
					this.tryCount++;
					if (this.tryCount <= this.retryLimit) {
						$.ajax(this);
						return;
					}
					return;
				}
				Chat.callbackInitToken(xhr);
			}
		})
	}
}

function isRefreshTokenRequired() {
	if (localStorage.getItem("at") === null && !isRefreshingToken) {
		return true;
	} else if (localStorage.getItem("expiry") !== null) {
		if (localStorage.getItem("expiry") - 5000 < getTimeInMillliseconds() && !isRefreshingToken) {
			return true;
		}
	}
	return false;
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
function refreshAccessToken(l, u, p, r, cookieToken, callback, compatibility_mode) {
	if (isRefreshTokenRequired() && !isRefreshingToken) {
		isRefreshingToken = true;
		var token_endpoint = l + '/oauth/token';
		if (!compatibility_mode) {
			$.ajax({
				url: token_endpoint,
				type: POST,
				crossDomain: true,
				async: true,
				data: 'grant_type=refresh_token' + "&client_id=" + u + '&refresh_token=' + r,
				timeout: 20000,
				tryCount: 0,
				retryLimit: 3,
				headers: {
					AUTHORIZATION: BASIC + encodedClientIdAndClientSecret(u, p)
				},
				accepts: {
					json: 'application/json'
				},
				dataType: 'json',
				success: function (data) {
					data.status = 200;
					isRefreshingToken = false;
					if (callback) {
						Chat.access_token = data.access_token;
						Chat.refresh_token = data.refresh_token;
						callback(data, true);
					} else {
						Chat.callbackConnectServer(data, cookieToken);
					}
					timeoutChat= data.expires_in;
					localStorage.setItem("at", JSON.stringify(data));
					localStorage.setItem("expiry", Date.now() + (data.expires_in * 1000));
				},
				error: function (xhr, statusText) {
					isRefreshingToken = false;
					if (statusText == 'timeout') {
						this.tryCount++;
						if (this.tryCount <= this.retryLimit) {
							$.ajax(this);
							return;
						}
						return;
					}
					Chat.buildError(Chat.chat_box, xhr.responseText);
				}
			});
		} else {
			token_endpoint = token_endpoint + '?grant_type=refresh_token' + "&client_id=" + u + '&refresh_token=' + r;
			$.ajax({
				url: token_endpoint,
				type: POST,
				crossDomain: true,
				async: true,
				xhrFields: { withCredentials: false },
				headers: {
					AUTHORIZATION: BASIC + encodedClientIdAndClientSecret(u, p)
				},
				accepts: {
					json: 'application/json'
				},
				dataType: 'json',
				timeout: 20000,
				tryCount: 0,
				retryLimit: 3,
				success: function (data) {
					isRefreshingToken = false;
					data.status = 200;
					if (callback) {
						callback(data);
					} else {
						Chat.callbackConnectServer(data, cookieToken);
					}
					timeoutChat= data.expires_in;
				},
				error: function (xhr, statusText) {
					isRefreshingToken = false;
					if (statusText == 'timeout') {
						this.tryCount++;
						if (this.tryCount <= this.retryLimit) {
							$.ajax(this);
							return;
						}
						return;
					}
					Chat.buildError(Chat.chat_box, xhr.responseText);
				}
			});
		}
	} else {
		if (callback) {
			callback(JSON.parse(localStorage.getItem("at")), false);
		} else {
			Chat.callbackConnectServer(JSON.parse(localStorage.getItem("at"), cookieToken));
		}
	}
}

/**
 * Render queue number
 */
function renderQueueNumber(compatibility_mode) {
	if (Chat.access_token && Chat.enable_queue && Chat.queue_text !== null && Chat.token) {
		var queue_endpoint = Chat.url + QUEUE_PATH;
		if (!compatibility_mode) {
			$.ajax({
				url: queue_endpoint,
				type: POST,
				crossDomain: true,
				async: true,
				timeout: 10000,
				accepts: {
					json: 'application/json'
				},
				data: 'token=' + Chat.token + '&access_token=' + Chat.access_token + "&accountId=" + Chat.phone + "-" + Chat.name,
				success: function (data) {
					if (data !== null && data.response === null) {
						queue_endpoint = Chat.url + QUEUE_PATH;
						$.ajax({
							url: queue_endpoint,
							type: POST,
							crossDomain: true,
							async: false,
							accepts: {
								json: 'application/json'
							},
							data: 'token=' + Chat.token + '&access_token=' + Chat.access_token + "&accountId=" + Chat.phone + "-" + Chat.name,
							success: function (data) {
								if (data.response != null) {
									var counter = JSON.parse(data.response).data
									if (counter > 0) {
										$('.dolphin-queue-title').remove();
										if (!Chat.enable_input_in_queue) {
											$("#message-input").prop("disabled", true);
											$("#attachment").prop("disabled", true);
											if (document.getElementById("start-button")) {
												$("#start-button").prop("disabled", true);
											}
										}
										$('<span class="dolphin-queue-title">' + Chat.queue_text + counter + '</span>').appendTo($('.dolphin-chat'));
										setTimeout(renderQueueNumber, 30000);
									} else {
										$('.dolphin-queue-title').remove();
										if (!Chat.enable_input_in_queue) {
											$("#message-input").prop("disabled", false);
											$("#attachment").prop("disabled", false);
											if (document.getElementById("start-button")) {
												$("#start-button").prop("disabled", false);
											}
										}
									}
								} else {
									$('.dolphin-queue-title').remove();
									if (!Chat.enable_input_in_queue) {
										$("#message-input").prop("disabled", false);
										$("#attachment").prop("disabled", false);
										if (document.getElementById("start-button")) {
											$("#start-button").prop("disabled", false);
										}
									}
								}
							},
							error: function (xhr) {
								$('.dolphin-queue-title').remove();
								if (!Chat.enable_input_in_queue) {
									$("#message-input").prop("disabled", false);
									$("#attachment").prop("disabled", false);
									if (document.getElementById("start-button")) {
										$("#start-button").prop("disabled", false);
									}
								}
								Chat.buildError(Chat.chat_box, xhr.responseText);
							}
						});
					} else {
						if (data && data.response != null) {
							var counter = JSON.parse(data.response).data
							if (counter > 0) {
								$('.dolphin-queue-title').remove();
								if (!Chat.enable_input_in_queue) {
									$("#message-input").prop("disabled", true);
									$("#attachment").prop("disabled", true);
									if (document.getElementById("start-button")) {
										$("#start-button").prop("disabled", true);
									}
								}
								$('<span class="dolphin-queue-title">' + Chat.queue_text + counter + '</span>').appendTo($('.dolphin-chat'));
								setTimeout(renderQueueNumber, 30000);
							} else {
								$('.dolphin-queue-title').remove();
								if (!Chat.enable_input_in_queue) {
									$("#message-input").prop("disabled", false);
									$("#attachment").prop("disabled", false);
									if (document.getElementById("start-button")) {
										$("#start-button").prop("disabled", false);
									}
								}
							}
						} else {
							$('.dolphin-queue-title').remove();
							if (!Chat.enable_input_in_queue) {
								$("#message-input").prop("disabled", false);
								$("#attachment").prop("disabled", false);
								if (document.getElementById("start-button")) {
									$("#start-button").prop("disabled", false);
								}
							}
						}
					}
				},
				error: function () {
					$('.dolphin-queue-title').remove();
					if (!Chat.enable_input_in_queue) {
						$("#message-input").prop("disabled", false);
						$("#attachment").prop("disabled", false);
						if (document.getElementById("start-button")) {
							$("#start-button").prop("disabled", false);
						}
					}
				}
			});
		} else {
			queue_endpoint = queue_endpoint + '?access_token=' + Chat.access_token + "&accountId=" + Chat.phone + "-" + Chat.name;
			$.ajax({
				url: queue_endpoint,
				type: GET,
				crossDomain: true,
				async: true,
				timeout: 10000,
				accepts: {
					json: 'application/json'
				},
				dataType: 'json',
				success: function (data) {
					if (data !== null && data.response === null) {
						$.ajax({
							url: queue_endpoint,
							type: GET,
							crossDomain: true,
							async: false,
							accepts: {
								json: 'application/json'
							},
							dataType: 'json',
							success: function (data) {
								if (data.response != null) {
									var counter = JSON.parse(data.response).data
									if (counter > 0) {
										$('.dolphin-queue-title').remove();
										if (!Chat.enable_input_in_queue) {
											$("#message-input").prop("disabled", true);
											$("#attachment").prop("disabled", true);
											$("#start-button").prop("disabled", true);
										}
										$('<span class="dolphin-queue-title">' + Chat.queue_text + counter + '</span>').appendTo($('.dolphin-chat'));
										setTimeout(renderQueueNumber, 30000);
									} else {
										$('.dolphin-queue-title').remove();
										if (!Chat.enable_input_in_queue) {
											$("#message-input").prop("disabled", false);
											$("#attachment").prop("disabled", false);
											$("#start-button").prop("disabled", false);
										}
									}
								} else {
									$('.dolphin-queue-title').remove();
									if (!Chat.enable_input_in_queue) {
										$("#message-input").prop("disabled", false);
										$("#attachment").prop("disabled", false);
										$("#start-button").prop("disabled", false);
									}
								}
							},
							error: function (xhr) {
								$('.dolphin-queue-title').remove();
								if (!Chat.enable_input_in_queue) {
									$("#message-input").prop("disabled", false);
									$("#attachment").prop("disabled", false);
									$("#start-button").prop("disabled", false);
								}
								Chat.buildError(Chat.chat_box, xhr.responseText);
							}
						});
					} else {
						if (data && data.response != null) {
							var counter = JSON.parse(data.response).data
							if (counter > 0) {
								$('.dolphin-queue-title').remove();
								if (!Chat.enable_input_in_queue) {
									$("#message-input").prop("disabled", true);
									$("#attachment").prop("disabled", true);
									$("#start-button").prop("disabled", true);
								}
								$('<span class="dolphin-queue-title">' + Chat.queue_text + counter + '</span>').appendTo($('.dolphin-chat'));
								setTimeout(renderQueueNumber, 30000);
							} else {
								$('.dolphin-queue-title').remove();
								if (!Chat.enable_input_in_queue) {
									$("#message-input").prop("disabled", false);
									$("#attachment").prop("disabled", false);
									$("#start-button").prop("disabled", false);
								}
							}
						} else {
							$('.dolphin-queue-title').remove();
							if (!Chat.enable_input_in_queue) {
								$("#message-input").prop("disabled", false);
								$("#attachment").prop("disabled", false);
								$("#start-button").prop("disabled", false);
							}
						}
					}
				},
				error: function () {
					$('.dolphin-queue-title').remove();
					if (!Chat.enable_input_in_queue) {
						$("#message-input").prop("disabled", false);
						$("#attachment").prop("disabled", false);
						$("#start-button").prop("disabled", false);
					}
				}
			});
		}
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
function testConnection(at, successCallback, errorCallback) {
	if (Chat.url && at.access_token) {
		var test_endpoint = Chat.url + INFO_PATH;
		$.ajax({
			url: test_endpoint,
			type: 'GET',
			crossDomain: true,
			async: true,
			timeout: 10000,
			xhrFields: { withCredentials: true },
			headers: {
				AUTHORIZATION: BEARER + at.access_token
			},
			accepts: {
				json: 'application/json'
			},
			dataType: 'json',
			success: function () {
				isInitiatingToken = false;
				successCallback();
			},
			error: function (xhr) {
				isInitiatingToken = false;
				errorCallback(xhr);
			}
		});
	}
}

function checkMemberIdValidity(memberId) {
	var isValid = false;
	if (Chat.url) {
		$.ajax({
			url: Chat.url + MEMBER_ID_VALIDATION_PATH + '?memberId=' + memberId,
			type: GET,
			processData: false, contentType: 'application/json',
			cache: false, timeout: 10000,
			async: false,
			success: function success(data) {
				if (data === 'true') {
					isValid = true;
					$("#dolphin-warning-member-id").text('');
				} else {
					isValid = false;
					$("#dolphin-warning-member-id").text(Chat.member_id_input_error_message);
				}
			},
			error: function error(e) {
				console.error(e);
				isValid = false;
				$("#dolphin-warning-member-id").text(Chat.member_id_input_error_message);
			}
		});
	}

	return isValid;
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
		if (message.label !== undefined && message.label !== null) {
			message.label = aesUtil.decrypt(salt, iv, hashedKey, message.label);
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
	if (message.label !== undefined && message.label !== null) {
		message.label = aesUtil.encrypt(salt, iv, hashedKey, message.label);
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
				return '<div class="dolphin-attachment-filename-sent" onclick="viewPage(\'' + url + '\')">' + '<button class="button-agent-feedback">Rate My Service</button></div><br/>'
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
		bodyPosition = tmpPosition;
	}
	if (tmpOverflow && tmpOverflow !== "hidden") {
		bodyOverflow = tmpOverflow
	}
	if (window.innerWidth < 700) {
		$(document.body).css('position', 'fixed');
		$(document.body).css('overflow', 'hidden');
	}
}

function enableBodyScroll() {
	if (bodyPosition !== null) {
		$(document.body).css('position', bodyPosition);
	} else {
		$(document.body).css('position', "static");
	}
	if (bodyOverflow !== null) {
		$(document.body).css('overflow', bodyOverflow);
	} else {
		$(document.body).css('overflow', "hidden scroll");
	}
	bodyPosition = null;
	bodyOverflow = null;
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
		if (Chat.chat_background) {
			$(".dolphin-messages").css("background", "url(" + Chat.chat_background + ")");
			$(".dolphin-messages").css("background-repeat", "no-repeat");
			$(".dolphin-messages").css("background-size", "cover");
		} else {
			$('.dolphin-messages').css("background", "white");
		}
		$('#dolphin-messages #pageFrame').remove();
		$('.dolphin-message-box #cancel').remove();
		$('#messages-content').css("visibility", "visible");
		$('.dolphin-message-box .message-input').css("visibility", "visible");
		$('.dolphin-message-box form label').css("visibility", "visible");
		$('.dolphin-message-box .message-submit').css("visibility", "visible");
		$('.dolphin-message-box #dolphin-send').css("visibility", "visible");
		$('.dolphin-message-box').css("background", "rgba(255, 255, 255, 1)");
		$('.dolphin-message-box').css("box-shadow", "0 0 20px 0 rgba(150,165,190,.3)");
		$('.dolphin-message-box').css("border", "1px solid white");
		document.getElementById("dolphin-message-box").removeAttribute("style");
		if ($('.speech-recognizer')) {
			$('.speech-recognizer').show();
		}
	}
});

$(window).resize(function () {
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

function emailProcessingMethod() {
	$("#dolphin-name").prop('disabled', true);
	$("#dolphin-email").prop('disabled', true);
	$("#dolphin-comment").prop('disabled', true);
	$("#dolphin-login-connect").prop('disabled', true);
	document.getElementById('snackbar').style.color = "rgba(93, 109, 126, 1)";
	showSnackbar(Chat.process_send_email_message);
}

function emailSentMethod() {
	$('#dolphin-name').prop('disabled', false);
	$('#dolphin-email').prop('disabled', false);
	$('#dolphin-comment').prop('disabled', false);
	$("#dolphin-login-connect").prop('disabled', false);
}

function showSnackbar(text) {
	$('#snackbar').html(text);
}

function sendEmail() {
	var token_endpoint = Chat.url + '/oauth/token';
	token_endpoint = token_endpoint + '?grant_type=password' + "&username=" + Chat.client_id + '&password=' + Chat.client_secret;
	$.ajax({
		url: token_endpoint,
		type: POST,
		crossDomain: true,
		async: true,
		xhrFields: { withCredentials: false },
		headers: {
			AUTHORIZATION: BASIC + encodedClientIdAndClientSecret(Chat.client_id, Chat.client_secret)
		},
		accepts: {
			json: 'application/json'
		},
		dataType: 'json',
		timeout: 10000,
		tryCount: 0,
		retryLimit: 3,
		success: function (data) {
			data.status = 200;
			localStorage.setItem("access_token_send_email", JSON.stringify(data));
			sendEmailProcess();
		},
		error: function (xhr, statusText) {
			setTimeout(function () {
				emailSentMethod();
				document.getElementById('snackbar').style.color = "red";
				showSnackbar(Chat.process_send_email_error_message);
				setTimeout(function () {
					showSnackbar('');
				}, 5000);
				isSendEmail = false;
			}, 2000);
		}
	});
}

function sendEmailProcess() {
	Chat.access_token = JSON.parse(localStorage.getItem("access_token_send_email")).access_token;
	var send_email_endpoint = Chat.url + EMAIL_PATH;
	var comment = Chat.send_email_success_message + "<br /><br /><br /><br /><br />'' " + Chat.comment + " ''";
	var obj = '{ "to":"' + Chat.email + '", "messageBody":"' + comment + '", "subject":"' + Chat.subject_email + '", "accountName":"' + Chat.name + '"}';
	$.ajax({
		url: send_email_endpoint + '?channel_id=' + Chat.channel_id_email + '&access_token=' + Chat.access_token,
		type: POST,
		contentType: "application/json; chatset=utf-8",
		crossDomain: false,
		async: true,
		accepts: {
			json: 'application/json'
		},
		data: obj,
		success: function success(data) {
			setTimeout(function () {
				emailSentMethod();
				showSnackbar('');
				$('#dolphin-name').prop('value', '');
				$('#dolphin-email').prop('value', '');
				$('#dolphin-comment').prop('value', '');
				$('#dolphin-hour-message').fadeOut('fast');
				$('#dolphin-name').fadeOut('fast');
				$('#dolphin-email').fadeOut('fast');
				$('#dolphin-comment').fadeOut('fast');
				$('#dolphin-warning-name').fadeOut('fast');
				$('#dolphin-warning-email').fadeOut('fast');
				$('#dolphin-warning-comment').fadeOut('fast');
				$('#dolphin-login-connect').fadeOut('fast');
				document.getElementById('dolphin-login-body').style.backgroundImage = 'url(images/bg-indigo.svg)';
				document.getElementById('dolphin-login-body').style.backgroundSize = 'cover';
				setTimeout(function () {
					$('#dolphin-send-email-success').fadeIn('fast');
					localStorage.removeItem("access_token_send_email");
				}, 500);
			}, 2000);
			isSendEmail = false;
		},
		error: function error() {
			setTimeout(function () {
				emailSentMethod();
				document.getElementById('snackbar').style.color = "red";
				showSnackbar(Chat.process_send_email_error_message);
				setTimeout(function () {
					showSnackbar('');
					localStorage.removeItem("access_token_send_email");
				}, 5000);
				isSendEmail = false;
			}, 2000);
		}
	});
}
function onFocusInputPhone() {
	if ($(".dolphin-phone-input").val() === "") {
		$(".dolphin-phone-input").val("+62");
	}
}
function onMessageInputFocus() {
	isInputFocus = true;
}
function onMessageInputBlur() {
	isInputFocus = false;
}