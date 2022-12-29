# star-graph

Discover what projects people who stared a repo are involved with.

## Entry points

To start from your pins: <https://xiegeo.github.io/star-graph/>

To start from any repo, replace the owner and name in the url <https://xiegeo.github.io/star-graph/?owner=xiegeo&name=star-graph>

## Screenshot

Now with system colors!

![Screenshot](example.png)

## Under The Hood

Clone this repo and open index.html in the browser, it's just static files accessing [GitHub GraphQL API](https://docs.github.com/graphql) directly.

The API auth token is saved in [session storage](https://developer.mozilla.org/docs/Web/API/Window/sessionStorage).

Node.js is not banned, a build environment is just not needed for this project yet. This is a call out to the strength of web technologies. (Or I'm just old and want my [blink tag](https://www.google.com/search?q=blink+tag) back)
