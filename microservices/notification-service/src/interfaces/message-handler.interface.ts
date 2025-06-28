import { ConsumeMessage } from 'amqplib';

export interface MessageHandler {
  handle(msg: ConsumeMessage): Promise<void>;
}
