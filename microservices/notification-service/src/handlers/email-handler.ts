import { MessageHandler } from '@notifications/interfaces/message-handler.interface';
import { EmailService } from '@notifications/queues/mail.transport';
import { config } from '@notifications/config';
import { IEmailLocals } from '@muhamed-mustafa/jobber-shared';
import { ConsumeMessage } from 'amqplib';

export class EmailMessageHandler implements MessageHandler {
  private emailService: EmailService = new EmailService();

  async handle(msg: ConsumeMessage): Promise<void> {
    const { receiverEmail: receiver, username, verifyLink, resetLink, template, otp } = JSON.parse(msg!.content.toString());

    const locals: IEmailLocals = {
      appLink: config.CLIENT_URL!,
      appIcon: 'https://i.ibb.co/Kyp2m0t/cover.png',
      username: username,
      verifyLink: verifyLink,
      resetLink: resetLink,
      otp: otp
    };

    await this.emailService.sendEmail({ template, receiver, locals });
  }
}
