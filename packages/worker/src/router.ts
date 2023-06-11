import express from "express";
import { z } from "zod";
import openapi3 from "openapi3-ts/oas30";

import { Route, RouteConfig, RouteUpdater } from "./route";

export class Router {
  private name: string;
  private routes: Route<any, any>[];

  constructor(name: string) {
    this.name = name;
    this.routes = [];
  }

  // Query creates a new route of the query type
  public query(opId: string) {
    // Create a new route object
    const config: RouteConfig = {
      opId,
      opType: "query",
      method: "get",
      jsonSchema: {
        input: { type: "null" },
        output: {}
      },
      zodSchemas: {
        input: z.null(),
        output: z.any(),
      }
    };

    return this.addRoute<void, any>(config);
  }

  public mutation(opId: string) {
    // Create a new route object
    const config: RouteConfig = {
      opId,
      opType: "mutation",
      method: "post",
      jsonSchema: {
        input: {},
        output: { type: "null" }
      },
      zodSchemas: {
        input: z.any(),
        output: z.null(),
      },
    };

    return this.addRoute<any, void>(config);
  }

  private addRoute<I, O>(config: RouteConfig) {
    const index = this.routes.length;
    const routeUpdater: RouteUpdater = r => {
      this.routes[index] = r;
    };
    const route = new Route<I, O>(config, routeUpdater);

    // Add the routes to an internal array
    this.routes = [...this.routes, route];
    return route;
  }

  initialiseRoutes(app: express.Application) {
    // Create the open api document
    const builder = openapi3.OpenApiBuilder.create();
    builder.addTitle(this.name);

    // Add one path for each operation
    this.routes.forEach(route => {
      // Get OpenAPI operation for route
      const { path, method, operation } = route.getOpenAPIOperation();

      // Add path to OpenAPI spec
      builder.addPath(path, { [method]: operation });
    });

    // Add express routes for openapi doc
    const jsonSpec = builder.getSpecAsJson();
    const yamlSpec = builder.getSpecAsYaml();
    app.get("/v1/openapi.json", (_req, res) => res.status(200).send(jsonSpec));
    app.get("/v1/openapi.yaml", (_req, res) => res.status(200).send(yamlSpec));

    // Add express route for each operation the user has registered
    this.routes.forEach(route => route.addRoute(app));
  }

  // Returns a list of routes
  getRoutes() {
    return this.routes;
  }
}