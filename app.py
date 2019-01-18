import similarities as sim
import os
import json
import time
from multiprocessing import Process, Array
from flask import Flask, render_template, url_for, abort


app = Flask(__name__)

# Load the models in memory when connection is made
print('Loading models on disk')
models = os.listdir('models/')
models = [model for model in models if model.endswith('.model')]
print('Loading ', models)

@app.route('/')
@app.route('/w2v_networks/<model>/<word>')
def w2v_networks(model='2016-08-w2v_model_all-normed.bin', word='trump'):
	# Function that returns the view of the Penelope word2vec/monadology explorer.

	sims = sim.getW2vSims('models/' + model, querystring=word, longitudinal=False)
	print(sims)
	sims = json.dumps(sims)

	print('w2v nearest neighbours:')
	print(sims)

	# Get a list of available w2v models
	models = os.listdir('models/')
	models = [model for model in models if model.endswith('-normed.bin')]
	print(models)

	return render_template('index.html', inputs=sims, models=models)

@app.route('/w2v/<model>/<word>')
@app.route('/w2v/<model>/<word>/<animate>')
def w2v(model, word='kek', animate=False):
	
	if animate == 'true':
		animate = True

	if (animate == False):
		# Function that returns the n closest words of a certain word in a word2vec model.
		sims = sim.getW2vSims('models/' + model, querystring=word, longitudinal=False)
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
			sims = sim.getW2vSims('models/' + model, querystring=word, longitudinal=False)
			li_sims.append(sims)

		print(li_sims)
		sims = json.dumps(li_sims)
		elapsed_time = time.time() - start_time
		print('Done in ', elapsed_time)
		return sims
