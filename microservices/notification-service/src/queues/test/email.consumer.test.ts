jest.mock('@muhamed-mustafa/jobber-shared', () => ({
  ...jest.requireActual('@muhamed-mustafa/jobber-shared'),
  winstonLogger: jest.fn().mockReturnValue({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  })
}));

jest.mock('@notifications/queues/connection');

import { QueueConnection } from '@notifications/queues/connection';
import { EmailConsumer } from '@notifications/queues/email.consumer';

describe('EmailConsumer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should consume messages correctly', async () => {
    const channel = {
      assertExchange: jest.fn(),
      assertQueue: jest.fn().mockResolvedValue({ queue: 'auth-email-queue' }),
      bindQueue: jest.fn(),
      consume: jest.fn(),
      publish: jest.fn(),
      ack: jest.fn()
    };

    (QueueConnection.prototype.connect as jest.Mock).mockResolvedValue(channel);

    const handler = { handle: jest.fn() };

    const consumer = new EmailConsumer({
      exchange: 'jobber-email-notification',
      routingKey: 'auth-email',
      queue: 'auth-email-queue',
      loggerLabel: 'AuthEmailConsumer',
      message: { receiverEmail: 'test@example.com', verifyLink: 'https://example.com/verify', template: 'verifyEmail' },
      handle: handler
    });

    await consumer.start();

    expect(channel.assertExchange).toHaveBeenCalledWith('jobber-email-notification', 'direct');
    expect(channel.assertQueue).toHaveBeenCalledWith('auth-email-queue', {
      durable: true,
      autoDelete: false
    });
    expect(channel.bindQueue).toHaveBeenCalledWith('auth-email-queue', 'jobber-email-notification', 'auth-email');
    expect(channel.consume).toHaveBeenCalled();
    expect(channel.consume).toHaveBeenCalledTimes(1);
  });
});
