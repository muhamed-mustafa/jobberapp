import express, { Router, Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';

class HealthRoute {
  public router: Router;

  constructor() {
    this.router = express.Router();
    this.setRoutes();
  }

  private setRoutes(): void {
    this.router.get('/health', this.healthCheck);
  }

  private healthCheck(_req: Request, res: Response): void {
    res.status(StatusCodes.OK).send('Notification service is healthy and OK.');
  }
}

export default new HealthRoute().router;
