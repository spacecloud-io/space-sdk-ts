import express, { Application } from "express";
import { Router } from "./router";

export interface ServerConfig {
  name: string;
  port?: number;
  baseUrl?: string;
}

export class Server {
  private config: ServerConfig;
  private app: express.Application;
  private routerObj: Router;

  public constructor(config: ServerConfig) {
    // Set default values if not provided
    if (!config.baseUrl) config.baseUrl = "/v1";
    if (!config.port) config.port = 3000;

    // Initialise the server object
    this.config = config;
    this.routerObj = new Router({ name: config.name, baseUrl: config.baseUrl });
    this.app = express();
  }

  /**
   * Create returns a new instance of the server object
   * @param config Object to configure server properties
   * @returns A `Server` object
   */
  public static create(config: ServerConfig): Server {
    return new Server(config);
  }

  /**
   * Router returns a router object to register your operations
   * @returns Router object
   */
  public router(): Router {
    return this.routerObj;
  }

  public getExpressApp(): Application {
    return this.app;
  }

  /**
   * Start begins the server operation. It will start an http server on the specified port.
   * It also exposes the OpenAPI spec for this server on `${baseUrl}/openapi.json`.
   */
  public start() {
    // First add the global middlewares we need
    this.app.use(express.json());

    // Add a default route
    this.app.get("/info", (req, res) => {
      res.json({ name: this.config.name });
    });

    // Add the routes to the express app
    this.routerObj._initialiseRoutes(this.app);

    this.app.listen(this.config.port, () => {
      console.log(`⚡️[server]: Server is running at http://localhost:${this.config.port}`);
    });
  }
}
