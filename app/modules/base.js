define([
	// Application.
	"app",
	"backbone",
	"modules/playlist",
	"modules/submodules/search-menu",
	//plugins
	"plugins/jquery-ui"

],

function(App, Backbone, Playlist, Search )
{

	var BaseLayout = Backbone.Layout.extend({

		manage: true,
		el: "#main",

		initialize : function()
		{
			this.insertView( new baseView() );
		},

		afterRender : function()
		{
			//this.showPlaylistMenu();
			App.trigger('base_layout_ready');	
		},

		hideLeftMenu : function(opts)
		{
			if( this.$('#controlsLeft .controls-inner').is(':visible') )
			{
				var _this = this;
				this.$('#controlsLeft').hide('slide',{direction:'left'}, function(){
					console.log('after hide', opts);
					_this.drawLeftMenu(opts.next);
				});
			}
			else if(opts.next)
			{
				this.drawLeftMenu(opts.next);
			}
		},

		drawLeftMenu : function( next )
		{
			switch(next)
			{
				case 'map':
					this.showSearchMenu();
					break;
				case 'playlist':
					this.showPlaylistMenu();
					break;
			}
		},

		showSearchMenu : function()
		{
			var searchView = new Search.View();
			this.setView('#controlsLeft .controls-inner', searchView );
			this.$('#controlsLeft').hide('slide',{direction:'right'});
			searchView.render();
			this.expandLeftMenu();
		},

		showPlaylistMenu : function(opts)
		{
			var playlistView = new Playlist.Views.PlaylistView();
			this.setView('#controlsLeft .controls-inner', playlistView );
			this.$('#controlsLeft').hide('slide',{direction:'right'});
			playlistView.render();
			this.expandLeftMenu();
		},

		expandLeftMenu : function()
		{
			console.log('show left menu');
			this.$('#controlsLeft').show('slide');
		}

	});

	var baseView = Backbone.LayoutView.extend({ template: "base" });

	return BaseLayout;
});
