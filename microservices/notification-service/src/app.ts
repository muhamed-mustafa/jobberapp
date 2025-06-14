import { winstonLogger } from '@muhamed-mustafa/jobber-shared';
import { Logger } from 'winston';
import { config } from '@notifications/config';
import express, { Express } from 'express';
import { NotificationServer } from '@notifications/server';

class InitializeApp {
  private app: Express;
  private notificationServer: NotificationServer;
  private logger: Logger;

  constructor() {
    this.app = express();
    this.notificationServer = new NotificationServer(this.app);
    this.logger = winstonLogger(`${config.ELASTIC_SEARCH_URL}`, 'notification-app', 'debug');
    this.logger.info('Notification Service Initialized');
  }

  public start(): void {
    this.notificationServer.start();
  }
}

new InitializeApp().start();
