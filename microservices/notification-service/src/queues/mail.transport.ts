import { config } from '@notifications/config';
import { IEmailLocals, winstonLogger } from '@muhamed-mustafa/jobber-shared';
import { Logger } from 'winston';
import { EmailTemplateService } from '@notifications/helpers';
import { EmailTemplateName } from '@notifications/types/email';

export class EmailService {
  private logger: Logger;
  private emailService: EmailTemplateService = new EmailTemplateService();

  constructor() {
    this.logger = winstonLogger(`${config.ELASTIC_SEARCH_URL}`, 'mailTransport', 'debug');
  }

  public async sendEmail({
    template,
    receiver,
    locals
  }: {
    template: EmailTemplateName;
    receiver: string;
    locals: IEmailLocals;
  }): Promise<void> {
    await this.emailService.send({ template, receiver, locals });
    this.logger.info('Email sent successfully.', { template, receiver, locals });
  }
}
