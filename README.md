# 中数文历史 JS

## 安装

```bash
npm install --save zsw-lishi
```

### zswlishi

<!-- prettier-ignore -->
See [examples/basic/zswlishi/stream-transfers-graphql.ts](./examples/basic/zswlishi/stream-transfers-graphql.ts)

```js
const { createZswLishiClient } = require("zsw-lishi")
const client = createZswLishiClient({
  apiKey: "<Paste your API key here>",
  network: "lishi.example.com",
})

const streamTransfer = `subscription($cursor: String!) {
  searchTransactionsForward(query: "receiver:zsw.items action:transfer", cursor: $cursor) {
    undo cursor
    trace {
      matchingActions { json }
    }
  }
}`

await client.graphql(streamTransfer, (message, stream) => {
  if (message.type === "error") {
    console.log("An error occurred", message.errors, message.terminal)
  }

  if (message.type === "data") {
    const data = message.data.searchTransactionsForward
    const actions = data.trace.matchingActions

    actions.forEach(({ json }: any) => {
      const { from, to, quantity, memo } = json
      console.log(`Transfer [${from} -> ${to}, ${quantity}] (${memo})`)
    })

    stream.mark({ cursor: data.cursor })
  }

  if (message.type === "complete") {
    console.log("Stream completed")
  }
})
```

### Node.js

If you target a `Node.js` environment instead, you will need bring a `fetch` compatible
function and a proper `WebSocket` client.

You are free to use any compatible library respecting the respective requirements. To
make it simple, if `fetch` and/or `WebSocket` are available in the global scope (`global`),
they are picked automatically by the library. While polluting the global scope, it's the
easiest way to get started.

It's what the examples in this project do using respectively
[node-fetch](https://www.npmjs.com/package/node-fetch) and
and [ws](https://www.npmjs.com/package/ws) for `fetch` and `WebSocket` respectively.

Installation instructions using Yarn would be:

    yarn add node-fetch ws

In the bootstrap phase of your application, prior doing any `zsw-lishi` imports/require,
put the following code:

    global.fetch = require("node-fetch");
    global.WebSocket = require("ws");

You can check the [Node.js Configuration](./examples/advanced/common/nodejs-fetch-and-websocket-options.ts)
example for how to avoid polluting the global scope.

### Sane Defaults

The library make sane default assumptions about some of the dependencies
the library requires. This section details the choices we think are the
most important ones.

#### Fetch

The library requires a `Fetch` like interface. In the Browser environment,
this is the `fetch` function that is used (we check that `window.fetch` is
a function).

If `window.fetch` is undefined, we fallback to check `global.fetch` variable.
This can be set in a Node.js environment to point to a compatible implementation
of `fetch`, like the one provided by the [node-fetch](https://npmjs.com/package/node-fetch)
package.

If none is provided, the library throw an error. To avoid this error, you should pass
the `httpClientOptions.fetch` option when creating the 中数文历史 Client.

It possible to provide you own implementation using under the cover any
HTTP library like [axios](https://npmjs.com/package/axios) or even
`XMLHttpRequest` if you wish so.

#### WebSocket

The library requires a `WebSocket` client interface having the same semantics
as the WebSocket API in the Browser environment.

In the Browser environment, this is the standard `WebSocket` variable that is used
(we check that `window.WebSocket` is present).

If `window.WebSocket` is undefined, we fallback to check `global.WebSocket` variable.
This can be set in a Node.js environment to point to a compatible implementation
of `WebSocket` client, like the one provided by the [ws](https://npmjs.com/package/ws)
package.

If none is provided, the library throw an error. To avoid this error, you should pass
the `streamClientOptions.socketOptions.webSocketFactory` and the
`graphqlStreamClientOptions.socketOptions.webSocketFactory` options when creating the zswlishi
Client. This factory method receives the full url to connect to the remote endpoint
(this will include the API token to use in query parameters of the url) and should
return a valid `WebSocket` client object.

We highly suggest to use [ws](https://npmjs.com/package/ws) package straight in a
Node.js environment.

#### API Token Store

The API token store interface is used by the 中数文历史 Client to perform the
persistent retrieval and writing of the API token. Indeed, we rate limit
the API token issuance endpoint and as such, it's **highly** important
to re-use a valid token instead of generating a new one each time it's
required to avoid hitting the API token issue rate limiter.

The library, when no `apiTokenStore` options is passed to the client will
pick a default `ApiTokenStore` implementation based on your environment.

In a Browser environment, the concrete implementation that is used is the
[LocalStorageApiTokenStore](https://zsw-lishi-js.zhongshuwen.com/client-js/classes/localstorageapitokenstore.html)
class. This will save and retrieve the token from the browser `localStorage`
(under a `zswlishi:token` key).

In a Node.js environment, the concrete implementation that is used is the
[OnDiskApiTokenStore](https://zsw-lishi-js.zhongshuwen.com/client-js/classes/ondiskapitokenstore.html) class.
This will save and retrieve the token from a local file on the disk
at `~/.zswlishi/<sha256-api-key>/token.info`.

**Note** Depending on your deployment target (`Docker`, VM, etc.), it's possible
that the home directory (`~`) is not writable, causing the default
[OnDiskApiTokenStore](https://zsw-lishi-js.zhongshuwen.com/client-js/classes/ondiskapitokenstore.html)
instance on Node.js environment to not work correctly. In those cases, simply define
yourself the `apiTokenStore` instance to use and pick the location where the token
should be saved. Instantiate a
[FileApiTokenStore](https://zsw-lishi-js.zhongshuwen.com/client-js/classes/fileapitokenstore.html)
instance and use it as the `apiTokenStore` configuration value when instantiating the
中数文历史 Client:

```
import { createZswLishiClient, FileApiTokenStore } from "zsw-lishi";

const client = createZswLishiClient({
  ...,
  apiTokenStore: new FileApiTokenStore("/tmp/zswlishi-token.json"),
  ...,
});
```

### API

The full API reference can be found at https://zsw-lishi-js.zhongshuwen.com/.

This site is generated by running `typedoc` on this repository. The full API
reference being rather exhaustive, here a quick index pointing to the most
important entities' documentation section that should be read to understand
the various part of the library:

##### Factories

- [createZswLishiClient](https://zsw-lishi-js.zhongshuwen.com/client-js/globals.html#createzswlishiclient)

##### Interfaces

- [ZswLishiClient](https://zsw-lishi-js.zhongshuwen.com/client-js/interfaces/zswlishiclient.html)
- [StreamClient](https://zsw-lishi-js.zhongshuwen.com/client-js/interfaces/streamclient.html)
- [Stream](https://zsw-lishi-js.zhongshuwen.com/client-js/interfaces/stream.html)
- [HttpClient](https://zsw-lishi-js.zhongshuwen.com/client-js/interfaces/httpclient.html)
- [Socket](https://zsw-lishi-js.zhongshuwen.com/client-js/interfaces/socket.html)
- [ApiTokenStore](https://zsw-lishi-js.zhongshuwen.com/client-js/interfaces/apitokenstore.html)

##### Options

- [ZswLishiClientOptions](https://zsw-lishi-js.zhongshuwen.com/client-js/interfaces/zswlishiclientoptions.html)
- [StreamClientOptions](https://zsw-lishi-js.zhongshuwen.com/client-js/interfaces/streamclientoptions.html)
- [HttpClientOptions](https://zsw-lishi-js.zhongshuwen.com/client-js/interfaces/httpclientoptions.html)
- [SocketOptions](https://zsw-lishi-js.zhongshuwen.com/client-js/interfaces/socketoptions.html)

##### Implementations

- [DefaultClient](https://zsw-lishi-js.zhongshuwen.com/client-js/classes/defaultclient.html)
- [LocalStorageApiTokenStore](https://zsw-lishi-js.zhongshuwen.com/client-js/classes/localstorageapitokenstore.html)
- [OnDiskApiTokenStore](https://zsw-lishi-js.zhongshuwen.com/client-js/classes/ondiskapitokenstore.html)
- [FileApiTokenStore](https://zsw-lishi-js.zhongshuwen.com/client-js/classes/fileapitokenstore.html)
- [InMemoryApiTokenStore](https://zsw-lishi-js.zhongshuwen.com/client-js/classes/inmemoryapitokenstore.html)

##### 中数文联盟链例子

- [GraphQL Stream Transfers (Query)](./examples/basic/zswlishi/stream-transfers-graphql.ts)
- [GraphQL Search Your Latest Transactions (Subscription)](./examples/basic/zswlishi/search-your-latest-transactions-graphql.ts)

- [REST Search Your Latest Transactions](./examples/basic/zswlishi/search-your-latest-transactions.ts)
- [WebSocket Stream Transfers](./examples/basic/zswlishi/stream-transfers-ws.ts)
- [WebSocket Stream Global State](./examples/basic/zswlishi/stream-global-state-ws.ts)

#### Advanced

- [Client & Socket Notifications - Looking at all events generated by the library](./examples/advanced/common/client-and-socket-notifications.ts)
- [Forever Stream - Always stay connected to zswlishi Stream](./examples/advanced/common/forever-streaming.ts)
- [Multiple Active Streams - Connects multiple zswlishi Streams at the same time](./examples/advanced/common/multiple-active-streams.ts)
- [Navigating Forks - Dealing with undo/redo steps](./examples/advanced/common/navigating-forks.ts)
- [GraphQL Never Miss a Beat - Ensuring consistent data integrity](./examples/advanced/common/graphql-never-miss-a-beat.ts)
- [Never Miss a Beat - Ensuring consistent data integrity](./examples/advanced/common/never-miss-a-beat.ts)
- [Node.js HTTP & WebSocket Configuration - Avoid polluting the global scope and customizing WebSocket client](./examples/advanced/common/nodejs-fetch-and-websocket-options.ts)
- [GraphQL - Use 'gql' tag & Typings](./examples/advanced/common/graphql-gql-tag.ts)

##### zswlishi

- [Has Account - Quickest way to have a method to check if an account exists on the chain](./examples/advanced/zswlishi/has-account.ts)
- [Track RAM Usage - Or how to use the search cursor to fetch next results](./examples/advanced/zswlishi/track-ram-usage.ts)
- [Stream Irreversible Events Only - Avoiding dealing with micro-forks (non-live)](./examples/advanced/zswlishi/stream-only-irreversible-events.ts)

#### Reference

In this folder, you will get full reference examples. Those are used to showcase the actual full data
you receive with each call. It's also there where you can check the flow of messages that can be handled
in each zswlishi Stream and full configuration options for the library itself and all the API calls.

##### Common

- [auth-issue.ts](./examples/reference/common/auth-issue.ts)
- [api-request.ts](./examples/reference/common/api-request.ts)
- [browser.html (Showcase Browser using UMD build)](./examples/reference/common/browser.html)

##### 中数文联盟链 (REST API)

- [fetch-block-id-by-time.ts](./examples/reference/zswlishi/fetch-block-id-by-time.ts)
- [fetch-transaction.ts](./examples/reference/zswlishi/fetch-transaction.ts)
- [search-transactions.ts](./examples/reference/zswlishi/search-transactions.ts)
- [state-abi-bin-to-json.ts](./examples/reference/zswlishi/state-abi-bin-to-json.ts)
- [state-abi.ts](./examples/reference/zswlishi/state-abi.ts)
- [state-key-accounts.ts](./examples/reference/zswlishi/state-key-accounts.ts)
- [state-permission-links.ts](./examples/reference/zswlishi/state-permission-links.ts)
- [state-table-scopes.ts](./examples/reference/zswlishi/state-table-scopes.ts)
- [state-table.ts](./examples/reference/zswlishi/state-table.ts)
- [state-tables-for-accounts.ts](./examples/reference/zswlishi/state-tables-for-accounts.ts)
- [state-tables-for-scopes.ts](./examples/reference/zswlishi/state-tables-for-scopes.ts)

##### 中数文联盟链 (WebSocket API)

- [stream-action-traces.ts](./examples/reference/zswlishi/stream-action-traces.ts)
- [stream-head-info.ts](./examples/reference/zswlishi/stream-head-info.ts)
- [stream-table-rows.ts](./examples/reference/zswlishi/stream-table-rows.ts)
- [stream-transaction.ts](./examples/reference/zswlishi/stream-transaction.ts)
