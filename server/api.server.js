/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

'use strict';

const register = require('react-server-dom-webpack/node-register');
register();
const babelRegister = require('@babel/register');
const {supabase} = require('../supabase/init');

babelRegister({
  ignore: [/[\\\/](build|server|node_modules)[\\\/]/],
  presets: [['react-app', {runtime: 'automatic'}]],
  plugins: ['@babel/transform-modules-commonjs'],
});

const express = require('express');
const compress = require('compression');
const {readFileSync} = require('fs');
const {unlink, writeFile} = require('fs').promises;
const {pipeToNodeWritable} = require('react-server-dom-webpack/writer');
const path = require('path');
const React = require('react');
const ReactApp = require('../src/App.server').default;

const PORT = 4000;
const app = express();

app.use(compress());
app.use(express.json());

app.listen(PORT, () => {
  console.log(`React Notes listening at http://localhost:${PORT}`);
});

function handleErrors(fn) {
  return async function(req, res, next) {
    try {
      return await fn(req, res);
    } catch (x) {
      next(x);
    }
  };
}

app.get(
  '/',
  handleErrors(async function(_req, res) {
    await waitForWebpack();
    const html = readFileSync(
      path.resolve(__dirname, '../build/index.html'),
      'utf8'
    );
    // Note: this is sending an empty HTML shell, like a client-side-only app.
    // However, the intended solution (which isn't built out yet) is to read
    // from the Server endpoint and turn its response into an HTML stream.
    res.send(html);
  })
);

async function renderReactTree(res, props) {
  await waitForWebpack();
  const manifest = readFileSync(
    path.resolve(__dirname, '../build/react-client-manifest.json'),
    'utf8'
  );
  const moduleMap = JSON.parse(manifest);
  pipeToNodeWritable(React.createElement(ReactApp, props), res, moduleMap);
}

function sendResponse(req, res, redirectToId) {
  const location = JSON.parse(req.query.location);
  if (redirectToId) {
    location.selectedId = redirectToId;
  }
  res.set('X-Location', JSON.stringify(location));
  renderReactTree(res, {
    selectedId: location.selectedId,
    isEditing: location.isEditing,
    searchText: location.searchText,
  });
}

app.get('/react', function(req, res) {
  sendResponse(req, res, null);
});

const NOTES_PATH = path.resolve(__dirname, '../notes');

app.post(
  '/notes',
  handleErrors(async function(req, res) {

    const newNote = {
      title: (req.body.title || '').slice(0, 255),
      body: (req.body.body || '').slice(0, 2048),
    }

    const { data: note, error } = await supabase
    .from('notes')
    .insert([newNote])
    .single()

    await writeFile(
      path.resolve(NOTES_PATH, `${note.id}.md`),
      req.body.body,
      'utf8'
    );

    sendResponse(req, res, note.id);
  })
);

app.put(
  '/notes/:id',
  handleErrors(async function(req, res) {
    const updatedId = Number(req.params.id);
    const bla = process.env.ENDPOINT;
    const updated = {
      id: updatedId,
      title: (req.body.title || '').slice(0, 255),
      body: (req.body.body || '').slice(0, 2048),
    }

    const { data: note, error } = await supabase
      .from('notes')
      .update(updated)
      .eq('id', updatedId)

    await writeFile(
      path.resolve(NOTES_PATH, `${updatedId}.md`),
      req.body.body,
      'utf8'
    );
    sendResponse(req, res, null);
  })
);

app.delete(
  '/notes/:id',
  handleErrors(async function(req, res) {
    const { data: note, error } = await supabase.
      from('notes')
      .delete()
      .eq('id', Number(req.params.id))

    await unlink(path.resolve(NOTES_PATH, `${req.params.id}.md`));
    sendResponse(req, res, null);
  })
);

app.get(
  '/notes',
  handleErrors(async function(_req, res) {
    const { data: notes, error } = await supabase
    .from('notes')
    .select('*')
    .order('id')

    res.json(notes);
  })
);

app.get(
  '/notes/:id',
  handleErrors(async function(req, res) {
    const { data: note, error } = await supabase
    .from('notes')
    .select()
    .eq('id', Number(req.params.id))
    .single()
    
  if (error) {
    console.log('error', error)
    return res.send('Method not allowed.')
  }

    res.json(note);
  })
);

app.get(
  '/notes/search/:text',
  handleErrors(async function(req, res) {
    const { data: note, error } = await supabase
    .from('notes')
    .select()
    .or(`title.ilike.%${req.params.text}%,body.ilike.%${req.params.text}%`)
    
  if (error) {
    console.log('error', error)
    return res.send('Method not allowed.')
  }

    res.json(note);
  })
);

app.get('/sleep/:ms', function(req, res) {
  setTimeout(() => {
    res.json({ok: true});
  }, req.params.ms);
});

app.use(express.static('build'));
app.use(express.static('public'));

app.on('error', function(error) {
  if (error.syscall !== 'listen') {
    throw error;
  }
  var bind = typeof port === 'string' ? 'Pipe ' + port : 'Port ' + port;
  switch (error.code) {
    case 'EACCES':
      console.error(bind + ' requires elevated privileges');
      process.exit(1);
      break;
    case 'EADDRINUSE':
      console.error(bind + ' is already in use');
      process.exit(1);
      break;
    default:
      throw error;
  }
});

async function waitForWebpack() {
  while (true) {
    try {
      readFileSync(path.resolve(__dirname, '../build/index.html'));
      return;
    } catch (err) {
      console.log(
        'Could not find webpack build output. Will retry in a second...'
      );
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
}
