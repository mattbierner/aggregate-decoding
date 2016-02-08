/**
    Super hacky functions to grab random images from Wikimedia commons.
*/
"use strict";
const path = require('path');
const request = require('request');
const parseString = require('xml2js').parseString;

const USER_AGENT = "AggregateDecoding/0.0 (https://github.com/mattbierner/aggregate-decoding)"

// Size to scale images to for upload.
const UPLOADED_IMAGE_SIZE = 500;

// Rough file extension based filter.
const ACCEPTED_TYPES = ['jpeg', 'png', 'jpg', 'gif'];

const isSupportedFileType = url =>
    url && ACCEPTED_TYPES.indexOf(path.extname(url).toLowerCase())

/**
    Grab the url to a thumbnail of a commons image.
*/
const getThumbnailImageUrl = (name, width, height) =>
    new Promise((resolve, reject) =>
        request({
            url: `https://tools.wmflabs.org/magnus-toolserver/commonsapi.php?image=${encodeURIComponent(name)}&thumbwidth=${width}&thumbheight=${height}&versions`,
            headers: { 'User-Agent': USER_AGENT }
        },  (error, response, body) => {
            if (error)
                return reject(error);

            if (response.statusCode !== 200)
                return reject("Bad status");

            parseString(body, { ignoreAttrs: true }, (err, result) => {
                if (err)
                    return reject(err);

                if (result && result.response && result.response.versions) {
                    const versions = result.response.versions[0];
                    if (versions && versions.version && versions.version[0]) {
                        const thumburl = versions.version[0].thumburl;
                        if (thumburl && thumburl[0])
                            return resolve({
                                name: name,
                                url: thumburl[0]
                            });
                    }
                }
                return reject('Could not process xml');
            });
        }));

/**
    Select a random file name from Wikimedia Commons.
*/
const selectRandomCommonsFiles = () =>
    new Promise((resolve, reject) =>
        request({
            url: 'https://commons.wikimedia.org/w/api.php?action=query&list=random&rnnamespace=6&rnlimit=10&format=json',
            headers: { 'User-Agent': USER_AGENT }
        }, (error, response, body) => {
            if (error)
                return reject(error);
            if (response.statusCode !== 200)
                return reject("Bad status");

             const info = JSON.parse(body);
             return resolve(
                 info.query.random
                     .map(x => x.title)
                     .filter(isSupportedFileType));
        }));

/**
    Download an image from Wikimedia Commons.
*/
const getImage = (url) =>
    new Promise((resolve, reject) =>
        request({
            url: url,
            encoding: null,
            headers: { 'User-Agent': USER_AGENT }
        }, (error, response, body) => {
            if (error)
                return reject(error);
            if (response.statusCode !== 200)
                return reject("Bad status");
            return resolve(body);
        }));

/**
    Try to get a random image from Wikimedia Commons.
*/
module.exports.getRandomImage = () =>
    selectRandomCommonsFiles().then(urls =>
        urls.reduce((p, url) =>
            p.catch(err =>
                getThumbnailImageUrl(url, UPLOADED_IMAGE_SIZE, UPLOADED_IMAGE_SIZE)
                    .then(img => getImage(img.url)
                        .then(data => ({ name: img.name, url: img.url, data: data})))),
            Promise.reject('no images')));
