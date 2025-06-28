import { MessageHandler } from '@notifications/interfaces/message-handler.interface';
import { EmailService } from '@notifications/queues/mail.transport';
import { config } from '@notifications/config';
import { IEmailLocals } from '@muhamed-mustafa/jobber-shared';
import { ConsumeMessage } from 'amqplib';

export class OrderMessageHandler implements MessageHandler {
  private emailService: EmailService = new EmailService();

  private readonly templateHandlers: Record<string, (receiver: string, locals: IEmailLocals) => Promise<void>> = {
    orderPlaced: async (receiver: string, locals: IEmailLocals) => {
      await this.emailService.sendEmail({ template: 'orderPlaced', receiver, locals });
      await this.emailService.sendEmail({ template: 'orderReceipt', receiver, locals });
    },

    default: async (receiver: string, locals: IEmailLocals) => {
      const { template } = locals as any;
      await this.emailService.sendEmail({ template, receiver, locals });
    }
  };

  async handle(msg: ConsumeMessage): Promise<void> {
    const {
      receiverEmail: receiver,
      username,
      template,
      sender,
      offerLink,
      amount,
      buyerUsername,
      sellerUsername,
      title,
      description,
      deliveryDays,
      orderId,
      orderDue,
      requirements,
      orderUrl,
      originalDate,
      newDate,
      reason,
      subject,
      header,
      type,
      message,
      serviceFee,
      total
    } = JSON.parse(msg!.content.toString());
    const locals: IEmailLocals = {
      appLink: `${config.CLIENT_URL}`,
      appIcon: 'https://i.ibb.co/Kyp2m0t/cover.png',
      username,
      sender,
      offerLink,
      amount,
      buyerUsername,
      sellerUsername,
      title,
      description,
      deliveryDays,
      orderId,
      orderDue,
      requirements,
      orderUrl,
      originalDate,
      newDate,
      reason,
      subject,
      header,
      type,
      message,
      serviceFee,
      total
    };

    const handler = this.templateHandlers[template] || this.templateHandlers.default;
    await handler(receiver, locals);
  }
}
