define([
	"app",
	// Libs
	"backbone"
],

function(App, Backbone)
{
	// Create a new module
	var Loader = App.module();


	Loader.View = Backbone.LayoutView.extend({
		template : 'player-loader',
		className : 'player-loader',

		hasPlayed : false,

		listenToPlayer : function( player )
		{
			this.player = player;
			this.updateLoaderTitle( player );
			this.$('.layer-loading').empty();
			player.on('all', function(e, obj){ if(e!='media_timeupdate') console.log('e: loader: ',e,obj);});

			player.on('layer_loading', this.addLoadingItem, this);
			player.on('layer_ready', this.onLayerLoaded, this);
			player.on('visual_ready', this.onPlayerReady, this);

		},

		updateLoaderTitle : function( player )
		{
			var _this = this;
			if( this.model.get('playlist_title') ) this.$('.loader-title').text( this.model.get('playlist_title'));
			else
			{
				this.model.on('change:playlist_title', function(){
					_this.$('.loader-title').text( _this.model.get('playlist_title'));
				});
			}
		},

		addLoadingItem : function( layerdata )
		{
			this.$('.layer-loading').append('<li class="unloaded" data-id="'+ layerdata.id +'"><div class="col-left"></div>'+ layerdata.attr.title + ' by '+ htmlDecode(layerdata.attr.media_creator_username) +'</li>');
		},

		onLayerLoaded : function( layerdata )
		{
			this.$(".layer-loading").find("[data-id='" + layerdata.id + "']").removeClass('unloaded');
		},

		onPlayerReady : function()
		{
			if(!this.hasPlayed)
			{
				var _this = this;
				_.delay(function(){
					_this.$el.fadeOut();
					_this.model.renderPlaylist();
					_this.player.play();
				},5000);
				
				this.hasPlayed = true;
			}
		}
	});

	function htmlDecode(input){
		return $("<div/>").html(input).text();
	}

	return Loader;
});