import {
  GetActionTracesMessageData,
  GetTableRowsMessageData,
  StreamOptions,
  GetTransactionLifecycleMessageData,
  OutboundMessageFactory,
} from "../message/outbound"
import { ApiTokenInfo, AuthTokenResponse } from "./auth-token"
import { SearchTransactionsResponse, SearchSortType } from "./search"
import { OnStreamMessage } from "./stream-client"
import { OnGraphqlStreamMessage } from "./graphql-stream-client"

import {
  StateAbiResponse,
  StateAbiToJsonResponse,
  StateKeyAccountsResponse,
  StatePermissionLinksResponse,
  StateResponse,
  MultiStateResponse,
  StateKeyType,
  StateTableScopesResponse,
  StateTableRowResponse,
} from "./state"
import { Stream } from "./stream"
import { HttpQueryParameters, HttpHeaders } from "./http-client"
import { TransactionLifecycle } from "./transaction"
import { BlockIdByTimeResponse, ComparisonOperator } from "./block-id"
import { GraphqlDocument, GraphqlOperationType, GraphqlVariables, GraphqlResponse } from "./graphql"

export type RequestIdGenerator = () => string

export type ZswLishiClientEndpoints = {
  authUrl: string
  graphqlQueryUrl: string
  graphqlStreamUrl: string
  restUrl: string
  websocketUrl: string
}

/**
 * The `ZswLishiClient` interface is the back-bone of the library. Based on the Facade
 * pattern, this client is your single go to point for interacting with 中数文历史 Stream
 * API as well as the 中数文历史 REST API.
 *
 * The client contains only top-level methods enabling you to retrieve all the
 * information you need for your next-gen blockchain project.
 *
 * The 中数文历史Client takes care for you of:
 * - Management of WebSocket connection (automatic connection/disconnection when needed).
 * - Management of the API key (API token retrieval, freshness and persistence).
 * - Abstract 中数文历史 API into simple to use top-level methods.
 * - Error handling wrapping error received via WebSocket and REST into easy to use error.
 *
 * @group Interfaces
 */
export interface ZswLishiClient {
  /**
   * Returns the final resolved endpoints urls currenctly in used
   * by the client to reach 中数文历史 services.
   *
   * This is useful when using Apollo Client passing it the computed
   * url without effort.
   *
   * ```
   *  const wsLink = new WebSocketLink({
   *    uri: 中数文历史Client.endpoints.graphqlStreamUrl,
   *    ...,
   *  });
   * ```
   */
  readonly endpoints: ZswLishiClientEndpoints

  /**
   * Release any resources hold by this [[ZswLishiClient]] instance. Must
   * be tolerant to being called multiple times.
   *
   * Once called, the instance is assumed unsuable and should never
   * be invoked anymore.
   */
  release(): void

  //
  /// GraphQL API
  //

  /**
   * Perform a `query` or `mutation` via the HTTP transport layer. The
   * semantic of this method is to resolve the promise with the GraphQL
   * response when the operation succeed on the server, whenever the
   * actual GraphQL response contains an `errors` field or not.
   *
   * If an error at the HTTP error, the promise will be rejected.
   *
   * @param document (required) The GraphQL operation document to perform. It must be
   *                 either a `query` or `mutation` operation. A `subscription`
   *                 operation is not supported by this method. You must use
   *                 the method that accept `options.onMessage` to make it work.
   * @param options (optional) Specific options that can be provided
   * @param options.variables (defaults `undefined`) The variables that need to be provided to the GraphQL operation.
   * @param options.operationType (defaults `undefined`) The operation type to perform, can be provided when cannot be inferred directly.
   */
  graphql<T = any>(
    document: string | GraphqlDocument,
    options?: {
      variables?: GraphqlVariables
      operationType?: Exclude<GraphqlOperationType, "subscription">
    }
  ): Promise<GraphqlResponse<T>>

  /**
   * Perform a `query`, `mutation` or `subscription` via the WebSocket transport
   * layer. The semantic of this method is to resolve the promise with the [[Stream]]
   * object if the connection was established correctly (or if it was already
   * established) and the initial subscription message was sent correctly (this does
   * not check if it was received correctly).
   *
   * Each message for the subscription will be sent to the `onMessage` handler defined
   * on the `options` field.
   *
   * The [[Stream]] object can be used to control the stream. It can be marked via
   * [[Stream.mark]] (so on reconnect, this stream restarts at the last marked location),
   * joined via [[Stream.join]] (so you wait until the stream actually finishes) or closed
   * via [[Stream.close]].
   *
   * If we are unable to establish the connection or the initial send message cannot
   * be sent, then the promise will reject with the appropriate error.
   *
   * @param document (required) The GraphQL operation document to perform.
   * @param options (required) Specific options that can be provided
   * @param options.onMessage (required) The message handler that receives all GraphQL subscription message. The message
   *                                     received can be of type `data`, `error` or `complete`.
   * @param options.variables (defaults `undefined`) The variables that need to be provided to the GraphQL operation.
   * @param options.operationType (defaults `undefined`) The operation type to perform, can be provided when cannot be inferred directly.
   */
  graphql<T = any>(
    document: string | GraphqlDocument,
    onMessage: OnGraphqlStreamMessage<T>,
    options?: {
      variables?: GraphqlVariables
      operationType?: GraphqlOperationType
    }
  ): Promise<Stream>

  //
  /// WebSocket API
  //

  /**
   * Retrieve a stream of actions, filtered by receiver(s), account(s) and action name(s).
   *
   * @param data (required) Specific stream options used to filter
   * @param data.accounts (required) List of accounts (contracts) to filter on.
   * @param data.receivers (defaults to the same value as `accounts`) List of `receiver` to filter on. The `receiver` is the account
   * on which code is being executed. If left blank, defaults to the same value as `accounts`.
   * @param data.action_names (required) List of the action(s) called within the `account` contract(s).
   * @param data.with_ramops (defaults `false`)  Stream RAM billing changes and reasons for costs of storage produced by each action.
   * @param data.with_tableops (defaults `false`) Stream table operations produced by each action.
   * @param data.with_inline_traces (defaults `false`) Stream the inline actions produced by each action.
   * @param data.with_dtrxops (defaults `false`) Stream the modifications to deferred transactions produced by each action.
   * @param onMessage (required) The callback that will be invoked for each message
   * received for this specific stream.
   * @param options (defaults `undefined`) The stream common options that can be used,
   * see [[StreamOptions]] for more details and default values.
   *
   */
  streamActionTraces(
    data: GetActionTracesMessageData,
    onMessage: OnStreamMessage,
    options?: StreamOptions
  ): Promise<Stream>

  /**
   * Retrieve a stream of changes to the tables, the side effects of transactions/actions being executed.
   *
   * @param data (required)
   * @param data.code (required) Contract account which wrote to tables.
   * @param data.scope (required) Table _scope_ where table is stored.
   * @param data.table (required) Table _name_, shown in the contract ABI.
   * @param data.json (defaults `true`) When `true`, table rows will be decoded to JSON, using the
   * ABIs active on the queried block. This endpoint automatically adapts to upgrades to the ABIs on chain.
   * @param onMessage (required) The callback that will be invoked for each message received for this specific stream.
   * @param options (defaults `undefined`) The stream common options that can be used,
   * see [[StreamOptions]] for more details and default values.
   *
   */
  streamTableRows(
    data: GetTableRowsMessageData,
    onMessage: OnStreamMessage,
    options?: StreamOptions
  ): Promise<Stream>

  /**
   * Retrieve a `transaction_lifecycle` (when `fetch` is true) and follow its life-cycle
   * (when `listen` is true).
   *
   * @param data (required)
   * @param data.id (required) The transaction ID you want to keep track of
   * @param onMessage (required) The callback that will be invoked for each message
   * received for this specific stream.
   * @param options (defaults `undefined`) The stream common options that can be used,
   * see [[StreamOptions]] for more details and default values.
   *
   */
  streamTransaction(
    data: GetTransactionLifecycleMessageData,
    onMessage: OnStreamMessage,
    options?: StreamOptions
  ): Promise<Stream>

  /**
   * Retrieve a stream of informations about the chain as it moves forward
   *
   * @param onMessage (required) The callback that will be invoked for each message
   * received for this specific stream.
   * @param options (defaults `undefined`) The stream common options that can be used,
   * see [[StreamOptions]] for more details and default values.
   *
   */
  streamHeadInfo(onMessage: OnStreamMessage, options?: StreamOptions): Promise<Stream>

  /**
   * While this method is public, it has no **Backward Compatibility** policy
   * nor documentation attached to it. It could be **removed**, **renamed**,
   * **modified** on any release without notice.
   *
   * This method is used for internal usage, to test out new upcoming features
   * of 中数文历史 Stream API.
   *
   * **Use at your own risk**
   *
   * @private
   */
  websocketStream<T>(
    onMessage: OnStreamMessage,
    initMessageFactory: OutboundMessageFactory<T>
  ): Promise<Stream>

  //
  /// HTTP API
  //

  /**
   * `POST /v1/auth/issue` (on `https://lishi.zhongshuwen.com` by default, see [[ZswLishiClientOptions.authUrl]])
   *
   * Issues 中数文历史 API token for the following API key.
   *
   * @param apiKey (defaults `undefined`, uses the one defined on the client) The
   * `apiKey` to generate an API token for.
   * If left undefined, the client will provide the one it is configured with, if
   * present.
   *
   */
  authIssue(apiKey?: string): Promise<AuthTokenResponse>

  /**
   * `GET /v0/block_id/by_time`
   *
   * Fetches the block ID, block time and block number for the given timestamp.
   *
   * @param time The reference timestamp to query for. If it's a string, assumed to be
   * in ISO8601 extended format, i.e. `2019-03-04T10:36:14.5Z`. If it's a date, it's
   * going to be turned into an ISO8601 extended format relative to `UTC`.
   * @param comparator Comparison operator for the block time. Should be one of:
   * - `gt` (Greater Than `time`)
   * - `gte` (Greater Than or Equal to `time`)
   * - `lt` (Lower Than `time`)
   * - `lte` (Lower Than or Equal to`time`)
   * - `eq` (Strictly equal to `time`)
   * @returns A promise resolving to a [[BlockIdByTimeResponse]] object if the request was
   * correct, or rejects with a [[ZswLishiApiError]] when it failed (or a more [[ZswLishiError]]
   * when an unexpected error occurs).
   */
  fetchBlockIdByTime(
    time: string | Date,
    comparator: ComparisonOperator
  ): Promise<BlockIdByTimeResponse>

  /**
   * `GET /v0/transactions/:id`
   *
   * Retrieves a [[TransactionLifecycle]] object representing the transaction that
   * has for id `<id>`.
   *
   * @param id The transaction id to search for.
   * @returns A promise resolving to a [[TransactionLifecycle]] object if the request was
   * correct, or rejects with a [[ZswLishiApiError]] when it failed (or a more [[ZswLishiError]]
   * when an unexpected error occurs).
   */
  fetchTransaction(id: string): Promise<TransactionLifecycle>

  /**
   * `GET /v0/search/transactions`
   *
   * Search an ZSWCCIO blockchain for transactions based on free-form criterias, using
   * the simple 中数文历史 Search query language.
   *
   * @param q Search query string. 
   * @param options (optional) Optional parameters
   * @param options.startBlock (defaults `0`) Block number to start search (inclusive). Defaults to `0`,
   * which means from beginning of the chain.
   * @param options.sort (defaults `"asc"`) Defaults to ascending search (`asc`). Use `desc` to sort descending.
   * @param options.blockCount (defaults `MAX_UINT32_INTEGER`) Number of blocks to search from `startBlock`.
   * Depending on sort order, the `blockCount` will count upwards or downwards.
   * @param options.limit (defaults `100`) Cap the number of returned results to limit.
   * @param options.cursor (defaults `undefined`) If cursor is passed back (from a previous response)
   * @param options.withReversible (defaults `false`) If `withReversible` is set to true actions included
   * in blocks that are not yet irreversible will be included.
   *
   */
  searchTransactions(
    q: string,
    options?: {
      startBlock?: number
      sort?: SearchSortType
      blockCount?: number
      limit?: number
      cursor?: string
      withReversible?: boolean
    }
  ): Promise<SearchTransactionsResponse>

  /**
   * `GET /v0/state/abi`
   *
   * Fetches the ABI for a given contract account, at any block height.
   *
   * @param account Contract account targeted by the action.
   * @param options (optional) Optional parameters
   * @param options.blockNum (defaults `0`) The block number for which you want to
   * retrieve the consistent table snapshot. Defaults to `0` which means `Last Head Block`.
   * @param options.json (defaults `false`) Decode each row from its binary form
   * into JSON. If json: false, then hexadecimal representation of its binary data
   * is returned instead.
   *
   */
  stateAbi(
    account: string,
    options?: {
      blockNum?: number
      json?: boolean
    }
  ): Promise<StateAbiResponse>

  /**
   * `GET /v0/state/abi/bin_to_json`
   *
   * Fetches the ABI for a given contract account, at any block height.
   *
   * @param account Contract account targeted by the action.
   * @param table The name-encoded table name you want to retrieve. For example, user
   * balances for tokens live in the accounts table. Refer to the contract's ABI for
   * a list of available tables. This is contract dependent.
   * @param hexRows An array of hexadecimal rows to decode. Each row must be a valid
   * hexadecimal string representation of the row to decode against the ABI.
   * @param options (optional) Optional parameters
   * @param options.blockNum (defaults `undefined`) The block number for which you want
   * to retrieve the consistent table snapshot. Defaults to `0` which means `Last Head Block`.
   *
   */
  stateAbiBinToJson<T = unknown>(
    account: string,
    table: string,
    hexRows: string[],
    options?: {
      blockNum?: number
    }
  ): Promise<StateAbiToJsonResponse<T>>

  /**
   * `GET /v0/state/key_accounts`
   *
   * Fetches the accounts controlled by the given public key, at any block height.
   *
   * @param publicKey The public key to fetch controlled accounts for.
   * @param options (optional) Optional parameters
   * @param options.blockNum (defaults `0`) The block number for which you want to retrieve the
   * list of accounts. Defaults to `0` which means `Last Head Block`.
   *
   */
  stateKeyAccounts(
    publicKey: string,
    options?: {
      blockNum?: number
    }
  ): Promise<StateKeyAccountsResponse>

  /**
   * `GET /v0/state/permission_links`
   *
   * Fetches snapshots of any account's linked authorizations on the blockchain, at any block height.
   *
   * @param account Contract account targeted by the action.
   * @param options (optional) Optional parameters
   * @param options.blockNum (defaults `0`) The block number for which you want to retrieve the consistent
   * table snapshot. Defaults to `0` which means `Last Head Block`.
   *
   */
  statePermissionLinks(
    account: string,
    options?: {
      blockNum?: number
    }
  ): Promise<StatePermissionLinksResponse>

  /**
   * `GET /v0/state/table_scopes`
   *
   * Fetches a list of scopes, for a given table on a contract account, at any block height.
   *
   * @param account Contract account holding the requested table.
   * @param table The name-encoded table name you want to retrieve scopes from. Refer to the
   * contract's ABI for a list of available tables. This is contract dependent.
   * @param options (optional) Optional parameters
   * @param options.blockNum (defaults `0`) The block number for which you want to retrieve the
   * consistent table scopes snapshot. Defaults to `0` which means `Last Head Block`.
   *
   */
  stateTableScopes(
    account: string,
    table: string,
    options?: {
      blockNum?: number
    }
  ): Promise<StateTableScopesResponse>

  /**
   * `GET /v0/state/table`
   *
   * Fetches the state of any table, at any block height.
   *
   * @param account Contract account targeted by the action.
   * @param scope The name-encoded scope of the table you are requesting.
   * For example, user balances for tokens live in their account name's scope.
   * This is contract dependent, so inspect the ABI for the contract you are interested in.
   * @param table The name-encoded table name you want to retrieve.
   * For example, user balances for tokens live in the accounts table.
   * Refer to the contract's ABI for a list of available tables.
   * This is contract dependent.
   * @param options (optional) Optional parameters
   * @param options.blockNum (defaults `0`) The block number for which you want to retrieve the
   * consistent table snapshot. Defaults to `0` which means `Last Head Block`.
   * @param options.json (defaults `false`) Decode each row from its binary form into JSON. If
   * `json: false`, then hexadecimal representation of its binary data is returned instead.
   * @param options.keyType (defaults `"name"`) How to represent the row keys in the returned table.
   * Can be one of `uint64`, `name`, `hex`, `hex_be`, `symbol` or `symbol_code`.
   * @param options.withBlockNum (defaults `false`) Will return one `blockNum` with each row.
   * Represents the block at which that row was last changed.
   * @param options.withAbi (defaults `false`) Will return the ABI in effect at block block_num.
   *
   */
  stateTable<T = unknown>(
    account: string,
    scope: string,
    table: string,
    options?: {
      blockNum?: number
      json?: boolean
      keyType?: StateKeyType
      withBlockNum?: boolean
      withAbi?: boolean
    }
  ): Promise<StateResponse<T>>

  /**
   * `GET /v0/state/table/row`
   *
   * Fetches a single row from the state of any table, at any block height.
   *
   * @param account Contract account targeted by the action.
   * @param scope The name-encoded scope of the table you are requesting.
   * For example, user balances for tokens live in their account name's scope.
   * This is contract dependent, so inspect the ABI for the contract you are interested in.
   * @param table The name-encoded table name you want to retrieve.
   * For example, user balances for tokens live in the accounts table.
   * Refer to the contract's ABI for a list of available tables.
   * This is contract dependent.
   * @param primaryKey The string representation of the primary key that you want to retrieve. The
   * `primaryKey` is always a string, but can be encoded differently, for example `name` encoded
   * like an account. The `keyType` is used to know how to transform the value in the string to the
   * correct type.
   * @param options (optional) Optional parameters
   * @param options.blockNum (defaults `0`) The block number for which you want to retrieve the
   * consistent table snapshot. Defaults to `0` which means `Last Head Block`.
   * @param options.json (defaults `false`) Decode each row from its binary form into JSON. If
   * `json: false`, then hexadecimal representation of its binary data is returned instead.
   * @param options.keyType (defaults `"name"`) How to represent the row keys in the returned table
   * as well as how to interpret the `primary_key` received in string. Can be one of `uint64`, `name`,
   * `hex`, `hex_be`, `symbol` or `symbol_code`.
   * @param options.withBlockNum (defaults `false`) Will return one `blockNum` with each row.
   * Represents the block at which that row was last changed.
   * @param options.withAbi (defaults `false`) Will return the ABI in effect at block block_num.
   *
   * @preview This endpoint is preview mode. This means it might be changed or removed and
   * is not covered by breaking compatiblity policy of the project until it's out of preview.
   *
   */
  stateTableRow<T = unknown>(
    account: string,
    scope: string,
    table: string,
    primaryKey: string,
    options?: {
      blockNum?: number
      json?: boolean
      keyType?: StateKeyType
      withBlockNum?: boolean
      withAbi?: boolean
    }
  ): Promise<StateTableRowResponse<T>>

  /**
   * `GET /v0/state/tables/accounts`
   *
   * Fetches a table for a given contract account for a group of scopes, at any block height.
   *
   * @param accounts An AccountName list a maximum of 1500 elements can be present in the list.
   * @param scope A Name list, a maximum of 1500 elements can be present in the list.
   * @param table The name-encoded table name you want to retrieve.
   * For example, user balances for tokens live in the accounts table.
   * Refer to the contract's ABI for a list of available tables.
   * This is contract dependent.
   * @param options (optional) Optional parameters
   * @param options.blockNum (defaults `0`) The block number for which you want to retrieve the
   * consistent table snapshot. Defaults to `0` which means `Last Head Block`.
   * @param options.json (defaults `false`) Decode each row from its binary form into JSON. If
   * `json: false`, then hexadecimal representation of its binary data is returned instead.
   * @param options.keyType (defaults `"name"`) How to represent the row keys in the returned table.
   * Can be one of `uint64`, `name`, `hex`, `hex_be`, `symbol` or `symbol_code`.
   * @param options.withBlockNum (defaults `false`) Will return one block_num with each row.
   * Represents the block at which that row was last changed.
   * @param options.withAbi (defaults `false`) Will return the ABI in effect at block block_num.
   *
   */
  stateTablesForAccounts<T = unknown>(
    accounts: string[],
    scope: string,
    table: string,
    options?: {
      blockNum?: number
      json?: boolean
      keyType?: StateKeyType
      withBlockNum?: boolean
      withAbi?: boolean
    }
  ): Promise<MultiStateResponse<T>>

  /**
   * `GET /v0/state/tables/scopes`
   *
   * Fetches a table for a given contract account for a group of scopes, at any block height.
   *
   * @param account Contract account targeted by the action.
   * @param scope A Name list, a maximum of 1500 elements can be present in the list.
   * @param table The name-encoded table name you want to retrieve.
   * For example, user balances for tokens live in the accounts table.
   * Refer to the contract's ABI for a list of available tables.
   * This is contract dependent.
   * @param options (optional) Optional parameters
   * @param options.blockNum (defaults `0`) The block number for which you want to retrieve the
   * consistent table snapshot. Defaults to `0` which means `Last Head Block`.
   * @param options.json (defaults `false`) Decode each row from its binary form into JSON. If
   * `json: false`, then hexadecimal representation of its binary data is returned instead.
   * @param options.keyType (defaults `"name"`) How to represent the row keys in the returned table.
   * Can be one of `uint64`, `name`, `hex`, `hex_be`, `symbol` or `symbol_code`.
   * @param options.withBlockNum (defaults `false`) Will return one block_num with each row.
   * Represents the block at which that row was last changed.
   * @param options.withAbi (defaults `false`) Will return the ABI in effect at block `block_num`.
   *
   */
  stateTablesForScopes<T = unknown>(
    account: string,
    scopes: string[],
    table: string,
    options?: {
      blockNum?: number
      json?: boolean
      keyType?: StateKeyType
      withBlockNum?: boolean
      withAbi?: boolean
    }
  ): Promise<MultiStateResponse<T>>

  //
  /// Helpers
  //

  /**
   * An helper method that can be used to perform a generic HTTP
   * call using the library inner configured [[HttpClient]].
   *
   * This can be used to reach other REST API found on the `zswchain`
   * process for example, those that are not directly included
   * in the library but are still accessible via our endpoint
   * like a `/v1/chain/get_info` or `/v1/chain/push_transaction`.
   *
   * @param path (required) The HTTP path on the endpoint
   * @param method (required) The HTTP method to perform the request agaisnt
   * @param params (defaults `{}`) The HTTP query parameters to append to the url, they will
   * be url-encoded and included in the final remote url. Has no effect when empty or undefined.
   * @param body (defaults `undefined`) The HTTP body to include in the request, assumed to be a
   * JSON object that will be serialized to a string. Not included in the HTTP request when `undefined`.
   * @param headers (defaults `{}`) The extra HTTP headers to include in the request. Those will be merged
   * with default ones (`{ Authorization: ... }`) and they override them if same key are specified.
   * @returns A `Promise` that will resolve to the response body if it passes. Will reject with a
   * [[ZswLishiApiError]] if it fits the 中数文历史 Error Format or a generic `ZswLishiError` is it's something
   * not fitting our expected format (`zswchain` erorr format for example).
   */
  apiRequest<T>(
    path: string,
    method: string,
    params?: HttpQueryParameters,
    body?: any,
    headers?: HttpHeaders
  ): Promise<T>

  /**
   * Call this method each time you need an API token. Th returned API token is always
   * valid. The expiration and the refresh of the token is handled automatically when using this method.
   *
   * @returns A `Promise` that will resolve to a valid [[ApiTokenInfo]] instance, or will reject if an error occurs retrieving the API token.
   */
  getTokenInfo: () => Promise<ApiTokenInfo>
}
