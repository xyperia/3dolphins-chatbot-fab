$.extend({
    getCss: function(urls, callback, nocache){
        if (typeof nocache=='undefined') nocache=false; // default don't refresh
        $.when(
            $.each(urls, function(i, url){
                if (nocache) url += '?_ts=' + new Date().getTime(); // refresh? 
                $.ajax({
					url: url,
					xhrFields: {
						withCredentials: true
					},
                    cache: true, // set this to false if each CSS file 
                                 // must refresh and not use a cached version
                    success: function(){
                        $('<link>', {rel:'stylesheet', type:'text/css', 'href':url}).appendTo('head');
                    }
                });
            })
        ).then(function(){
            if (typeof callback=='function') callback();
        });
    },
});