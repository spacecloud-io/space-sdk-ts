import { Application, RequestHandler } from "express";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import openapi3 from "openapi3-ts/oas30";

import { getErrorResponseSchema, getPayloadFromParams, isZodTypeNull, processException } from "./helpers";

export type RouteUpdater = (r: Route<any, any>) => void;

export interface RouteConfig {
  opId: string;
  opType: string;
  method: string;
  url?: string;
  jsonSchema: {
    input: any;
    output: any;
  };
  zodSchemas: {
    input?: z.ZodType;
    output?: z.ZodType;
  };
}

export interface ZodSchemas {
  input?: z.ZodType;
  output?: z.ZodType;
}

export type Query<I, O> = (input: I) => Promise<O>;

export class Route<I, O> {
  private config: RouteConfig;
  private updater: RouteUpdater;

  // The callback function the user has registered
  private handler?: Query<I, O>;

  constructor(config: RouteConfig, updater: RouteUpdater) {
    this.config = config;
    this.updater = updater;

    // Autogenerate a url if it wasn't already provided by the user
    if (this.config.url === undefined) {
      this.config.url = `/v1/${this.config.opId}`;
    }
  }

  public method(method: string) {
    this.config.method = method;
    return this;
  }

  public url(url: string) {
    this.config.url = url;
    return this;
  }

  public input<T>(schema: z.ZodType<T>) {
    // Create json schema from zod schema
    this.config.zodSchemas.input = schema;
    this.config.jsonSchema.input = zodToJsonSchema(schema);
    delete this.config.jsonSchema.input["$schema"];

    // Infer input type for new route object
    type I = z.infer<typeof schema>;

    // Update the router
    const r = new Route<I, O>(this.config, this.updater);
    this.updater(r);
    return r;
  }

  public output<T>(schema: z.ZodType<T>) {
    // Create json schema from zod schema
    this.config.zodSchemas.output = schema;
    this.config.jsonSchema.output = zodToJsonSchema(schema);
    delete this.config.jsonSchema.output["$schema"];

    // Infer output type for new route object
    type O = z.infer<typeof schema>;

    // Update the router
    const r = new Route<I, O>(this.config, this.updater);
    this.updater(r);
    return r;
  }

  public fn(query: Query<I, O>) {
    this.handler = query;
    return this;
  }

  public getOpenAPIOperation() {
    // Process request schema
    const isRequestNull = isZodTypeNull(this.config.zodSchemas.input);
    const requestBodyObject: openapi3.RequestBodyObject = {
      description: `Request object for ${this.config.opId}`,
      content: {},
      required: false
    };

    // Add request schema if we require payload
    if (!isRequestNull) {
      requestBodyObject.content = { "application/json": { schema: this.config.jsonSchema.input } };
      requestBodyObject.required = true;
    }

    // Process response schemas
    const isResponseNull = isZodTypeNull(this.config.zodSchemas.output);
    const successResponseStatusCode = isResponseNull ? "204" : "200";
    const successResponseObject: openapi3.ResponseObject = { description: `Success response object for ${this.config.opId}` };

    // Add response schema when we have a return type
    if (!isResponseNull) {
      successResponseObject.content = { "application/json": { schema: this.config.jsonSchema.output } };
    }


    // Add the schemas to operation
    const operation: openapi3.OperationObject = {
      operationId: this.config.opId,
      requestBody: requestBodyObject,
      responses: {
        [successResponseStatusCode]: successResponseObject,
        "400": getErrorResponseSchema(),
        "500": getErrorResponseSchema(),
      },

      // Add the sc specific extensions
      ["x-request-op-type"]: this.config.opType,
    };

    // Unnecessary check to remove linting error. We don't really require this
    // since we are already performing this step in the constructor. 
    if (!this.config.url) {
      this.config.url = `/v1/${this.config.opId}`;
    }

    return {
      path: this.config.url,
      method: this.config.method,
      operation,
    };
  }

  public addRoute(app: Application) {
    // Check if input body was defined
    const isBodyPresent = ["post", "put"].includes(this.config.method);
    const isRequestPayloadPresent = !isZodTypeNull(this.config.zodSchemas.input);

    // Create a request handler
    const handler: RequestHandler = async (req, res) => {
      if (!this.handler) {
        throw new Error("Validator and query are not defined");
      }

      // Create a default payload object
      let payload: any = isRequestPayloadPresent ? {} : null;

      // Extract the payload from request body or query params
      if (isRequestPayloadPresent) {
        if (isBodyPresent) payload = req.body;
        else payload = getPayloadFromParams(req.query, this.config.jsonSchema.input);
      }


      const parseResult = this.config.zodSchemas.input?.safeParse(payload);
      if (!parseResult?.success) {
        res.status(400).json({ message: "Invalid request payload sent", errors: parseResult?.error.issues });
        return;
      }

      // Simply return back the response
      try {
        const output = await this.handler(payload);
        res.json(output);
      } catch (e: any) {
        // Return status code 500 if we catch an exception
        res.status(500).json({ message: processException(e) });
      }
    };

    // Unnecessary check to remove linting error. We don't really require this
    // since we are already performing this step in the constructor. 
    if (!this.config.url) {
      this.config.url = `/v1/${this.config.opId}`;
    }

    // Register the handler for the appropriate method
    switch (this.config.method) {
      case "get":
        app.get(this.config.url, handler);
        break;
      case "delete":
        app.delete(this.config.url, handler);
        break;
      case "put":
        app.put(this.config.url, handler);
        break;
      case "post":
      default:
        app.post(this.config.url, handler);
    }
  }
}
