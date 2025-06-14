import { connect, Channel, ChannelModel } from 'amqplib';
import { config } from '@notifications/config';
import { winstonLogger } from '@muhamed-mustafa/jobber-shared';
import type { Logger } from 'winston';

export class QueueConnection {
  private logger: Logger;
  private connection!: ChannelModel;
  private channel!: Channel;

  constructor() {
    this.logger = winstonLogger(`${config.ELASTIC_SEARCH_URL}`, 'notificationQueueConnection', 'debug');
  }

  public async connect(): Promise<Channel | undefined> {
    try {
      const connection = await connect(config.RABBITMQ_ENDPOINT!);
      connection.createChannel();
      this.logger.info('Connected to RabbitMQ successfully');
      this.setupGracefulShutdown();
      return this.channel;
    } catch (error) {
      this.logger.error('Error connecting to RabbitMQ:', error as Error);
      return undefined;
    }
  }

  private setupGracefulShutdown(): void {
    process.once('SIGINT', async () => await this.close());
    process.once('SIGTERM', async () => await this.close());
  }

  public async close(): Promise<void> {
    try {
      await this.channel?.close();
      await this.connection?.close();
      this.logger.info('RabbitMQ connection closed gracefully');
    } catch (error) {
      this.logger.error('Error closing RabbitMQ connection:', error as Error);
    }
  }
}
