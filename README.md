# Space SDK (Typescript)
Typescript API for Space Cloud

## Worker API

Sample usage
```ts
import { Server } from "@spacecloud-io/worker";
import { z } from "zod";

// We first create the server object
const server = Server.create({ 
  name: "myServer",
  baseUrl: "/v2",     // Optional. Defaults to `/v1`.
  port: 8080          // Optional. Defaults to `3000`.
});

// Create a router object. All operations are registered on this router.
const router = server.router();

// Register a query object.
router.query("operate")                       // `opId` is the name of the operation
  .method("GET")                              // Defaults to `GET` for queries and `POST` for mutations
  .url("/v1/operate")                         // Defaults to `${baseURL}/${opId}`                                                 
  .input(z.object({ name: z.string() }))
  .output(z.object({ greeting: z.string() }))
  .fn(async (_ctx, req) => {
    return { greeting: `Hi ${req.name}` };
  });

// Start the express http server.
server.start();
```