import { Request, Response } from "express";
import { extractHeadersFromRequest } from "./helpers";

export class Context {
  private req: Request;
  private res: Response;

  public metadata: { [key: string]: string };
  
  constructor(req: Request, res: Response) {
    this.req = req;
    this.res = res;
    this.metadata = extractHeadersFromRequest(req);
  }

/**
 * Returns the request object provided by express. Helpful for accessing
 * underlying request properties like hostname & cookies. For headers, use metadata.
 * @returns 
 */
  public getRawRequestObject(): Request {
    return this.req;
  }

/**
 * Returns the response object provided by express. Useful for setting properties in response
 * object like headers.
 * @returns 
 */
  public getRawResponseObject(): Response {
    return this.res;
  }
}