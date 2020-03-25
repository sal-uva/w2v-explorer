/*

|**** EXPLANATION ****|


*/

$(document).ready(function() {

	var svg = d3.select('svg'),
	width = +svg.attr('width'),
	height = +svg.attr('height'),
	color = d3.scaleOrdinal(d3.schemeCategory10);

	// Global variables
	var node
	var link
	var nodes // All current nodes used for the network
	var links // All current links used for the network
	var simulation
	var g
	var queryword
	var model_name
	var arr_addednodes
	var obj_time_sims
	var time_centernode
	var ctrl_press = false // whether control is pressed (used to delete nodes)
	var model_count // indicates how many models are in the back-end
	var animate_network // setInterval var to animate the network 

	simulation = d3.forceSimulation(nodes)
	.force('charge', d3.forceManyBody().strength(-100))
	.force('link', d3.forceLink(links).distance(90))
	.force('x', d3.forceX())
	.force('y', d3.forceY())
	.alphaTarget(1)
	.on('tick', ticked);

	var option_el = $('#model_select')	// Used to get the selected documents
	
	function initialise_network(json_object){
		// Initialise the d3 graph

		d3.selectAll("svg > *").remove();

		queryword = json_object['nodes'][0]['name']
		model_source = $('#model_select:selected').attr('data-source')
		model_name = $('#model_select').val()
		console.log(queryword)

		nodes = []
		links = []

		for (var key in json_object){
			if (json_object.hasOwnProperty(key)) {
				if (key == 'nodes'){
					for (x in json_object[key]){
						if (json_object[key].hasOwnProperty(x)){
							console.log(json_object[key][x])
							nodes.push({id: (json_object[key][x]['name'])})
						}
					}
				}
				if (key == 'links'){
					for (i in json_object[key]){
						if (json_object[key].hasOwnProperty(i)){
							// console.log(json_object[key][i])
							links.push({source: (json_object[key][i]['source']), target: (json_object[key][i]['target']), weight: parseInt(json_object['links'][i]['weight'] * 10)})
						}
					}
				}
			}
		}

		//store already present nodes in array
		var names = json_object['nodes']
		arr_addednodes = []
		for (x in names) {
			arr_addednodes.push(names[x]['name'])
		}

		g = svg.append('g')
		.attr('transform', 'translate(' + width / 2 + ',' + height / 2 + ')')
		.attr('id','network');
		link = g.append('g')
		.attr('stroke', '#000')
		.attr('stroke-width', 1.5)
		.selectAll('.link');
		node = g.append('g')
		.attr('stroke', '#fff')
		.attr('stroke-width', 1.5)
		.selectAll('.node');

		restart();

		// add classes to node to style differently for nodes per platform
		var arr_newnodes = arr_addednodes
		for (var i = 0; i < arr_newnodes.length; i++) {
			// Type of node is dependent on the model_name
			if (model_source == '4chan'){
				$('#node-' + arr_newnodes[i]).addClass('4chan-node')
			}
			else if (model_source == 'breitbart'){
				$('#node-' + arr_newnodes[i]).addClass('breitbart-node')
			}
			else if (model_source == 'the_donald'){
				$('#node-' + arr_newnodes[i]).addClass('the_donald-node')
			}
		}
		arr_newnodes = []

		console.log('Nodes:')
		console.log(nodes)
		console.log('Links:')
		console.log(links)

		$('#' + queryword).addClass('clicked')
	}

	initialise_network(json_initial);

	function restart() {
		// Create a new graph from JSON data
		// This function is called each time a change in the network occurs

		node = node.data(nodes, function(d) { return d.id;});
		node.exit().remove();
		node = node
		.enter()
		.append('text')
		.text(function (d) { return d.id; })
		.attr('text-anchor', 'middle')
		.attr('id', function(d) { return ('node-' + d.id); })
		.merge(node)

		// Apply the general update pattern to the links.
		link = link.data(links, function(d) { return d.source.id + '-' + d.target.id; });
		link.exit().remove();
		link = link
		.enter()
		.append('line')
		.merge(link);

		// Update and restart the simulation.
		simulation.nodes(nodes);
		simulation.force('link').links(links);
		simulation.alpha(1).restart();
	}

	function ticked() {
		// This function updates the x and y positions of the nodes and links
		node.attr('x', function(d) { return d.x; })
		.attr('y', function(d) { return d.y; })

		link.attr('x1', function(d) { return d.source.x; })
		.attr('y1', function(d) { return d.source.y; })
		.attr('x2', function(d) { return d.target.x; })
		.attr('y2', function(d) { return d.target.y; });
	}

	/* Non-D3 functions */
	function get_sims(callback, model_source, model_name, word, animate=false) {
		// Returns a dictionary with w2v most_similar results

		var url_animate = ''
		var url = '/w2v/' + model_source + '/' + model_name + '/' + word + url_animate
		animate_counter = 0

		if (animate) {
			url_animate = '/true'
		}
		
		$.ajax({
			dataType: 'text',
			url: url,
			success: callback,

			error: function(error) {
				console.log(url)
				document.getElementById('alerts').innerHTML = 'Error in backend'
				console.log('error')
				console.log(error);
			}
		});
	}

	// Callback function to get w2v most_similar json
	function parse_sims(callback){
		get_sims(function(data) {
			
			if (data == 'Word not in vocabulary'){
				document.getElementById('alerts').innerHTML = ''
				$('#alertbox').html(data)
			}
			else {
				callback(data)
			}
		});
	}

	function create_network(json, model_source, word, new_graph=false, append_graph=false, same_node=false, remove_old_nodes=false){
		/*
		Function to create a new network

		json:			str,	Name of the w2v model to query (listed in front-end dropdown).
		model_source	str,	Source of the model (e.g. "the_donald").
		word:			str,	Word to create a new network with, or to append to an existing network.
		new_graph:		bool,	Whether to create a totally new graph.
		append_graph:	bool,	Whether to append to an existing graph.
		same_node:		bool,	Whether to make a graph for the same node in a different timespan.
								If so, it retains the already existing nodes
		remove_old_nodes:	bool,	Remove the nodes that do not appear in a new model (used in slider)
		.
		*/

		// Parse the input data if it's not an object already
		var obj_sims
		if (typeof json == 'object') {
			obj_sims = json
		}
		else {
			obj_sims = JSON.parse(json)
		}

		if (new_graph == true) {
			console.log('Restarting network for ' + word)
			initialise_network(obj_sims)
			document.getElementById('alerts').innerHTML = ''
		}

		else {
			//set the source of the clicked node, i.e. the index of the node labels array
			var index_source = get_index(word)
			var link_weight
			//z is used to skip the first node - for when a present node is clicked
			var z = 0

			// If nodes need to be appended
			if (append_graph) {
				console.log('Appending network for ' + word)
				z = 1
			}

			// If the center node stays the same but network should show nodes over time
			else if (same_node) {
				console.log('Showing nodes for ' + word + ' from a different model')
				console.log(arr_addednodes.indexOf(word))
				console.log(word)
			}

			var arr_newnodes = []
			var arr_oldnodes = arr_addednodes.slice()
			arr_newnodes.push(word)

			//add new nodes and links
			for (var key in obj_sims){
				if (obj_sims.hasOwnProperty(key)) {
					//add nodes to array
					if (key == 'nodes'){
						//loop through new nearest neighbours
						for (x in obj_sims[key]){

							if (obj_sims[key].hasOwnProperty(x)){

								node_name = obj_sims['nodes'][x]['name']
								arr_newnodes.push(node_name)
								console.log(node_name)

								// Skip the first returned node, as it is the same as the clicked node
								// Check whether nodes already exist - else just update the link
								if (arr_oldnodes.includes(node_name)) {
									console.log('node already added')
									if (x > 0) {
										// Don't add a new link if the slider is used and the nodes is already in the new ones
										if (!same_node && !remove_old_nodes) {
											console.log('Creating link')
											links.push({source: (index_source), target: (arr_addednodes.indexOf(node_name)), weight: parseInt(obj_sims['links'][(x - 1)]['weight'] * 10)})
										}
									}
								}

								// If node does not already exist, add it
								else {
									nodes.push({id: (node_name)})
									arr_addednodes.push(node_name)
									link_weight = node_name
									
									// source = clicked node, i.e. index_source
									// target = last added node to arr_addednode
									var target_source = get_index(node_name)
									if (append_graph == false) {
										links.push({source: (index_source), target: (target_source), source_id: (node_name), weight: parseInt(obj_sims['links'][(x - 1)]['weight'] * 10)})
									}
									else {
										//skip the first link, since there are eleven nodes and ten links with a new graph
										if (x == 0) {
											console.log(x)
										}
										else {
											console.log(x)
											links.push({source: (index_source), target: (target_source), source_id: (node_name), weight: parseInt(obj_sims['links'][(x - 1)]['weight'] * 10)})
										}
									}									
								}
							}
						}
					}
				}
			}

			console.log('Nodes:')
			console.log(nodes)
			console.log('Links:')
			console.log(links)

			restart()

			// Remove the old nodes that are not in the new nodes if the time slider is used
			if (same_node && remove_old_nodes) {

				// console.log('Removing old nodes')
				
				// Make an array that includes the node names that did not reappear
				var arr_drop_nodes = arr_oldnodes.filter(function(item){
					return arr_newnodes.indexOf(item) == -1;
				});

				// console.log(arr_drop_nodes)
				// Drop nodes and links
				for (i in arr_drop_nodes) {
					remove_node(arr_drop_nodes[i])
				}
			}

			$('#node-' + word).addClass('clicked')

			// add classes to node to style differently for nodes per platform
			for (var i = 0; i < arr_newnodes.length; i++) {
				console.log(model_name)
				if (model_name.substring(0,2) == 'yt'){
					$('#node-' + arr_newnodes[i]).addClass('yt-node')
				}
				else if (model_name.substring(0,4) == 'chan'){
					$('#node-' + arr_newnodes[i]).addClass('chan-node')
				}
			}
			arr_newnodes = []
			document.getElementById('alerts').innerHTML = ''
		}
	}


	function create_time_networks(json, word) {
		// Create an object of similarities over time and show the first network

		console.log('Animating the network over time.')

		obj_time_sims = JSON.parse(json)
		time_centernode = word

		// Create a slider with a dynamic length based on the amount of w2v models results returned
		model_count = obj_time_sims.length
		create_slider(model_count)

		nodes = []
		links = []
		arr_addednodes = []
		node = ''
		link = ''
		g = ''
		$('#network').remove()

		document.getElementById('alerts').innerHTML = ''

		// Create the network for the first w2v model
		initialise_network(obj_time_sims[0])

		// Show the name of the first model
		model_names = document.getElementById('model_select').options
		model_name = model_names[0].value
		$('#time_model').html(model_name)

		restart();
	}

	function remove_node(node_name) {
		// Takes a node name and removes a node and its links from the network

		// console.log('Removing ' + node_name)

		var all_links = links.slice()
		var all_nodes = nodes.slice()
		var count_removed = 0
		var node_index = get_index(node_name)

		// Get the index of the node and remove it
		for (i in all_nodes) {
			if (all_nodes[i]['id'] == node_name) {
				nodes.splice(i, 1)
			}
		}
		
		// Drop all links connecting to the node
		for (x in all_links) {
			if (all_links[x]['source']['index'] == node_index || all_links[x]['target']['index'] == node_index) {
				// console.log('removing link')
				// console.log(x - count_removed)
				links.splice(x - count_removed, 1)
				count_removed++
			}
		}

		arr_addednodes.splice(node_index, 1)

		restart()
	}

	function get_index(node_name) {
		// Returns the index of a node from its label
		var all_nodes = nodes.slice()
		// default to a new node for appending node
		var node_index = all_nodes.length
		for (i in all_nodes) {
			if (all_nodes[i]['id'] == node_name) {
				node_index = parseInt(i)
			}
		}
		// console.log('Index for ' + node_name + ' is ' + node_index)
		return node_index
	}

	function stop_animation() {
		// Stops any ongoing network animation
		$('#btn-animate-slider').html('Animate')
		$('#btn-animate-slider').attr('disabled', 'false')
		clearInterval(animate_network)
	}

	function create_slider(length) {
		// Creates an HTML slider based on the amount of w2v models returned from the server
		// Remove the old slider if it exists
		console.log('adding slider')
		$('#slider-container').empty()
		$('#slider-container').html('<input type="range" min="1" max="' + length + '" value="1" id="time-slider"><button id="btn-animate-slider">Animate</button>')
	}

	////////////////////
	/* CLICK HANDLERS */
	////////////////////

	$('svg').on('click', 'text', function() {
		stop_animation()
		var input_word = this.innerHTML
		$('#alerts').html('')

		if (ctrl_press) {
			remove_node(input_word)
		}

		else {
			$(this).addClass('clicked')

			model_name = $('#model_select').val()								// Get model name
			model_source = $('option:selected', option_el).attr('data-source')	// CHANGE
			
			document.getElementById('alerts').innerHTML = 'Loading...'
			console.log(model_source, input_word)

			get_sims(function(response){
				create_network(response, model_source, model_name, input_word, new_graph=false, append_graph=false)
			},
			model_source, model_name, input_word)
		}
	});

	$('#btn-restart').on('click', function(){
		// Create a fresh network. Calls 'create_network' which calls 'initialise_network'
		stop_animation()
		$('#slider-container').empty()

		var input_word = $('#querystring').val()
		if (input_word == '') {
			alert('Please type a word to restart the new network with.')
		}
		else {
			model_name = $('#model_select').val()
			document.getElementById('alerts').innerHTML = 'Loading...'
			
			model_source = $('option:selected', option_el).attr('data-source')	// Get model source

			get_sims(function(response){
				create_network(response, model_source, input_word, new_graph=true, append_graph=false)
			},
			model_name, input_word)
		}
	});

	$('#btn-append').on('click', function(){
		stop_animation()
		var input_word = $('#querystring').val()
		if (input_word == '') {
			alert('Please type a word to append to the network.')
		}
		else if (arr_addednodes.includes(input_word)){
			document.getElementById('alerts').innerHTML = 'Node already added'
		}
		else{
			document.getElementById('alerts').innerHTML = 'Loading...'
			model_name = $('#model_select').val()
			model_source = $('option:selected', option_el).attr('data-source')	// Get model source

			get_sims(function(response){
				create_network(response, model_source, input_word, new_graph=false, append_graph=true)
			},
			model_name, input_word)
		}
	});

	$('#btn-time-range').on('click', function(){
		stop_animation()
		var input_word = $('#querystring').val()
		if (input_word == '') {
			alert('Please type a word to animate the network with.')
		}
		else {
			$('#model_select')[0].selectedIndex = 0
			model_name = $('#model_select').val()
			document.getElementById('alerts').innerHTML = 'Loading...'
			
			get_sims(function(response){
				create_time_networks(response, input_word)
			},
			model_name, input_word, animate=true)
		}
	});

	// Update the network if the slider changes
	$('#slider-container').on('change', '#time-slider', function(){
		clearInterval(animate_network)
		$('#model_select')[0].selectedIndex = (this.value - 1)
		model_source = $('option:selected', option_el).attr('data-source')	// Get model source
		model_name = $('#model_select').val()
		$('#time_model').html(model_name)
		create_network(obj_time_sims[this.value - 1], model_source, time_centernode, new_graph=false, append_graph=false, same_node=true, remove_old_nodes=true)
	});

	$('#slider-container').on('click', '#btn-animate-slider', function(){
		$('#model_select')[0].selectedIndex = 0
		model_source = $('option:selected', option_el).attr('data-source')	// Get model source
		var model_counter = 0
		$('#time-slider').attr('value', model_counter + 1)
		$('#btn-animate-slider').html('Animating...')
		$('#btn-animate-slider').attr('disabled', 'true')
		create_network(obj_time_sims[model_counter], model_source, time_centernode, new_graph=false, append_graph=false, same_node=true, remove_old_nodes=true)
		model_counter++

		animate_network = setInterval(function() {
			$('#model_select')[0].selectedIndex = (model_counter - 1)
			model_source = $('option:selected', option_el).attr('data-source')	// Get model source
			model_name = $('#model_select').val()
			$('#time-model').html(model_name)
			$('#time-slider').attr('value', model_counter + 1)
			create_network(obj_time_sims[model_counter], model_source, time_centernode, new_graph=false, append_graph=false, same_node=true, remove_old_nodes=true)
			model_counter++

			if (model_counter >= model_count) {
				clearInterval(animate_network)
			}
		}, 3000)
	});

	// Recognise control key
	$(document).keydown(function(event){
		if (event.which == "17") {
			ctrl_press = true
		}
	});
	$(document).keyup(function(event){
		if (event.which == "17") {
			ctrl_press = false
		}
	});
});