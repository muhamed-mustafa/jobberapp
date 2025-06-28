import { Channel, ConsumeMessage } from 'amqplib';
import { config } from '@notifications/config';
import { IEmailLocals, IEmailMessageDetails, winstonLogger } from '@muhamed-mustafa/jobber-shared';
import { QueueConnection } from '@notifications/queues/connection';
import type { Logger } from 'winston';
import { EmailService } from './mail.transport';
import { MessageHandler } from '@notifications/interfaces/message-handler.interface';

export class EmailConsumer {
  private readonly logger: Logger;
  public readonly exchange: string;
  public readonly routingKey: string;
  public readonly message?: IEmailMessageDetails;
  public readonly queue: string;
  private readonly handler: MessageHandler;
  private readonly connection: QueueConnection;
  private channel!: Channel;
  private emailService: EmailService = new EmailService();

  constructor({
    exchange,
    routingKey,
    queue,
    loggerLabel,
    message,
    handle
  }: {
    exchange: string;
    routingKey: string;
    queue: string;
    loggerLabel: string;
    message?: IEmailMessageDetails;
    handle: MessageHandler;
  }) {
    this.exchange = exchange;
    this.routingKey = routingKey;
    this.queue = queue;
    this.message = message;
    this.handler = handle;
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
    this.channel.consume(this.queue, async (msg: ConsumeMessage | null) => {
      if (msg) {
        await this.handler.handle(msg);
        this.channel.ack(msg);
      }
    });

    this.logger.info(`Started consuming messages from "${this.queue}"`);
  }
}
