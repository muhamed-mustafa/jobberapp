import path from 'path';
import nodemailer, { Transporter } from 'nodemailer';
import Email from 'email-templates';
import { Logger } from 'winston';
import { config } from '@notifications/config';
import {  winstonLogger } from '@muhamed-mustafa/jobber-shared';
import SMTPTransport from 'nodemailer/lib/smtp-transport';
import { EmailTemplateParams } from '@notifications/types/email';


export class EmailTemplateService {
  private logger: Logger;
  private smtpTransport: Transporter;
  private email: Email;

  constructor() {
    this.logger = winstonLogger(`${config.ELASTIC_SEARCH_URL}`, 'mailTemplateService', 'debug');

    this.smtpTransport = nodemailer.createTransport({
      host: config.SMTP_HOST,
      port: config.SMTP_PORT,
      auth: {
        user: config.SENDER_EMAIL,
        pass: config.SENDER_EMAIL_PASSWORD
      }
    } as SMTPTransport.Options);

    this.email = new Email({
      message: {
        from: `Jobber App <${config.SENDER_EMAIL}>`
      },
      send: true,
      preview: false,
      transport: this.smtpTransport,
      views: {
        options: {
          extension: 'ejs'
        }
      },
      juice: true,
      juiceResources: {
        preserveImportant: true,
        webResources: {
          relativeTo: path.join(__dirname, '../build')
        }
      }
    });
  }

  public async send({ template, receiver, locals }: EmailTemplateParams): Promise<void> {
    try {
      await this.email.send({
        template: path.join(__dirname, '..', 'src/emails', template),
        message: {
          to: receiver
        },
        locals
      });

      this.logger.info('Email sent successfully.', { template, receiver });
    } catch (error) {
      this.logger.error('Failed to send email.', {
        error: (error as Error).message,
        template,
        receiver
      });
    }
  }
}
