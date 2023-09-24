import express from "express";
import { z } from "zod";
import openapi3 from "openapi3-ts/oas30";

import { Route, RouteConfig, RouteUpdater } from "./route";

export interface RouterConfig {
  name: string;
  baseUrl: string;
}

export class Router {
  private config: RouterConfig;
  private routes: Route<any, any>[];
  openApiBuilder: openapi3.OpenApiBuilder;

  constructor(config: RouterConfig) {
    this.config = config;
    this.routes = [];
    this.openApiBuilder = openapi3.OpenApiBuilder.create();
  }

  /**
   * Query registers a read-only operation.
   * It uses the `GET` http method by default.
   * @param opId Name for the operation
   * @returns 
   */
  public query(opId: string) {
    // Create a new route object
    const config: RouteConfig = {
      opId,
      opType: "query",
      method: "get",
      url: `${this.config.baseUrl}/${opId}`,
      jsonSchema: {
        input: { type: "null" },
        output: {}
      },
      zodSchemas: {
        input: z.null(),
        output: z.any(),
      }
    };

    return this._addRoute<void, any>(config);
  }

  /**
   * Mutation registers an operation which can mutate the state of the system. 
   * It uses the `POST` http method by default.
   * @param opId Name for the operation
   * @returns 
   */
  public mutation(opId: string) {
    // Create a new route object
    const config: RouteConfig = {
      opId,
      opType: "mutation",
      method: "post",
      url: `${this.config.baseUrl}/${opId}`,
      jsonSchema: {
        input: {},
        output: { type: "null" }
      },
      zodSchemas: {
        input: z.any(),
        output: z.null(),
      },
    };

    return this._addRoute<any, void>(config);
  }

  private _addRoute<I, O>(config: RouteConfig) {
    const index = this.routes.length;
    const routeUpdater: RouteUpdater = r => {
      this.routes[index] = r;
    };
    const route = new Route<I, O>(config, routeUpdater);

    // Add the routes to an internal array
    this.routes = [...this.routes, route];
    return route;
  }

  _generateOpenApi() {
    // Create the open api document
    this.openApiBuilder.addTitle(this.config.name);

    // Add one path for each operation
    this.routes.forEach(route => {
      // Get OpenAPI operation for route
      const { path, method, operation } = route._getOpenAPIOperation();

      // Add path to OpenAPI spec
      this.openApiBuilder.addPath(path, { [method]: operation });
    });
  }

  _getOpenApiSpec() {
    return this.openApiBuilder.getSpec();
  }

  _initialiseRoutes(app: express.Application) {
    // Add express routes for openapi doc
    const jsonSpec = this.openApiBuilder.getSpecAsJson();
    const yamlSpec = this.openApiBuilder.getSpecAsYaml();
    app.get(`${this.config.baseUrl}/openapi.json`, (_req, res) => {
      res.setHeader("Content-Type", "application/json");
      res.status(200).send(jsonSpec);
    });
    app.get(`${this.config.baseUrl}/openapi.yaml`, (_req, res) => {
      res.setHeader("Content-Type", "application/yaml");
      res.status(200).send(yamlSpec);
    });

    // Add express route for each operation the user has registered
    this.routes.forEach(route => route.addRoute(app));

    // Add a default route to catch errors
    app.all("*", (_req, res) => res.status(400).json({ message: "No route found" }));
  }

  // Returns a list of routes
  _getRoutes() {
    return this.routes;
  }
}