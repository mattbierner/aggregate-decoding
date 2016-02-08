# Aggregate Decoding
Script that posts a random image from [Wikimedia Commons][commons], plus a random sampling of between one and three hashtags to Twitter every 30 minutes. Results can be highly entertaining.

See it in action [@Arthur_Morty][Arthur_Morty].

Unlike [@_LovedHArt][_LovedHArt], this script only maintains short term memory. It may post about the same tag more than once, but hopefully not too close together. The interval has also been decrease to every half hour since the script uploads images. I was originally targeting Instagram but their API sucks.

# Running
To randomize your images, first [register an application with Twitter](http://dev.twitter.com).

The main script for the bot lives in `index.js` and uses [Node][node].

```bash
$ cd aggregate-decoding
$ npm install
```

Make sure to set the following environment variables using your fancy new registered Twitter application:

```bash
$ export AGG_TWITTER_CONSUMER_KEY="your app key"
$ export AGG_TWITTER_CONSUMER_SECRET="your app secret"
$ export AGG_TWITTER_ACCESS_TOKEN_KEY="your access token key"
$ export AGG_TWITTER_ACCESS_TOKEN_SECRET="your access token secret"
```

Then just run the script, `$ node index.js`. A pseudo-json log file is written to `log.txt` recording what has been posted so far.

I recommend running the script in the background using using [forever][forever], `$ forever start index.js`.

[forever]: https://github.com/foreverjs/forever
[node]: https://nodejs.org/
[Arthur_Morty]: https://twitter.com/Arthur_Morty
[commons]: https://commons.wikimedia.org/wiki/Main_Page
[_LovedHArt]: https://github.com/mattbierner/i-u2764-everything
