import { Request } from "express";
import openapi3 from "openapi3-ts/oas30";

export const getPayloadFromParams = (query: any, inputSchema: any) => {
  // Return the payload as is if type is any or additional property is set to true
  if (inputSchema.type === undefined || inputSchema.additionalProperties) return query;

  const payload: any = {};
  const properties = inputSchema.properties;

  for (const key in query) {
    // Skip if property isn't defined
    if (!properties[key]) continue;

    // Convert the param to the appropriate type basis the schema
    const param = query[key];
    switch (properties[key].type) {
      case "string":
        payload[key] = param;
        break;
      case "boolean":
        payload[key] = (param === "true");
        break;
      case "number":
      case "integer":
        payload[key] = Number(param);
        break;
      default:
        payload[key] = JSON.parse(param);
        break;
    }
  }
  return payload;
};

export const isZodTypeNull = (inputZodType: any) => {
  return inputZodType._def.typeName === "ZodNull";
};

export const processException = (e: any) => {
  // Return the exception as is if it was a type of string
  if (typeof e === "string") return e;

  // Return error message if it was provided
  if (e.message && typeof e.message === "string") return e.message;

  // Else return a static error message
  return "Internal server error occured";
};

export const getErrorResponseSchema = () => {
  const schema: openapi3.SchemaObject = {
    type: "object",
    properties: {
      message: { type: "string" },
      errors: {
        type: "array",
        items: {
          type: "object",
          properties: {
            message: { type: "string" },
          },
          additionalProperties: true,
        }
      }
    }
  };
  const responseObject: openapi3.ResponseObject = {
    description: "Standard error response object",
    content: { "application/json": { schema } }
  };

  return responseObject;
};

export const extractHeadersFromRequest = (req: Request) => {
  const headers: { [key: string]: string } = {};
  for (const [key, value] of Object.entries(req.headers)) {
    if (typeof value === "string") headers[key] = value;
    else if (Array.isArray(value)) headers[key] = value[0];
  }

  return headers;
};
