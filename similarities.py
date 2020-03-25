import json
import os
from gensim.models import Word2Vec, KeyedVectors

def train_w2v_model(input_tokens, model_name, min_word=200):

	# Train a model
	print('Training ' + model_name)
	model = Word2Vec(train, min_count=min_word)
	# pickle the entire model to disk, so we can load & resume training later
	model.save(model_name + '.model')
	#store the learned weights, in a format the original C tool understands
	model.wv.save_word2vec_format(model_name + '.model.bin')
	return model

def load_w2v_model(input_model):
	
	# Load a new model
	model = KeyedVectors.load(input_model, mmap='r')
	model.wv.syn0norm = model.wv.syn0				# prevent recalc of normed vectors
	#model = KeyedVectors.load_word2vec_format(load, binary=True)
	return model

def get_w2v_sims(input_model, query_string, longitudinal=False, nearest_neighbours=10):
	""" returns a json file of word2vec nearest neighbours """

	model = load_w2v_model(input_model)

	neigbours = []
	if query_string not in list(model.wv.vocab):
		return 'Word not in vocabulary'
	else:
		# Change this later with better models
		similars = model.wv.most_similar(positive=[query_string], topn = 200)
		total_words = 0
		for words in similars:
			if model.wv.vocab[words[0]].count >= 200:
				neigbours.append(words)
				total_words = total_words + 1

				if total_words == nearest_neighbours:
					break
	print(neigbours)

	#create the JSON file required for the D3 network graph
	di_nn = {}
	di_nn['nodes'] = []
	di_nn['links'] = []

	di_nn['nodes'].append({'name': 'empty'})
	di_nn['nodes'][0]['name'] = query_string
	di_nn['nodes'][0]['group'] = 1

	for index, neigbour in enumerate(neigbours):
		#create nodes
		di_nn['nodes'].append({'name': 'empty'})
		di_nn['nodes'][index + 1]['name'] = neigbour[0]
		di_nn['nodes'][index + 1]['group'] = 1
		#create edges
		di_nn['links'].append({'source': 'empty'})
		di_nn['links'][index]['source'] = index + 1
		di_nn['links'][index]['target'] = 0
		di_nn['links'][index]['weight'] = neigbour[1]

	return di_nn