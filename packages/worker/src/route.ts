import { Application, RequestHandler } from "express";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import openapi3 from "openapi3-ts/oas30";

import { getErrorResponseSchema, getPayloadFromParams, isZodTypeNull, processException } from "./helpers";
import { Context } from "./context";

export type RouteUpdater = (r: Route<any, any>) => void;

export interface RouteConfig {
  opId: string;
  opType: string;
  method: string;
  url: string;
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

export type Query<I, O> = (ctx: Context, input: I) => Promise<O>;

export class Route<I, O> {
  private config: RouteConfig;
  private updater: RouteUpdater;

  // The callback function the user has registered
  private handler?: Query<I, O>;

  constructor(config: RouteConfig, updater: RouteUpdater) {
    this.config = config;
    this.updater = updater;
  }

  /**
   * Method configures the HTTP method to use for this operation 
   * @param method 
   * @returns 
   */
  public method(method: string) {
    this.config.method = method;
    return this;
  }

  /**
   * Url configures the URL to use for this operation
   * @param url 
   * @returns 
   */
  public url(url: string) {
    this.config.url = url;
    return this;
  }

  /**
   * Input configures the data type of the request object to pass in the handler function
   * registered by the user. It also performs a JSONSchema check before calling the handler function.
   * The proeprties specified by the input may be accepted via the body or as query parameters based
   * on the method being used for the operation
   * @param schema ZOD schema object
   * @returns 
   */
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

  /**
   * Output configures the data type of the response object to that the handler function registered
   * by the user will return.
   * The returned object will always be sent as a JSON payload in the response body.
   * @param schema ZOD schema object
   * @returns 
   */
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

  /**
   * fn accepts the procedure that needs to be called when this operation is invoked
   * @param handlerFn 
   * @returns
   */
  public fn(handlerFn: Query<I, O>) {
    this.handler = handlerFn;
    return this;
  }

  public _getOpenAPIOperation() {
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
        const ctx = new Context(req, res);
        const output = await this.handler(ctx, payload);
        res.json(output);
      } catch (e: any) {
        // Return status code 500 if we catch an exception
        res.status(500).json({ message: processException(e) });
      }
    };

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
