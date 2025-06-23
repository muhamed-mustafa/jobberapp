import 'express-async-errors';
import http from 'http';
import { Application } from 'express';
import { Logger } from 'winston';
import { Channel } from 'amqplib';
import { winstonLogger } from '@muhamed-mustafa/jobber-shared';
import { config } from '@notifications/config';
import { ElasticsearchService } from '@notifications/elasticsearch';
import healthRoute from '@notifications/routes';
import { QueueConnection } from '@notifications/queues/connection';
import { EmailConsumer } from '@notifications/queues/email.consumer';
import { QueueConfig } from '@notifications/types/queue-config';

export class NotificationServer {
  private app: Application;
  private logger: Logger;
  private server!: http.Server;
  private readonly queueConnection: QueueConnection;
  private readonly consumers: EmailConsumer[] = [];

  constructor(app: Application) {
    this.app = app;
    this.logger = winstonLogger(`${config.ELASTIC_SEARCH_URL}`, 'notification-service', 'debug');
    this.queueConnection = new QueueConnection();

    const queueConfigs: QueueConfig[] = this.getQueueConfigs();

    this.consumers = queueConfigs.map(
      (cfg) =>
        new EmailConsumer({
          exchange: cfg.exchange,
          routingKey: cfg.routingKey,
          queue: cfg.queue,
          loggerLabel: cfg.loggerLabel
        })
    );
  }

  private getQueueConfigs(): QueueConfig[] {
    return [
      {
        exchange: 'jobber-email-notification',
        routingKey: 'auth-email',
        queue: 'auth-email-queue',
        loggerLabel: 'AuthEmailConsumer'
      },
      {
        exchange: 'jobber-order-notification',
        routingKey: 'order-email',
        queue: 'order-email-queue',
        loggerLabel: 'OrderEmailConsumer'
      }
    ];
  }
  private setupRoutes(): void {
    this.app.use('/notifications', healthRoute);
  }

  public async start(): Promise<void> {
    try {
      await this.initializeQueues();
      this.initializeElasticSearch();
      this.startHttpServer();
      this.setupRoutes();
    } catch (error) {
      this.logger.error('Error while starting NotificationServer', error);
    }
  }

  private async initializeQueues(): Promise<void> {
    this.logger.info('Initializing queues...');
    await this.queueConnection.connect();
    const channel: Channel = this.queueConnection.getChannel()!;

    for (const consumer of this.consumers) {
      await consumer.start();
      await channel.assertExchange(consumer.exchange, 'direct', { durable: true });
      this.publishStartupMessage(channel, consumer.exchange, consumer.routingKey);
    }
  }

  private publishStartupMessage(channel: Channel, exchange: string, routingKey: string): void {
    const message = JSON.stringify({ name: 'Jobber', service: 'Notification Service' });
    channel.publish(exchange, routingKey, Buffer.from(message));
    this.logger.info(`Startup message published to "${routingKey}" on "${exchange}"`);
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
