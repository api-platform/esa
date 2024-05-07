const http2 = require('node:http2');
const { pipeline } = require('node:stream');
const fs = require('node:fs');

const options = {
  key: fs.readFileSync('key.pem'),
  cert: fs.readFileSync('cert.pem'),
};

// Create a secure HTTP/2 server
const server = http2.createSecureServer(options);

function jsonResponse(stream, path) {
  stream.respond({
    ':status': 200,
    'content-type': 'application/ld+json; charset=utf-8',
  });

  const fileStream = fs.createReadStream(path);
  pipeline(fileStream, stream, (err) => {
    if (err) {
      console.log(err); // No such file
      // this message can't be sent once `pipeline` already destroyed the socket
      return res.end('Error');
    }
  });
}

server.on('stream', (stream, headers) => {
  const p = headers[':path']

  if (fs.existsSync(`.${p}.html`)) {
      stream.respond({
        ':status': 200,
        'content-type': 'text/html; charset=utf-8',
      });
      pipeline(fs.createReadStream(`.${p}.html`), stream, (err) => err && console.log(err));
    return;
  }

  switch(headers[':path']) {
    case '/books':
      jsonResponse(stream, './fixtures/books.jsonld')
      break;
    case '/authors/1':
      jsonResponse(stream, './fixtures/authors/1.jsonld')
      break;
    case '/authors/2':
      jsonResponse(stream, './fixtures/authors/2.jsonld')
      break;
    case '/authors/3':
      jsonResponse(stream, './fixtures/authors/3.jsonld')
      break;
    case '/authors/3':
      break;
    case '/':
      stream.respond({
        ':status': 200,
        'content-type': 'text/html; charset=utf-8',
      });
      pipeline(fs.createReadStream('./index.html'), stream, (err) => err && console.log(err));
      break;
    case '/ld':
      stream.respond({
        ':status': 200,
        'content-type': 'text/javascript',
      });
      pipeline(fs.createReadStream('../packages/ld/index.js'), stream, (err) => err && console.log(err));
      break;
    case '/use-swrld':
      stream.respond({
        ':status': 200,
        'content-type': 'text/javascript',
      });
      pipeline(fs.createReadStream('../packages/use-swrld/use-swrld.js'), stream, (err) => err && console.log(err));
      break;
    default:
      stream.respond({
          ':status': 404
      })
      stream.end()
  }
})
  
server.listen(443);
