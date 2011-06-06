/**
 * TODO
 *      
 *      ---Node Color Changer Thing
 *          --Show all conditions in something, on screen or dialog
 *      ---Load from predetermined file on website, loading the file not demo
 *      ---Prettify the dialog boxes
 *      ---Prettify the pop out window
 *      ---Find shortest path option....doesn't seem to always work? merged edges? source and target seem correct...
 *      ---Default layout tree --> when reading xgmml it goes to "PreSet" no matter what...so either preset in the file or $click afterward
 *      --- somehow stop unresponsive script messages....
 *      --- Bug report page?
 *      --- delete selected has a huge memory leak...700k memory?!?!?!?! likely
 *          somethign we're doing...cytoscape web demo doesn't increase...
 *          http://www.javascriptkit.com/javatutors/closuresleak/index.shtml
 *      ---take out anything that has to do with the examples
 *      --- css the shortcut layout and colors
 *      --- block bad browsers (IE5 and IE6 --- ajax necessary/working?)
 *      --- all nodes guaranteed to have same heading? if so, change to only check first node(much faster)
 */ 
/*
  This file is part of Cytoscape Web.
  Copyright (c) 2009, The Cytoscape Consortium (www.cytoscape.org)

  The Cytoscape Consortium is:
    - Agilent Technologies
    - Institut Pasteur
    - Institute for Systems Biology
    - Memorial Sloan-Kettering Cancer Center
    - National Center for Integrative Biomedical Informatics
    - Unilever
    - University of California San Diego
    - University of California San Francisco
    - University of Toronto

  This library is free software; you can redistribute it and/or
  modify it under the terms of the GNU Lesser General Public
  License as published by the Free Software Foundation; either
  version 2.1 of the License, or (at your option) any later version.

  This library is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
  Lesser General Public License for more details.

  You should have received a copy of the GNU Lesser General Public
  License along with this library; if not, write to the Free Software
  Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA 02110-1301 USA 
  */
$(function(){

    // delays
    var DELAY_BEFORE_HIDING_LOADERS = 250;
    var DELAY_BEFORE_HIDING_SAVE_MENU = 250;
    var VALIDATION_DELAY = 1000;
    var MESSAGE_HIDE_SPEED = 0;
    var FILTER_DELAY_ON_SLIDER = 25;
    var FILTER_STEPS_ON_SLIDER = 100;
    var LISTENER_DELAY = 50;
    
    // sizes
    var SIDE_BAR_MIN_SIZE = 50;
    var SIDE_BAR_MAX_SIZE = 600;
    var SIDE_BAR_RESIZER_GRIP_SIZE = 16;
    var SIDE_BAR_START_SIZE = 350;
    
    // versions
    var MIN_FLASH_VERSION = 10;
    
    // Cytoscape Web instance
    var vis;
    
    //Keeps track of sequence id's for nodes
    var probeset = [];
    
    var dbl_to_zooom = 0;
    
    var hidden_nodes = [];
    
    var hidden_edges = [];
    
    var selected_for_highlight = [];
    
    var currentTime = new Date();
    currentTime = currentTime.getMinutes();
    
    // keeps track of a path...
    var nodesToSelect = [];
    // boolean which keeps track of whether or not to highlight the path...
    var findingPath=false;
    
    
    /**
     * A list of displayableHeadingsMap for the node headings
     **/
    var nodeHeadings = [];
    
    /**
     * A list of displayableHeadingsMap for the edge headings
     **/
    var edgeHeadings = [];
    
    /**
     * Maps whether a given heading is to be displayed in the properties tab
     * @heading the heading which may or may not be displayed
     * @bool whether or not to display the heading
     **/
    function displayableHeadingsMap(heading, bool){
        this.heading=heading;
        this.isDisplayable=bool;
    }
    
    // Path util
    ////////////////////////////////////////////////////////////////////////////////////////////////
    
    
    function path(str){
        function has_slash(str){
            return str.substr(0, 1) == "/";
        }
    
        if( window.location.protocol == "file:" || window.location.protocol != "http:" ){
            if( has_slash(str) ){
                return str.substr(1);
            } else {
                return str;
            }
        } else {
            if( has_slash(str) ){
                return str;
            } else {
                return "/" + str;
            }
        }
    }
    
    // Loading and error
    ////////////////////////////////////////////////////////////////////////////////////////////////
    
    function show_msg( options ){
        var options = $.extend({
            type: "info",
            showCorner: false
        }, options);
        
        var obj = options.target;
    
        var err = $(  "<div class=\"" + options.type + "_screen screen\">\
                            " + (options.showCorner ? ((options.cornerLink ? '<a href="' + options.cornerLink + '">' : "") + "<div class=\"corner\"><div class=\"icon\"></div><span>" + options.cornerText + "</span></div>" + (options.cornerLink ? '</a>' : "")) : ("")) + "\
                            <div class=\"notification\">\
                                <div class=\"icon\"></div>\
                                <div class=\"heading\">" + (options.heading || "") + "</div>\
                                <div class=\"message\">" + (options.message || "") + "</div>\
                            </div>\
                        </div>");
        
        $(obj).append(err);
    
        err.find(".corner").click(function(){
            hide_msg( options );
        });
    }
    
    function hide_msg( options ){
        var obj = options.target;
        
        $(obj).find( (options.type ? "." + options.type + "_screen" : ".screen") ).fadeOut(MESSAGE_HIDE_SPEED, function(){
            $(this).remove();
        });
    }
    
    function show_msg_on_tabs( options ){
        show_msg( $.extend( { target: $("#side") }, options ) );
    }
    
    function hide_msg_on_tabs( options ){
        hide_msg( $.extend( { target: $("#side") }, options ) );
    }
    
    function show_msg_on_all( options ){
        show_msg_on_tabs(options);
        show_msg( $.extend( { target: $("#cytoweb") }, options ) );
    }
    
    function hide_msg_on_all( options ){
        hide_msg_on_tabs(options);
        hide_msg( $.extend( { target: $("#cytoweb") }, options ) );
    }
    
    // Detect flash version
    ////////////////////////////////////////////////////////////////////////////////////////////////
   
    if( !FlashDetect.versionAtLeast(MIN_FLASH_VERSION) ){
        if( $("#content").length > 0 ){
            
            $("#content .left").html('<h1>A newer version of Flash is required to view the demo</h1>\
            <p>You must install <a href="http://get.adobe.com/flashplayer">Flash ' + MIN_FLASH_VERSION + '</a> or newer to view the demo.\
            Please install a newer version of Flash and reload this page.</p>');
            
            $("#content .right").html('<h1>What if my broswer does not support Flash?</h1>\
            <p>Please consider <a href="http://mozilla.com">upgrading your browser</a>.</p>');
        } else {
            show_msg({
                type: "error",
                target: $("body"),
                message: '<a href="http://get.adobe.com/flashplayer">Flash ' + MIN_FLASH_VERSION + '</a> or newer must be installed for this demo to work properly.',
                showCorner: true,
                cornerText: "Back to site" 
            });
        }
        return; // no more demo
    }
   
    // [layout] Layout set up and override
    ////////////////////////////////////////////////////////////////////////////////////////////////
    
    $("body").html('\
                        <div id="header" class="slice">\
                            <a href="/"><div id="logo"></div></a>\
                            <div class="message">\
                                <h2>ISU Cytoscape Plugins | Cytoscape Web Implementation</h2>\
                                <p>Welcome to Cytoscape Web.<br\>\
                                Has been tested to work with Google Chrome and IE 8+. Some features are slow so please be patient\
                                </p>\
                            </div>\
                        </div>\
                        <div id="cytoweb">\
                            <div id="menu"></div>\
                            <div id="cytoweb_container"></div>\
                        </div>\
                        <div id="side">\
                            <ul>\
                                <li><a id="vizmapper_link" href="#vizmapper"><span>Visual style</span></a></li>\
                                <li><a id="filter_link" href="#filter"><span>Filter</span></a></li>\
                                <li><a id="info_link" href="#info"><span>Properties</span></a></li>\
                                <li><a id="node_data" href="#data"><span>Node Data</span></a></li>\
                            </ul>\
                            <div id="side_header" class="ui-layout-header">\
                            </div>\
                            <div id="side_content" class="ui-layout-content">\
                                <div id="vizmapper" class="content"></div>\
                                <div id="filter" class="content"></div>\
                                <div id="info" class="content"></div>\
                                <div id="data" class="content"></div>\
                            </div>\
                        </div>\
    ');
    
    $("#side_content > .content").each(function(){
        var id = $(this).attr("id");
        $("#side_header").append('<div id="' + id + '_header" class="header"></div>');
    });
    
    show_msg({
        type: "loading",
        target: $("body"),
        message: "Please wait a moment while the Cytoscape Web demo loads.  (It's worth the wait.)",
        heading: "Loading",
        showCorner: true,
        cornerText: "Go back",
        cornerLink: "javascript:window.history.back()"
    });
    
    // Flash steals events, and this is a problem with things in the side bar (e.g. resizing).
    // When resizing, for example, Flash will steal the mouse up event needed to finish resizing.
    // So, we put an overlay to get the events, so Flash doesn't steal it.  Show the overlay to
    // prevent event stealing, but hide it when finished or it will block the page.
    $("body").append('<div id="overlay"></div>');

    $("body").addClass("demo");

    var side_min_size = SIDE_BAR_MIN_SIZE;
    var side_max_size = SIDE_BAR_MAX_SIZE;
    var grip_size = SIDE_BAR_RESIZER_GRIP_SIZE;
    var layout = $("body").layout({
       
        defaults: {
            size: "auto",
            resizable: true,
            fxName: "fade",
            fxSpeed: "normal",
            spacing_open: 0,
		    togglerLength_open: 0,
		    contentIgnoreSelector: "span"
        },
        north: {
            paneSelector: "#header"
        },
        center: {
            paneSelector: "#cytoweb"
        },
        east: {
            size: parseInt(SIDE_BAR_START_SIZE),
            paneSelector: "#side",
            minSize: parseInt(side_min_size),
            maxSize: parseInt(side_max_size),
            spacing_open: parseInt(grip_size),
            resizable: true,
            closable: true,
            resizerTip: "",
            onresize_start: function(){
                $("#side").add("#cytoweb").addClass("resizing");
                $("#overlay").show();
                cytoweb_layout.resizeAll();
            },
            onresize_end: function(){
                $("#side").add("#cytoweb").removeClass("resizing");
                $("#overlay").hide();
                cytoweb_layout.resizeAll();
            },
            onresize: function(){
                cytoweb_layout.resizeAll();
            }
        }
    });
    
    $("input[type=button].ui-state-default").live("mouseover", function(){
        $(this).addClass("ui-state-hover");
    }).live("mouseout", function(){
        $(this).removeClass("ui-state-hover");
    });
    
    // Layout options:
    var layout_names = {};
    layout_names["ForceDirected"] = "Force Directed";
    layout_names["Circle"] = "Circle";
    layout_names["Radial"] = "Radial";
    layout_names["Tree"] = "Tree";
    
 
    
//    var edgeFieldsFn = function() {
//	    var edgeAttrList = [""];
//		if(vis != null) {
//			var edgeFields = vis.dataSchema().edges;
//			$.each(edgeFields, function(i, field) {
//				if (field.type === "number") {
//					edgeAttrList.push(field.name);
//				}
//			});
//		}
//		return edgeAttrList;
//    }
    
    var layout_options = {};
    layout_options["ForceDirected"] = [
        { id: "gravitation", label: "Gravitation",       value: -500,   tip: "The gravitational constant. Negative values produce a repulsive force." },
        { id: "mass",        label: "Node mass",         value: 3,      tip: "The default mass value for nodes." },
        { id: "tension",     label: "Edge tension",      value: 0.1,    tip: "The default spring tension for edges." },
        { id: "restLength",  label: "Edge rest length",  value: "auto", tip: "The default spring rest length for edges." },
        { id: "drag",        label: "Drag co-efficient", value: 0.4,    tip: "The co-efficient for frictional drag forces." },
        { id: "minDistance", label: "Minimum distance",  value: 1,      tip: "The minimum effective distance over which forces are exerted." },
        { id: "maxDistance", label: "Maximum distance",  value: 10000,  tip: "The maximum distance over which forces are exerted." },
        { id: "weightAttr",  label: "Weight Attribute",  value: "",  tip: "The name of the edge attribute that contains the weights." },
        { id: "weightNorm",  label: "Weight Normalization", value: ["linear","invlinear","log"],  tip: "How to interpret weight values." },
        { id: "iterations",  label: "Iterations",        value: 400,    tip: "The number of iterations to run the simulation." },
        { id: "maxTime",     label: "Maximum time",      value: 30000,  tip: "The maximum time to run the simulation, in milliseconds." },
        { id: "autoStabilize", label: "Auto stabilize",  value: true,   tip: "If checked, Cytoscape Web automatically tries to stabilize results that seems unstable after running the regular iterations." }
    ];
    layout_options["Circle"] = [
        { id: "angleWidth", label: "Angle width",    value: 360,   tip: "The angular width of the layout, in degrees." },
        { id: "tree",       label: "Tree structure", value: false, tip: "Flag indicating if any tree-structure in the data should be used to inform the layout." }
    ];
    layout_options["Radial"] = [
        { id: "radius",     label: "Radius",      value: "auto", tip: "The radius increment between depth levels." },
        { id: "angleWidth", label: "Angle width", value: 360,    tip: "The angular width of the layout, in degrees." }
    ];
    layout_options["Tree"] = [
        { id: "orientation",  label: "Orientation",   value: ["topToBottom","bottomToTop","leftToRight","rightToLeft"], tip: "The orientation of the layout." },
        { id: "depthSpace",   label: "Depth space",   value: 50, tip: "The space between depth levels in the tree." },
        { id: "breadthSpace", label: "Breadth space", value: 30, tip: "The space between siblings in the tree." },
        { id: "subtreeSpace", label: "Angle width",   value: 5,  tip: "The space between different sub-trees." }
    ];
    
    // create tabs
    $("#side").tabs({
        show: function(event, ui){
            // show header for selected tab
            
            var panel_id = $(ui.panel).attr("id");
            $("#side_header > .header").not("#" + panel_id + "_header").hide();
            
            var header = $("#" + panel_id + "_header");
            if( header.is(":empty") ){
                header.hide();
            } else {
                header.show();
            }
            
            layout.resizeContent("east"); 
        }
    });
  
    // [dispose]
    ////////////////////////////////////////////////////////////////////////////////////////////////
    
    function dispose(){
	    if(vis != null) {
	    	vis.removeListener("select")
	          .removeListener("deselect")  
	    	  .removeListener("click", "nodes")
	          .removeListener("dblClick", "nodes")
	          .removeListener("dblClick", "edges")
	          .removeListener("layout");
	    }
	    //if (default_options) { default_options.visualStyle = undefined; }
    
        $("#NodesAttributeSelection").dialog("close");
        $("#EdgesAttributeSelection").dialog("close");
        $("#stats").dialog("close");
    }
    
    // [open] Create examples and utility function to open new graphs
    ////////////////////////////////////////////////////////////////////////////////////////////////
    var options;
    
    var default_options = {
        layout: "Tree",
        panZoomControlVisible: true,
		edgesMerged: false,
		nodeLabelsVisible: true,
		edgeLabelsVisible: false,
		nodeTooltipsEnabled: true,
		edgeTooltipsEnabled: true,
		swfPath: path("swf/CytoscapeWeb"),
		flashInstallerPath: path("swf/playerProductInstall"),
		preloadImages: true,
		useProxy: false
    };
    
    // example graphs    
    var examples = {
        shapes: {
            name: "Shape example",
            description: "A graph that contains all available node and arrow shapes and all edge styles",
            url: path("file/example_graphs/sample1.graphml"),
            visualStyleName: "Shapes",
            visualStyle: GRAPH_STYLES["Shapes"],
            nodeLabelsVisible: false
        }
    };
    
    // utility for opening a graph
    function open_graph(opt){
    	dispose();
    	
        var description;
        options = $.extend({}, default_options, opt);
        
        if(options.name) {
            description = options.name;
        } else if(options.url){
            var partsOfFile = options.url.split("/");
            description = partsOfFile[partsOfFile.length-1];
        }
        
        // we only need show this msg if the initial one that covers the whole page doesn't exist
        
        hide_msg({
            target: $("body")
        });
        
        if( $("body .screen").length <= 0 ){
            show_msg_on_all({
                type: "loading",
                message: "Please wait while the network data loads.",
                heading: description
            });
        }
        
        vis.addListener("error", onDrawError);
        
        function isXgmml(xml) {
        	return xml.indexOf("</graphml>") === -1 && xml.indexOf("</graph>") > -1;
        }
        
        if( options.url != undefined ) {
            $.ajax({
                url: options.url,
                dataType: "text/plain",
                
                success: function(data){
            		options.network = data;
            		if (isXgmml(options.network)) { options.layout = "Preset"; }
                    vis.draw(options);  
                },
                
                error: function(){
                    hide_msg({ target: $("body") });
                    
                    show_msg({
                        type: "error",
                        target: $("body"),
                        message: "The file you specified could not be loaded.  Please go back to your previous file.",
                        heading: "File not found",
                        showCorner: true,
                        cornerText: "Back to previous file"
                    });
                }
            });
        } else {
        	if (isXgmml(options.network)) { options.layout = "Preset"; }
            vis.draw(options);
        }       
    } 
    
    
    /**
     * Pushes the proper headings onto each list. "id" is set as a displayable heading by default.
     */ 
    function initializeHeadings(){
        // delete anything that was previously in the headings...
        nodeHeadings.length=0;
        edgeHeadings.length=0;
        
        // load the node headings if there are any nodes.
        var nodeList=vis.nodes();
        nodeHeadings.push(new displayableHeadingsMap("id", true));
        for (var n in nodeList){
            for (var heading in nodeList[n].data){
                var newHeading = true;
                for (var dispHeading in nodeHeadings){
                    if (nodeHeadings[dispHeading].heading == heading){
                        newHeading=false;
                        break;
                    }
                }
                if (newHeading){
                    nodeHeadings.push(new displayableHeadingsMap(heading, false));
                }
            }        
        }
        nodeHeadings.sort(sortAlphaId);
        
         // load the edge headings if there are any edges.
        var edgeList=vis.edges();
        edgeHeadings.push(new displayableHeadingsMap("id", true));
        for (var e in edgeList){
            for (var heading in edgeList[e].data){
                var newHeading = true;
                for (var dispHeading in edgeHeadings){
                    if (edgeHeadings[dispHeading].heading == heading){
                        newHeading=false;
                        break;
                    }
                }
                if (newHeading){
                    edgeHeadings.push(new displayableHeadingsMap(heading, false));
                }
            }        
        }
        edgeHeadings.sort(sortAlphaId);
        
        
        /**
         * A comparator which sorts two headings. Priority is given first to the heading which maps to "id"
         * and then alphabetically
         **/ 
        function sortAlphaId(a, b){
            if (a.heading == "id" && b.heading == "id"){
                return 0;
            } else if (a.heading == "id"){
                return -1;
            } else if (b.heading == "id"){
               return 1;
            } else if (a.heading < b.heading) {
               return -1;
            } else if (b.heading < a.heading) {
                return 1;
            } else {
                return 0;
            }
        }
    }
    
    $("*").live("available", function(){
        $(this).data("available", true);
    });
    
    $("*").live("unavailable", function(){
        $(this).removeData("available");
    });
    
    
    
    // Listener for drawing errors:
    function onDrawError(err) {
		hide_msg({ target: $("body") });
        show_msg({
            target: $("#cytoweb_container").add("#side"),
            type: "error",
            heading: err.value.name,
            message: err.value.msg + ( err.value.id != undefined ? " (id = " + err.value.id + ")" : "" )
        });
        show_msg({
            target: $("#side"),
            type: "info",
            heading: "Area unavailable",
            message: "This area is unavailable when the graph file can not be loaded."
        });
        vis.removeListener("error", onDrawError);
	}
    
    // create cytoweb
    vis = $("#cytoweb_container").cytoscapeweb(default_options);

    // call back for when the graph is opened and fully loaded
    vis.ready(function(){
    	vis.removeListener("error", onDrawError);
        $("#cytoweb_container").trigger("available");
        initializeHeadings();
    });
    
    create_menu();
    
    $(window).trigger("resize");
    
    create_open();
    
    create_save();
  
    
    $("#cytoweb_container").bind("available", function(){
    	dirty_attributes_cache();

        update_background();
        update_menu();
        update_info();
//        update_vizmapper(); // lazy initialization, instead...
        update_filter();
        dirty_vizmapper();

        hide_msg({
            type: "loading",
            target: $("body")
        });
        
        //$("#vizmapper_link").click();
        $("#examples_link").click();
        
        $(window).trigger("resize");

        var style = vis.visualStyle();
        
        // Let's simplify the style and make the creation of the visual styles tab faster.
        // It just removes discrete mappers that have the same value for all elements,
        // and sets that value as default.
//        for (var group in style) {
//        	if (group === "nodes" || group === "edges") {
//        		var props = style[group];
//        		
//        		for (var pname in props) {
//        			var p = props[pname];
//        			
//        			if (p.hasOwnProperty("discreteMapper")) {
//        				var entries = p.discreteMapper.entries;
//        				var value, same = true;
//        				
//        				$.each(entries, function(i, e) {
//        					if (i === 0) {
//        						value = e.value;
//        					} else if (value != e.value) {
//        						same = false;
//        						return false;
//        					}
//        				});
//        				
//        				if (same) {
//        					props[pname] = value; 
//        				}
//        			}
//        		}
//        	}
//        }
        
        // TODO: remove this workaround! After opening an XGMML net, loading graphml does not apply correct styles
        vis.visualStyle(style);
    });
    
    // open the first example
    open_graph(examples["shapes"]);
 

    // [settings] Layout settings
    ////////////////////////////////////////////////////////////////////////////////////////////////
    
    function create_settings_panel(layout_id){
    	var opt = layout_options[layout_id];
    	var panel = ('<div id="'+layout_id+'" class="content ui-widget-content"><table>');

    	for(var i in opt) {
    		var o = opt[i];
    		var v = o.value;
    		panel += '<tr title="'+o.tip+'">';

    		if (typeof v === "function") { v = v(); }

    		if (typeof v === "object") {
    			panel += ('<td align="right"><label>'+o.label+' </label></td><td><select id="'+o.id+'" size="1">');
    			for(var j in v) { panel += ('<option value="'+v[j]+'">'+v[j]+'</option>'); }
    			panel += '</select></td>'
    		} else if (typeof v === "boolean") {
    			panel += ('<td align="right"><label>'+o.label+' </label></td><td align="left"><input type="checkbox" id="'+o.id+'" value="'+v+'"'+(v?' checked="checked"':'')+'/></td>');
    		} else {
    			panel += ('<td align="right"><label>'+o.label+' </label></td><td><input type="text" id="'+o.id+'" value="'+v+'"/></td>');
    		}
    		
    		panel += "</tr>";
    	}
    	
    	panel += "</table></div>";
    	
    	return $(panel);
    }
    
    function open_node_graph(){
        if($("#graphs").length==0){
            var dialog = '\
                <div id="graphs" title="Load Node Graphs">\
                    <div class="dialog ui-widget">\
                        <ul></ul>\
                        <div class="ui-layout-content"/>\
                    </div>\
                    <span class="footer"><input type="button" id="ok_button" class="ui-state-default" value="OK"/></span>\
                </div>\
                    ';
        }
        
        $("#ok_button").click(function(){
            $(this).dialog("close");
        });
        $("body").append(dialog);
        $("#graphs").dialog({ autoOpen: false, resizable: false, width: 300 });
        $("#graphs").dialog("open");
    }
    
    
    function open_stats(){
        var all_nodes = vis.nodes().length;
        var all_edges = vis.edges().length;
        var timeNow = new Date();
        timeNow = timeNow.getMinutes();
        if($("#stats").length == 0) {
            var dialog = '\
                <div id="stats" title="Current Graph Stats">\
                    <div class ="tabs ui-widget">\
                        <ul></ul>\
                        <div class="ui-layout-content"/>\
                    </div>\
                    </br>\
                    Current # of Nodes: <span id="all_nodes_id">'+all_nodes+'</span><br/><br/>\
                    Current # of Edges: <span id="all_edges_id">'+all_edges+'</span><br/><br/>\
                    <span class="footer"><center><input type="button" id="recalculate_stats" class="ui-state-default" value="Recalculate Stats"/></center></span>\
                </div>\
                ';
            $("body").append(dialog);
            $("#stats").dialog({ autoOpen: false, resizable: false, width: 300 });
        }
        $("#recalculate_stats").click();
        $("#recalculate_stats").click(function(){
            all_nodes = vis.nodes().length;
            all_edges = vis.edges().length;
            document.getElementById("all_nodes_id").innerHTML = all_nodes;
            document.getElementById("all_edges_id").innerHTML = all_edges;
        });
        
        $("#stats").dialog("open");
    }
    
    function open_settings(){
	    if ($("#settings").length === 0) {
			var dialog = '\
				<div id="settings" title="Layout Settings">\
					<div class="tabs ui-widget">\
						<ul></ul>\
						<div class="ui-layout-content"/>\
					</div>\
					<div class="footer"><input type="button" id="execute_layout" class="ui-state-default" value="Execute Layout"/></div>\
				</div>\
				';

			$("body").append(dialog);
				
			for(var i in layout_names) {
	            var layout_id = i;
	            var layout_name = layout_names[layout_id];
	            var panel = create_settings_panel(layout_id);
	            $("#settings .tabs ul").append('<li><a href="#'+layout_id+'">' + layout_name + '</a></li>');
	            $("#settings .tabs > .ui-layout-content").append(panel);
	        }
				
			$("#settings .tabs").tabs().addClass('ui-tabs-vertical ui-helper-clearfix');
			$("#settings .tabs li").removeClass('ui-corner-top').addClass('ui-corner-left');
			
			$("#execute_layout").click(function(){
				var layout_id = $("#settings .ui-tabs-selected a").attr("href").replace("#", "");
				var options = {};
				var def = layout_options[layout_id];
				
				for(var i in def) {
					var o = def[i];
		    		var v, id = o.id;
		    		var input = $("#settings #"+layout_id+" #"+id);
		    		v = input.val();
		    		if (input.attr("type") === "checkbox") { v = input.is(":checked"); }
		    		else if (typeof o.value === "number") { v = Number(v); }
		    		options[id] = v;
		    	}
				vis.layout({ name: layout_id, options: options });
			});
			
			$("#settings").dialog({ autoOpen: false, resizable: false, width: 450 });
		}
	    $("#settings").dialog("open");
    }
    
    
    // [menu] Create the menu above Cytoscape Web
    ////////////////////////////////////////////////////////////////////////////////////////////////
    
    // Update the menu after the graph has loaded
    function create_menu(){
        $("#menu").children().remove(); // remove old menu if needed (we don't want two after a redraw)
        $("#menu").append(      '<ul>\
                                    <li><label>File</label>\
                                        <ul>\
                                            <li id="open_file"><label>Open File</label><span id="file_importer"></span></li>\
                                            <li id="open_node_data"><label>Open Node Data</label><span id="flashImporterLoad"></span></li>\
                                            <li id="save_file"><label>Save File</label></li>\
                                            <li id="load_server_data"><label>Load from PLEXdb</label></li>\
                                        </ul>\
                                    </li>\
                                    \
                                    <li id="style_menu"><label>Style</label>\
                                        <ul>\
                                            <li id="merge_edges" class="ui-menu-checkable"><label>Merge edges</label></li>\
                                            <li id="show_node_labels" class="ui-menu-checkable"><label>Show node labels</label></li>\
                                            <li id="show_edge_labels" class="ui-menu-checkable"><label>Show edge labels</label></li>\
                                            <li id="show_node_graph" class="ui-menu-checkable"><label>Show node graphs</label></li>\
                                            <li id="show_node_color" class="ui-menu-checkable"><label>Show node color vis</label></li>\
                                            <li>\
                                                <label>Visualisation</label>\
                                                <ul id="visual_style" class="ui-menu-one-checkable">\
                                                </ul>\
                                            </li>\
                                        </ul>\
                                    </li>\
                                    \
                                    <li id="select_menu"><label>Select</label>\
                                        <ul>\
                                            <li>\
                                                <label>Nodes</label>\
                                                <ul id="select_node_menu">\
                                                    <li id="all_nodes"><label>Select all Nodes\t\t\t\t<font color="#736F6E">Ctrl+A</font></label></li>\
                                                    <li id="deselect_all_nodes"><label>Deselect all Nodes\t\t\t<font color="#736F6E">Ctrl+Shift+A</font></label></li>\
                                                    <li id="first_neighbor"><label>First Node Neighbor\t\t\t<font color="#736F6E">Ctrl+6</font></label></li>\
                                                    <li id="invert_node"><label>Invert Node Selection\t\t\t<font color="#736F6E">Ctrl+I</font></label></li>\
                                                    <li id="select_by_edges"><label>Select Nodes by Selected Edges <font color="#736F6E">Ctrl+7</font></label></li>\
                                                    <li id="select_by_name"><label>Select Nodes by Name\t\t <font color="#736F6E">Ctrl+F</font></label></li>\
                                                    <li id="show_all_nodes"><label>Show all Nodes\t\t\t\t <font color="#736F6E">Ctrl+Shift+H</font></label></li>\
                                                    <li id="hide_all_nodes"><label>Hide all Nodes\t\t\t\t <font color="#736F6E">Ctrl+H</font></label></li>\
                                                </ul>\
                                            </li>\
                                            \
                                            <li>\
                                                <label>Edges</label>\
                                                <ul id="select_edge_menu">\
                                                    <li id="all_edges"><label>Select All Edges\t\t\t<font color="#736F6E">Alt+A</font></label></li>\
                                                    <li id="deselect_all_edges"><label>Deselect all Edges\t\t<font color="#736F6E">Alt+Shift+A</font></label></li>\
                                                    <li id="invert_edges"><label>Invert Edge Selection\t\t<font color="#736F6E">Alt+I</font></label></li>\
                                                    <li id ="show_all_edges"><label>Show all Edges\t\t\t<font color="#736F6E">Alt+Shift+H</font></label></li>\
                                                    <li id ="hide_all_edges"><label>Hide all Edges\t\t\t<font color="#736F6E">Alt+H</font></label></li>\
                                                </ul>\
                                            </li>\
                                            <li id="everything"><label>Select All\t\t   <font color="#736F6E">Ctrl+Alt+A</font></label></li>\
                                            <li id="nothing"><label>Deselect All\t   <font color="#736F6E">Ctrl+Alt+Shift+A</font></label></li>\
                                        </ul>\
                                    </li>\
                                    \
                                    <li id="layout_menu"><label>Layout</label>\
                                        <ul>\
                                            <li id="recalculate_layout"><label>Recalculate layout \t\t<font color="#736F6E">Ctrl+R</font></label></li>\
                                            <li>\
                                                <label>Mechanism</label>\
                                                <ul id="layout_style" class="ui-menu-one-checkable">\
                                                </ul>\
                                            </li>\
                                            <li id="layout_settings"><label>Settings... \t\t\t<font color="#736F6E">Ctrl+Shift+S</font></label></li>\
                                            <li id="graph_stats"><label>Graph Stats</label></li>\
                                    		<li id="dbl_to_zoom" class="ui-menu-checkable"><label>Double Click to Zoom \t<font color="#736F6E">Ctrl+D</font></label></li>\
                                            <li id="popout"><label>Popout Node Data \t\t<font color="#736F6E">Ctrl+P</font></label></li>\
                                        </ul>\
                                    </li>\
                                    \
                                </ul>\
                                ');

        // add layouts to menu
        for(var i in layout_names) {
            var layout_id = i;
            var layout_name = layout_names[layout_id];
            $("#layout_style").append("<li class=\"ui-menu-checkable\" layout_id=\"" + layout_id + "\"><label>" + layout_name + "</label></li>");
        }
        
        // add visual styles to menu (styles predefined in demo_styles.js)
        var viss = GRAPH_STYLES;
        $("#visual_style").append("<li class=\"ui-menu-checkable\" id=\"custom_visual_style\"><label>Custom</label></li>");
        for(var i in viss){
            var vis_name = i;
            var vis = viss[i];
            $("#visual_style").append("<li class=\"ui-menu-checkable\"><label>" + vis_name + "</label></li>");
        } 
               
        // create the menu and add handlers for when items 
        $("#menu").menu({
        	menuItemMaxWidth: 180,
            onMenuItemClick: function(li){
                switch( li.attr("id") || li.parent().attr("id") ) {
                case "layout_style":
                	$("#cytoweb_container").cw().layout( li.attr("layout_id") );
                    break;
                    
                case "visual_style":
                	$("#cytoweb_container").cw().visualStyle( viss[ li.text() ] );
                    update_background();
                    
                    show_msg_on_tabs({
                        type: "loading",
                        message: "Please wait while the style is updated."
                    });            
                    
                    $.thread({
                        worker: function(params){
                            update_vizmapper();
                            
                            hide_msg_on_tabs({
                                type: "loading"
                            });
                        }
                    });
                    break;
                
                case "recalculate_layout":
                	var layout = $("#cytoweb_container").cw().layout();
                	$("#cytoweb_container").cw().layout(layout);
                    break;
                    
                case "layout_settings":
                	open_settings();
                	break;
                
                case "graph_stats":
                    open_stats();
                    break;
                
                case "all_nodes":
                    $("#cytoweb_container").cw().select("nodes");
                    break;
                    
                case "hide_all_nodes":
                    $("#cytoweb_container").cw().filter("nodes", function(node){
                        return false;
                     });
                    break;
                    
                case "show_all_nodes":
                    $("#cytoweb_container").cw().filter("nodes", function(node){
                        return true;
                    });
                    for(var i in hidden_nodes){
                        hidden_nodes[i] = null;
                    }
                    break;
                    
                case "hide_all_edges":
                    $("#cytoweb_container").cw().filter("edges", function(edge){
                        return false;
                    });
                    break;
                
                case "show_all_edges":
                    $("#cytoweb_container").cw().filter("edges", function(edge){
                        return true;
                    });
                    for(var i in hidden_edges){
                        hidden_edges[i] = null;
                    }
                    break;
                
                case "deselect_all_nodes":
                    $("#cytoweb_container").cw().deselect("nodes");
                    break;
                
                case "all_edges":
                    $("#cytoweb_container").cw().select("edges");
                    break;
                    
                case "deselect_all_edges":
                    $("#cytoweb_container").cw().deselect("edges");
                    break;
                    
                case "everything":
                    $("#cytoweb_container").cw().select();
                    break;
                
                case "nothing":
                    $("#cytoweb_container").cw().deselect();
                    break;
                    
                case "invert_node":
                    invert_node_selection("nodes");
                    break;
                    
                case "invert_edges":
                    invert_node_selection("edges");
                    break;
                
                case "first_neighbor":
                    find_first_neighbor();
                    break;
                
                case "select_by_edges":
                    select_by_edges();
                    break;
                    
                case "select_by_name":
                    select_by_name();
                    break;
                    
                case "popout":
                    popout();
                    break;
                    
                 case "load_server_data":
                    prompt_species();
                    break;
                    
                }
            },
       
            onMenuItemCheck: function(li){
                switch( li.attr("id") ) {
                case "show_node_labels":
                	$("#cytoweb_container").cw().nodeLabelsVisible(true);
                    break;
                case "show_edge_labels":
                	$("#cytoweb_container").cw().edgeLabelsVisible(true);
                	break;
                case "merge_edges":
                	$("#cytoweb_container").cw().edgesMerged(true);
                    break;
                case "show_node_graph":
                    open_node_graph();
                    node_graphs();
                    break;
                case "show_node_color":
                    node_color();
                    break;
				case "dbl_to_zoom":
					dbl_to_zooom = 1;
					break;
                }
            },
            
            onMenuItemUncheck: function(li){
                switch( li.attr("id") ) {
                case "show_node_labels":
                	$("#cytoweb_container").cw().nodeLabelsVisible(false);
                    break;
                case "show_edge_labels":
                	$("#cytoweb_container").cw().edgeLabelsVisible(false);
                	break;
                case "merge_edges":
                	$("#cytoweb_container").cw().edgesMerged(false);
                    break;
                case "show_node_color":
                    remove_node_color();
                    break;
                case "show_node_graph":
                    remove_node_graphs();
                    break;
				case "dbl_to_zoom":
					dbl_to_zooom = 0;
					break;
                }
            }
        });
        
        $("#save_file").click(function(){
            show_save_menu();
        });
        
        // menu should not span
        var last_top_lvl_item = $("#menu > ul > li:last");
        $("#menu").css( "min-width", last_top_lvl_item.offset().left + last_top_lvl_item.outerWidth(true) );
        
        
        $("#hide_all_edges").bind("mouseover", function(){
           $.tooltip.show();
        });
        $("#hide_all_edges").bind("mouseout", function(){
            $.tooltip.hide();
        });
    }
    
    
    function create_open(){
        var options = {
                swfPath: path("swf/Importer"),
                flashInstallerPath: path("swf/playerProductInstall"),
                data: function(data){
        			var network = data.string;
					var new_graph_options = {
						network: network,
					    name: data.metadata.name,
					    description: "",
					    visualStyle: GRAPH_STYLES["Cytoscape"],
					    nodeLabelsVisible: true
					};

					open_graph(new_graph_options);
				},
	            ready: function(){
	                $("#open_file").trigger("available");
	            },
	            typeFilter: function(){
	                return "*.graphml;*.xgmml;*.xml;*.sif";
	            },
	            binary: function(metadata){
	            	return false; // to return data.string and not data.bytes
	            	// TODO: if CYS support, check metadata.name.indexOf(".cys")
	            }
            };
        new org.cytoscapeweb.demo.Importer("file_importer", options);
    }
    
    function show_save_menu(){
        hide_msg_on_tabs({
            type: "info"
        });
        
        show_msg_on_tabs({
            type: "info",
            message: "This area will be available again when you finish up saving and go back to the network."            
        });
        
        $("#cytoweb_container").children().not(".save_screen").addClass("hidden");
        $("#cytoweb").find(".save_screen").removeClass("hidden");
    }
    
    function hide_save_menu(){
        $("#cytoweb_container").children().not(".save_screen").removeClass("hidden");
        $("#cytoweb").find(".save_screen").addClass("hidden");

        hide_msg_on_tabs({
            type: "info"
        });
    }
    
    function create_save(){
        var parent = $("#cytoweb");
    
        function default_file_name(extension){
            var d = new Date();
            
            function pad(num){
                if( num < 10 ) {
                    return "0" + num;
                }
                return num;
            }
            
            return "network_" + d.getFullYear() + "." + pad(d.getMonth()+1) + "." + pad(d.getDay()) + "_" + pad(d.getHours()) + "." + pad(d.getMinutes()) + "." + extension;
        }
        
        
        parent.find(".save_screen").remove();
        parent.append("\
            <div class=\"save_screen\">\
                <div class=\"corner\"><span>Back to network</span><div class=\"icon\"></div></div>\
                <div class=\"selections\">\
                    <div class=\"description\">Select a file type to save your file.</div>\
                    <h2>Network Data</h2>\
                    <div class=\"data_formats\"></div>\
                    <h2>Image</h2>\
                    <div class=\"image_formats\"></div>\
                </div>\
            </div>");
        
        parent.find(".save_screen").find(".corner").click(function(){
            hide_save_menu();
        });
        
        function hide(){
            parent.find(".save_screen").addClass("hidden");
            
            show_msg({
                type: "loading",
                target: parent,
                message: "Please wait while your file is prepared.",
                heading: "Preparing"
            });
        }
        
        function show(){
            parent.find(".save_screen").removeClass("hidden").fadeIn();
            
            hide_msg({
                target: parent
            });
        }

        function make_selection(fn, title, description, isImage, binary){
        	var id = "exporter_" + fn;
        	var containerClass = isImage ? ".image_formats" : ".data_formats";
        	
        	parent.find(".save_screen").find(containerClass).append("\
                <div class=\"selection\" id=\"save_" + fn + "\">\
                    <div class=\"icon\"></div>\
                    <div class=\"description\"><label>" + title + "</label>\
                        <span>" + description + "</span></div>\
                    <div id=\""+id+"\"></div>\
                </div>\
            ");
            
            var options = {
                    swfPath: path("swf/Exporter"),
                    flashInstallerPath: path("swf/playerProductInstall"),
                    base64: binary,
                	data: function(){
                		return vis[fn]();
                    },
                    fileName: function() {
                    	return default_file_name(fn);
                    },
		            ready: function() {
		            	$("#"+id).trigger("available");
                    }
                };
                
            new org.cytoscapeweb.demo.Exporter(id, options);
        }
        
        make_selection(
            "xgmml",
            "XGMML",
            "eXtensible Graph Markup and Modeling Language",
            false
        );
        make_selection(
            "graphml",
            "GraphML",
            "Graph Markup Language",
            false
        );
        make_selection(
    		"sif",
    		"SIF",
    		"Simple Interaction Format",
    		false
        );
        make_selection(
            "svg",
            "SVG",
            "Vector Image",
            true
        );
        make_selection(
    		"pdf",
    		"PDF",
    		"Vector Image",
    		true,
    		true
        );
        make_selection(
    		"png",
    		"PNG",
    		"Bitmap Image",
    		true,
    		true
        );
        
        hide_save_menu();
    }
    
    
    function update_menu(){
        // add initial state of check marks
        var check = {};
        check["merge_edges"] = vis.edgesMerged();
        check["show_node_labels"] = vis.nodeLabelsVisible();
        check["show_edge_labels"] = vis.edgeLabelsVisible();
        
        for( var i in check ){
            var id = i;
            var checked = check[i];
            
            if(checked) {
                $("#" + id).find(".ui-menu-check-icon").addClass("ui-menu-checked");
            } else {
                $("#" + id).find(".ui-menu-check-icon").removeClass("ui-menu-checked");
            }
        }
        
        // add initial state of one check marks
        $("#layout_style").find(".ui-menu-check-icon").removeClass("ui-menu-checked");
        
        var layout = vis.layout();
        $("#layout_style").find("[layout_id=" + layout.name + "]").find(".ui-menu-check-icon").addClass("ui-menu-checked");
     
        $("#visual_style").find(".ui-menu-check-icon").removeClass("ui-menu-checked");
        $("#visual_style").find("li:contains(" + options.visualStyleName + ")").find(".ui-menu-check-icon").addClass("ui-menu-checked");
        
        $("#menu").trigger("available");
    }
    
    // [cytoweb] Cytoscape Web area
    ////////////////////////////////////////////////////////////////////////////////////////////////
    
    // recalculate cytoweb layout
    
    var cytoweb_layout = $("#cytoweb").layout({
        defaults: {
            size: "auto",
            resizable: true,
            fxName: "slide",
            fxSpeed: "normal",
            spacing_open: 0,
            togglerLength_open: 0
        },
        
        north: {
            paneSelector: "#menu",
            showOverflowOnHover: true
        },
        
        center: {
            paneSelector: "#cytoweb_container"
        }
    });
    
   
    // update background to match cytoweb component
    function update_background(){
        $("#cytoweb").css("background-color", vis.visualStyle().global.backgroundColor );
    }
    

    //  [info] for selected objects
    ////////////////////////////////////////////////////////////////////////////////////////////////
   
    
    // Update the info tab with selection information after the graph has loaded
    function update_info(){
      
        update();
        updateContextMenu();
      
        vis.addListener("select", function(){
            setTimeout(function(){
                if (findingPath){
                    vis.select(nodesToSelect);
                    findingPath=false;
                    nodesToSelect.length = 0; // empty...don't want to reselect
                }
          	  update_with_loader();
      		  updateContextMenu();
                highlight_selected();
      	  }, LISTENER_DELAY);
        })
        .addListener("deselect", function(){
      	  setTimeout(function(){
      		  update_with_loader();
                updateContextMenu();
                dehighlight_selected();
      	  }, LISTENER_DELAY);
        })
        .addListener("dblClick", "nodes", function(){
            $("#info_link").click();
            if(dbl_to_zooom == 1){
                var node_to_zoom = vis.selected("nodes");
                vis.filter("nodes", function(node){
                    return node.data.id == node_to_zoom[0].data.id;
      	      });
                vis.panToCenter();
                vis.zoom(300);
                vis.filter("nodes", function(node){
                    return true;
  		      }); 
  		  }
        })
        .addListener("dblClick", "edges", function(){
            $("#info_link").click();
        })
        .addListener("layout", function(evt){
      	  $("#layout_style .ui-menu-check-icon").removeClass("ui-menu-checked");
      	  $("#layout_style .ui-menu-checkable[layout_id="+evt.value.name+"] .ui-menu-check-icon").addClass("ui-menu-checked");
        });
      
        var _srcId;
        function clickNodeToAddEdge(evt) {
            if (_srcId != null) {
          	  vis.removeListener("click", "nodes", clickNodeToAddEdge);
          	  if (vis.node(_srcId)) {
          		  vis.addEdge({ source: _srcId, target: evt.target.data.id }, true);
          		  dirty_graph_state();
          		  update_with_loader();
          	  }
          	  _srcId = null;
            }
        }
  	
  	
        /**
        * Listener called when the user clicks to find the shortest path. Calculates the shortest path,
        * lets the select listener know that a path is being found, and stores the path
        * Uses a BFS algorithm for unweighted graphs from 
        * http://faculty.simpson.edu/lydia.sinapova/www/cmsc250/LN250_Weiss/L21-MinPath.htm
        */ 
        function clickNodeToFindPath(evt){
            // since we can't highlight in this method (select will override), let the select listener
            // know that we don't want to click the node just selected....
            findingPath = true;
          
            // remove the listener else it keeps asking to click...
     	   vis.removeListener("click", "nodes", clickNodeToFindPath);
     	   // get the source and the target node...
     	   var targetNode=evt.target;
     	   var srcNode=vis.node(_srcId);
          
     	   _srcId=null;
          
            // find the shortest path from the source node to the target node,
            // and highlight that path....BFS algorithm
            var allNodes = vis.nodes();
          
            // A queue of unexamined nodes...the source node will be initally stored
            var unexamined_q = new Array();
          
           /**
            * An object which maps a node to a distance and a previous node.
            */ 
            nodesInfo = function(n, d, p){
                this.node = n; // this node
                this.distance = d; // distance to this node
                this.previous = p; // previous node
            };
          
            // set the distance to all vertices to infinity, and the distance to the
            // source node to 0
            var dist = new Array();
            for (var i in allNodes){
                if (allNodes[i].data.id === srcNode.data.id){
                    var srcInfo = new nodesInfo(allNodes[i], 0, undefined); 
                    dist[i]= srcInfo;
                    unexamined_q.push(srcInfo);
                } else {
                    dist[i]= new nodesInfo(allNodes[i], Infinity, undefined);
                }
            }
          
            var edges=vis.edges();
          
            // while there are still nodes in the queue
            while (unexamined_q.length != 0){
                // pop the next node
                var current=unexamined_q.pop();
                // get the adjacent nodes of current
                var adj_nodes=new Array();
              
                for (var i in edges){
                    if (edges[i].data.source==current.node.data.id){
                        var nodeFromId = vis.node(edges[i].data.target);
                        adj_nodes.push(nodeFromId);
                    }
                }
              
                var targetPathFound = false;
                // for each adjacent node,
                for (var i in adj_nodes){
                    // if the distance to the adjacent node in infinite,
                    //   1) make the distance to the adjacent vertex = current distance + 1
                    //   2) make path to the adjacent node equal to the current node
                    //   3) append the adjacent node to the queue
                    for (var j in dist){
                        if (dist[j].node.data.id == adj_nodes[i].data.id){
                            if (dist[j].distance === Infinity){
                                dist[j].distance = current.distance + 1; // 1)
                                dist[j].previous = current; //2)
                                if (adj_nodes[i].data.id == targetNode.data.id){
                                    targetPathFound = true;
                                    break;
                                }           
                                unexamined_q.push(dist[j]);//3)   
                            }
                            break; //adjacent node found, no need to keep searching
                        }
                    }
                    if (targetPathFound){
                        break;
                    }
                }
                if (targetPathFound){
                    break;
                }
            }
          
            // get the path from the target node to the source node and highlight it
            var targetInfo;
            for (var i in dist){
                if (dist[i].node.data.id === targetNode.data.id){
                    targetInfo = dist[i];
                }
            }
          
            // highlight all previous nodes, put in "global" variable
            nodesToSelect.push(targetInfo.node);
            var prevNode=targetInfo.previous;
            while (prevNode){
                nodesToSelect.push(prevNode.node);
                prevNode=prevNode.previous;
            } 
          
            var edgesToSelect = new Array();
            // go through each edge. if it's source and target is found in the nodes
            // to add, push it onto edges to add
            for (var k in edges){
                var sourceFound = false;
                var targetFound = false;
                for (var m in nodesToSelect){ 
                    if (edges[k].data.source == nodesToSelect[m].data.id){
                        sourceFound = true;
                    }
                    if (edges[k].data.target == nodesToSelect[m].data.id) {
                        targetFound = true;
                    }
                }
                if (sourceFound && targetFound){
                    edgesToSelect.push(edges[k]);
                }
            }
            for (var k in edgesToSelect){
                nodesToSelect.push(edgesToSelect[k]);
            }
        }
        
        function update(){
            var edges = vis.selected("edges");
            var nodes = vis.selected("nodes");
            var container = $("#info");
          
            container.html(""); // clear info area
          
            /**
             * Prints selected nodes in properties tab
             * @typeStr "Nodes" or "Edges" --> whether to print the nodes or the edges
             */ 
            function print_selection(typeStr){          
                // the name for the label
                var name = typeStr;
                // the tag to put the table in
                var id;
                
                if (typeStr === "Nodes"){
                    id = "nodes_data_table";
                } else if (typeStr === "Edges"){
                    id = "edges_data_table";
                }
                
                // create the space for the properties display
  		      var half = $('<div class="half"></div>');
                container.append(half);
                var section = $('<div class="section"></div>');
                half.append(section);
                section.append('<div class="title_line"><label class="title">' + name + '</label></div>');
                
                // create the button which allows users to select what attributes to display
                
                section.append('<button id="display' + name + 'Attribute" type="button">Select Attributes</button>');
                section.append('<button id="add' + name + 'Attribute" type="button">Add Attributes</button>');
                section.append('<button id="delete' + name + 'Attribute" type="button">Delete Attributes</button>');
                
                section.append('<div id="' + id + '_holder"></div>'); // placement div to hold the table
                
                $("#delete" + name + "Attribute").click(function(){
                    // close select attribute dialog box and add attribute dialog box if they're open. Else things can get messy.
                    $("#NodesAttributeSelection").dialog("close");
                    $("#EdgesAttributeSelection").dialog("close");
                    $("#createNodesAttributeDialog").dialog("close");
                    $("#createEdgesAttributeDialog").dialog("close");
                    
                    
                    // open dialog box
                    if ($("#delete" + name + "AttributeDialog").length === 0){
                        var dialog = '\
                                <div id="delete' + name + 'AttributeDialog" title="Delete ' + name.substring(0, name.length - 1) + ' Attributes">\
                                    <div id="delete' + name + 'checkboxes" style="height:250px;overflow:scroll">\
                                    </div>\
                                    <br />\
                                    <div id="deleteAttributeButtonDiv">\
                                        <button type="button" id="delete' + name + 'AttributeButton">Delete</button>\
                                    </div>\
                                </div>';
                                
                        $("body").append(dialog);
                    }
            
                    // display all attributes from appropriate headings with checkboxes
                    $("#delete" + name + "checkboxes").html("");
                    var checkboxStr = "";
                    var headingsMap;
                    if (name === "Nodes"){
                        headingsMap = nodeHeadings;
                    } else if (name === "Edges"){
                        headingsMap = edgeHeadings;
                    }
                    
                    for (var i in headingsMap){
                        if (headingsMap[i].heading != "id" && headingsMap[i].heading != "source" && headingsMap[i].heading != "target"){
                            checkboxStr += '<input value="' + headingsMap[i].heading + '" class="attributeDeletionBox" id="delete_' + i + '" type="checkbox"/> ' + headingsMap[i].heading + '<br />';
                        }
                    }
                    $("#delete" + name + "checkboxes").html(checkboxStr);
                    
                    // on delete click, make list of all checked, remove heading from each node and from headingsMap
                    $("#delete" + name + "AttributeButton").click(function(){
                        // get a list of all the headings that have been checked for deletion
                        var checkboxes = $(".attributeDeletionBox");
                        var checked=[]; // array of headings that have been checked.
                        for (var i = 0; i < checkboxes.length; i++){
                            if (checkboxes[i].checked){
                                checked.push(checkboxes[i].value);
                            }
                        }
                        
                        // for each heading, remove the heading from the headingsMap and from each node/edge in the graph
                        for (var i in checked){
                            var toDelete = checked[i];
                            for (var j in headingsMap){
                                if (headingsMap[j].heading == toDelete){
                                    delete headingsMap[j];
                                    break;
                                }
                            }
                          
                            vis.removeDataField(name.toLowerCase(), toDelete);
                
                        }
                        $("#delete" + name + "AttributeDialog").dialog("close");
                        create_table(name);                        
                    });
                    
                    // open the dialog
                    $("#delete" + name + "AttributeDialog").dialog({ autoOpen: false, resizable: false, width: 300 });
                    $("#delete" + name + "AttributeDialog").dialog("open");
                });
                 
                $("#add" + name + "Attribute").click(function(){
                    // close add attribute and select attribute dialog if they're open...else things can get messy...
                    $("#deleteNodesAttributeDialog").dialog("close");
                    $("#deleteEdgesAttributeDialog").dialog("close");
                    $("#NodesAttributeSelection").dialog("close");
                    $("#EdgesAttributeSelection").dialog("close");
                    
                    // create dialog with 3 radio buttons for type of attribute -- boolean, number, string
                    if ($("#create" + name + "AttributeDialog").length == 0){
                        var dialog = '\
                            <div id="create' + name + 'AttributeDialog" title="Add ' + name.substring(0, name.length - 1) + ' Attribute">\
                                <div id="addAttributeRadioDiv' + name + '">\
                                </div>\
                                <div id="addAcceptButtonDiv' + name + '" >\
                                </div>\
                            </div>\
                            ';
                    
                        $("body").append(dialog);
                    }
                    
                    $("#addAttributeRadioDiv" + name).html('\
                        What type of attribute? <br />\
                        <input type="radio" class="rb_attributeType' + name +'" id="addNumberRb' + name + '" name="attributeType" /> Number <br />\
                        <input type="radio" class="rb_attributeType' + name +'" id="addStringRb' + name + '" name="attributeType" /> String <br />\
                        <input type="radio" class="rb_attributeType' + name + '" id="addBooleanRb' + name +'" name="attributeType" /> Boolean <br />\
                        <input type="radio" class="rb_attributeType' + name + '" id="addIntRb' + name + '" name="attributeType" /> Int <br />\
                    ');
                    
                    $("#addAcceptButtonDiv" + name).html('\
                        <button type="button" disabled="disabled" id="addAcceptButton' + name + '">OK</button>\
                    ');
                    
                    $(".rb_attributeType"+ name).change(function(){
                        document.getElementById("addAcceptButton" + name).disabled=false;
                        $(".rb_attributeType" + name).unbind(); // no point in keeping the listener around
                    });
                
                    // after choosing, prompt for name of new attribute, error if attribute already exists
                    $("#addAcceptButton" + name).click(function(){
                        var value;
                        if ($("#addNumberRb" + name)[0].checked){
                            value="number";
                        } else if ($("#addStringRb" + name)[0].checked){
                            value="string";
                        } else if ($("#addBooleanRb" + name)[0].checked){
                            value="boolean";
                        } else if ($("#addIntRb" + name)[0].checked){
                            value="int";
                        }
                        
                        $("#addAttributeRadioDiv" + name).html('\
                            Please enter new attribute name: <br />\
                            <input id="newAttributeNamePrompt' + name + '" type="text" />\
                        ');
                        
                        $("#addAcceptButton" + name).unbind(); // no longer getting radio button input
                        
                        // if there is text in the box, allow the user to press okay. disable the box when empty.
                        document.getElementById("addAcceptButton" + name).disabled=true;
                        $("#newAttributeNamePrompt" + name).keyup(function(){
                            var userText=document.getElementById("newAttributeNamePrompt" + name).value;
                            if (userText){
                                document.getElementById("addAcceptButton" + name).disabled=false;
                            } else {
                                document.getElementById("addAcceptButton" + name).disabled=true;
                            }
                        });
                        
                        $("#addAcceptButton" + name).click(function(){

                            var userText=document.getElementById("newAttributeNamePrompt" + name).value;
                            // check if that attribute name is being used
                            var headingFound = false;
                            var headingsMap;
                            if (name == "Nodes"){
                                headingsMap = nodeHeadings;
                            } else if (name == "Edges"){
                                headingsMap = edgeHeadings;
                            }
                            
                            for (var j in headingsMap){
                                if (headingsMap[j].heading == userText){
                                    headingFound=true;
                                    break;
                                }
                            }
     
                            if (headingFound){
                                alert("Attribute " + userText + " already exists!"); 
                            } else {
                                // valid input...add attribute and value...by default, a string will be null, an int = 0, boolean = false
                              
                                var field = { name: userText, type: value };
                                vis.addDataField(name.toLowerCase(), field);
                                headingsMap.push(new displayableHeadingsMap(userText, true));
                                
                                $("#create" + name + "AttributeDialog").dialog("close");
                                create_table(name);
                            }

                            
                        });
                    
                    });
                    
                    
                    // open the dialog
                    $("#create" + name + "AttributeDialog").dialog({ autoOpen: false, resizable: false, width: 300 });
                    $("#create" + name + "AttributeDialog").dialog("open");
                    
                });
            
                // create dialog box for displaying attributes
                $("#display" + name + "Attribute").click(function(){
                    // close add attribute and delete attribute dialog if they're open. else things can get messy.
                    $("#deleteNodesAttributeDialog").dialog("close");
                    $("#deleteEdgesAttributeDialog").dialog("close");
                    $("#createNodesAttributeDialog").dialog("close");
                    $("#createEdgesAttributeDialog").dialog("close");
                    
                    var headingsMap; // the headings for the nodes or edges
                    var prefix; // so if a node and attribute have the same heading, things don't go crazy
                    if (name === "Nodes"){
                        headingsMap = nodeHeadings;
                        prefix = "n";
                    } else if (name === "Edges"){
                        headingsMap = edgeHeadings;
                        prefix = "e";
                    }
                    
                    // create the dialog if it hasn't been made yet
                    if ($("#" + name + "AttributeSelection").length === 0){
                        var dialog = '\
                    	    <div id="' + name + 'AttributeSelection" title="Select ' + name.substring(0, name.length - 1) + ' Attributes">\
                    	    </div>\
                    	    ';
                        $("body").append(dialog);
                    }
                    // add the scroll bar. all checkboxes should go in this tag
                    document.getElementById(name + "AttributeSelection").innerHTML='<div id="' + name + 'checkboxes" style="height:250px;overflow:scroll"></div>'
                    
                    // append the checkboxes
                    for (var i in headingsMap){
                        (function(){ // reaaally awkward workaround from http://stackoverflow.com/questions/1485770/how-to-store-local-variables-in-jquery-click-functions
                            if (headingsMap[i].heading !== "id"){
                                var head=i;
                                if (headingsMap[i].isDisplayable){
                                    $("#" + name + "checkboxes").append('<input id="' + prefix + head +'checkbox" type="checkbox" checked="checked"/>  ' + headingsMap[i].heading + '<br />');
                                } else {
                                    $("#" + name + "checkboxes").append('<input id="' + prefix + head +'checkbox" type="checkbox"/>  ' + headingsMap[i].heading + '<br />');
                                }
                                $('#' + prefix + head + 'checkbox').change(function(){
                                    headingsMap[head].isDisplayable = !headingsMap[head].isDisplayable;
                                    create_table(name);
                                });
                            }
                        })();
                    }
                    
                    $("#" + name + "AttributeSelection").dialog({ autoOpen: false, resizable: false, width: 300 });
                    $("#" + name + "AttributeSelection").dialog("open");
                });            
  		
                create_table(name);
            
                function create_table(typeStr){                    
                    var id;
                    var headingsMap;
                    var items;
                    
                    if (typeStr === "Nodes"){
                        id = "nodes_data_table";
                        headingsMap = nodeHeadings;
                        items = vis.selected("nodes");
                    } else if (typeStr === "Edges"){
                        id = "edges_data_table";
                        headingsMap = edgeHeadings;
                        items = vis.selected("edges");
                    }
                    
                    document.getElementById(id + "_holder").innerHTML="";
                    var tablePlaceholder = $("#" + id + "_holder");
                    
                    if( items.length > 0 ) {
                    
                        var table = $('<table class="tablesorter" id="'+id+'"></table>');
                        tablePlaceholder.append(table);
                      
                        var thead = $('<thead></thead>');
                        table.append(thead); 
                      
                        var thead_row = $('<tr></tr>');
                        thead.append(thead_row);
                      
                        
                        // make headings for displayable headings
                        for(var j in headingsMap){
                    	  if (headingsMap[j].isDisplayable){
                    		  var heading = headingsMap[j].heading;
                    		  thead_row.append('<th><label>' + ("" + heading).replace(/(\s)/g, "&nbsp;") + '</label></th>');
                    	  }
                        }
                      
                        var tbody = $('<tbody></tbody>');
                        table.append(tbody);
                      
                        // make data row for each data item
                        for(var i in items){
                            var data = items[i].data;
                            var row = $('<tr name="' + data.id + '"></tr>');
                            tbody.append(row);
                          
                            // make 
                            for(var j in headingsMap){
                    		  if (headingsMap[j].isDisplayable){
                    			  var param_name = headingsMap[j].heading;
                    			  var param_val = data[param_name];
                              
                    			  var val = ("" + param_val).replace(/(\s)/g, "&nbsp;");
                    			  var entry = $('<td class="code" name="'+param_name+'">' + val + '</td>');
                    		  	row.append(entry);
                              
                    		  	if( typeof param_val == "boolean" ){
                    		  		entry.attr("type", "boolean");   
                    	  		} else {
                    	  			entry.attr("type", "string");
                      			}
                    			}
                            }
                        }
                    } else {
                        tablePlaceholder.append('<p>No ' + name.toLowerCase() + ' are selected.</p>');
                    }
                    $("#info").find(".tablesorter").tablesorter();
                    convert_td_to_input( $("#" + typeStr.toLowerCase() + "_data_table"), typeStr.toLowerCase() );
                }
          
            }
  
            print_selection("Nodes");
            print_selection("Edges");
          
            function convert_td_to_input( table, group ){
            
                var width = [];
                var num_attrs = $(table).find("th").size();
                
                var i = 0;
                $(table).find("td").slice(0, num_attrs).each(function(){
                    width[i] = $(this).width();
                    i++;
                });
            
                i = -1;
                $(table).find("td").each(function(){
                    i = (i + 1) % num_attrs;
                
                    var td = $(this);
                    var td_width = width[i];
                    var id = td.parents("tr:first").attr("name");
                    var ele = vis[group.substring(0, 4)](id);
                    var param_name = td.attr("name");
                    
                    switch( param_name ){
                        case "id":
                        case "source":
                        case "target":
                            td.addClass("not_editable");
                            return;
                        default:
                            break;
                    }
                    
                    var input;
                    
                    if( td.attr("type") == "boolean" ){
                        input = $(this).html('<input type="checkbox" ' + ($(this).text() == "true" ? " checked='checked' " : "") + ' />').find("input");
                    } else {
                        input = $(this).html('<input type="text" value=' + $(this).text() + ' />').find("input");
                    }
                    
                    input.css({
                        width: td_width
                    });
                    
                    if( td.attr("type") == "boolean" ){
                        input.bind("click", function(){
                            var val = input.is(":checked");
                            var data = {};
                            data[param_name] = val;
                            ele.data[param_name] = val;
                            vis.updateData(group, [ id ], data);
                        });
                    } else {
                        var keypress_timeout = undefined;
                        var orig_val = input.val();
                        input.bind("keydown", function(event){
                            if (event.keyCode == '13') {
                                $(this).blur(); 
                            }
                        }).bind("focus", function(){
                            orig_val = input.val();
                        }).bind("keyup", function(){
                            
                        }).bind("blur", function(){
                            if( input.val() != orig_val ){
                                var text_div = $('<div></div>');
                                text_div.css({
                                    font: input.css("font"),
                                    float: "left",
                                    position: "absolute",
                                    padding: input.css("padding"),
                                    visibility: "hidden"
                                });
                                text_div.html( input.val() );
                                $("body").append(text_div);
                                
                                var text_width = text_div.width();
                                
                                input.width( Math.max( text_width, td_width ) );
                                text_div.remove();
                                
                                var val = input.val();
                                
                                var schema = vis.dataSchema();
                                $.each(schema[group], function(i, el) {
                                    if (el.name === param_name) {
                                		if (el.type === "number") { val = parseFloat(val); }
                                		if (el.type === "int") { val = parseInt(val); }
                                	}
                                });
                                
                                var data = {};
                                data[param_name] = val;
                                ele.data[param_name] = val;
                                vis.updateData(group, [ id ], data);
                                dirty_graph_state();
                            }
                        })
                    }
                });
            }
        }
      
      
        var need_to_update = false;
        function update_with_loader(){
      	  if (! $("#info").hasClass("ui-tabs-hide")){
      		  need_to_update = false;
      		
                $.thread({
  				  worker: function(params){
  					  update();
  			
  					  hide_msg({
  						  target: $("#side")
  					  });
  				  }
  			  });
      	  } else {
      		  need_to_update = true;
      	  }
        }
      
        $("#info_link").bind("click", function(){
      	  if( need_to_update ){      	
      		  show_msg_on_tabs({
                    type: "loading",
                    message: "Please wait while the data is updated."
                });
      		
  			  var interval = setInterval(function(){
  				  if (! $("#info").hasClass("ui-tabs-hide")){
  					  update_with_loader();
  					  clearInterval(interval);
  				  }
  			  }, 100);
      	  }
        });
      
        function updateContextMenu(){
      	  vis.removeAllContextMenuItems();
      	
            vis.addContextMenuItem("Delete node", "nodes", function(evt) {
            	vis.removeNode(evt.target, true);
          	  vis.removeListener("click", "nodes", clickNodeToAddEdge);
          	  dirty_graph_state();
            	updateContextMenu();
          	  update_with_loader();
            })
            .addContextMenuItem("Delete edge", "edges", function(evt) {
          	  vis.removeEdge(evt.target, true);
          	  updateContextMenu();
          	  dirty_graph_state();
          	  update_with_loader();
            })
      	  .addContextMenuItem("Add new node", function(evt) {
      		  vis.addNode(evt.mouseX, evt.mouseY, { }, true);
      		  updateContextMenu();
      		  dirty_graph_state();
      	  })
            .addContextMenuItem("Hide node", "nodes", function(evt){
                hidden_nodes.push(evt.target.data.id);
                vis.filter("nodes", function(node){
                    for(var i in hidden_nodes){
                        if(node.data.id == hidden_nodes[i])
                            return false;
                    }
                    return true;
                });
            })
            .addContextMenuItem("Hide edge", "edges", function(evt){
                hidden_edges.push(evt.target.data.id);
                vis.filter("edges", function(edge){
                    for(var i in hidden_edges){
                        if(edge.data.id == hidden_edges[i])
                            return false;
                    }
                    return true;
                });   
            })
      	  .addContextMenuItem("Add new edge (then click the target node...)", "nodes", function(evt) {
          	  _srcId = evt.target.data.id;
                vis.removeListener("click", "nodes", clickNodeToFindPath);
          	  vis.removeListener("click", "nodes", clickNodeToAddEdge);
          	  vis.addListener("click", "nodes", clickNodeToAddEdge);
            })
            .addContextMenuItem("Find shortest path (then click the target node...)", "nodes", function(evt) {
          	  _srcId = evt.target.data.id;
                vis.removeListener("click", "nodes", clickNodeToAddEdge);
                vis.removeListener("click", "nodes", clickNodeToFindPath);
                vis.addListener("click", "nodes", clickNodeToFindPath);
            });
      	
      	  var items = vis.selected();
      	  if (items.length > 0) {
      		  vis.addContextMenuItem("Delete selected", function(evt) {
                    //var items = vis.selected();
      			  vis.removeElements(items, true);
      			  vis.removeListener("click", "nodes", clickNodeToAddEdge);
                    vis.removeListener("click", "nodes", clickNodeToFindPath);
                    dirty_graph_state();
                    updateContextMenu();
                    update_with_loader();
                });
      	  } else {
      		  vis.removeContextMenuItem("Delete selected");
      	  }		
        }
      
        $("#info").trigger("available");
    }
    
    
    // [attr] Attributes generation
    ////////////////////////////////////////////////////////////////////////////////////////////////
    
    function dirty_graph_state(){
        dirty_attributes_cache();
        dirty_vizmapper();
        dirty_filter();
    }
    
    var attribute_cache;
    
    function dirty_attributes_cache(){
        attribute_cache = undefined;
    }

    function get_attributes(){
        var attr = {};
        
        if( attribute_cache ){
            return $.extend(true, {}, attribute_cache);
        }
        
        function attribute_class(value){
            if( value.match(/^(-){0,1}([0-9])+((\.)([0-9])+){0,1}$/) ){
                return "continuous";
            } else {
                return "discrete";
            }
        }
        
        function attribute_js_type(value){
            if( value.match(/^(-){0,1}([0-9])+((\.)([0-9])+){0,1}$/) ){
                return "number";
            } else if( value == true || ("" + value).toLowerCase() == "true"
            || value == false || ("" + value).toLowerCase() == "false") {
                return "boolean";
            } else {
                return "string";
            }
        }
        
        // attributes are data within cytoweb (e.g. nodes.data, edges.data)
        function build_attr(group_name){
            var group = vis[group_name]();
            attr[group_name] = {};
            
            // add values, types, etc to attr
            for(var i in group){
                var group_item = group[i];
                var data_struct = group_item.data;
                
                for(var j in data_struct){
                	// ignore some attributes
                	if (group_name === "edges" && (j === "source" || j === "target")) {
                        continue;
                    }
                	
                    var data = data_struct[j];
                    var name = j;
                    var value = "" + data;
                    var type = attribute_class(value);
                    var js_type = attribute_js_type(value);
                    var attribute = attr[group_name][name];
                    
                    if( attribute == undefined ){
                        attribute = {};
                        attr[group_name][name] = attribute;
                        
                        attribute.name = name;
                        attribute.type = type;
                        attribute.js_type = js_type;
                        attribute.values = [];
                        attribute.multiplicities = {};
                        attribute.shown = undefined;
                    } 
                    
                    if( $.inArray(data, attribute.values) < 0 ){
                        attribute.values.push(data);
                        attribute.multiplicities[data] = 1;
                    } else {
                        attribute.multiplicities[data]++;
                    }
                    
                    // if one piece of data is discrete, so is the set overall
                    if( type == "discrete" ){
                        attribute.type = "discrete";
                    }
                    
                    // not matching => have to use string
                    if( js_type != attribute.js_type ){
                        attribute.type = "string";
                    }
                }
            }
            
            // make values sorted in the list
            for(var j in attr[group_name]){
                var attribute = attr[group_name][j];
                
                if( attribute.type == "continuous" ){
                    for(var k in attribute.values){
                        attribute.values[k] = parseFloat( attribute.values[k] );
                    }
                }
                
                attribute.values = attribute.values.sort(function(a, b){
                    if( a > b ){
                        return 1;
                    } else if( a < b ){
                        return -1;
                    } else {
                        return 0;
                    }
                });
            }
        }
        build_attr("nodes");
        build_attr("edges");
        
        attribute_cache = attr;
        
        return $.extend(true, {}, attribute_cache);
    }
    
    
    // [vizmapper] Style tab generation
    ////////////////////////////////////////////////////////////////////////////////////////////////
    
    var vizmapper_dirty = false;
    
    function dirty_vizmapper(){
        vizmapper_dirty = true;
        
        if( ! $("#vizmapper").hasClass("ui-tabs-hide") ){
            rebuild_dirty_vizmapper();
        }
    }
    
    $("#vizmapper_link").click(function(){
        if( vizmapper_dirty ){
            rebuild_dirty_vizmapper();
// TODO: remove this workaround ############            
            $("#vizmapper_header").show();
// ##########################################
        }
    });
    
    function rebuild_dirty_vizmapper(){
        show_msg({
            type: "loading",
            target: $("#side"),
            message: "You added, removed, or changed properties of elements in the graph.  Please wait while the visual styles update.",
            heading: "Updating",
            showCorner: false
        });
        
        $.thread({
            worker: function(params){
                update_vizmapper();
        
                hide_msg({
                    target: $("#side")
                });
            }
        });
    }
    
    function update_vizmapper(){
        var parent = $("<div></div>");
        $("#vizmapper").empty();

        $("#vizmapper_header").empty();
        $("#vizmapper_header").append('<div id="vizmapper_tabs"><ul></ul></div>');
        
        $("#vizmapper_link").bind("click", function(){
            $("#custom_visual_style").find(".ui-menu-check-icon").addClass("ui-menu-checked");
            $("#custom_visual_style").siblings().find(".ui-menu-check-icon").removeClass("ui-menu-checked");
        });
        
        var attr = get_attributes();

        // properties to show in the tab that the user can change
        // only this should change when adding/removing items in the style tab
        var properties = {
            groups: [
                {
                    name: "Global",
                    groups: [
                         {
                             name: "Background",
                             properties: [
                                 {
                                	 name: "Color",
                                     variable: "global.backgroundColor",
                                     type: "colour",
                                     mappable: false
                                 }
                             ]
                         },
                         {
                             name: "Selection Rectangle",
                             properties: [
								 {
									  name: "Line Width",
									  variable: "global.selectionLineWidth",
									  type: "number",
									  mappable: false
								 },
	                             {
                                	 name: "Line Color",
                                	 variable: "global.selectionLineColor",
                                	 type: "colour",
                                	 mappable: false
                                 },
                                 {
                                	 name: "Line Opacity",
                                	 variable: "global.selectionLineOpacity",
                                	 type: "per cent number",
                                	 mappable: false
                                 },
                                 {
                                     name: "Fill Color",
                                     variable: "global.selectionFillColor",
                                     type: "colour",
                                     mappable: false
                                 },
                                 {
                                	 name: "Fill Opacity",
                                	 variable: "global.selectionFillOpacity",
                                	 type: "per cent number",
                                	 mappable: false
                                 }
                             ]
                         },
                         {
                        	 name: "Tooltip",
                        	 properties: [
                	              {
                	            	  name: "Delay (milliseconds)",
                	            	  variable: "global.tooltipDelay",
                	            	  type: "number",
                	            	  mappable: false
                	              }
            	              ]
                         }
                     ]
                },
                
                {
                    name: "Nodes",
                    groups: [
                        {
                            name: "Border",
                            properties: [
                                {
                                    name: "Width",
                                    variable: "nodes.borderWidth",
                                    type: "number",
                                    mappable: true,
                                    mapgroup: "nodes"
                                },
                                {
                                    name: "Color",
                                    variable: "nodes.borderColor",
                                    type: "colour",
                                    mappable: true,
                                    mapgroup: "nodes"
                                }
                            ]
                        },
                        
                        {
                            name: "Fill",
                            properties: [
                                {
                                    name: "Size",
                                    variable: "nodes.size",
                                    type: "number",
                                    mappable: true,
                                    mapgroup: "nodes"
                                },
                                {
                                    name: "Color",
                                    variable: "nodes.color",
                                    type: "colour",
                                    mappable: true,
                                    mapgroup: "nodes"
                                },
                                {
                                    name: "Opacity",
                                    variable: "nodes.opacity",
                                    type: "per cent number",
                                    mappable: true,
                                    mapgroup: "nodes"
                                },
                                {
                                    name: "Shape",
                                    variable: "nodes.shape",
                                    type: "node shape",
                                    mappable: true,
                                    mapgroup: "nodes"
                                }
                            ]
                        }
                        /*
                        ,
                        
                        {
                        	name: "Label",
                        	properties: [
                	             {
                	            	 name: "Text",
                	            	 variable: "nodes.label",
                	            	 type: "string",
                	            	 mappable: true,
                	            	 mapgroup: "nodes"
                	             },
                	             {
                	            	 name: "Font",
                	            	 variable: "nodes.labelFontName",
                	            	 type: "string",
                	            	 mappable: true,
                	            	 mapgroup: "nodes"
                	             },
                	             {
                	            	 name: "Size",
                	            	 variable: "nodes.labelFontSize",
                	            	 type: "number",
                	            	 mappable: true,
                	            	 mapgroup: "nodes"
                	             },
                	             {
                	            	 name: "Color",
                	            	 variable: "nodes.labelFontColor",
                	            	 type: "colour",
                	            	 mappable: true,
                	            	 mapgroup: "nodes"
                	             },
                	             {
                	            	 name: "Weight",
                	            	 variable: "nodes.labelFontWeight",
                	            	 type: "string",
                	            	 mappable: true,
                	            	 mapgroup: "nodes"
                	             },
                	             {
                	            	 name: "Style",
                	            	 variable: "nodes.labelFontStyle",
                	            	 type: "string",
                	            	 mappable: true,
                	            	 mapgroup: "nodes"
                	             }
            	             ]
                        }
                        */
                    
                    ]
                },
                
                {
                    name: "Edges",
                    groups: [
                        {
                            name: "Line",
                            properties: [
                                {
                                    name: "Width",
                                    variable: "edges.width",
                                    type: "number",
                                    mappable: true,
                                    mapgroup: "edges"
                                },
                                {
                                    name: "Color",
                                    variable: "edges.color",
                                    type: "colour",
                                    mappable: true,
                                    mapgroup: "edges"
                                },
                                {
                                    name: "Opacity",
                                    variable: "edges.opacity",
                                    type: "per cent number",
                                    mappable: true,
                                    mapgroup: "edges"
                                },
                                {
                                	name: "Style",
                                	variable: "edges.style",
                                	type: "edge style",
                                	mappable: true,
                                	mapgroup: "edges"
                                },
                                {
                                	name: "Curvature",
                                	variable: "edges.curvature",
                                	type: "number",
                                	mappable: false,
                                	mapgroup: "edges"
                                }
                            ]
                        },
                        
                        {
                            name: "Arrow",
                            properties: [
                                {
                                    name: "Target Shape",
                                    variable: "edges.targetArrowShape",
                                    type: "edge shape",
                                    mappable: true,
                                    mapgroup: "edges"
                                },
                                {
                                	name: "Target Color",
                                	variable: "edges.targetArrowColor",
                                	type: "colour",
                                	mappable: true,
                                	mapgroup: "edges"
                                },
                                {
                                    name: "Source Shape",
                                    variable: "edges.sourceArrowShape",
                                    type: "edge shape",
                                    mappable: true,
                                    mapgroup: "edges"
                                },
                                {
                                	name: "Source Color",
                                	variable: "edges.sourceArrowColor",
                                	type: "colour",
                                	mappable: true,
                                	mapgroup: "edges"
                                }
                            ]
                        },
                        {
                            name: "Merged Line",
                            properties: [
                                {
                                    name: "Width",
                                    variable: "edges.mergeWidth",
                                    type: "number",
                                    mappable: true,
                                    mapgroup: "edges"
                                },
                                {
                                    name: "Color",
                                    variable: "edges.mergeColor",
                                    type: "colour",
                                    mappable: true,
                                    mapgroup: "edges"
                                },
                                {
                                    name: "Opacity",
                                    variable: "edges.mergeOpacity",
                                    type: "per cent number",
                                    mappable: true,
                                    mapgroup: "edges"
                                },
                                {
                                	name: "Style",
                                	variable: "edges.mergeStyle",
                                	type: "edge style",
                                	mappable: true,
                                	mapgroup: "edges"
                                }
                            ]
                        }
                    ]
                }
                
            ]
        };
        
        var cached_style = vis.visualStyle();

        function get_property(variable){
            var objs = variable.split(".");
            var property = cached_style;
            
            for(var i in objs){
                var obj = objs[i];
                property = property[obj];
            }

            return property;
        }
        
        function set_property(variable, value){
            var old_style = cached_style;
            var style = {};
                      
            var current_lvl = style;
            var old_current_lvl = old_style;
            var objs = variable.split(".");
            for(var i = 0; i < objs.length; i++){
                var obj = objs[i];
                
                if( i == objs.length - 1 ){
                    current_lvl[obj] = value;
                    old_current_lvl[obj] = undefined;
                } else {
                    current_lvl[obj] = {};
                }
                current_lvl = current_lvl[obj];
                old_current_lvl = old_current_lvl[obj];
            }
            
            cached_style = $.extend( true, cached_style, style );
            
            vis.visualStyle(cached_style);
            update_background();
        }
        
        function cast_value(value, type){
            switch( type ) {
                case "colour":
                    return "" + value;
                case "number":
                case "per cent number":
                    return parseFloat(value);
                case "integer":
                    return parseInt(value);
                case "string":
                default:
                    return "" + value;
            }
            
            return value;
        }
        
        function property_class(property){
            switch(property.type){
                case "colour":
                case "number":
                case "per cent number":
                case "integer":
                    return "continuous";
                case "string":
                default:
                    return "discrete";
            }
        }
        
        function valid_value(value, type){
            switch( type ) {
                case "colour":
                    return value.match(/^(\#)([0-9]|[a-f]|[A-F]){6}$/);
                case "number":
                    return value.match(/^(-){0,1}([0-9])+((\.)([0-9])+){0,1}$/);
                case "per cent number":
                    return value.match(/^((1)|(0)((\.)([0-9])+){0,1})$/);
                case "integer":
                    return value.match(/^([0-9])+$/);
                case "string":
                    return true;
                case "non-empty string":
                    return value != null && value != "";
                case "node shape":
                    return value.match(/^(ellipse)|(diamond)|(rectangle)|(triangle)|(hexagon)|(roundrect)|(parallelogram)|(octagon)|(vee)|(v)$/i);
                case "edge shape":
                    return value.match(/^(circle)|(diamond)|(delta)|(arrow)|(T)|(none)$/i);
                case "edge style":
                	return value.match(/^(SOLID)|(DOT)|(LONG_DASH)|(EQUAL_DASH)$/i);
            }
            
            return false;
        }
        
        function print_property(property, root_div){
            var div = $('<div class="property" property="' + property.variable + '" type="' + property.type + '"></div>');
            $(root_div).append(div);
            
            var input_label = $('<label class="style">' + property.name + '</label>');
            div.append(input_label);
            
            initial_property = get_property(property.variable);
            var input = $('<input class="default" type="text" />');
            div.append(input);
            
            var initial_property_is_mapped = typeof initial_property == "object";
            if(initial_property_is_mapped){
                input.val(initial_property.defaultValue);
            } else {
                input.val(initial_property);
            }
                        
            function apply_continuous_mapping_from_inputs(){
                if( div.find(".continuous input.error:visible").length <= 0 ){
                    var continuous_min = div.find(".continuous_min:first");
                    var continuous_max = div.find(".continuous_max:first");              
                    
                    var mapping = {
                        defaultValue: cast_value(input.val(), property.type),
                        continuousMapper: {
                            attrName: div.find(".selector").attr("attribute"),
                            minValue: cast_value(continuous_min.val(), property.type),
                            maxValue: cast_value(continuous_max.val(), property.type)
                        }
                    };
                    
                    set_property( property.variable, mapping );
                
                }
            }
            
            function apply_discrete_mapping_from_inputs(){
                if( div.find(".discrete input.error:visible").length <= 0 ){
                    var discrete = div.find(".discrete:first");
                    var category = discrete.children(":visible");
                    var attribute = category.attr("attribute");
                    
                    var mapping = {
                        defaultValue: cast_value(input.val(), property.type),
                        discreteMapper: {
                            attrName: attribute,
                            entries: []
                        }
                    };
                    
                    // grab mapping from each input
                    category.find("input").each(function(){
                        
                        mapping.discreteMapper.entries.push({
                            attrValue: $(this).attr("attribute_value"),
                            value: cast_value($(this).val(), property.type)
                        });
                    });
                    
                    set_property( property.variable, mapping );
                }
            }
            
            input.validate({
                label: input_label,
                errorMessage: function(str){
                    return "must be a valid " + property.type;
                },
                valid: function(str){
                    return valid_value( str, property.type );
                }
            });
            
            input.bind("valid", function(){
                var continuous = div.find(".continuous:first");
                var discrete = div.find(".discrete:first");
                
                if( continuous.is(":visible") ){
                    apply_continuous_mapping_from_inputs();
                } else if( discrete.is(":visible") ) {
                    apply_discrete_mapping_from_inputs();
                } else {
                    set_property( property.variable, cast_value($(this).val(), property.type) );
                }
            });
            
            
            if( property.mappable ) {
                var map_button_open_map_class = "ui-icon-transferthick-e-w";
                var map_button_close_map_class = "ui-icon-close";
                
                var map_button = $('<div class="ui-state-default ui-corner-all map_button"><div class="ui-icon ' + map_button_open_map_class + '"></div></div>');
                div.append(map_button);
                
                map_button.bind("mouseover", function(){
                    $(this).addClass("ui-state-hover");
                }).bind("mouseout", function(){
                    $(this).removeClass("ui-state-hover");
                });
                
                var map_section = $('<div class="map_section ui-corner-bottom"></div>');
                div.append(map_section);
                map_section.hide();
                 
                var selector = $('\
                <div class="selector"><ul>\
                    <li class="title"><label class="title">Select attribute to map</label>\
                        <ul>\
                        </ul>\
                     </li>\
                </ul></div>');
                map_section.append(selector);
                    
                var attr_group = attr[property.mapgroup];
                var attr_group_names = [];
                for(var i in attr_group){
                    var name = i;
                    attr_group_names.push(name);
                }
                attr_group_names.sort();
                
                // add menu for what attribute to map to
                for(var i in attr_group_names){
                    var name = attr_group_names[i];
                    var attribute = attr_group[name];
                    var type = ( property_class(property) == "discrete" ? "discrete" : attribute.type );
                    var name = attribute.name;
                    
                    var li = $('<li type="' + type + '"><label>' + name + '</label></li>');
                    selector.find("ul:first").find("ul:first").append(li);
                    
                    if( type == "continuous" ){
                        li.append('\
                        <ul>\
                            <li class="type_selector" type="continuous"><label>Continuous</label></li>\
                            <li class="type_selector" type="discrete"><label>Discrete</label></li>\
                        </ul>\
                        ');
                    }
                }
                
                function open_map_section(){
                    map_section.show();
                    map_button.find(".ui-icon").removeClass(map_button_open_map_class).addClass(map_button_close_map_class);
                }
                
                function close_map_section(){
                    map_section.hide();
                    map_button.find(".ui-icon").addClass(map_button_open_map_class).removeClass(map_button_close_map_class);
                }
                
                map_button.click(function(){
                    if( !map_section.is(":visible") ){
                        open_map_section();
                    } else {
                        close_map_section();
                    }
                    input.trigger("validate");
                });
                
                var continuous = $('<div class="continuous ui-corner-bottom"></div>');
                map_section.append(continuous);
                continuous.hide();
                
                var continuous_max = $('<input type="text" class="continuous_max"/>');
                continuous.append('<label class="continuous_max_name">High</span></label>');
                continuous.append(continuous_max);
                
                continuous_max.validate({
                    label: continuous.find(".continuous_max_name"),
                    valid: function(str){
                        return valid_value( str, property.type );
                    },
                    errorMessage: function(str){
                        return "must be a valid " + property.type;
                    }
                });
                continuous_max.bind("valid", function(){                
                    apply_continuous_mapping_from_inputs();
                });
                
                var continuous_min = $('<input type="text" class="continuous_min"/>');
                continuous.append('<label class="continuous_min_name">Low</span></label>');
                continuous.append(continuous_min);
                continuous_min.validate({
                    label: continuous.find(".continuous_min_name"),
                    valid: function(str){
                        return valid_value( str, property.type );
                    },
                    errorMessage: function(str){
                        return "must be a valid " + property.type;
                    }
                });
                continuous_min.bind("valid", function(){                
                    apply_continuous_mapping_from_inputs();
                });

                var line = $('<div class="line"></div>');
                continuous.append(line);
                line.append('<div class="ui-state-disabled arrow_top"><div class="ui-icon ui-icon-arrowthickstop-1-n"></div></div>');
                line.append('<div class="ui-state-disabled arrow_bottom"><div class="ui-icon ui-icon-arrowthickstop-1-s"></div></div>');
                line.append('<div class="middle ui-state-disabled">Range</div>');
                
                var discrete = $('<div class="discrete ui-corner-bottom"></div>');
                map_section.append(discrete);
                discrete.hide();
                
                function create_discrete(attribute){                    
                    var attr_vals = attr[property.mapgroup][attribute].values;
                    var category = $('<div attribute="' + attribute + '"></div>');
                    discrete.append(category);
                    
                    for(var i in attr_vals){
                        var val = attr_vals[i];
                        
                        var discrete_input = $('<input attribute_value="' + val + '" type="text" />');
                        var discrete_input_label = $('<label class="discrete_name">' + val + '</label>');
                        category.append(discrete_input_label);
                        category.append(discrete_input);
                        
                        discrete_input.val( input.val() );
                        
                        discrete_input.validate({
                            label: discrete_input_label,
                            valid: function(str){
                                return valid_value( str, property.type );
                            },
                            errorMessage: function(str){
                                return "must be a valid " + property.type;
                            }
                        });
                        
                        discrete_input.bind("valid", function(){                
                            apply_discrete_mapping_from_inputs();
                        });
                    }
                }
                
                for(var i in attr_group_names){
                    var name = attr_group_names[i];
                    var attribute = attr_group[name];
                    create_discrete(name);
                }
                
                function set_selector_title(name, type){
                    selector.attr("attribute", name);
                    selector.find("label.title").text( name + " (" + type + ")" );
                }
                
                function display_continuous(use_initial_property){
                    continuous.show();
                    discrete.hide();
                    
                    if(use_initial_property){
                        continuous_min.val( initial_property.continuousMapper.minValue );
                        continuous_max.val( initial_property.continuousMapper.maxValue );
                    } else {
                        if( valid_value( input.val(), property.type ) ){
                            continuous_min.val( input.val() );
                            continuous_max.val( input.val() );
                        }
                    }
                }
                
                function display_discrete(use_initial_property){
                    continuous.hide();
                    discrete.show();
                    
                    discrete.children().each(function(){
                        if( $(this).hasClass("[attribute=" + selector.attr("attribute") + "]") ){
                            $(this).show();
                            var discrete_category = $(this);
                            
                            if(use_initial_property){
                                var entries = initial_property.discreteMapper.entries;
                                for(var i in entries){
                                    var entry = entries[i];
                                    var attr_val = entry.attrValue;
                                    var value = entry.value;
                                    
                                    discrete_category.find("input[attribute_value=" + attr_val + "]").val( value );
                                }
                            } else if( valid_value( input.val(), property.type ) ){
                                $(this).find("input").val( input.val() );
                            }
                        
                        } else {
                            $(this).hide();
                        }
                    });
                }
                
                // create menu to select what attribute to map to the property
                selector.menu({
                    addArrow: false,
                    onMenuItemClick: function(li){
                        if( li.parents("ul").length > 1 ) {
                            var name = li.find("label:first").text();
                            var type = li.attr("type");
                            
                            if( li.hasClass("type_selector") ){
                                name = li.parents("li:first").find("label:first").text();
                            }
                            
                            set_selector_title(name, type);
                            if( type == "continuous" ) {
                                display_continuous();
                            } else {
                                display_discrete();
                            }
                            
                            input.trigger("validate");
                        }
                    }
                });
                
                if (initial_property_is_mapped){
                    open_map_section();
                    
                    if (initial_property.continuousMapper != undefined) {
                        set_selector_title(initial_property.continuousMapper.attrName, "continuous");
                        display_continuous(true);
                    } else if (initial_property.discreteMapper != undefined) {
                        set_selector_title(initial_property.discreteMapper.attrName, "discrete");
                        display_discrete(true);
                    }
                }
                
            }
        }
        
        function print_group_set(groups, level, root_node){
            for(var i in groups){
                var group = groups[i];
                var name = group.name;
                var properties = group.properties;
                var sub_groups = group.groups;
                
                var div;
                
                if( root_node == undefined ){
                    div = $('<div id="vizmapper_' + name + '"></div>');
                    $("#vizmapper_tabs ul").append('<li><a href="#vizmapper_' + name + '">' + capitalise(name) + '</a></li>');
                    parent.append(div);
                } else {
                    div = $(root_node);
                }
                
                if(level != 1){
                    div.append("<h" + level + ">" + name + "</h" + level + ">");
                }
                
                for(var j in properties){
                    print_property( properties[j], div );
                }
                
                if( sub_groups != undefined ){
                    print_group_set(sub_groups, level + 1, div);
                }
            }
        }

        print_group_set(properties.groups, 1);

        // utility for pickers
        function position_at_input(picker, input){
            $(picker).css({
                position: "absolute",
                left: $(input).offset().left,
                top: $(input).offset().top + $(input).outerHeight()
            });
            
            if( $(picker).offset().top + $(picker).outerHeight() > $(window).height() ){
                $(picker).css({
                    top: $(input).offset().top - $(picker).outerHeight()
                });
            }       
        }
        
        function hide_with_input(picker, input, fn){
        	if ($(picker).find(".header").is(":visible")) {
        		// IE set focus to picker, forcing a blur on input, so blur cannot be used here.
        		// Let's just create a close button instead:
        		$("#colour_picker .ui-icon-close").bind("click", function(evt){
        			fn();
        			evt.preventDefault();
        		});
        	} else {
        		// Regular GOOD browsers!
	        	$(input).bind("blur", function(){
	            	fn();
	            });
        	}
            
            $(parent).parent().bind("scroll", function(){
                fn();
            });
            
            $(window).bind("resize", function(){
                fn();
            });
        }
        
        // add colour pickers
        var picker; // parent div to farbtastic
        var picker_internals; // farbtastic instance
        
        function remove_picker(){
            if( picker != undefined ){
                $(picker).remove();
                picker = undefined;
                picker_internals = undefined;
            }
        }
        
        $(parent).find(".property[type=colour] input").each(function(){
            var input = $(this);
            
            $(input).addClass("colour_sample_bg");
            
            function set_colour(){
                $(input).css({
                    backgroundColor: $(input).val()
                });
            }
            set_colour();
            
            // update colour on picker after typing
            $(input).bind("valid", function(){
                if( picker_internals != undefined ){
                    picker_internals.setColor( $(input).val() );
                }
                
                set_colour();
            }).bind("invalid", function(){
                $(input).css("background-color", "transparent");
            });
            
            // on empty put # so user doesn't have to
            $(input).bind("keyup", function(){
                if( $(this).val() == "" ){
                    $(this).val("#");
                }
            });
            
            // add clicker near input when clicked
            $(input).bind("click", function(){
                remove_picker();
            
                picker = $('<div id="colour_picker" class="floating_widget">' +
                		   '<div class="header ui-state-default"><div class="ui-icon ui-icon-close"/></div><div class="content"/></div>');
                $("body").append(picker);
                
                if (!$.browser.msie) { $("#colour_picker .header").hide(); }
                
                picker_internals = $.farbtastic($("#colour_picker .content"), function(colour){
                    $(input).val(colour).trigger("validate");
                });

                position_at_input($(picker), $(input));
                
                $(input).trigger("validate");
                
                hide_with_input($(picker), $(input), function(){
                    remove_picker();
                });
            });
        });
        
        // add node shape pickers
        var node_shape_picker; // parent div to farbtastic
        
        function remove_node_shape_picker(){
            if( node_shape_picker != undefined ){
                $(node_shape_picker).remove();
                node_shape_picker = undefined;
            }
        }
        
        $(parent).find(".property[type=node shape] input").each(function(){
            var input = $(this);
                       
            // add clicker near input when clicked
            $(input).bind("click", function(){
                remove_node_shape_picker();
            
                node_shape_picker = $('<div id="node_shape_picker" class="shape_picker floating_widget"></div>');
                $("body").append(node_shape_picker);
                
                var types = [ "ellipse", "triangle", "diamond", "rectangle", "roundrect", "parallelogram",  "hexagon", "octagon", "vee" ];
                for(var i in types){
                    var type = types[i];
                    $(node_shape_picker).append('<div class="shape ' + type + '" shape="' + type + '"></div>');
                }
                
                $(node_shape_picker).bind("mousedown", function(){
                    return false;
                });
                $(node_shape_picker).children().bind("mousedown", function(){
                    var type = $(this).attr("shape");
                    
                    $(input).val(type);
                    $(input).trigger("validate");
                
                    return false;
                });
                
                position_at_input($(node_shape_picker), $(input));
                
                $(input).trigger("validate");
                
                hide_with_input($(node_shape_picker), $(input), function(){
                    remove_node_shape_picker();
                });
            });
        });
        
        // add node shape pickers
        var edge_shape_picker; // parent div to farbtastic
        
        function remove_edge_shape_picker(){
            if( edge_shape_picker != undefined ){
                $(edge_shape_picker).remove();
                edge_shape_picker = undefined;
            }
        }
        
        $(parent).find(".property[type=edge shape] input").each(function(){
            var input = $(this);
                       
            // add clicker near input when clicked
            $(input).bind("click", function(){
                remove_edge_shape_picker();
            
                edge_shape_picker = $('<div id="edge_shape_picker" class="shape_picker floating_widget"></div>');
                $("body").append(edge_shape_picker);
                
                var types = [ "delta", "arrow", "diamond", "circle", "t", "none" ];
                for(var i in types){
                    var type = types[i];
                
                    $(edge_shape_picker).append('<div class="shape ' + type + '" shape="' + type + '"></div>');
                }
                $(edge_shape_picker).bind("mousedown", function(){
                    return false;
                });
                $(edge_shape_picker).children().bind("mousedown", function(){
                    var type = $(this).attr("shape");
                    
                    $(input).val(type);
                    $(input).trigger("validate");
                
                    return false;
                });
                
                position_at_input($(edge_shape_picker), $(input));
                
                $(input).trigger("validate");
                
                hide_with_input($(edge_shape_picker), $(input), function(){
                    remove_edge_shape_picker();
                });
            });
        });
    
    	$("#vizmapper").html(parent);
    
        $("#vizmapper_tabs").tabs();
        
        vizmapper_dirty = false;
        
        $("#vizmapper").trigger("available");
        
    } // End update_vizmapper
    
    // [filters] Generation of the filters tab
    ////////////////////////////////////////////////////////////////////////////////////////////////
    
    function capitalise(str){
        return str.substr(0, 1).toUpperCase() + str.substr(1);
    }
    
    var filter_dirty = false;
    
    function dirty_filter(){
        filter_dirty = true;
        
        $("#filter_header .rebuild").show();
        $(window).trigger("resize");
    }
    
    function rebuild_dirty_filter(){
        
        show_msg({
            type: "loading",
            target: $("#side"),
            message: "Please wait while the filters reset.",
            heading: "Resetting",
            showCorner: false
        });
        
        $.thread({
            worker: function(params){
                update_filter();
        
                hide_msg({
                    target: $("#side")
                });
            }
        });
        
        
        
    }
    
    function update_filter(){
        var attr = get_attributes();
        var parent = $("#filter");
        var header = $("#filter_header");
        var operation;
        
        var cached_elements = {};
        cached_elements.nodes = function(){
            if(cached_elements.cached_nodes == undefined){
                cached_elements.cached_nodes = vis.nodes();
            }
            return cached_elements.cached_nodes;
        }
        cached_elements.edges = function(){
            if(cached_elements.cached_edges == undefined){
                cached_elements.cached_edges = vis.edges();
            }
            return cached_elements.cached_edges;
        }
        
        
        parent.empty();
        header.empty();
        
        header.append('<div id="reset_filter">\
            <label>Reset filters</label> \
            <div id="reset_filter_button" class="ui-state-default ui-corner-all"><span class="ui-icon ui-icon-arrowreturnthick-1-w"></span></div>\
        </div>');
        
        $("#reset_filter").bind("mouseover", function(){
            $("#reset_filter_button").addClass("ui-state-hover");
        }).bind("mouseout", function(){
            $("#reset_filter_button").removeClass("ui-state-hover");
        });
        
        var tabs = $('<div id="filter_tabs"><ul></ul></div>');
        header.append(tabs);
        
        header.append('\<div class="select padded">\
        Filter such that\
        <ul>\
            <li><a href="#" operation="and">every</a></li>\
            <li><a href="#" operation="or">any</a></li>\
        </ul>\
        filter is satisfied.</div>');
        
        header.find(".select a").click(function(){
            header.find(".select a").not(this).removeClass("selected");
            $(this).addClass("selected");
            operation = $(this).attr("operation");
            
            parent.trigger("filternodes").trigger("filteredges");
            
            return false; // no changing the URL
        });
        header.find("[operation=and]").click();
        
        header.append('\<div class="rebuild padded">\
        <span class="ui-icon ui-icon-alert"></span>\
        <p>Nodes or edges have been added, removed, or had their data modified.</p>  \
        <p><small>Click here to reset the filters to bring them up to date.</small></p></div>');
        
        header.find(".rebuild").hide().add("#reset_filter").bind("click", function(){
            rebuild_dirty_filter();
            $(window).trigger("resize");
        });
        
        function append_group(group, group_name){
            tabs.find("ul").append('<li><a href="#filter_' + group_name + '">' + capitalise(group_name) + '</a></li>');
            
            var root_div = $('<div id="filter_' + group_name + '"></div>');
            parent.append(root_div);
            
            var attribute_names = [];
            for(var j in group){
                attribute_names.push(j);
            }
            
            attribute_names.sort();
            for(var j in attribute_names){
                var name = attribute_names[j];
                var attribute = group[name];
                
                var min = attribute.values[ 0 ];
                var max = attribute.values[ attribute.values.length - 1 ];
                
                if( min != max ){
                	append_attribute(attribute);
                }
            }
            
            parent.bind("filter" + group_name, function(){         
                
                vis.filter(group_name, function(ele){
                    
                    for(var j in ele.data){
                        var ele_attr_name = j;
                        var ele_attr_val = ele.data[j];
                        
                        if( attr[group_name][ele_attr_name] == undefined || attr[group_name][ele_attr_name].shown == undefined ){
                            continue; // ignore if shown not set (i.e. filter not set)
                        }
                        
                        var shown = attr[group_name][ele_attr_name].shown[ele_attr_val];
                        
                        switch(operation){
                            case "and":
                                if( !shown ){
                                    return false; // at least 1 not shown
                                }
                                break;
                                
                            case "or":
                                if( shown ){
                                    return true; // at least 1 shown
                                }
                                break;
                        }
                    }
                    
                    switch(operation){
                        case "and":
                            return true; // all shown in loop
                            
                        case "or":
                            return false; // no shown in loop
                    }
                    
                }, true);
                
                
            });
            
            function append_attribute(attribute){
            	
            	switch(attribute.name){
            	case "style":
            	case "mergeStyle":
            	case "image":
            		return;
            	}
            	
                var attribute_label = $('<label>' + attribute.name + '</label>');
                root_div.append(attribute_label);
                var div = $('<div class="attribute" attribute_name="' + attribute.name + '"></div>');
                root_div.append(div);
                
                var string_search = $('<input type="text" class="inactive string_search" value="Find a value to filter" />');
                div.append(string_search);
                
                string_search.bind("focus", function(){
                    if( $(this).hasClass("inactive") ){
                        $(this).removeClass("inactive");
                        $(this).val("");
                    }
                });
                
                var results_area = $('<div class="results_area"></div>');
                div.append(results_area);
                
                var stats_area = $('<div class="stats_area"></div>');
                results_area.append(stats_area);
                
                var slider_area = $('<div class="slider_area"></div>');
                results_area.append(slider_area);
                
                var label_min = $('<span class="slider_min"></span>');
                slider_area.append(label_min);
                
                var label_max = $('<span class="slider_max"></span>');
                slider_area.append(label_max);
                
                var slider = $('<div class="slider"></div>');
                slider_area.append(slider);
                
                var range_area = $('<div class="range_area"></div>');
                slider_area.append(range_area);
                
                var range_min = $('<input type="text" class="range_min" />');
                range_area.append(range_min);
                
                var range_max = $('<input type="text" class="range_max" />');
                range_area.append(range_max);
                
                if( attribute.type == "continuous" ){
                    use_continuous_logic();
                } else {
                    use_discrete_logic();
                }
                
                function add_slider_logic(attribute){
                    var steps = FILTER_STEPS_ON_SLIDER;
                    
                    var min, max;
                    if(attribute.type == "continuous"){
                        min = attribute.values[ 0 ];
                        max = attribute.values[ attribute.values.length - 1 ];
                    } else if( attribute.type == "discrete" ){
                        min = attribute.diff_values[ 0 ];
                        max = attribute.diff_values[ attribute.diff_values.length - 1 ];
                        
                    }
                    
                    // add shown to all, since we're now adding a slider that has all values shown
                    attr[group_name][attribute.name].shown = {};
                    for(var i in attribute.values){
                        var val = attribute.values[i];
                        
                        attr[group_name][attribute.name].shown[val] = true;
                    }
                    
                    var timeout;
                    slider.slider("destroy").empty().slider({
                        animate: "fast",
                        min: min,
                        max: max,
                        step: (max - min)/steps,
                        values: [min, max],
                        range: true,
                        start: function(event, ui){
                            // clear errors on start
                            range_min.val( ui.values[0] );
                            range_max.val( ui.values[1] );
                            
                            range_min.trigger("validate");
                            range_max.trigger("validate");
                        },
                        slide: function(event, ui){                            
                            range_min.val( ui.values[0] );
                            range_max.val( ui.values[1] );
                            
                            function set_timeout(){
                                timeout = setTimeout(function(){
                                    filter();
                                    timeout = undefined;
                                }, FILTER_DELAY_ON_SLIDER);
                            }
                            
                            if( timeout == undefined ){
                                set_timeout();
                            } else {
                                clearTimeout(timeout);
                                set_timeout();
                            }
                            
                        },
                        change: function(event, ui){                            
                        },
                        stop: function(event, ui){
                            filter();
                        }
                    });
                    
                    label_min.text( min );
                    label_max.text( max );
                    
                    range_min.val( min );
                    range_max.val( max );
                    
                    for(var i in attribute.values){
                        var val = attribute.values[i];
                        
                        for(var j = 0; j < attribute.multiplicities[val]; j++){
                            var stat = $('<div class="stat"></div>');
                            stats_area.append(stat);
                            
                            if( attribute.type == "continuous" ){
                                // val as is
                            } else if(attribute.type == "discrete") {
                                val = attribute.diff[val];  
                            }
                            
                            var percent = ((val - min) / (max - min));
                            stat.css({
                                left: ( (percent*100) + "%" )
                            });
                        }
                    }
                    
                    function update_slider_from_inputs(){
                        var values = [ parseFloat($(range_min).val()), parseFloat($(range_max).val()) ];
                        
                        for(var i in values){
                            slider.slider("values", i, values[i]);
                        }
                    }
                    
                    function valid_val(str, type){
                        if(str.match(/^(-|-){0,1}([0-9])+((\.)([0-9])+){0,1}$/)){
                            var val = parseFloat(str);
                            
                            var smin =  parseFloat( range_min.val() );
                            var smax =  parseFloat( range_max.val() );
                            
                            if( val < min || val > max ){
                                return false;
                            }
                            
                            if( type == "min" && val >= smax ){
                                return false;
                            }
                            
                            if( type == "max" && val <= smin ){
                                return false;
                            }
                            
                            return true;
                        }
                        
                        return false;
                    }
                    
                    function filter(){
                        var elements = cached_elements[group_name](); 
                        
                        // don't actually call cytoweb filter; just update the filter maps since
                        // we can not filter by just looking at ONE filter; we need to consider
                        // ALL filters
                        attr[group_name][attribute.name].shown = {};
                        for(var i in elements){
                            var ele = elements[i];
                            
                            var data = ele.data[attribute.name]
                            
                            if(attr[group_name][attribute.name].shown[data] != undefined){
                                continue;
                            }
                            
                            var val = data;
                            
                            switch(attribute.type){
                                case "continuous":
                                    val = parseFloat(val);
                                    break;
                                case "discrete":
                                    val = attribute.diff[val];
                                    break;
                            }

                            
                            var smin =  parseFloat( $(range_min).val() );
                            var smax =  parseFloat( $(range_max).val() );
                            var shown = (smin <= val && val <= smax);
                            
                            attr[group_name][attribute.name].shown[data] = shown;
                        }
                        
                        // now, let the parent filter everything based on the maps
                        parent.trigger("filter" + group_name);
                    }
                    
                    range_min.validate({
                        valid: function(str){
                            return valid_val(str, "min");
                        }
                    });
                    
                    range_max.validate({
                        valid: function(str){
                            return valid_val(str, "max");
                        }
                    });
                    
                    range_min.add(range_max).bind("valid", function(){
                        update_slider_from_inputs();
                        filter();
                    });
                }
                
                function use_continuous_logic(){
                    string_search.hide();
                    add_slider_logic(attribute);
                }
                
                function use_discrete_logic(){
                    function hide_slider(){
                        results_area.hide();
                        
                    }
                    hide_slider();
                    
                    function show_slider(){
                        if( results_area.is(":visible") ){
                            results_area.hide().fadeIn();
                        } else {
                            results_area.show();
                        }
                    }
                    
                    $(range_min).add(range_max).hide();
                    
                    function update_discrete_attribute(){   
                        attribute.diff = {};
                        attribute.diff_values = [];
                    
                        for(var i in attribute.values){
                            var val = "" + attribute.values[i];
                            var desired = "" + $(string_search).val();
                            
                            var diff = levenshtein(desired.toLowerCase(), val.toLowerCase());
                            
                            attribute.diff[val] = diff;
                            
                            if( $.inArray(diff, attribute.diff_values) < 0 ){
                                attribute.diff_values.push(diff);
                            }
                        }
                        attribute.diff_values = attribute.diff_values.sort(function(a, b){
                            if( a > b ){
                                return 1;
                            } else if( a < b ){
                                return -1;
                            } else {
                                return 0;
                            }
                        });
                        
                        attribute.desired = string_search.val();
                        
                    }
                    
                    var prev_string_search_val = string_search.val();
                    string_search.validate({
                        label: attribute_label,
                        valid: function(str){
                            if( str == "" ){
                                return false;
                            }
                        
                            update_discrete_attribute();
                            
                            if(attribute.diff_values.length > 1){
                                return true;
                            } else {
                                return false;
                            }
                        },
                        errorMessage: function(str){
                            if( str == "" ){
                                return "can not be blank to filter";
                            }
                            
                            return "needs a better matching string";
                        }
                    }).bind("valid", function(){
                        if( $(this).val() != prev_string_search_val ){
                            slider.slider("disable");
                            
                            $.thread({
                                worker: function(){
                                    add_slider_logic(attribute);
                                    
                                    if( attr[group_name][attribute.name].js_type == "boolean" ){                                        
                                        label_min.text("true");
                                        label_max.text("false");
                                    } else {
                                        label_min.text("most similar");
                                        label_max.text("most different");
                                    }
                                    
                                    slider.slider("enable");
                                    show_slider();
                                }
                            });
                            
                        }
                        
                        prev_string_search_val = $(this).val();
                    }).bind("invalid", function(){
                        hide_slider();
                        attr[group_name][attribute.name].shown = undefined; // hidden slider => filter has no effect
                        parent.trigger("filter" + group_name);
                    
                        prev_string_search_val = $(this).val();
                        
                        // this means all values are true or all values are false and filtering is
                        // completely useless, so just remove the filter
                        if( attr[group_name][attribute.name].js_type == "boolean" ){
                            attribute_label.remove();
                            div.remove();
                        }
                    });
                    
                    
                    // boolean is just a special case of discrete so just configure the ui so
                    // it's nice for users
                    if( attr[group_name][attribute.name].js_type == "boolean" ){
                        string_search.val("true").trigger("change").hide();
                    }
                    
                } // end use_discrete_logic
                
            } // end append_attribute
            
        } // end append_group
        
        
        for(var i in attr){
            var group = attr[i];
            var group_name = i;
            append_group(group, group_name);
        }
        
        $("#filter_tabs").tabs();
        
        vis.removeFilter();
        
        filter_dirty = false;
        
        $("#filter").trigger("available");
    }
    
    //[Node Data] Generates the Extra Node Data Tab
    /////////////////////////////////////////////////////////////////////////////////////////////////////////////////
        
        //New///////////////////////////////////////////////////////////////\
        
        
        
    var textFile;
    function create_load_node_data(){
    	var optionss = {
    		swfPath: path("swf/Importer"),
    		flashInstallerPath: path("swf/playerProductInstall"),
            data: function(data){
            	textFile = data.string; // textFile in string format
                var network = data.string;
            	var new_graph_options = {
            		network: network,
            	    name: data.metadata.name,
            	    description: "",
            	    visualStyle: GRAPH_STYLES["Default"],
            	    nodeLabelsVisible: true
            	};
                
                // parse and format the text file if one has been chosen.
                if (textFile){
                    var nodeArray = parseTabFile(textFile);
                    formatNodeArray(nodeArray, "textArea");
                    delete nodeArray;
                }
            },
    		ready: function(){
                  $("#flashImporterLoad").trigger("available");
            },
    		typeFilter: function(){
    			return "*.txt;*.tab";
    		},
    		binary: function(metadata){
    			return false;
    		}
    	};
        
        // bind importer to open node data tab
    	new org.cytoscapeweb.demo.Importer("flashImporterLoad",optionss);
    }
                                                       
    // put a text area div in the node data tab
    $("#data").append('<div id="textArea"><b>Node data has not been loaded yet. Click "Open Node Data" to load this graph\'s node data.</b></div>');        
 
    create_load_node_data();
        
        
    function popout(){
        var str = "This popout is merely for your viewing convenience. Changing these values does not have an affect on the graph";
        var txtNode = document.createTextNode(str);
        var oDiv = document.getElementById('textArea');
        var oWindow = window.open("about:blank");
        oWindow.document.body.appendChild(txtNode.cloneNode(true));
        oWindow.document.body.appendChild(document.createElement("br"));
        oWindow.document.body.appendChild(document.createElement("br"));
        oWindow.document.body.appendChild(oDiv.cloneNode(true));
    }
    
    
    
    /**
     * Prompts the user for the server data they wish to load. Gives the user a 
     * list of all available species that are available for load. Will prompt for 
     * pathway and data based on species the user wishes to load.
     **/ 
    function prompt_species(){
  
        if ($("#species_dialog").length === 0){
            // Create the dialog
            var dialog = '\
                    <div id="species_dialog" title="Load PlexDB">\
                        <div id="species_buttons" style="height:250px;overflow:scroll">\
                            Loading...Please Wait.\
                        </div>\
                    </div>';
            $('body').append(dialog);
            
            //Creates a new XMLHttpRequest, then gets the species data from the server
            var speciesRequestURL = "/file/php/proxy.php?mimeType=text/plain&url=http://www.plexdb.org/modules/webservices/datapoints.php?listplants=1";
            var req;
            if (window.XMLHttpRequest){
                req=new XMLHttpRequest();
            } else {
                req=new ActiveXObject("Microsoft.XMLHTTP");
            }
            req.open("GET", speciesRequestURL, true);
            req.send(null);
            
            // when loaded, create the buttons.
            req.onreadystatechange = function(){
                if (req.readyState == 4){
                    var speciesRequest=req.responseText;
                    document.getElementById("species_buttons").innerHTML="";
                    var lines = speciesRequest.split("\n");
                    for (var i in lines){
                            
                        // line[0] is the species and line[1] is the array_name
                        var line = lines[i].split("\t");
                        if (line[1] && line[0]){ // ignore empty lines
                            $("#species_buttons").append('<button type="button" id="species_' + i + '">' +  line[0] + ' (' + line[1] + ')</button><br/>');
                            (function(){
                                var array_name = line[1];
                            
                                $("#species_" + i).click(function(){
                                    prompt_experiment(array_name);
                                });
                            
                            //alert("species: " + line[0] + ", arrayname: " + line[1]); 
                            })();
                        }
                    }
                }   
            }    
        }
    
        $("#species_dialog").dialog({ autoOpen: false, resizable: false, width: 300 });
        $("#species_dialog").dialog("open");
        
        function prompt_experiment(exp){
            document.getElementById("species_buttons").innerHTML="Loading...Please Wait.";
            
            //Creates a new XMLHttpRequest, then gets the species data from the server
            var experimentRequestURL = "/file/php/proxy.php?mimeType=text/plain&url=http://www.plexdb.org/modules/webservices/datapoints.php?arrayname=" + exp;
            var req;
            if (window.XMLHttpRequest){
                req=new XMLHttpRequest();
            } else {
                req=new ActiveXObject("Microsoft.XMLHTTP");
            }
            req.open("GET", experimentRequestURL, true);
            req.send(null);
            
            // when loaded, create the buttons
            req.onreadystatechange = function(){
                if (req.readyState == 4){
                    var experimentRequest = req.responseText;
                    document.getElementById("species_buttons").innerHTML="";
                    var lines = experimentRequest.split("\n");
                    
                    for (var i in lines){
                            
                        // line[0] is the array_name, line[1] is the experiment, line[2] is the description
                        var line = lines[i].split("\t");
                        if (line[2] && line[1] && line[0]){ // ignore empty lines
                            $("#species_buttons").append('<button type="button" id="experiment_' + i + '">' +  line[1] + ')</button><br/>');
                            (function(){
                                var experiment = line[1];
                            
                                $("#experiment_" + i).click(function(){
                                    prompt_data(experiment);
                                });        
                            //alert("species: " + line[0] + ", arrayname: " + line[1]); 
                            })();
                        }
                    }
                    
                    
                }
            }
        }
        
        function prompt_data(experiment){
            alert("We're sorry. this isn't done yet.");
        
        }
    
    }
    
    /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    
    /**
     * The dialog that appears when the user chooses to load server data
     */ 
    var graph_choose_dialog = "";
    
    /**
     * The graph the user selected to load
     */ 
    var selectedGraph;
    
    /**
     * The node date the user selected to load
     */ 
    var selectedNodeData;
    /**
     * Prompts the user for the server data they wish to load. Will give the 
     * user the option to load all available graphs and all available node 
     * data for that graph. ---> gathers from local files....
     */ // TODO not used atm
    function prompt_server_data(){
        
        // generate the graph selection dialog and map a list of node data files to each graph the first time this is clicked.
        if (graph_choose_dialog == ""){
            var start_dialog = '\
                            <div id="server_data_prompt" title="Select graph to load">\
                                Loading...<br\>Please be patient\
                            </div>';
            $("body").append(start_dialog);
            $("#server_data_prompt").dialog({ autoOpen: false, resizable: false, width: 300 });
            $("#server_data_prompt").dialog("open");
            
            var graphsHttpRequest;
            if (window.XMLHttpRequest){
                graphsHttpRequest=new XMLHttpRequest();
            } else {
                graphsHttpRequest=new ActiveXObject("Microsoft.XMLHTTP");
            }
            graphsHttpRequest.open("GET", "load_data/files.xml", true);
            graphsHttpRequest.send(null);
            var availableFiles = []; // an array of graphNodeDataPairs...maps each graph to a list of its node_data files
            graphsHttpRequest.onreadystatechange = function(){
                if (graphsHttpRequest.readyState == 4){
                    // the xml document containging the available files
                    var filesXMLDoc=graphsHttpRequest.responseXML;
                    var graphsList=filesXMLDoc.getElementsByTagName("graph");
            	
                    // get all the names and node_data files for each graph
                    for (var i=0; i < graphsList.length; i++){
                        var graph_name=graphsList[i].getAttribute("name");
            	        graph_choose_dialog += '<input type="button" id="' + graph_name + '" value="' + graph_name + '" class="ui-state-default"/><br />';
            	        var data = [];
                        var childData=graphsList[i].getElementsByTagName("data");
            	        for (var j=0; j<childData.length; j++){
                            data.push(childData[j].textContent);
            	        }
            	        availableFiles.push(new graphNodeDataPairs(graph_name, data));
                    }
                    document.getElementById("server_data_prompt").innerHTML=graph_choose_dialog;
                    
                }
                
                
            };
        } else {
            $("#server_data_prompt").innerHTML=graph_choose_dialog;
            $("#server_data_prompt").dialog("open");
        }
        
        /**
         * A mapping of a graph name to an array of node_data files
         */ 
        function graphNodeDataPairs(name, data){
            this.graphName = name;
            this.node_data = data;
        };
        
    }
    /**
    function promptNodeData(name){
        // clear the dialog
        $("#server_data_prompt").innerHTML="";
        var dialog = "";
        var data;
        // if node data is available for graph, create buttons for the node_data
        for (var k=0; k<availableFiles.length; k++){
            if (availableFiles[k].graphName == name){
              data=availableFiles[k].node_data;
    	      break;
          }
        }
    
        // if there is node data for this graph, display it. else start loading the graph.
        if (data.length){
            for (var k=0; k<data.length; k++){
                dialog += '<input type="button" id="' + data[k] + '" value="' + data[k] + '" class="ui-state-default" onclick="load_server_data('+ name + ',' + data[k] + ')"/><br />';
    	    }
            $("#server_data_prompt").innerHTML=dialog;
        } else {
            load_server_data(name, null);
        }
    }*/
    // TODO --- loads a graph and node data from the server...
    function load_server_data(graph, node_data){
        // AJAX request from server for the graph...
        var xmlhttp; // TODO possibly create this the eloquent javascript way?
        if (window.XMLHttpRequest) { // modern browser support - IE7+, Firefox, Chrome, Opera, Safari
            xmlhttp=new XMLHttpRequest();
        } else {// support for IE6, IE5
            xmlhttp=new ActiveXObject("Microsoft.XMLHTTP");
        }
      
        xmlhttp.open("GET", "load_data/graphs/" + graph, true);
        xmlhttp.send(null);
      
        // when the graph string is loaded from the server, display it in the browser
        xmlhttp.onreadystatechange = function() {
            if (xmlhttp.readyState == 4){
                var network=xmlhttp.responseText;
                var new_graph_options = {
                    network: network,
                    description: "",
                    visualStyle: GRAPH_STYLES["Cytoscape"],
                    nodeLabelsVisible: true
                };
                open_graph(new_graph_options);
            }
        };
    }
    ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    
    
    //Helper function used to bypass the original mapping to add graph images
    function node_graphs(){
        //var flag = 0;
        var experiment_name = prompt("Please enter the title of your experiment");
        if (experiment_name !== "" && experiment_name !== null){        
    /**        for(var j in experiment_names){
                if(experiment_name == experiment_names[j]){
                    flag = 1;
                    break;
                }
            }
*/        
            var nodesInGraph = vis.nodes();
            var bypass = {  nodes:{} };
            for(var i in nodesInGraph){
               /* if(flag == 0){
                    alert("The experiment you chose is currently not supported.");
                    flag = 0;
                    $("#show_node_graph").click(); // uncheck if invalid graph
                    break;
                }*/
                if(nodesInGraph[i].data.probeset!=null){
        		    var name = nodesInGraph[i].data.id;
                    var probeset_id_name = nodesInGraph[i].data.probeset;
                    var props = { 
                        //Following URL is from John Vanhemert's graph display
                        image: "/file/php/proxy.php?mimeType=image/png&url=http://www.plexdb.org/modules/PD_browse/thumbnail_plot.php?experiment="
                        + experiment_name + "%26sequence_id=" + probeset_id_name,
                        size: 45
                    };
                    bypass[nodesInGraph[i].group][name] = props;
                }
            }
            //Puts the images over the intial visual style without actually changing the visual style
            vis.visualStyleBypass(bypass);
            update_background();
        } else {
            $("#show_node_graph").click(); // uncheck if nothing entered or cancel hit
        }
        
    }
    
                function node_color(){
             var experiment_name = prompt("Please enter the name of the experiment", "AT40"); //Name of experiment to get colors
       	var nodesInGraph = vis.nodes();    //All nodes in graph, used for finding nodes with a probeset
       	var nodesWithProbeset = [];		//Array of nodes with a probeset
       	var nodesWithProbesetId = [];		//Array of nodes with a probesetID
       	var stringNodeData;				//String of the data to be passed to the parser
       	var colorArray = new Array();		//Eventually a 2D array of all of the Treatments and their colors
       	var nodesARR = [];					//Array that stores the data from the parser
       	var current_treatment_number = 0;		//Keeps track of the current treatment being shown
       	var bypass = {  nodes:{} };		//Used to bypass the current visualization
       	var trigger;						//is used in the setTimeout for the play_animation function
       	var animation_speed = 3000;
       	var color_array_marker_2;
       	var is_started = false;
       	//Loops through all the nodes and finds the ones that contain a probeset
       	for(var i in nodesInGraph){
       		if(nodesInGraph[i].data.probeset!=null){
       		nodesWithProbeset.push(nodesInGraph[i].data.probeset);	//Not sure why both are needed *
       		nodesWithProbesetId.push(nodesInGraph[i].data.id);		//							   *
       		}
       	}
       	//Address for the color mapper
       	var address = "http://www.plexdb.org/modules/webservices/datapoints.php?experiment="+experiment_name+"%26format=plain%26verbose=0%26color=1%26method=rma%26sequence_id="
       	//Adds each probeset to the address
       	for(var j in nodesWithProbeset){
       		if(j==(nodesWithProbeset.length-1)){
       			address += nodesWithProbeset[j];
       			break;
       		}
       		address += nodesWithProbeset[j]+",";
       	}
       	stringNodeData = "/file/php/proxy.php?mimeType=text/plain&url="+address;  //Must be done this way to go through proxy
       	//Creates a new XMLHttpRequest, then gets the data from the server
       	function loadTheColorData(){
       		req = new XMLHttpRequest();
       		req.open("GET", stringNodeData, false);
       		req.send(null);
       		return req.responseText;
       	}
       	var node_color_data = loadTheColorData();	//Holds the data from the request
       	node_color_data = "probe\tcolor\n"+node_color_data;	//Data is not returned with headers, need these
       	//Parse the tab file into an array
       	nodesARR = parseTabFile(node_color_data);
       	//Keep track of start node, multiple occurences of the same probset,
       	//Since there are multiple treatments
       	var start_end_node = nodesARR[0].data.probe;
       	//Keep track of where we are in colorArray
       	var colorArrayTracker=0;
       	//Creates the 2D array to store all of the colors into their treatments
       	for(var i in nodesARR){
       		if(nodesARR[i].data.probe == start_end_node){
       			colorArray[colorArrayTracker] = new Array();
       			colorArrayTracker++;
       			k=0;
       		}
       		colorArray[colorArrayTracker-1][k] = nodesARR[i];
       		k++;
       	}
       	//Opens the dialog box
       	open_node_color_chooser();
       	//Function that will open the node color dialog box
       	//Essentially all buttons that have different functionalities
       	function open_node_color_chooser(){
       		//keeps track of what treatment is being used currently
       		var color_array_marker = 0;
       		//Only load the dialog box once, keeps from having multiple appear
       		//html that is the makeup of the dialog box
       		var dialog = '\
       		<div id="color_chooser" title="Cycle Node Colors">\
       		<div class ="tabs ui-widget">\
       		<ul></ul>\
       		<div class="ui-layout-content"/>\
       		</div>\
       		<div id="current_treatment"><center>Currently viewing Treatment #: ' + current_treatment_number + '</center></div>\
       		<div><br /><center>\
                             <input type="image" id="start_animation" class="ui-state-default" src="/img/player/play3.png"/>\
                             <input type="image" id="pause_animation" class="ui-state-default" src="/img/player/pause3.png"/>\
                             <input type="image" id="restart_animation" class="ui-state-default" src="/img/player/restart3.png"/>\
                             <input type="image" id="stop_animation" class="ui-state-default" src="/img/player/stop3.png"/></center></div><br/>\
       		<div>Speed: <input type="text" id="animation_text" value="3000" size="5"/>msec <input type="image" id="set_speed" class="ui-state-default" src="/img/player/arrow.png"/></div><br />\
       		<div class="treatment_buttons" style="height:85px;overflow:scroll">'
       		for(var i in colorArray){dialog += '<input type="button" id="treatment_'+i+'"class="ui-state-default" value="Treatment #:'+i+',"/>\t'}
       		dialog+= '</div>\
       		</div>\
       		';
       		//Append the box to the window
       		if($("#color_chooser").length==0){
       			$("body").append(dialog);
       		}
       		else{
       			document.getElementById("color_chooser").innerHTML = dialog;
       		}
       		//Sets the attributes of the box, maybe make it resizable?? Not sure how that would affect viewing
       		$("#color_chooser").dialog({autoOpen: false, resizable: false, height: 250, width: 300});
            
       		//Not sure if the ready function was necessary, had lots of issues trying to map each button correctly
       		//*****Something to go back and check*****
       		$(document).ready(function(){
       		//Goes through each treatment, number of treatments is size of colorArray
       			for(var i in colorArray){
       				//Work around I found to map the i variable correctly to each click function
       				(function() {
       					//Had to put the value of i into a temp variable to get it correctly
       					//Otherwise i was always the max length of colorArray
       					var temp = i;
       					//Adds the basic vis style bypass to each of the buttons
       					$("#treatment_"+i).click(function(){
       						for(var j in colorArray[i]){
       							var props = { 
       							color: "#"+colorArray[temp][j].data.color
       							};
       						bypass[colorArray[temp][j].group][nodesWithProbesetId[j]] = props;
       						document.getElementById("current_treatment").innerHTML = "Currently viewing Treatment #: " + temp;
       						color_array_marker = temp;
       						color_array_marker_2 = temp;
       						}
       						//Removes the current vis style bypass
       						vis.visualStyleBypass(null);
       						//Adds the new vis style bypass
       						vis.visualStyleBypass(bypass);
       						//Not sure if update_background() is needed, maybe remove****
       						update_background();
       					});
       				})();
       			}
       		});
       		//Adds functionality to the start button
       		$("#start_animation").click(function(){
       			if(is_started != true){
                       is_started = true;
       			//keeps track of if the stop button has been pressed, can probably be removed?????
       			var stopped = false;
       			//Keeps track of if the pause button has bee pressed
       			is_paused = false;
       			//Main function
       			play_animation();
       			//Needed a second marker 
       			function play_animation(){
       				//if(stopped == false){
       				//basic bypass function-------------------------------------------------
       				for(var j in colorArray[color_array_marker]){
       					var props = { 
       					color: "#"+colorArray[color_array_marker][j].data.color
       					};
       					bypass[colorArray[color_array_marker][j].group][nodesWithProbesetId[j]] = props;
       				}
       				vis.visualStyleBypass(null);
       				vis.visualStyleBypass(bypass);
       				update_background();
       				//---------------------------------------------------------------------
       				//Checks if the pause button has been pressed
       				//When paused its not really paused, it just does not advance to the next treatment
       				if(is_paused == false){
       					color_array_marker++;
       				}
       				//Updates the currently viewing what treatment dialog, only if the it is not paused
       				if(is_paused == false){
       					document.getElementById("current_treatment").innerHTML = "Currently viewing Treatment #: " + (--color_array_marker);
       					color_array_marker++;
       				}
       				//If it is paused it updates with this dialog, probably not needed, as the treatment does not change
       				//******NEEDS TESTING*******
       				/*else{
       				document.getElementById("current_treatment").innerHTML = "Currently viewing Treatment #: " + (color_array_marker);
       				}*/
       				//Needed the ready function function, to allow the graphs to catch up
       				$(document).ready(function(){
       					//keeps track of if the restart button has been clicked
       					var restartClicked = false
       					//is used for the setTimeout pause function
       					var pauseTimeout;
       					//Makes sure that the animation will stop when the max number of treatments has been reached
       					if(color_array_marker<colorArray.length){
       						//Sets the play_animation to be called in three seconds
       						//*****Need to change to 3 seconds to a user inputted value*****
       						trigger = setTimeout(function(){play_animation()}, animation_speed);
       					}
       					//Gives the pause button functionality
       					$("#pause_animation").click(function(){
       						//Needed the a second marker so that restarting the animation would start on the right treatment
       						if(is_paused != true){
       							color_array_marker = color_array_marker - 1;
       							color_array_marker_2 = color_array_marker;
       						}
       						is_paused = true;
       					});
       					//Gives the restart button functionality
       					$("#restart_animation").click(function(){
       						is_paused = false;
       						//Sets the marker to what it was before pausing
       						color_array_marker = color_array_marker_2;
       					});
       					//Gives the stop button functionality
       					$("#stop_animation").click(function(){
       						//Removes the visual style bypass
       						vis.visualStyleBypass(null);
       						//Clears the pause trigger
       						clearTimeout(pauseTimeout);
       						//Clears the animation trigger
       						clearTimeout(trigger);
       						//Sets the treatment marker back to 0, or the first treatment
       						color_array_marker = 0;
       						//Resets the count back to 0, technically at this point it isn't anything though
       						document.getElementById("current_treatment").innerHTML = "Currently viewing Treatment #: 0";
       						is_started = false;
       					});      
       				});
       			}
       		}
       		});
       		
       		$('div#color_chooser').bind('dialogclose', function(event){
       			//Clicks the show node color button to remove the check box
       			$("#show_node_color").click();
       			//Clicks the style button to close the menu
       			$("#style_menu").click();
       			//Clears the animation trigger
       			clearTimeout(trigger);
       			//Sets the treatment marker back to 0, or the first treatment
       			color_array_marker = 0;
       			colorArray.length = 0;
       			is_started = false;
       		});
            
       		$("#set_speed").click(function(){
       			animation_speed = document.getElementById("animation_text").value;
       		});
       		//Opens the dialog box
       		$("#color_chooser").dialog("open");
       	}
       }
              
        
        //Small function that is called when the show node color button is clicked when checked
       function remove_node_color(){
           vis.visualStyleBypass(null);
       }
    //******************SHORTSCUTS*************************************************************
    
  
    
    
    // Save File
    shortcut.add("Ctrl+S", function(){
        $("#save_file").click(); 
    });
    
    shortcut.add("Ctrl+O", function(){
        $("#file_importer").click(); //TODO open file
    });
    
    // Layout -> Recalculate Layout
    shortcut.add("Ctrl+L+R", function(){
        var layout = $("#cytoweb_container").cw().layout();
        $("#cytoweb_container").cw().layout(layout);
    });
    
    // Select -> Nodes -> Select All Nodes 
    shortcut.add("Ctrl+A", function(){
        $("#cytoweb_container").cw().select("nodes");
    });
    
    // Select -> Nodes -> Deselect All Nodes
    shortcut.add("Ctrl+Shift+A", function(){
          $("#cytoweb_container").cw().deselect("nodes");
    });
    
    // Select -> Nodes -> First Node Neighbor
    shortcut.add("Ctrl+6", function(){
         find_first_neighbor();
    });
    
    // Select -> Nodes -> Invert Node Selection
    shortcut.add("Ctrl+I", function(){
          invert_node_selection("nodes");
    });

    // Select -> Nodes -> Select Nodes by Selected Edges
    shortcut.add("Ctrl+7", function(){
        select_by_edges(); 
    });
    
    // Select -> Nodes -> Select Nodes by Name
    shortcut.add("Ctrl+F", function(){
        select_by_name(); 
    });
    
    // Select -> Nodes -> Show all nodes
    shortcut.add("Ctrl+Shift+H", function(){
        $("#cytoweb_container").cw().filter("nodes", function(node){
            return true;
        });
        for(var i in hidden_nodes){
            hidden_nodes[i] = null;
        }
    });
     
    // Select -> Nodes -> Hide all nodes
    shortcut.add("Ctrl+H", function(){
            $("#cytoweb_container").cw().filter("nodes", function(node){
           return false;
        });
    });
    
    // Select -> Edges -> Select all edges
    shortcut.add("Alt+A", function(){
        $("#cytoweb_container").cw().select("edges");
    });
    
    // Select -> Edges -> Deselect all edges
    shortcut.add("Alt+Shift+A", function(){
        $("#cytoweb_container").cw().deselect("edges");
    });
    
     // Select -> Edges -> Invert Edge Selection
    shortcut.add("Alt+I", function(){
          invert_node_selection("edges");
    });
    
     // Select -> Edges -> Show all edges
    shortcut.add("Alt+Shift+H", function(){
       $("#cytoweb_container").cw().filter("edges", function(edge){
           return true;
       });
       for(var i in hidden_edges){
           hidden_edges[i] = null;
       }
    });
    
     // Select -> Edges -> Hide all Edges
    shortcut.add("Alt+H", function(){
        $("#cytoweb_container").cw().filter("edges", function(edge){
            return false;
        });
    });
      
      // Select -> Select All
    shortcut.add("Ctrl+Alt+A", function(){
        $("#cytoweb_container").cw().select();
    });
      
    // Select -> Deselect All
    shortcut.add("Ctrl+Alt+Shift+A", function(){
        $("#cytoweb_container").cw().deselect();
    });
    
    //Layout -> Double to Zoom
    shortcut.add("Ctrl+D", function(){
        $("#dbl_to_zoom").click();
        $("#layout_menu").click();
    });
    
    //Layout -> popout
    shortcut.add("Ctrl+P", function(){
        popout();
    });
    
    //Layout -> recalculate layout
    shortcut.add("Ctrl+R", function(){
        var layout = $("#cytoweb_container").cw().layout();
        $("#cytoweb_container").cw().layout(layout);
    });
    
    //Layout -> settings
    shortcut.add("Ctrl+Shift+S", function(){
        open_settings();
    });   
    
    shortcut.add("Ctrl+Alt+Shift+N", function(){
        $("#open_node_data").click();
    });
    
    //shortcut.add("Ctrl+Shift+S", function(){
    
    //    $("#show_node_graph").click();
    //});
    //********************************************************************************************
    
    //Reverts the visual style back to its' original form
    function remove_node_graphs(){
        vis.visualStyleBypass(null);
        update_background();
    }
    
    //Finds the first neighbors of any selected nodes in the current graph
    function find_first_neighbor(){
        var selected_nodes = vis.selected("nodes");
        var edge_search = vis.edges();
        var neighbor_found = [];
        var count_nodes = 0;
        for(var j in selected_nodes){
            for(var i in edge_search){
                if(edge_search[i].data.source == selected_nodes[j].data.id){
                    neighbor_found[count_nodes] = edge_search[i].data.target;
                    count_nodes++;
                }
                else if(edge_search[i].data.target==selected_nodes[j].data.id){
                    neighbor_found[count_nodes] = edge_search[i].data.source;
                    count_nodes++;
                }
            }
        }
        vis.select("nodes",neighbor_found);
    }
    
    //Inverts the selection of the currently selected nodes
    //Very Important** edges_or_nodes var must be inputted as either
    //"edges" or "nodes"
    function invert_node_selection(edges_or_nodes){
        var selected_nodes = vis.selected(edges_or_nodes);
        if(edges_or_nodes == "nodes")
            var all_nodes = vis.nodes();
        else if(edges_or_nodes == "edges")
            var all_nodes = vis.edges();
        var nodes_to_select = [];
        var breakflag = 0;
        for(var i in all_nodes){
            for(var j in selected_nodes){
                if(all_nodes[i].data.id==selected_nodes[j].data.id){
                    breakflag = 1;
                    break;
                }
            }
            if(breakflag!=1){
                nodes_to_select.push(all_nodes[i].data.id);
            }
            breakflag = 0;
        }
        vis.deselect(edges_or_nodes);
        vis.select(edges_or_nodes,nodes_to_select);
    }
       
    //Selects nodes from the selected edges
    function select_by_edges(){
        var edges_selected = vis.selected("edges");
        var all_nodes = vis.nodes();
        var nodes_to_select = [];
        for(var i in edges_selected){
            for(var j in all_nodes){
                if(edges_selected[i].data.source==all_nodes[j].data.id){
                    nodes_to_select.push(all_nodes[j].data.id);
                }
                else if(edges_selected[i].data.target==all_nodes[j].data.id){
                    nodes_to_select.push(all_nodes[j].data.id);
                }
            }
        }
        vis.select("nodes", nodes_to_select);
    }
    
    //Selects nodes by the name that is given
    function select_by_name(){
        var all_nodes = vis.nodes();
        var name_to_find = prompt("Select nodes whose name or synonym is: (Use * for wildcard)", "*");
        var length_of_name = name_to_find.length;
        var nodes_to_select = [];
        if(name_to_find.indexOf("*") == 0){
            nodes_to_select = all_nodes;
        }
        else if(name_to_find.indexOf("*") == (-1)){
            for(var i in all_nodes){
                if(all_nodes[i].data.label == name_to_find){
                    nodes_to_select.push(all_nodes[i].data.id);
                }
            }
        }
        else{
            var piece_to_find = name_to_find.substring(0,(length_of_name-1));
            for(var i in all_nodes){
                if(all_nodes[i].data.label.indexOf(piece_to_find) != (-1)){
                    nodes_to_select.push(all_nodes[i].data.id);
                }
            }
        }
        vis.select("nodes", nodes_to_select);
    }
    
    function highlight_selected(){
            var selected = vis.selected("nodes");
    //*****************************************************ADD THIS**********************************************************************************************
        	for(var i in selected){
                
                var p = selected[i].data.probeset;
                if (p){
                    selected_for_highlight[i] = selected[i].data.probeset;    
                    var rowNode = document.getElementById('import_data_' + p);
                    if (rowNode){
                        rowNode.bgColor="#FDD017";
                    }
                }
                /*
    			var selected_probe = $("#importednodes_data_table:contains(selected[i].data.probeset)");
              alert("selected PROBE:" + selected_probe);
    			if(selected_probe!=null && document.getElementById('importednodes_data_table')){
    				selected_for_highlight[i] = selected[i].data.probeset;
         //           document.getElementById('
    		//	    alert(selected[i].data.probeset);
                    document.getElementById('import_data_' + selected[i].data.probeset).bgcolor="#F88017";
                    //document.getElementById('importednodes_data_table').innerHTML = document.getElementById('importednodes_data_table').innerHTML.replace(selected[i].data.probeset, '<font color="#F88017">'+selected[i].data.probeset+'</font>');
    			}*/
    		}
    //***********************************************************************************************************************************************************************		
        }
    	
    	function dehighlight_selected(){
    		for(var i in selected_for_highlight){
                if (document.getElementById('import_data_'+selected_for_highlight[i])){
                    document.getElementById('import_data_' + selected_for_highlight[i]).bgColor = "";
                }
                delete selected_for_highlight[i];
    		/*	document.getElementById('importednodes_data_table').innerHTML = document.getElementById('importednodes_data_table').innerHTML.replace('<font color="#F88017">'+selected_for_highlight[i]+'</font>', selected_for_highlight[i]);
    			selected_for_highlight[i] = null;*/
    		}
    	}
        

     /**
     * Parses a tab delimted data file and returns an array of nodes
     * containing the data in the file. 
     * @fileString A tab delimited node data file in string format.
     * array that maps each heading to the node's value
     * "nodes", and the property data containing an object which contains an 
     * array that maps each heading to the node's value
     **/
    function parseTabFile(fileString){
        
        var currentNodes=vis.nodes();
        
        // An array of every line. The first element of the array contains
    	// tab delimited attributes. Each subsequent line contains node data
    	// for the corresponding attribute.
    	var fileLines=fileString.split("\n");
    
    	// parse the heading. The heading should be on the first line, 
    	// with each attribute delimited by a tab. 
    	var headingsArr=fileLines[0].split("\t");
    	
    	// Create an array of nodes based on each of the following lines...
    	var nodesArr = new Array();
    	
        //next position to add node data
        var nodesArrayPos = 0;
        
        
        
    	for (var i = 1; i < fileLines.length; i++){
            // if the next line is not blank and if it is in the graph, put the data in the node array
            if ($.trim(fileLines[i])){
               
                var node = {
                    group : "nodes",
                    data : new dat(fileLines[i])
                };
                
                for (var j in currentNodes){
                    // don't add if they're both undefined....
                    if (node.data.probe && currentNodes[j].data.probeset == node.data.probe){
                        nodesArr[nodesArrayPos] = node;
                        nodesArrayPos++;
                    }
                }
            }
    	}	
    		
    	return nodesArr;
    
    	/**
    	 * A helper object which creates the node data. 
    	 * @nodeData a line of node data from the text file.
    	 */
    	function dat(nodeDataString){
    		var nodeValues = nodeDataString.split("\t");
    		for (var i in headingsArr){
                // if there is a legitimate value, set the nodeValue. In a properly formatted file, 
                // there shouldn't be any undefined data...If there is undefined data, set it to an empty string.
                if (nodeValues[i] !== undefined){
                    this["" + headingsArr[i]]=nodeValues[i];
                } else {
                    this["" + headingsArr[i]]="";
                }
            }
    	}
    }
    
    /**
     * Formats a nodeArray into a given container. The keys of nodeArray will be 
     * formatted as headings and the values will be formatted as the data. The values
     * will be allowed to be edited
     * 
     * @nodeArray an array of node objects with the property data. data is an object
     * with a set of keys and values, where the keys act as the headings for the
     * node data and the values are the data corresponding to the headings.
     * @textArea the id of the container to store the formatted nodes into
     **/
    function formatNodeArray(nodeArray, textArea){
         
        var container = $("#" + textArea)
        container.html(""); // clear info area
          
          /**
           * Helper function which prints the nodeArray into a table.
           * @name the header to put above the table
           * @id the id to give the the table HTML tag
           */ 
        function print_selection(name, id){
            var headings = [];
                  
            var half = $('<div class="half"></div>');
      	  container.append(half);
              
      	  var section = $('<div class="section"></div>');
            half.append(section);
      
            section.append('<div class="title_line"><label class="title">' + name + '</label></div>');
                  
            if( nodeArray.length > 0 ) {
                var table = $('<table class="tablesorter" id="'+id+'"></table>');
                section.append(table);
                      
                var thead = $('<thead></thead>');
                table.append(thead); 
                      
                var thead_row = $('<tr></tr>');
                thead.append(thead_row);
      		
      		  // Get the headings from the nodes
                for(var j in nodeArray[0].data){
                    headings.push(j);
                }
                      
                headings.sort();
                      
                // move id heading to front TODO can prbly just move probe/probeset to the front 
                for(var j in headings){
                    var heading = headings[j];
                          
                    if( heading == "id" ){
      		          for(var i = j; i > 0; i--){
      				      var first = headings[ i - 1 ];
      					  var second = headings[ i ];                    
      					  headings[ i - 1 ] = second;
      					  headings[ i ] = first;
      				  }            
      			  } else if(heading == "probe"){  // move probe heading to front   
                        for(var k = j; k>0; k--){
                            var first_probe = headings[k-1];
                            var second_probe = headings[k];
                            headings[k-1] = second_probe;
                            headings[k] = first_probe;
                        }
                    }
      		  }
                      
                // make headings
                for(var j in headings){
      	          var heading = headings[j];
                    thead_row.append('<th><label>' + ("" + heading).replace(/(\s)/g, "&nbsp;") + '</label></th>');
                }
                      
                var tbody = $('<tbody></tbody>');
                table.append(tbody);
                      
                // make data row for each data item (i.e. for each node)
                for (var i in nodeArray){ 
      		      var data = nodeArray[i].data;
                    //if it has an id use the id for the name, else use the i count    
                    if (data.probe){
                        var row = $('<tr id="import_data_' + data.probe + '" name="import_data_' + data.probe + '_' + i + '"></tr>');
      			      tbody.append(row);
                    } else {
                        var row = $('<tr name="import_data_' + i + '"></tr>');
                        tbody.append(row);
                    }
                  
                    // make 
                    for(var j in headings){
                        var param_name = headings[j];
                        var param_val = data[param_name];
                              
                        var val = ("" + param_val).replace(/(\s)/g, "&nbsp;");
                        var entry = $('<td class="code" name="'+param_name+'">' + val + '</td>');
                        row.append(entry);
                              
                        if( typeof param_val == "boolean" ){
      			          entry.attr("type", "boolean");   
                        } else {
      					  entry.attr("type", "string");
                        }
                    }
                }
            } else {
                section.append('<p>No data loaded.</p>');
            }     
        }
          
        print_selection("Nodes", "importednodes_data_table");

              
        $("#data").find(".tablesorter").tablesorter();
    }   
        
        // [end] Some clean up
    ////////////////////////////////////////////////////////////////////////////////////////////////
    
    // trigger resize to recalculate the layout
    $(window).trigger("resize");
    
}); 