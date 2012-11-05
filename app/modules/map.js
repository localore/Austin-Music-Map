define([
	"app",
	// Libs
	"backbone",
	
	"modules/submodules/fuzz"

	

], function(App, Backbone, Fuzz) {
	
	var Map = App.module();

	Map.Model = Backbone.Model.extend({
		type: 'Map',
		defaults: {
			title: 'Map'
		},

		initialize: function() {
			window.fuzz=Fuzz;
			console.log('init map');
			var mapCollection = new MapCollection();
			var _this=this;
			App.playlistCollection = new PlaylistCollection();
			App.playlistCollection.fetch({success:function(collection,response){
				App.playlistCollection.createKeys();
				App.playlistCollection.getMatches(['Blues']);
				mapCollection.fetch({success:function(collection,response){
					_this.mapView = new Map.Views.Main({collection:collection});
					$('#appBase').empty().append( _this.mapView.el );
					_this.mapView.render();
				}});
			}});

			
		}
	});

	Map.Views = Map.Views || {};

	Map.Views.Featured = Backbone.LayoutView.extend({
		template : 'mapfeatured',
		serialize : function(){ return this.model.toJSON(); }
	});

	Map.Views.Main  = Backbone.LayoutView.extend({
		id : 'base-map',
		template: 'map',
		latLng: new L.LatLng(30.266702991845,-97.745532989502),
		
		initialize : function(options){
			_.extend(this,options);
		},
		
		createPoints:function(){

			var p =[];
			_.each(_.toArray(this.collection), function(item){
				if(!_.isNull(item.get('media_geo_longitude')))
				{

					item.attributes.playlists=App.playlistCollection.getMatches(item.get('tags'));


						
					p.push({
						"type": "Feature",
						"geometry": {
							"type": "Point",
							"coordinates": [item.get('media_geo_longitude'), item.get('media_geo_latitude')]
						},
						"properties":item.attributes,
						"id":item.id
					});
				}
			});
			return { "type": "FeatureCollection", "features": p};
		},

		afterRender:function(){
			

			var cloudmade = new L.TileLayer('http://{s}.tiles.mapbox.com/v3/zeega.map-17habzl6/{z}/{x}/{y}.png', {maxZoom: 18, attribution: ''}),
				homemade = new L.TileLayer('assets/img/map.png#{z}/{x}/{y}', {maxZoom: 18, attribution: ''});
				
			this.map = new L.Map(this.el,{
				// dragging:false,
				touchZoom:false,
				scrollWheelZoom:false,
				doubleClickZoom:false,
				boxZoom:false,
				zoomControl:false
			});
			this.map.setView(this.latLng, 13).addLayer(cloudmade).addLayer(homemade);
			this.map.featureOn=false;
			this.loadItems();
			//This loads neighborhood polygons
			//this.loadNeighborhoods();
			
		},
		clearItems:function(){
			$('.map-overlay').remove();
			var map=this.map;
			map.featureOn=false;
			_.each(map._layers,function(layer){
				if(!_.isUndefined(layer.feature))map.removeLayer(layer);
			});
			this.loadItems();
			
		},
		loadItems:function(){
			this.itemsLayer='';
			var map=this.map,
				radius=114,
				diameter=2*radius,
				points = this.createPoints(),
				itemLayer=this.itemLayer;
			
			

			function onEachFeature(feature, layer) {
				layer.on("mouseover", function (e) {
					//layer.projectLatlngs();
					var layerPoint=map.latLngToContainerPoint(layer._latlng);
					layer._point=layerPoint;
					var x=layer._point.x-radius;
					var y=layer._point.y-radius-30;
					var height = diameter+30;
					var popup = $("<div></div>", {
						id: "popup-" + feature.id,
						css: {
							position: "absolute",
							top: y+"px",
							left: x+"px",
							zIndex: 12,
							width:diameter+"px",
							height:height+"px",
							cursor: "pointer"
		
						}
					}).addClass('map-overlay');
					
					var hed = $("<div id='wrapper-"+feature.id+"' style='z-index:18; position:absolute; top:30px; opacity:.8'><canvas id='canvas-"+feature.id+"' width='"+diameter+"' height='"+diameter+"'></canvas></div>").appendTo(popup);
					// Add the popup to the map
					popup.appendTo($('body'));
					
					var thumbImg = document.createElement('img');
					thumbImg.src = feature.properties.thumbnail_url;
					var r=0;
					function drawThumb(){
						if(_.isNull(document.getElementById("canvas-"+feature.id))){
							clearInterval(drawThumbAnim);
						}
						else{
							var tmpCtx=document.getElementById("canvas-"+feature.id).getContext("2d");
							tmpCtx.save();
							tmpCtx.beginPath();
							tmpCtx.arc(radius, radius, radius*r, 0, Math.PI * 2, true);
							tmpCtx.closePath();
							tmpCtx.clip();
							tmpCtx.drawImage(thumbImg, 0, 0, diameter, diameter);
							tmpCtx.restore();
							if(r>=1)clearInterval(drawThumbAnim);
							r=parseFloat(r)+0.05;
						}
					}
					var drawThumbAnim=setInterval(drawThumb,20);


					popup.on('mousemove',function(e){
						if(!map.featureOn){
							var d= Math.sqrt((e.pageX-layer._point.x)*(e.pageX-layer._point.x)+(e.pageY-layer._point.y)*(e.pageY-layer._point.y));
									if(d>20){
										clearInterval(drawThumbAnim);
										$("#popup-" + feature.id).fadeOut('fast',function(){$(this).remove(); });
								}
							}
						})
						.on('click',function(e){
							if(!map.featureOn){



								console.log(feature.properties);
								var featuredView = new Map.Views.Featured({model:new Backbone.Model(feature.properties)});
								featuredView.render();
								$('#popup-'+feature.id).append(featuredView.el);

								map.featureOn=true;
								var overlay = $("<div></div>", {
									id: "overlay-" + feature.id,
									css: {
										cursor: "pointer",
										position: "absolute",
										top: "0px",
										left: "0px",
										zIndex: 11,
										width:"100%",
										height:"100%"
					
									}
								}).addClass('map-overlay');
								
								var hedd = $("<div id='overlay-wrapper-"+feature.id+"' style='opacity:1'><canvas id='overlay-canvas-"+feature.id+"' width='"+window.innerWidth+"' height='"+window.innerHeight+"'></canvas></div>").appendTo(overlay);
								overlay.appendTo($('body'));
								var largeImg = document.createElement('img');
		

								if(feature.properties.media_type=="Image") largeImg.src = feature.properties.uri;
								else{
									largeImg.src ="http://maps.googleapis.com/maps/api/streetview?size=600x600&location="+feature.properties.media_geo_lat+",%20"+feature.properties.media_geo_lng+"&fov=90&heading=235&pitch=10&sensor=false";
								}

								
								largeImg.onload = function() {
										
									var i=0;
									var k = Math.sqrt(window.innerHeight*window.innerHeight+window.innerWidth*window.innerWidth);
						
								//Want animation radius to be large enough such that begins at farthest corner of the screen
									var d =2*Math.max( Math.sqrt(window.innerHeight*window.innerHeight+window.innerWidth*window.innerWidth)-Math.sqrt(layer._point.x*layer._point.x+layer._point.y*layer._point.y),
												Math.sqrt(layer._point.x*layer._point.x+layer._point.y*layer._point.y));
						
								
							
								var drawLargeImageAnim=setInterval(drawLargeImage,20);
								var shrinkAnim;
								var expandAnim;
								
								function drawLargeImage(){
									if(_.isNull(document.getElementById("overlay-canvas-"+feature.id))) clearInterval(drawThumbAnim);
									else
									{


										var f;
										if(i<0.7){
											f = 1-(0.7-i)*(0.7-i);
										}
										else{
											f=1;
										}

										var tmpCtx=document.getElementById("overlay-canvas-"+feature.id).getContext("2d");
										tmpCtx.globalCompositeOperation = 'destination-over';
										
										tmpCtx.save();
										tmpCtx.beginPath();
										tmpCtx.arc(layer._point.x, layer._point.y,d, 0, Math.PI * 2, true);
										tmpCtx.arc(layer._point.x, layer._point.y, (radius+50) + (1-f)*(d-(radius+50)), 0, Math.PI * 2, false);
										tmpCtx.closePath();
										tmpCtx.clip();
										tmpCtx.drawImage(largeImg, 0, 0, window.innerWidth, window.innerWidth);
										tmpCtx.restore();
										
										var thumbctx=document.getElementById("canvas-"+feature.id).getContext("2d");
										thumbctx.globalCompositeOperation = 'destination-over';
										thumbctx.clearRect(0,0,diameter,diameter);

										thumbctx.save();
										thumbctx.beginPath();
										thumbctx.arc(radius, radius, radius, 0, Math.PI * 2, true);
										thumbctx.arc(radius, radius, f*radius, 0, Math.PI * 2, false);
										thumbctx.closePath();
										thumbctx.clip();
										if(i<1) thumbctx.drawImage(thumbImg, 0, 0, diameter, diameter);
									
										thumbctx.restore();

										if(i>=1) {
											$('.back-to-map').fadeIn('fast');
											clearInterval(drawLargeImageAnim);
											$('#wrapper-'+feature.id).remove();
											$('#marker-container').addClass('marker').fadeIn('fast');
											var shrinkGapAnim,expandGapAnim,
												gapState = 'small';

											
											$('.map-overlay').on('mousemove',function(e){
												var i=0;
												var d= Math.sqrt((e.pageX-layer._point.x)*(e.pageX-layer._point.x)+(e.pageY-layer._point.y)*(e.pageY-layer._point.y));
												function expandGap(){
													if(_.isNull(document.getElementById("overlay-canvas-"+feature.id))){
														clearInterval(expandGapAnim);
													}
													else{
														var tmpCtx=document.getElementById("overlay-canvas-"+feature.id).getContext("2d");
														tmpCtx.globalCompositeOperation = 'destination-over';
														tmpCtx.clearRect(0,0,window.innerWidth,window.innerHeight);
													
														tmpCtx.save();
														tmpCtx.beginPath();
														tmpCtx.arc(layer._point.x, layer._point.y,10000, 0, Math.PI * 2, true);
														tmpCtx.arc(layer._point.x, layer._point.y,(radius+50) + i*8, 0, Math.PI * 2, false);
														tmpCtx.closePath();
														tmpCtx.clip();
														tmpCtx.drawImage(largeImg, 0, 0, window.innerWidth, window.innerWidth);
														tmpCtx.restore();
													
														if(i>=1) {
															clearInterval(expandGapAnim);
															expandGapAnim=false;
															gapState='large';
															//$('.back-to-map').fadeIn('fast');
															
														}
														i=parseFloat(i)+0.1	;
													}
												}
												function shrinkGap(){
													if(_.isNull(document.getElementById("overlay-canvas-"+feature.id))){
														clearInterval(expandGapAnim);
													}
													else
													{
														//$('.back-to-map').hide();
														var tmpCtx=document.getElementById("overlay-canvas-"+feature.id).getContext("2d");
														tmpCtx.globalCompositeOperation = 'destination-over';
														tmpCtx.clearRect(0,0,window.innerWidth,window.innerHeight);
													
														tmpCtx.save();
														tmpCtx.beginPath();
														tmpCtx.arc(layer._point.x, layer._point.y,10000, 0, Math.PI * 2, true);
														tmpCtx.arc(layer._point.x, layer._point.y,radius+58 - i*8, 0, Math.PI * 2, false);
														tmpCtx.closePath();
														tmpCtx.clip();
														tmpCtx.drawImage(largeImg, 0, 0, window.innerWidth, window.innerWidth);
														tmpCtx.restore();
						
														if(i>=1) {
															clearInterval(shrinkGapAnim);
															shrinkGapAnim=false;
															gapState='small';
														}
														i=parseFloat(i)+0.1;
													}
												}

												if(d>radius&&d<radius+20&&gapState=='small'){
													clearInterval(shrinkGapAnim);
													if(!expandGapAnim){
														i=0;
														expandGapAnim=setInterval(expandGap,30);
													}
												}

												else if((gapState == 'large'&&d<radius)||(gapState == 'large'&&d>radius+50)){
													clearInterval(expandGapAnim);
													if(!shrinkGapAnim){
														shrinkGapAnim=setInterval(shrinkGap,30);
														i=0;
													}
												}
											
											});
											
										
											overlay.on('click',function(e){
												var d= Math.sqrt((e.pageX-layer._point.x)*(e.pageX-layer._point.x)+(e.pageY-layer._point.y)*(e.pageY-layer._point.y));
												if(d>radius&&d<radius+50){
													$('.map-overlay').fadeOut('slow',function(){$(this).remove();});
													map.featureOn=false;
												}
											});
										}
										i=parseFloat(i)+0.015;
									}
								}
								};
							
							}else{
							
								var d= Math.sqrt((e.pageX-layer._point.x)*(e.pageX-layer._point.x)+(e.pageY-layer._point.y)*(e.pageY-layer._point.y));
								
								if(d>100&&d<150){
									$('.map-overlay').fadeOut('slow',function(){$(this).remove();});
									map.featureOn=false;
								}
							}
						});
				return false;
			});
			}
			L.geoJson([points], {

				
				onEachFeature:onEachFeature,
				

				pointToLayer: function (feature, latlng) {
					var ico = L.divIcon({
						className : 'custom-icon',
						html: '<i class="amm-dot-'+ Math.floor(Math.random()*57) +'"></i>',
						iconAnchor: new L.Point(10,10)
					});

					return L.marker(latlng,{icon:ico});

					/*
					return L.circleMarker(latlng, {
						radius: 8,
						fillColor: "blue",
						color: "#000",
						weight: 1,
						opacity: 1,
						fillOpacity: 0.8
					});
*/
				}
			}).addTo(map);
		
		},

		loadNeighborhoods:function(){
	
		var map=this.map;

		L.geoJson.prototype.getCenter=function(){
			var feature =this.feature;
			var lat=0,lng=0,counter=0;
			_.each(feature.geometry.coordinates[0],function(coord){
				
				//if(lat!=0) lat=Math.min(coord[1],lat);
				//else lat=coord[1];
				lat+=coord[1];
				lng+=coord[0];
				counter++;
			});
			return new L.LatLng(lat/counter,lng/counter);
		};

		L.geoJson.prototype.getBounds=function(){
			var feature=this.feature;
			var nelat=0,nelng=0,swlat=0,swlng=0,counter=0;
			_.each(feature.geometry.coordinates[0],function(coord){

				if(swlng!==0) swlng=Math.min(coord[0],swlng);
				else swlng=coord[0];

				if(nelng!==0) nelng=Math.max(coord[0],nelng);
				else nelng=coord[0];

				if(swlat!==0) swlat=Math.min(coord[1],swlat);
				else swlat=coord[1];

				if(nelat!==0) nelat=Math.max(coord[1],nelat);
				else nelat=coord[1];

			});
			var southWest = new L.LatLng(swlat, swlng),
			northEast = new L.LatLng(nelat, nelng);
			return new L.LatLngBounds(southWest, northEast);
		};

		var onEachFeature=function(feature,layer){
			var uniq=Math.floor(Math.random()*1000);
			console.log(layer);
			layer.on("mouseover",function(e){
				layer.setStyle({fillOpacity:0.5});
			/*
				
				var latlng = this.getCenter();
				var layerPoint=map.latLngToContainerPoint(latlng);
				var popup = $("<div></div>", {
					id: "popup-" + uniq,
					css: {
						position: "absolute",
						top: (layerPoint.y-50)+"px",
						left: (layerPoint.x-50)+"px",
						zIndex: -1,
						cursor: "pointer"
	
					}
				});
				// Insert a headline into that popup
				var hed = $("<div></div>", {
				text: feature.properties.title,
				css: {fontSize: "25px", marginBottom: "3px",color:feature.properties.color}
				}).appendTo(popup);
				
				// Add the popup to the map
				popup.appendTo(".leaflet-overlay-pane");
				*/

			});
			layer.on("click",function(){
				map.fitBounds(layer.getBounds());

			});
			layer.on("mouseout",function(e){
				
					layer.setStyle({fillOpacity:0.2});
					//$('#popup-'+uniq).remove();
				
			});


		};
		//_.each(AustinNeighborhoods.geojson,function(poly){
			//console.log(poly.properties.color);


			var layer = L.geoJson(Neighborhoods.geojson,{
				style: function(feature){
					return {
						color:feature.properties.color,
						//color: 'black',
						weight: 1,
						opacity: 0,
						fillOpacity: 0.2
					};
				},
				onEachFeature:onEachFeature
			}).addTo(map);
			this.loadItems();
		//});



	}

	});



	var MapCollection = Backbone.Collection.extend({

	
		initialize:function(){
			
		
		},
		
		url:'http://alpha.zeega.org/api/items/50229/items',
		parse: function(response){
			console.log('returned collection');
			return response.items;
		}

	});

	var PlaylistCollection = Backbone.Collection.extend({

	
		initialize:function(){
			
		
		},
		
		url:function(){
			return 'http://alpha.zeega.org/api/items/50264/items';
		},

		createKeys:function(){
			var keys=[];
			_.each(this.models,function(model){
				keys.push(model.get('attributes').tags.toLowerCase());
			});
			this.keys=keys;
		},

		getMatches:function(candidates){
			var matches = [];
			var models = this.models;
			
			_.each(_.intersection(this.keys,candidates),function(key){
				matches.push(_.find(models, function(model){ return key == model.get('title').toLowerCase(); }));
			});
			return matches;
		},
		
		parse: function(response){
			
			return response.items;
		}

	});

	// Required, return the module for AMD compliance
	return Map;

});