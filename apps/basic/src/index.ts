import { Server } from "@spacecloud-io/worker";
import { z } from "zod";
import * as schemas from "./schema";

const server = Server.create({ name: "myServer" });
const router = server.router();

router.query("operate")
  .input(z.object({ name: z.string() }))
  .output(z.object({ greeting: z.string() }))
  .fn(async (_ctx, req) => {
    return { greeting: `Hi ${req.name}` };
  });

// You can also use the ts-to-zod packages to auto create
// the zod schemas for you.
router.mutation("addTodo")
  .input(schemas.addTodoRequestSchema)
  .output(schemas.addTodoResponseSchema)
  .fn(async (_ctx, req) => {
    console.log("Adding todo:", req);
    return { id: "myid" };
  });

server.start();