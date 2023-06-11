import express, { Application } from "express";
import { Router } from "./router";

export interface ServerConfig {
  name: string;
  port: number;
}

export class Server {
  private config: ServerConfig;
  private app: express.Application;
  private routerObj: Router;

  public constructor(config: ServerConfig) {
    this.config = config;
    this.routerObj = new Router(this.config.name);
    this.app = express();
  }

  public static create(name: string): Server {
    return new Server({ name, port: 3000 });
  }

  public router(): Router {
    return this.routerObj;
  }
  
  public getExpressApp(): Application {
    return this.app;
  }

  public start() {
    // First add the global middlewares we need
    this.app.use(express.json());

    // Add a default route
    this.app.get("/info", (req, res) => {
      res.json({ name: this.config.name });
    });

    // Add the routes to the express app
    this.routerObj.initialiseRoutes(this.app);

    this.app.listen(this.config.port, () => {
      console.log(`⚡️[server]: Server is running at http://localhost:${this.config.port}`);
    });
  }
}
