import express from 'express';
import bodyParser from 'body-parser';
import {filterImageFromURL, deleteLocalFiles} from './util/util';
import * as request from 'request-promise-native';
var errors = require('request-promise-native/errors');

(async () => {



  // Init the Express application
  const app = express();

  // Set the network port
  const port = process.env.PORT || 8082;
  
  // Use the body parser middleware for post requests
  app.use(bodyParser.json());

  // @TODO1 IMPLEMENT A RESTFUL ENDPOINT
  // GET /filteredimage?image_url={{URL}}
  // endpoint to filter an image from a public url.
  // IT SHOULD
  //    1
  //    1. validate the image_url query
  //    2. call filterImageFromURL(image_url) to filter the image
  //    3. send the resulting file in the response
  //    4. deletes any files on the server on finish of the response
  // QUERY PARAMATERS
  //    image_url: URL of a publicly accessible image
  // RETURNS
  //   the filtered image file [!!TIP res.sendFile(filteredpath); might be useful]

  /**************************************************************************** */
  app.get("/filteredimage", async ( req, res) => {
    // look for image_url
    console.log(req.query);
    const imageUrl = req.query.image_url;

    const fs = require('fs');
    const path = require('path');

    if ( !imageUrl ) {
      res.status(400).send({msg: "image_url is required"});
    }

    var validUrl = require('valid-url');
    if (!validUrl.isUri(imageUrl)) {
      res.status(400).send({msg: "image_url not a valid url"});
      return;
    }

    let mimeTypes = {
      gif: 'image/gif',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      svg: 'image/svg+xml',
    };
    let type = mimeTypes[path.extname(imageUrl).split('.')[1] as keyof typeof mimeTypes];

    console.log("Type: " + type);
    if (!type) {
      res.status(422).send({message: "The requested media type is unsupported"});
      return;
    }

    // Check for resource to see if it exists
    var err = null;
    var statusCode = null;
    await request.head({uri: imageUrl, simple: false, resolveWithFullResponse: true})
        .then((response) => {
          console.log("HEAD OK")
          console.log(response.statusCode);
          statusCode = response.statusCode;
        })
        .catch((error: Error) => {
          console.log("Error retrieving resource: " + error); // failed for technical reasons (not an error status code)
          err = error;
        });

    // Handle errors
    if (err) {
      res.status(400).send({msg: "Problem retrieving requested image"});
      return;
    } else if (statusCode != 200) {
      res.status(statusCode).send({msg: "Problem retrieving requested image. Status code=" + statusCode});
      return;
    }

    // Now, actually retrieve the contents and apply filter
    // TODO: Somehow combine the check for the image and the jimp.read operation to avoid making two requests
    const filePath = await filterImageFromURL(imageUrl);
    console.log("Path to image: " + filePath);

    var s = fs.createReadStream(filePath);
    s.on('open', function () {
      res.set('Content-Type', type);
      s.pipe(res);
    });
    s.on('error', function () {
      res.set('Content-Type', 'text/plain');
      res.status(404).end('Not found');
    });
  } );
  //! END @TODO1
  
  // Root Endpoint
  // Displays a simple message to the user
  app.get( "/", async ( req, res ) => {
    res.send("try GET /filteredimage?image_url={{}}")
  } );

  // Start the Server
  app.listen( port, () => {
      console.log( `server running http://localhost:${ port }` );
      console.log( `press CTRL+C to stop server` );
  } );
})();
