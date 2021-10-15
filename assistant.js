setTimeout(function() {
$(document).ready(function () {
			$.getScript( "https://cdn.3dolphins.ai/assistant/js/jquery.stylesheet.js").done(function() {
				var css = [ "https://cdn.3dolphins.ai/assistant/css/white.css", "https://cdn.3dolphins.ai/assistant/css/widget.css", "https://cdn.3dolphins.ai/assistant/css/lightslider.css", "https://cdn.3dolphins.ai/assistant/css/intlTelInput.css"]
				$.getCss(css, function() {
					$.when(
						$.getScript( "https://www.google.com/recaptcha/api.js" ),
						$.getScript( "https://cdn.3dolphins.ai/assistant/js/iframeResizer.contentWindow.js" ),
						$.getScript( "https://cdn.3dolphins.ai/assistant/js/iframeResizer.js" ),
						$.getScript( "https://cdn.3dolphins.ai/assistant/js/lightslider.js" ),
						$.getScript( "https://cdn.3dolphins.ai/assistant/js/lazyload.min.js" ),
						$.getScript( "https://cdn.3dolphins.ai/assistant/js/cryptojs/pbkdf2.js" ),
						$.getScript( "https://cdn.3dolphins.ai/assistant/js/cryptojs/aes.js" ),
						$.getScript( "https://cdn.3dolphins.ai/assistant/js/cipher/aes-util.js" ),
						$.getScript( "https://cdn.3dolphins.ai/assistant/js/stp.js" ),
						$.getScript( "https://cdn.3dolphins.ai/assistant/js/sjs.js" ),
						$.getScript( "https://cdn.3dolphins.ai/assistant/js/fuse.js" ),
						$.getScript( "https://cdn.3dolphins.ai/assistant/js/speech.js" ),
						$.getScript( "https://cdn.3dolphins.ai/assistant/js/intlTelInput.js" ),
                    	$.getScript( "https://cdn.3dolphins.ai/assistant/js/utils.js" ),
						$.getScript( "https://cdn.3dolphins.ai/assistant/js/chat.js" ),
						$.Deferred(function( deferred ){
							$( deferred.resolve );
						})
					).done(function(){
						Chat.init({
							header: 'Welcome to Inmotion Chat',
							login_sub_header: 'Please tell us about yourself',
							connect_message: 'Do you have questions ? <br>Come chat with us, we are here to help you',
							chat_sub_header: 'Our agent will serve you shortly',
							url: 'https://driver.3dolphins.ai:31418',
							client_id: 'f181392d7b4f13ec1903d6359edf0cf2',
							client_secret: '0a105a36837fd92504c9b9a1ad8d36a5',
							type_placeholder: 'Type message...',
							avatar: 'https://cdn.3dolphins.ai/assistant/images/bella.png',
							icon_avatar: 'https://cdn.3dolphins.ai/assistant/images/bella.png',
							agent_avatar: 'https://cdn.3dolphins.ai/assistant/images/bella.png',
							iframe_height_method: 'custom',
							cancel_share_location: 'Batal',
							enable_voice: false,
							enable_speech: false,
							enable_queue: true,
							queue_text: "⏰NOMOR URUT: ",
							enable_campaign: false,
							campaign_avatar: 'https://cdn.3dolphins.ai/assistant/images/bella.png',
							campaign_title: 'Bella',
							campaign_text: 'Hello 👋, What do you think about our product ?',
							campaign_timer: 5000,
							campaign_menu: [{"label":"Services", "value":"Layanan", "icon":"https://cdn.3dolphins.ai/assistant/menu/ic_service.gif"}, {"label":"Product", "value":"Produk", "icon":"https://cdn.3dolphins.ai/assistant/menu/ic_product.gif"}, {"label":"Live Agent", "value":"Sambungkan ke cs", "icon":"https://cdn.3dolphins.ai/assistant/menu/ic_liveagent.gif"}]
						});
					});
				}, true);
			});
		});
}, 2000);
