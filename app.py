import similarities as sim
import os
import json
import time
from multiprocessing import Process, Array
from flask import Flask, render_template, url_for, abort


app = Flask(__name__)

model_sources = ["4chan", "the_donald", "breitbart"]

# Load the models in memory when connection is made
print('Loading models on disk')
models = os.listdir('models/')
for model_source in model_sources:
	model_folder = "models/" + model_source + "/"
	models = [model_folder + model_file for model_file in os.listdir("models/" + model_source) if model_file.endswith('.bin')]
	print('Loading models from ', model_source)

@app.route('/')
@app.route('/w2v_networks/<source>/<model>/<word>')
def w2v_networks(source='4chan', model='4chan-2016-08-w2v_model_all-normed.bin', word='trump'):
	# Function that returns the view of the Penelope word2vec/monadology explorer.
	model_location = 'models/' + source + '/' + model

	sims = sim.get_w2v_sims(model_location, query_string=word, longitudinal=False)
	print(sims)
	sims = json.dumps(sims)

	print('w2v nearest neighbours:')
	print(sims)

	# Get a list of available w2v models for the HTML form
	model_files = []
	for source in model_sources:
		for model_file in os.listdir('models/' + source):
			model_files.append({source: model_file})

	print(models)

	return render_template('index.html', inputs=sims, models=model_files)

@app.route('/w2v/<source>/<model>/<word>')
@app.route('/w2v/<source>/<model>/<word>/<animate>')
def w2v(source='4chan', model='4chan-2016-08-w2v_model_all-normed.bin', word='kek', animate=False):
	
	model_location = 'models/' + source + '/' + model

	if animate == 'true':
		animate = True

	if (animate == False):
		# Function that returns the n closest words of a certain word in a word2vec model.
		sims = sim.get_w2v_sims(model_location, query_string=word, longitudinal=False)
		print(sims)
		sims = json.dumps(sims)
		return sims

	else:
		start_time = time.time()
		print('Starting')
		# Get the similar terms per mondel over time
		li_sims = []
		models = os.listdir('models/')
		models = [model for model in models if model.endswith('-normed.bin')]
		print(models)

		for index, model in enumerate(models):
			sims = sim.get_w2v_sims(model_location, query_string=word, longitudinal=False)
			li_sims.append(sims)

		print(li_sims)
		sims = json.dumps(li_sims)
		elapsed_time = time.time() - start_time
		print('Done in ', elapsed_time)
		return sims

