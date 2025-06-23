import { Channel, ConsumeMessage } from 'amqplib';
import { config } from '@notifications/config';
import { winstonLogger } from '@muhamed-mustafa/jobber-shared';
import { QueueConnection } from '@notifications/queues/connection';
import type { Logger } from 'winston';

export class EmailConsumer {
  private readonly logger: Logger;
  public readonly exchange: string;
  public readonly routingKey: string;
  public readonly queue: string;
  private readonly connection: QueueConnection;
  private channel!: Channel;

  constructor({ exchange, routingKey, queue, loggerLabel }: { exchange: string; routingKey: string; queue: string; loggerLabel: string }) {
    this.exchange = exchange;
    this.routingKey = routingKey;
    this.queue = queue;
    this.logger = winstonLogger(config.ELASTIC_SEARCH_URL!, loggerLabel, 'debug');
    this.connection = new QueueConnection();
  }

  public async start(): Promise<void> {
    this.channel = (await this.connection.connect()) as Channel;
    await this.setupExchangeAndQueue();
    await this.startConsuming();
  }

  private async setupExchangeAndQueue(): Promise<void> {
    await this.channel.assertExchange(this.exchange, 'direct');
    await this.channel.assertQueue(this.queue, { durable: true, autoDelete: false });
    await this.channel.bindQueue(this.queue, this.exchange, this.routingKey);
    this.logger.info(`Queue "${this.queue}" bound to exchange "${this.exchange}"`);
  }

  private async startConsuming(): Promise<void> {
    this.channel.consume(this.queue, (msg: ConsumeMessage | null) => {
      if (msg) {
        const content = JSON.parse(msg.content.toString());
        console.log('content', content);
        this.channel.ack(msg);
      }
    });

    this.logger.info(`Started consuming messages from "${this.queue}"`);
  }
}
