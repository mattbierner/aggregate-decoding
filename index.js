"use strict";
const path = require('path');
const fs = require('fs');
const Twitter = require('twitter');
const request = require('request');
const parseString = require('xml2js').parseString;
const commons = require('./commons');

// Time between postings, in ms.
const INTERVAL = 1000 * 60 * 10; // ten minutes.

const LOG_FILE = path.join(__dirname, 'log.txt');

// Disable actual postings
const DEBUG = false;

/**
    In memory store of tags to post about.

    Cannot contain duplicates, but does not track long term history.
*/
let tag_cache = [];

// Number of tags to add to the pool each time.
const SAMPLE_LIMIT = 20;

// Max number of tags to keep in cache.
const CACHE_LIMIT = 100;

const add_cache = (x) => {
    tag_cache.unshift(x);
    // unduplicate
    tag_cache = tag_cache.filter((x, pos) => tag_cache.indexOf(x) === pos);
    while (tag_cache.length > CACHE_LIMIT)
        tag_cache.pop();
};

const remove_cache = (x) => {
    const i = tag_cache.indexOf(x);
    if (i > -1)
        tag_cache.splice(i, 1);
};


const client = new Twitter({
    consumer_key: process.env.AGG_TWITTER_CONSUMER_KEY,
    consumer_secret: process.env.AGG_TWITTER_CONSUMER_SECRET,
    access_token_key: process.env.AGG_TWITTER_ACCESS_TOKEN_KEY,
    access_token_secret: process.env.AGG_TWITTER_ACCESS_TOKEN_SECRET,
});

/**
    Start filling in the tags using the sample stream.
*/
const populate_tags = (k) =>
    client.stream('statuses/sample', {}, (stream) => {
        stream.on('data', tweet => {
            if (tweet && tweet.entities && tweet.entities.hashtags) {
                for (let tag of tweet.entities.hashtags)
                    if (!k(tag.text))
                        stream.destroy();
            }
        });

        stream.on('error', e => {
            console.error('stream error', e);
        });
    });

/**
    Try to make sure we have a good set of tags.
*/
const ensure_future_tags = () =>
    new Promise((resolve) => {
        let required = SAMPLE_LIMIT;
        populate_tags(tag => {
            add_cache(tag);
            if (required-- < 0) {
                resolve(tag_cache);
                return false; /* done */
            }
            return true; /* continue */
        });
    });

/**
    Select between 1 and 3 tags.
*/
const pick_tags = () =>
    new Promise((resolve) => {
        const toPick = 1 + Math.floor(Math.random() * 3);
        const tags = [];
        let remaining = 100;
        for (let i = 0; i < toPick; ++i) {
            const picked = tag_cache[Math.floor(Math.random() * tag_cache.length)];
            remaining -= picked.length;
            if (remaining < 0 && tags.length)
                break;
            tags.push(picked);
            remove_cache(picked);
        }
        resolve(tags);
    });

/**
    Generate the status message
*/
const status_message = (tags) =>
    '.' + tags.map(x => "#" + x).join(' ');

/**
    Upload image to Twitter
*/
const upload_image = (image) =>
    new Promise((resolve, reject) =>
        client.post('media/upload', { media: image.data },
            (err, media, response) =>
                err ? reject(err) : resolve({ name: image.name, url: image.url, media_id: media.media_id_string})));

/**
    Post the tweet
*/
const share = (tags, image) =>
    new Promise((resolve, reject) =>
        DEBUG ? resolve(tags) :
        client.post('statuses/update', { status: status_message(tags), media_ids: image.media_id },
            (err, tweet, response) =>
                err ? reject(err) : resolve(tags)));


const logPosting = (tags, image) => {
    console.log(`Posted about [${status_message(tags)}] with ${image.name} ----- ${image.url}`);
    fs.appendFileSync(LOG_FILE, JSON.stringify({ time: Date.now, tags: tags, image: image }) + '\n');
};

/**
    Start posting
*/
const post_random_image = () =>
    commons.getRandomImage().then(upload_image).then(image =>
        ensure_future_tags().then(pick_tags).then(tags =>
            share(tags, image)
                .then(tags => {
                    logPosting(tags, image)
                    return tags;
                })
                .catch(err => {
                    console.error('post error', err);
                    return err;
                }))
        .catch(err => {
            console.error('pick error', err);
            return err;
        }))
    .catch(err => {
        console.error('image upload error', err);
        return err;
    });

const main = () =>
    post_random_image()
        .then(
            _ => setTimeout(main, INTERVAL),
            _ => setTimeout(main, INTERVAL));

main();
