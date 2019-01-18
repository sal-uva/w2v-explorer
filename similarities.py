import json
import os
from gensim.models import Word2Vec, KeyedVectors

def loadModels(model):
	"""
	Loads the models in memory so read is quicker

	"""
	print('Saving ' + model + ' as normed')
	loaded_model = KeyedVectors.load('models/' + model)
	print('Doing loaded_model.init_sims(replace=True)')
	loaded_model.init_sims(replace=True)
	print('Saving as normed')
	loaded_model.save('models/' + model[:-6] + '-normed.bin')
	print('Loading normed model')
	normed_model = KeyedVectors.load('models/' + model[:-6] + '-normed.bin', mmap='r')
	print('Doing normed_model.syn0norm = normed_model.syn0')
	normed_model.wv.syn0norm = normed_model.wv.syn0		# prevent recalc of normed vectors
	print('Most similar')
	normed_model.wv.most_similar('4chan')				# any word will do: just to page all in
	

def getWord2vecModel(train='', load='', modelname='', min_word=200):
	if train != '':
		print('Training ' + modelname)
		# train model
		# neighbourhood?
		model = Word2Vec(train, min_count=min_word)
		# pickle the entire model to disk, so we can load & resume training later
		model.save(modelname + '.model')
		#store the learned weights, in a format the original C tool understands
		model.wv.save_word2vec_format(modelname + '.model.bin')
		return model
	elif load != '':
		model = KeyedVectors.load(load, mmap='r')
		model.wv.syn0norm = model.wv.syn0				# prevent recalc of normed vectors
		#model = KeyedVectors.load_word2vec_format(load, binary=True)
		return model

def getW2vSims(inputmodel, querystring, longitudinal=False, nearest_neighbours=10):
	""" returns a json file of word2vec nearest neighbours """
	model = getWord2vecModel(load=inputmodel)

	neigbours = []
	if querystring not in list(model.wv.vocab):
		return 'Word not in vocabulary'
	else:
		# Change this later with better models
		similars = model.wv.most_similar(positive=[querystring], topn = 200)
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
	di_nn['nodes'][0]['name'] = querystring
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