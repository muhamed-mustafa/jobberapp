import 'express-async-errors';
import http from 'http';
import { Application } from 'express';
import { Logger } from 'winston';
import { winstonLogger } from '@muhamed-mustafa/jobber-shared';
import { config } from '@notifications/config';
import { ElasticsearchService } from '@notifications/elasticsearch';
import healthRoute from '@notifications/routes';
import { QueueConnection } from './queues/connection';

export class NotificationServer {
  private app: Application;
  private logger: Logger;
  private server!: http.Server;

  constructor(app: Application) {
    this.app = app;
    this.logger = winstonLogger(`${config.ELASTIC_SEARCH_URL}`, 'notification-service', 'debug');
  }

  private setupRoutes(): void {
    this.app.use('/notifications', healthRoute);
  }
  public start(): void {
    try {
      this.initializeQueues();
      this.initializeElasticSearch();
      this.startHttpServer();
      this.setupRoutes();
    } catch (error) {
      this.logger.error('Error while starting NotificationServer', error);
    }
  }

  private initializeQueues(): void {
    this.logger.info('Queues initialized successfully');
    const queueConnection = new QueueConnection();
    queueConnection.connect();
  }

  private initializeElasticSearch(): void {
    this.logger.info('Elasticsearch client connected and health check passed');
    const elasticsearchService = new ElasticsearchService();
    elasticsearchService.checkConnection();
  }

  private startHttpServer(): void {
    const port = config.PORT!;
    this.server = http.createServer(this.app);

    this.server.listen(port, () => {
      this.logger.info(`Notification server running on port ${port}`);
    });

    this.logger.info(`Worker with PID ${process.pid} for notification-service has started`);
  }

  public getServer(): http.Server | undefined {
    return this.server;
  }
}
